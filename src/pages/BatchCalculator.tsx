import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Save, History, Users, QrCode, BarChart3, Download, Loader2, Edit2, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useBatchRecipes } from "@/hooks/useBatchRecipes";
import { useBatchProductions } from "@/hooks/useBatchProductions";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";
import { MixologistGroupMembersDialog } from "@/components/MixologistGroupMembersDialog";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  bottle_size_ml?: number;
  bottles_needed?: number;
}

const BatchCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipeName, setRecipeName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" }
  ]);
  const [targetBatchSize, setTargetBatchSize] = useState("");
  const [targetLiters, setTargetLiters] = useState("");
  const [currentServes, setCurrentServes] = useState("1");
  const [producedByName, setProducedByName] = useState("");
  const [producedByUserId, setProducedByUserId] = useState<string>(user?.id || "");
  const [notes, setNotes] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
  const [isAILoading, setIsAILoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [producerProfiles, setProducerProfiles] = useState<Map<string, any>>(new Map());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [managingGroup, setManagingGroup] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [masterList, setMasterList] = useState("");
  const [showMasterList, setShowMasterList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProductionId, setEditingProductionId] = useState<string | null>(null);

  const aiAnalysisText =
    typeof aiSuggestions === "string"
      ? aiSuggestions
      : aiSuggestions
      ? JSON.stringify(aiSuggestions, null, 2)
      : "";

  const weeklyAnalysis =
    aiAnalysisText && aiAnalysisText.includes("**WEEKLY ANALYSIS:**")
      ? aiAnalysisText
          .split("**MONTHLY ANALYSIS:**")[0]
          .replace("**WEEKLY ANALYSIS:**", "")
          .trim()
      : aiAnalysisText;

  const monthlyAnalysis =
    aiAnalysisText && aiAnalysisText.includes("**MONTHLY ANALYSIS:**")
      ? aiAnalysisText
          .split("**MONTHLY ANALYSIS:**")[1]
          ?.split("**QUARTERLY ANALYSIS:**")[0]
          ?.trim() || ""
      : "";

  const quarterlyAnalysis =
    aiAnalysisText && aiAnalysisText.includes("**QUARTERLY ANALYSIS:**")
      ? aiAnalysisText.split("**QUARTERLY ANALYSIS:**")[1]?.trim() || ""
      : "";

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes(selectedGroupId);
  const { productions, createProduction, getProductionIngredients } = useBatchProductions(
    selectedRecipeId && selectedRecipeId !== "all" ? selectedRecipeId : undefined,
    selectedGroupId
  );
  const { groups, createGroup } = useMixologistGroups();
  const { spirits, calculateBottles } = useMasterSpirits();
  const queryClient = useQueryClient();

  // Set default producer to current user
  useEffect(() => {
    const setDefaultProducer = async () => {
      if (user?.id && !producedByUserId) {
        setProducedByUserId(user.id);
        
        // Fetch and set producer name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setProducedByName(profile.full_name || profile.username || '');
        }
      }
    };
    
    setDefaultProducer();
  }, [user]);

  // Fetch registered users (followers/followings for selection)
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .order('username');

      if (data && !error) {
        setRegisteredUsers(data);
      }
    };

    fetchUsers();
  }, []);

  // Fetch producer profiles for display
  useEffect(() => {
    if (!productions || productions.length === 0) return;

    const fetchProducerProfiles = async () => {
      const userIds = productions
        .map(p => p.produced_by_user_id)
        .filter(Boolean);

      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (data && !error) {
        const profileMap = new Map();
        data.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
        setProducerProfiles(profileMap);
      }
    };

    fetchProducerProfiles();
  }, [productions]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), name: "", amount: "", unit: "ml" }
    ]);
  };

  const parseMasterList = (text: string) => {
    // Parse 3-column format: Item Name | Category | Package(measure)
    const lines = text.split('\n').filter(line => line.trim());
    const parsedIngredients: Ingredient[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Split by tab or multiple spaces (common in table copy-paste)
      const parts = trimmed.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 2) {
        // Looking for bottle size in the last column
        const name = parts[0];
        const lastPart = parts[parts.length - 1];
        
        // Extract bottle size from the last column
        const sizeMatch = lastPart.match(/(\d+\.?\d*)\s*(ml|l|ltr|litre|liter|cl)/i);
        
        if (sizeMatch) {
          const amount = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toLowerCase();
          let amountInMl: number;
          
          if (unit === 'cl') {
            amountInMl = amount * 10;
          } else if (unit.startsWith('l')) {
            amountInMl = amount * 1000;
          } else {
            amountInMl = amount;
          }
          
          parsedIngredients.push({
            id: `parsed-${Date.now()}-${index}`,
            name: name,
            amount: "",
            unit: "ml",
            bottle_size_ml: amountInMl
          });
        } else {
          // No bottle size found
          parsedIngredients.push({
            id: `parsed-${Date.now()}-${index}`,
            name: name,
            amount: "",
            unit: "ml"
          });
        }
      } else {
        // Single column - just name
        parsedIngredients.push({
          id: `parsed-${Date.now()}-${index}`,
          name: parts[0] || trimmed,
          amount: "",
          unit: "ml"
        });
      }
    });
    
    return parsedIngredients;
  };
  const handleParseMasterList = async () => {
    try {
      if (!masterList.trim()) {
        toast.error("Please enter ingredients to parse");
        return;
      }

      const parsed = parseMasterList(masterList);
      
      // Remove duplicates from parsed list based on name
      const uniqueParsed = parsed.reduce((acc, current) => {
        const exists = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [] as typeof parsed);
      
      // Save to master spirits database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (const ingredient of uniqueParsed) {
          if (ingredient.name && ingredient.bottle_size_ml) {
            // Check if spirit already exists
            const { data: existing } = await supabase
              .from('master_spirits')
              .select('id')
              .eq('name', ingredient.name)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!existing) {
              await supabase.from('master_spirits').insert({
                name: ingredient.name,
                bottle_size_ml: ingredient.bottle_size_ml,
                user_id: user.id,
              });
            }
          }
        }
      }
      
      setIngredients(uniqueParsed);
      toast.success(`Added ${uniqueParsed.length} unique ingredients to master list!`);
      setShowMasterList(false);
      setMasterList("");
      queryClient.invalidateQueries({ queryKey: ["master-spirits"] });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to parse ingredients");
    }
  };

  const addFromMasterList = (spirit: Ingredient) => {
    setIngredients([...ingredients, { ...spirit, id: Date.now().toString() }]);
    toast.success(`Added ${spirit.name}`);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => {
      if (ing.id === id) {
        const updated = { ...ing, [field]: value };
        
        // If name changed and it's a spirit from master list, auto-fill bottle size
        if (field === 'name' && spirits) {
          const selectedSpirit = spirits.find(s => s.name === value);
          if (selectedSpirit) {
            updated.bottle_size_ml = selectedSpirit.bottle_size_ml;
          }
        }
        
        // Calculate bottles if amount and bottle_size_ml are available
        if (updated.amount && updated.bottle_size_ml) {
          const liters = parseFloat(updated.amount) / 1000; // Convert ml to liters
          updated.bottles_needed = calculateBottles(liters, updated.bottle_size_ml);
        }
        
        return updated;
      }
      return ing;
    }));
  };

  const calculateBatch = () => {
    if (!recipeName || (!targetBatchSize && !targetLiters) || !currentServes) {
      return null;
    }

    const multiplier = targetBatchSize 
      ? parseFloat(targetBatchSize) / parseFloat(currentServes)
      : parseFloat(targetLiters) * 1000 / ingredients.reduce((sum, ing) => sum + parseFloat(ing.amount || "0"), 0);

    const scaledIngredients = ingredients.map(ing => ({
      ...ing,
      scaledAmount: (parseFloat(ing.amount) * multiplier).toFixed(2)
    }));

    return { scaledIngredients, multiplier };
  };

  const handleSaveRecipe = async () => {
    if (!recipeName || ingredients.length === 0) {
      toast.error("Please provide recipe name and ingredients");
      return;
    }

    if (editingRecipeId) {
      // Update existing recipe
      updateRecipe({
        id: editingRecipeId,
        updates: {
          recipe_name: recipeName,
          description: batchDescription,
          current_serves: parseFloat(currentServes),
          ingredients: ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }))
        }
      });
      setEditingRecipeId(null);
    } else {
      // Create new recipe
      createRecipe({
        recipe_name: recipeName,
        description: batchDescription,
        current_serves: parseFloat(currentServes),
        ingredients: ingredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        }))
      });
    }
  };

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(recipe.recipe_name);
    setBatchDescription(recipe.description || "");
    setCurrentServes(String(recipe.current_serves));
    setIngredients(Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.map((ing: any) => ({
          id: ing.id || `${Date.now()}-${Math.random()}`,
          name: ing.name || "",
          amount: String(ing.amount || ""),
          unit: ing.unit || "ml"
        }))
      : [{ id: "1", name: "", amount: "", unit: "ml" }]
    );
    setActiveTab("calculator");
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe(recipeId);
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setRecipeName("");
    setBatchDescription("");
    setCurrentServes("1");
    setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
  };

  const handleSubmitBatch = async () => {
    const calculation = calculateBatch();
    if (!calculation) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!producedByUserId) {
      toast.error("Please select who produced this batch");
      return;
    }

    const totalLiters = targetLiters 
      ? parseFloat(targetLiters)
      : calculation.scaledIngredients.reduce((sum, ing) => sum + parseFloat(ing.scaledAmount), 0) / 1000;

    // Calculate actual servings produced based on multiplier
    const actualServings = parseFloat(currentServes) * calculation.multiplier;

    // Generate QR code data
    const qrData = JSON.stringify({
      batchName: recipeName,
      date: new Date().toISOString(),
      liters: totalLiters.toFixed(2),
      servings: Math.round(actualServings),
      producedBy: producedByName,
      ingredients: calculation.scaledIngredients
    });

    let recipeId = selectedRecipeId;

    // If no recipe is selected, auto-create one
    if (!recipeId) {
      try {
        const { data: newRecipe, error: recipeError } = await supabase
          .from('batch_recipes')
          .insert({
            recipe_name: recipeName,
            description: batchDescription,
            current_serves: parseFloat(currentServes),
            ingredients: ingredients.map(ing => ({
              id: ing.id,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit
            })),
            user_id: user!.id
          })
          .select()
          .single();

        if (recipeError) throw recipeError;
        recipeId = newRecipe.id;
      } catch (error) {
        toast.error("Failed to create recipe");
        return;
      }
    }

    const selectedUser = registeredUsers.find(u => u.id === producedByUserId);

    if (editingProductionId) {
      // Update existing production
      try {
        // Update production
        const { error: productionError } = await supabase
          .from('batch_productions')
          .update({
            batch_name: recipeName,
            target_serves: Math.round(actualServings),
            target_liters: totalLiters,
            produced_by_name: selectedUser ? selectedUser.full_name || selectedUser.username : producedByName,
            produced_by_user_id: producedByUserId,
            qr_code_data: qrData,
            notes: notes,
            group_id: selectedGroupId
          })
          .eq('id', editingProductionId);

        if (productionError) throw productionError;

        // Delete old ingredients
        await supabase
          .from('batch_production_ingredients')
          .delete()
          .eq('production_id', editingProductionId);

        // Insert new ingredients
        const { error: ingredientsError } = await supabase
          .from('batch_production_ingredients')
          .insert(
            calculation.scaledIngredients.map(ing => ({
              production_id: editingProductionId,
              ingredient_name: ing.name,
              original_amount: parseFloat(ing.amount),
              scaled_amount: parseFloat(ing.scaledAmount),
              unit: ing.unit
            }))
          );

        if (ingredientsError) throw ingredientsError;

        await queryClient.invalidateQueries({ queryKey: ["batch-productions"] });
        toast.success("Batch production updated!");
      } catch (error) {
        console.error("Update error:", error);
        toast.error("Failed to update production");
        return;
      }
    } else {
      // Create new production
      createProduction({
        production: {
          recipe_id: recipeId,
          batch_name: recipeName,
          target_serves: Math.round(actualServings),
          target_liters: totalLiters,
          production_date: new Date().toISOString(),
          produced_by_name: selectedUser ? selectedUser.full_name || selectedUser.username : producedByName,
          produced_by_email: selectedUser ? null : null,
          produced_by_user_id: producedByUserId,
          qr_code_data: qrData,
          notes: notes,
          group_id: selectedGroupId
        },
        ingredients: calculation.scaledIngredients.map(ing => ({
          ingredient_name: ing.name,
          original_amount: parseFloat(ing.amount),
          scaled_amount: parseFloat(ing.scaledAmount),
          unit: ing.unit
        }))
      });
    }

    // Reset form after submission
    setProducedByName("");
    setProducedByUserId(user?.id || "");
    setNotes("");
    setTargetBatchSize("");
    setTargetLiters("");
    setEditingProductionId(null);
  };

  const handleEditProduction = async (production: any) => {
    // Fetch production ingredients
    const { data: prodIngredients } = await supabase
      .from('batch_production_ingredients')
      .select('*')
      .eq('production_id', production.id);

    setEditingProductionId(production.id);
    setRecipeName(production.batch_name);
    setTargetLiters(String(production.target_liters));
    setProducedByName(production.produced_by_name || "");
    setProducedByUserId(production.produced_by_user_id || "");
    setNotes(production.notes || "");
    setSelectedRecipeId(production.recipe_id);
    setSelectedGroupId(production.group_id);
    
    if (prodIngredients && prodIngredients.length > 0) {
      setIngredients(prodIngredients.map((ing: any) => ({
        id: ing.id || Date.now().toString(),
        name: ing.ingredient_name,
        amount: String(ing.original_amount),
        unit: ing.unit
      })));
    }

    setActiveTab("calculator");
    toast.success("Production loaded for editing");
  };

  const handleDeleteProduction = async (productionId: string) => {
    if (!confirm("Are you sure you want to delete this batch production?")) {
      return;
    }

    try {
      // Delete production ingredients first
      const { error: ingredientsError } = await supabase
        .from('batch_production_ingredients')
        .delete()
        .eq('production_id', productionId);

      if (ingredientsError) throw ingredientsError;

      // Delete production
      const { error: productionError } = await supabase
        .from('batch_productions')
        .delete()
        .eq('id', productionId);

      if (productionError) throw productionError;

      await queryClient.invalidateQueries({ queryKey: ["batch-productions"] });
      toast.success("Batch production deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete production");
    }
  };

  const handleAISuggestions = async () => {
    if (!recipeName) {
      toast.error("Please enter a recipe name first");
      return;
    }

    setIsAILoading(true);
    try {
      const response = await supabase.functions.invoke('batch-ai-assistant', {
        body: {
          action: 'suggest_ingredients',
          data: { recipeName }
        }
      });

      if (response.data?.result) {
        try {
          // Extract JSON from AI response (handles markdown code blocks)
          let jsonText = response.data.result;
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          
          const suggested = JSON.parse(jsonText);
          if (Array.isArray(suggested) && suggested.length > 0) {
            setIngredients(suggested.map((ing: any, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              name: ing.name || "",
              amount: String(ing.amount || ""),
              unit: ing.unit || "ml"
            })));
            toast.success("AI suggestions loaded!");
          } else {
            toast.error("No ingredients suggested");
          }
        } catch (e) {
          console.error("Parse error:", e, "Response:", response.data.result);
          toast.error("Could not parse AI suggestions");
        }
      } else if (response.error) {
        toast.error(response.error.message || "Failed to get AI suggestions");
      }
    } catch (error) {
      toast.error("Failed to get AI suggestions");
      console.error(error);
    } finally {
      setIsAILoading(false);
    }
  };

  const fetchAiSuggestions = async () => {
    if (!productions || productions.length === 0) return;
    
    setLoadingAiSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-ai-assistant', {
        body: {
          action: 'forecast_par',
          data: {
            history: productions.map(p => ({
              batch_name: p.batch_name,
              production_date: p.production_date,
              target_liters: p.target_liters,
              target_serves: p.target_serves
            }))
          }
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        setAiSuggestions(data.result);
        toast.success('AI analysis complete!');
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast.error('Failed to generate AI suggestions');
    } finally {
      setLoadingAiSuggestions(false);
    }
  };

  // Auto-fetch AI suggestions when analytics tab is opened and productions exist
  useEffect(() => {
    if (productions && productions.length > 0 && !aiSuggestions && !loadingAiSuggestions) {
      fetchAiSuggestions();
    }
  }, [productions]);

  const downloadBatchPDF = async (production: any) => {
    try {
      // Fetch ingredients for this production
      const { data: ingredients, error } = await supabase
        .from('batch_production_ingredients')
        .select('*')
        .eq('production_id', production.id);
      
      if (error) throw error;

      // Fetch productions for THIS recipe only to calculate recipe-specific totals
      const { data: allProductions, error: allError } = await supabase
        .from('batch_productions')
        .select('*, batch_production_ingredients(*)')
        .eq('user_id', user?.id)
        .eq('recipe_id', production.recipe_id);
      
      if (allError) console.error("Error fetching recipe productions:", allError);

      // Fetch master spirits for bottle size calculations
      const { data: masterSpirits } = await supabase
        .from('master_spirits')
        .select('*');
      
      const spiritsMap = new Map(masterSpirits?.map(s => [s.name, s]) || []);

      const doc = new jsPDF();
      
      // Calculate recipe-specific production totals
      let totalBatchesProduced = allProductions?.length || 0;
      let totalLitersProduced = 0;
      let overallIngredientsMap = new Map<string, { amountMl: number; bottles: number; leftoverMl: number; bottleSize?: number }>();
      
      if (allProductions) {
        allProductions.forEach((prod: any) => {
          totalLitersProduced += prod.target_liters || 0;
          
          if (prod.batch_production_ingredients) {
            prod.batch_production_ingredients.forEach((ing: any) => {
              const key = `${ing.ingredient_name}`;
              const amountInMl = ing.unit === 'ml' ? parseFloat(ing.scaled_amount || 0) : parseFloat(ing.scaled_amount || 0) * 1000;
              
              const existing = overallIngredientsMap.get(key);
              if (existing) {
                existing.amountMl += amountInMl;
              } else {
                overallIngredientsMap.set(key, {
                  amountMl: amountInMl,
                  bottles: 0,
                  leftoverMl: 0
                });
              }
            });
          }
        });
      }
      
      // Calculate bottles and leftover per ingredient
      overallIngredientsMap.forEach((data, name) => {
        const spirit = spiritsMap.get(name);
        if (spirit && spirit.bottle_size_ml) {
          const fullBottles = Math.floor(data.amountMl / spirit.bottle_size_ml);
          const leftoverMl = data.amountMl % spirit.bottle_size_ml;

          data.bottles = fullBottles;
          data.leftoverMl = leftoverMl;
          data.bottleSize = spirit.bottle_size_ml;
        }
      });
      
      // Modern Color Palette
      const deepBlue: [number, number, number] = [30, 58, 138];
      const skyBlue: [number, number, number] = [56, 189, 248];
      const emerald: [number, number, number] = [16, 185, 129];
      const amber: [number, number, number] = [245, 158, 11];
      const slate: [number, number, number] = [51, 65, 85];
      const lightGray: [number, number, number] = [248, 250, 252];
      
      // Elegant Header with gradient effect
      doc.setFillColor(...deepBlue);
      doc.rect(0, 0, 210, 28, 'F');
      
      // Accent stripe
      doc.setFillColor(...skyBlue);
      doc.rect(0, 28, 210, 2.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("BATCH PRODUCTION REPORT", 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Professional Quality Control & Traceability", 105, 23, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(...slate);
      
      // Production Date
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const productionDate = new Date(production.production_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      doc.text(productionDate, 105, 38, { align: 'center' });
      
      // Batch Summary Card - Modern Design
      let yPos = 45;
      
      // Left card - Batch Info
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, yPos, 88, 38, 3, 3, 'F');
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(0.4);
      doc.roundedRect(12, yPos, 88, 38, 3, 3, 'S');
      
      // Accent corner
      doc.setFillColor(...deepBlue);
      doc.roundedRect(12, yPos, 88, 7, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("BATCH DETAILS", 56, yPos + 4.5, { align: 'center' });
      
      doc.setTextColor(...slate);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Batch:", 16, yPos + 13);
      doc.setFont("helvetica", "normal");
      const batchName = production.batch_name.length > 28 ? production.batch_name.substring(0, 28) + '...' : production.batch_name;
      doc.text(batchName, 16, yPos + 19);
      
      doc.setFont("helvetica", "bold");
      doc.text("Volume:", 16, yPos + 25);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...emerald);
      doc.setFontSize(10);
      doc.text(`${production.target_liters.toFixed(2)} L`, 38, yPos + 25);
      
      doc.setTextColor(...slate);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Servings:", 16, yPos + 31);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...amber);
      doc.setFontSize(10);
      doc.text(`${production.target_serves || 0}`, 40, yPos + 31);
      
      doc.setTextColor(...slate);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Producer:", 16, yPos + 36);
      doc.setFont("helvetica", "normal");
      const producerName = production.produced_by_name || 'N/A';
      doc.text(producerName.length > 25 ? producerName.substring(0, 25) + '...' : producerName, 38, yPos + 36);
      
      // Right card - QR Code Sticker
      if (production.qr_code_data) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(110, yPos, 88, 38, 3, 3, 'F');
        doc.setDrawColor(...skyBlue);
        doc.setLineWidth(0.4);
        doc.roundedRect(110, yPos, 88, 38, 3, 3, 'S');
        
        // Accent corner
        doc.setFillColor(...deepBlue);
        doc.roundedRect(110, yPos, 88, 7, 3, 3, 'F');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("WATERPROOF STICKER", 154, yPos + 4.5, { align: 'center' });
        
        // High-res QR for sticker printing
        const qrCodeDataUrl = await QRCode.toDataURL(production.qr_code_data, {
          width: 1000,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'
        });
        doc.addImage(qrCodeDataUrl, 'PNG', 143, yPos + 10, 22, 22);
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...slate);
        doc.text(production.batch_name.substring(0, 30), 154, yPos + 35, { align: 'center' });
      }
      
      yPos += 43;
      
      // Ingredients Section with modern styling
      doc.setFillColor(...deepBlue);
      doc.rect(12, yPos, 186, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("INGREDIENTS", 15, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(...slate);
      doc.setFontSize(8);
      
      // Modern ingredients table
      if (ingredients && ingredients.length > 0) {
        // Table header with gradient effect
        doc.setFont("helvetica", "bold");
        doc.setFillColor(...deepBlue);
        doc.rect(12, yPos - 2, 186, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("#", 15, yPos + 2.5);
        doc.text("Ingredient Name", 25, yPos + 2.5);
        doc.text("Quantity", 145, yPos + 2.5);
        doc.text("Unit", 175, yPos + 2.5);
        yPos += 8;
        
        // Table rows with alternating colors
        doc.setFont("helvetica", "normal");
        let totalIngredientsQty = 0;
        
        ingredients.forEach((ing: any, index: number) => {
          if (index % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(12, yPos - 2, 186, 5.5, 'F');
          }
          
          doc.setTextColor(...slate);
          doc.text(`${index + 1}`, 15, yPos + 2);
          const ingName = ing.ingredient_name.length > 55 ? ing.ingredient_name.substring(0, 55) + '...' : ing.ingredient_name;
          doc.text(ingName, 25, yPos + 2);
          doc.setTextColor(...emerald);
          doc.setFont("helvetica", "bold");
          doc.text(ing.scaled_amount.toString(), 145, yPos + 2);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...slate);
          doc.text(ing.unit, 175, yPos + 2);
          totalIngredientsQty += parseFloat(ing.scaled_amount);
          yPos += 5.5;
        });
        
        // Total row with emphasis
        doc.setFillColor(...emerald);
        doc.rect(12, yPos - 2, 186, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 25, yPos + 2.5);
        doc.text(`${ingredients.length} Items`, 145, yPos + 2.5);
        yPos += 10;
        
        // Separate ingredients into sharp bottles and required ml
        const sharpBottles: any[] = [];
        const requiredMlItems: any[] = [];
        
        ingredients.forEach((ing: any) => {
          const amountInMl = ing.unit === 'ml'
            ? parseFloat(ing.scaled_amount)
            : parseFloat(ing.scaled_amount) * 1000;
          const spirit = spiritsMap.get(ing.ingredient_name);
          
          if (spirit && spirit.bottle_size_ml) {
            const fullBottles = Math.floor(amountInMl / spirit.bottle_size_ml);
            const leftoverMl = amountInMl % spirit.bottle_size_ml;

            if (fullBottles > 0) {
              sharpBottles.push({
                name: ing.ingredient_name,
                bottles: fullBottles,
              });
            }

            if (leftoverMl > 0) {
              requiredMlItems.push({
                name: ing.ingredient_name,
                mlNeeded: leftoverMl,
              });
            }
          } else {
            // No bottle size defined - show total ML as required
            requiredMlItems.push({
              name: ing.ingredient_name,
              mlNeeded: amountInMl,
            });
          }
        });
        
        // ALWAYS show Sharp Bottles section
        const sharpEstimatedHeight = 20 + (sharpBottles.length * 5.5);
        if (yPos + sharpEstimatedHeight > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...emerald);
        doc.rect(12, yPos, 186, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("SHARP BOTTLES", 15, yPos + 4.5);
        yPos += 8;
        
        if (sharpBottles.length > 0) {
          doc.setFillColor(...slate);
          doc.rect(12, yPos, 186, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("Ingredient", 14, yPos + 4);
          doc.text("Bottles", 135, yPos + 4);
          yPos += 7;
          
          doc.setFont('helvetica', 'normal');
          sharpBottles.forEach((item, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(12, yPos, 186, 5.5, 'F');
            }
            
            doc.setFontSize(7);
            doc.setTextColor(...slate);
            const maxNameLength = 42;
            const displayName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;
            doc.text(displayName, 14, yPos + 3.5);
            
            doc.setTextColor(...deepBlue);
            doc.setFont('helvetica', 'bold');
            doc.text(item.bottles.toString() + " btl", 135, yPos + 3.5);
            
            yPos += 5.5;
          });
        } else {
          doc.setFillColor(249, 250, 251);
          doc.rect(12, yPos, 186, 8, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text("No full bottles required for this batch", 105, yPos + 5, { align: 'center' });
          yPos += 8;
        }
        
        yPos += 6;
        
        // ALWAYS show Required ML section
        const reqEstimatedHeight = 20 + (requiredMlItems.length * 5.5);
        if (yPos + reqEstimatedHeight > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...amber);
        doc.rect(12, yPos, 186, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("REQUIRED ML", 15, yPos + 4.5);
        yPos += 8;
        
        if (requiredMlItems.length > 0) {
          doc.setFillColor(...slate);
          doc.rect(12, yPos, 186, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("Ingredient", 14, yPos + 4);
          doc.text("ML Needed", 135, yPos + 4);
          yPos += 7;
          
          doc.setFont('helvetica', 'normal');
          requiredMlItems.forEach((item, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(12, yPos, 186, 5.5, 'F');
            }
            
            doc.setFontSize(7);
            doc.setTextColor(...slate);
            const maxNameLength = 42;
            const displayName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;
            doc.text(displayName, 14, yPos + 3.5);
            
            doc.setTextColor(...amber);
            doc.setFont('helvetica', 'bold');
            doc.text(item.mlNeeded.toFixed(0) + " ml", 135, yPos + 3.5);
            
            yPos += 5.5;
          });
        } else {
          doc.setFillColor(249, 250, 251);
          doc.rect(12, yPos, 186, 8, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text("No additional ML required for this batch", 105, yPos + 5, { align: 'center' });
          yPos += 8;
        }
        
        yPos += 6;
      }
      
      doc.setTextColor(...slate);
      
      // Check space before Recipe Production Summary
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      // Recipe-Specific Production Summary - Eye-catching design
      doc.setFillColor(...emerald);
      doc.rect(12, yPos, 186, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("RECIPE PRODUCTION SUMMARY", 15, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(...slate);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(12, yPos, 186, 20, 3, 3, 'F');
      doc.setDrawColor(...emerald);
      doc.setLineWidth(0.4);
      doc.roundedRect(12, yPos, 186, 20, 3, 3, 'S');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Total Batches (This Recipe):", 16, yPos + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...deepBlue);
      doc.text(`${totalBatchesProduced} Batches`, 72, yPos + 7);
      
      doc.setTextColor(...slate);
      doc.setFont("helvetica", "bold");
      doc.text("Total Volume (This Recipe):", 16, yPos + 13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...emerald);
      doc.setFontSize(10);
      doc.text(`${totalLitersProduced.toFixed(2)} L`, 72, yPos + 13);
      
      doc.setTextColor(...slate);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Unique Ingredients:", 110, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...amber);
      doc.text(`${overallIngredientsMap.size} Types`, 160, yPos + 10);
      
      yPos += 28;
      
      // Ingredients breakdown table with bottles and leftover - Add page check
      if (overallIngredientsMap.size > 0) {
        // Check if we need a new page for Overall sections
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        // Table rows
        const ingredientsArray = Array.from(overallIngredientsMap.entries());
        const overallSharpBottles: any[] = [];
        const overallRequiredMlItems: any[] = [];
        
        // Split into sharp bottles and required ML
        ingredientsArray.forEach(([name, data]) => {
          if (data.bottleSize) {
            // Has bottle size defined - can calculate bottles
            if (data.bottles > 0) {
              overallSharpBottles.push({
                name,
                bottles: data.bottles,
              });
            }

            if (data.leftoverMl > 0) {
              overallRequiredMlItems.push({
                name,
                mlNeeded: data.leftoverMl,
              });
            }
          } else {
            // No bottle size - show total ML as required
            overallRequiredMlItems.push({
              name,
              mlNeeded: data.amountMl,
            });
          }
        });
        
        // ALWAYS show Overall Sharp Bottles section (even if empty, show message)
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...emerald);
        doc.rect(12, yPos, 186, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("OVERALL SHARP BOTTLES", 15, yPos + 4.5);
        yPos += 8;
        
        if (overallSharpBottles.length > 0) {
          doc.setFillColor(...slate);
          doc.rect(12, yPos, 186, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("Ingredient", 14, yPos + 4);
          doc.text("Bottles", 135, yPos + 4);
          yPos += 7;
          
          doc.setFont('helvetica', 'normal');
          overallSharpBottles.forEach((item, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(12, yPos, 186, 6, 'F');
            }
            
            doc.setFontSize(7);
            doc.setTextColor(...slate);
            const maxNameLength = 45;
            const displayName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;
            doc.text(displayName, 14, yPos + 4);
            
            doc.setTextColor(...deepBlue);
            doc.setFont('helvetica', 'bold');
            doc.text(item.bottles.toString() + " btl", 135, yPos + 4);
            
            yPos += 6;
          });
        } else {
          // Show message if no sharp bottles
          doc.setFillColor(249, 250, 251);
          doc.rect(12, yPos, 186, 10, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text("No full bottles calculated for this recipe production", 105, yPos + 6, { align: 'center' });
          yPos += 10;
        }
        
        yPos += 6;
        
        // ALWAYS show Overall Required ML section
        const estimatedHeight = 20 + (overallRequiredMlItems.length * 6);
        if (yPos + estimatedHeight > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...amber);
        doc.rect(12, yPos, 186, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("OVERALL REQUIRED ML", 15, yPos + 4.5);
        yPos += 8;
        
        if (overallRequiredMlItems.length > 0) {
          doc.setFillColor(...slate);
          doc.rect(12, yPos, 186, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("Ingredient", 14, yPos + 4);
          doc.text("ML Needed", 135, yPos + 4);
          yPos += 7;
          
          doc.setFont('helvetica', 'normal');
          overallRequiredMlItems.forEach((item, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(12, yPos, 186, 6, 'F');
            }
            
            doc.setFontSize(7);
            doc.setTextColor(...slate);
            const maxNameLength = 45;
            const displayName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;
            doc.text(displayName, 14, yPos + 4);
            
            doc.setTextColor(...amber);
            doc.setFont('helvetica', 'bold');
            doc.text(item.mlNeeded.toFixed(0) + " ml", 135, yPos + 4);
            
            yPos += 6;
          });
        } else {
          // Show message if no required ML
          doc.setFillColor(249, 250, 251);
          doc.rect(12, yPos, 186, 10, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text("No additional ML required for this recipe production", 105, yPos + 6, { align: 'center' });
          yPos += 10;
        }
        
        yPos += 6;
      }

      // Notes Section - if exists (expanded)
      if (production.notes) {
        doc.setFillColor(255, 251, 235);
        doc.roundedRect(12, yPos, 186, 18, 3, 3, 'F');
        doc.setDrawColor(...amber);
        doc.setLineWidth(0.3);
        doc.roundedRect(12, yPos, 186, 18, 3, 3, 'S');
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...slate);
        doc.text("Notes:", 16, yPos + 6);
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(production.notes, 175);
        doc.text(splitNotes.slice(0, 3), 16, yPos + 11);
        yPos += 22;
      }
      
      // Calculate remaining space and add padding if needed
      const remainingSpace = 287 - yPos;
      if (remainingSpace > 10) {
        yPos = 283; // Position footer near bottom
      }
      
      // Modern Footer
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(0.4);
      doc.line(12, yPos, 198, yPos);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                       ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Generated: ${timestamp} | Professional Batch Tracking System`, 105, yPos + 5, { align: 'center' });
      
      const fileName = `Batch_Report_${batchName}.pdf`;
      doc.save(fileName);
      toast.success("Batch report download started!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const downloadAllBatchesReport = async () => {
    try {
      if (!productions || productions.length === 0) {
        toast.error("No batches to report");
        return;
      }

      // Fetch all production ingredients
      const allProductionIds = productions.map(p => p.id);
      const { data: allIngredients, error } = await supabase
        .from('batch_production_ingredients')
        .select('*')
        .in('production_id', allProductionIds);
      
      if (error) throw error;

      // Fetch master spirits for bottle size calculations
      const { data: spirits } = await supabase
        .from('master_spirits')
        .select('*');

      const doc = new jsPDF();
      
      let totalLitersProduced = 0;
      let totalServesProduced = 0;
      const ingredientsMap = new Map<string, { amount: number; unit: string }>();
      
      // Calculate totals
      productions.forEach((prod: any) => {
        totalLitersProduced += prod.target_liters || 0;
        totalServesProduced += prod.target_serves || 0;
      });

      if (allIngredients) {
        allIngredients.forEach((ing: any) => {
          const key = ing.ingredient_name;
          const existing = ingredientsMap.get(key);
          if (existing) {
            existing.amount += parseFloat(ing.scaled_amount || 0);
          } else {
            ingredientsMap.set(key, {
              amount: parseFloat(ing.scaled_amount || 0),
              unit: ing.unit
            });
          }
        });
      }
      
      // Modern Color Palette
      const deepBlue: [number, number, number] = [30, 58, 138];
      const skyBlue: [number, number, number] = [56, 189, 248];
      const emerald: [number, number, number] = [16, 185, 129];
      const amber: [number, number, number] = [245, 158, 11];
      const slate: [number, number, number] = [51, 65, 85];
      const lightGray: [number, number, number] = [248, 250, 252];
      
      // Compact Header
      doc.setFillColor(...deepBlue);
      doc.rect(0, 0, 210, 18, 'F');
      doc.setFillColor(...skyBlue);
      doc.rect(0, 18, 210, 1.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("ALL BATCHES REPORT", 105, 10, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(`Generated: ${reportDate}`, 105, 15, { align: 'center' });
      
      let yPos = 24;
      
      // Compact Summary Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, yPos, 186, 20, 2, 2, 'F');
      doc.setDrawColor(...emerald);
      doc.setLineWidth(0.3);
      doc.roundedRect(12, yPos, 186, 20, 2, 2, 'S');
      
      doc.setFillColor(...emerald);
      doc.roundedRect(12, yPos, 186, 5, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTION OVERVIEW", 105, yPos + 3.5, { align: 'center' });
      
      doc.setTextColor(...slate);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Productions:", 16, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...deepBlue);
      doc.text(`${productions.length}`, 45, yPos + 10);
      
      doc.setTextColor(...slate);
      doc.setFont("helvetica", "bold");
      doc.text("Volume:", 16, yPos + 15);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...emerald);
      doc.setFontSize(8);
      doc.text(`${totalLitersProduced.toFixed(2)} L`, 35, yPos + 15);
      
      doc.setTextColor(...slate);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Servings:", 90, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...amber);
      doc.text(`${totalServesProduced}`, 112, yPos + 10);
      
      doc.setFont("helvetica", "bold");
      doc.text("Report:", 90, yPos + 15);
      doc.setFont("helvetica", "normal");
      doc.text(reportDate, 107, yPos + 15);
      
      yPos += 24;
      
      // Batch List with Ingredient Details
      doc.setFillColor(...deepBlue);
      doc.rect(12, yPos, 186, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("BATCH LIST WITH INGREDIENT CONSUMPTION", 15, yPos + 3.5);
      yPos += 7;
      
      doc.setTextColor(...slate);
      doc.setFontSize(6);
      
      // Pre-calculate ingredient data for each batch
      const batchIngredientsData = new Map();
      
      productions.forEach((prod: any) => {
        const batchIngredients = allIngredients?.filter((ing: any) => ing.production_id === prod.id) || [];
        const ingredientDetails: any[] = [];
        let batchTotalMl = 0;
        let batchTotalBottles = 0;
        let batchTotalLeftoverMl = 0;
        
        batchIngredients.forEach((ing: any) => {
          const scaledMl = parseFloat(ing.scaled_amount || 0);
          batchTotalMl += scaledMl;
          
          const matchingSpirit = spirits?.find(s => s.name === ing.ingredient_name);
          let bottles = 0;
          let leftoverMl = 0;
          
          if (matchingSpirit && matchingSpirit.bottle_size_ml) {
            bottles = Math.floor(scaledMl / matchingSpirit.bottle_size_ml);
            leftoverMl = scaledMl % matchingSpirit.bottle_size_ml;
            batchTotalBottles += bottles;
            batchTotalLeftoverMl += leftoverMl;
          }
          
          ingredientDetails.push({
            name: ing.ingredient_name,
            ml: scaledMl,
            bottles,
            leftoverMl
          });
        });
        
        batchIngredientsData.set(prod.id, {
          ingredients: ingredientDetails,
          totalMl: batchTotalMl,
          totalBottles: batchTotalBottles,
          totalLeftoverMl: batchTotalLeftoverMl
        });
      });
      
      // Display each batch with ingredient details
      productions.forEach((prod: any, index: number) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 15;
        }
        
        // Batch header card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(12, yPos, 186, 8, 2, 2, 'F');
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(12, yPos, 186, 8, 2, 2, 'S');
        
        doc.setTextColor(...deepBlue);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${prod.batch_name.substring(0, 40)}`, 15, yPos + 3);
        
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...slate);
        const batchDate = new Date(prod.production_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(`${batchDate} | ${prod.target_liters}L | ${prod.target_serves} srv | ${prod.produced_by_name || 'N/A'}`, 15, yPos + 6.5);
        
        yPos += 10;
        
        const batchData = batchIngredientsData.get(prod.id);
        
        if (batchData && batchData.ingredients.length > 0) {
          // Ingredients table header
          doc.setFont("helvetica", "bold");
          doc.setFillColor(226, 232, 240);
          doc.rect(14, yPos - 1, 182, 3.5, 'F');
          doc.setTextColor(...slate);
          doc.setFontSize(5.5);
          doc.text("Ingredient", 16, yPos + 1.5);
          doc.text("ML", 105, yPos + 1.5);
          doc.text("Bottles", 130, yPos + 1.5);
          doc.text("Extra ML", 160, yPos + 1.5);
          yPos += 4;
          
          doc.setFont("helvetica", "normal");
          
          batchData.ingredients.forEach((ing: any, ingIndex: number) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 15;
            }
            
            if (ingIndex % 2 === 0) {
              doc.setFillColor(250, 250, 250);
              doc.rect(14, yPos - 1, 182, 3, 'F');
            }
            
            doc.setTextColor(...slate);
            doc.setFontSize(5.5);
            const ingDisplayName = ing.name.length > 35 ? ing.name.substring(0, 35) + '...' : ing.name;
            doc.text(ingDisplayName, 16, yPos + 1.5);
            
            doc.setTextColor(...deepBlue);
            doc.text(`${ing.ml.toFixed(0)}`, 105, yPos + 1.5);
            
            doc.setTextColor(...emerald);
            doc.setFont("helvetica", "bold");
            doc.text(ing.bottles > 0 ? `${ing.bottles}` : '-', 130, yPos + 1.5);
            doc.setFont("helvetica", "normal");
            
            doc.setTextColor(...amber);
            doc.text(ing.leftoverMl > 0 ? `${ing.leftoverMl.toFixed(0)}` : '-', 160, yPos + 1.5);
            
            yPos += 3;
          });
          
          // Batch total row
          doc.setFillColor(...deepBlue);
          doc.rect(14, yPos, 182, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.text("BATCH TOTAL:", 16, yPos + 2.5);
          doc.text(`${batchData.totalMl.toFixed(0)} ml`, 105, yPos + 2.5);
          doc.text(`${batchData.totalBottles} btl`, 130, yPos + 2.5);
          doc.text(`${batchData.totalLeftoverMl.toFixed(0)} ml`, 160, yPos + 2.5);
          yPos += 6;
        }
        
        yPos += 3;
      });
      
      yPos += 5;
      
      // DETAILED BATCH BREAKDOWN - Per Batch Ingredients and Bottles
      if (yPos > 200) {
        doc.addPage();
        yPos = 15;
      }
      
      doc.setFillColor(148, 163, 184);
      doc.rect(12, yPos, 186, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED BATCH BREAKDOWN - INGREDIENTS & BOTTLES", 15, yPos + 3.5);
      yPos += 8;
      
      // Process each batch individually
      for (const prod of productions) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 15;
        }
        
        // Batch header card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(12, yPos, 186, 8, 2, 2, 'F');
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(12, yPos, 186, 8, 2, 2, 'S');
        
        doc.setTextColor(...deepBlue);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        const batchDisplayName = prod.batch_name.length > 45 ? prod.batch_name.substring(0, 45) + '...' : prod.batch_name;
        doc.text(batchDisplayName, 15, yPos + 3);
        
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...slate);
        const batchDate = new Date(prod.production_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(`${batchDate} | ${prod.target_liters}L | ${prod.target_serves} serves | ${prod.produced_by_name || 'N/A'}`, 15, yPos + 6.5);
        
        yPos += 10;
        
        // Get ingredients for this specific batch
        try {
          const batchIngredients = await getProductionIngredients(prod.id);
          
          if (batchIngredients && batchIngredients.length > 0) {
            // Calculate bottles and leftover for this batch
            const batchBottleData = new Map<string, { totalMl: number; bottleSize: number | null }>();
            
            batchIngredients.forEach((ing: any) => {
              const scaledMl = parseFloat(ing.scaled_amount || 0);
              const matchingSpirit = spirits?.find(s => s.name === ing.ingredient_name);
              
              const existing = batchBottleData.get(ing.ingredient_name);
              if (existing) {
                existing.totalMl += scaledMl;
              } else {
                batchBottleData.set(ing.ingredient_name, {
                  totalMl: scaledMl,
                  bottleSize: matchingSpirit?.bottle_size_ml || null
                });
              }
            });
            
            // Ingredients table header
            doc.setFont("helvetica", "bold");
            doc.setFillColor(226, 232, 240);
            doc.rect(14, yPos - 1, 182, 3.5, 'F');
            doc.setTextColor(...slate);
            doc.setFontSize(5.5);
            doc.text("Ingredient", 16, yPos + 1.5);
            doc.text("ML Used", 100, yPos + 1.5);
            doc.text("Bottles", 130, yPos + 1.5);
            doc.text("ML Leftover", 160, yPos + 1.5);
            yPos += 4;
            
            doc.setFont("helvetica", "normal");
            let ingredientIndex = 0;
            let batchTotalBottles = 0;
            let batchTotalMl = 0;
            
            batchBottleData.forEach(({ totalMl, bottleSize }, ingredientName) => {
              if (yPos > 280) {
                doc.addPage();
                yPos = 15;
              }
              
              if (ingredientIndex % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(14, yPos - 1, 182, 3, 'F');
              }
              
              const bottles = bottleSize ? Math.floor(totalMl / bottleSize) : 0;
              const leftoverMl = bottleSize ? totalMl % bottleSize : 0;
              
              batchTotalBottles += bottles;
              batchTotalMl += totalMl;
              
              doc.setTextColor(...slate);
              doc.setFontSize(5.5);
              const ingDisplayName = ingredientName.length > 35 ? ingredientName.substring(0, 35) + '...' : ingredientName;
              doc.text(ingDisplayName, 16, yPos + 1.5);
              
              doc.setTextColor(...deepBlue);
              doc.text(`${totalMl.toFixed(0)} ml`, 100, yPos + 1.5);
              
              doc.setTextColor(...emerald);
              doc.setFont("helvetica", "bold");
              doc.text(bottles > 0 ? `${bottles}` : '-', 130, yPos + 1.5);
              doc.setFont("helvetica", "normal");
              
              doc.setTextColor(...amber);
              doc.text(leftoverMl > 0 ? `${leftoverMl.toFixed(0)} ml` : '-', 160, yPos + 1.5);
              
              yPos += 3;
              ingredientIndex++;
            });
            
            // Batch total summary row
            doc.setFillColor(...deepBlue);
            doc.rect(14, yPos, 182, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.text("BATCH TOTAL:", 16, yPos + 2.5);
            doc.text(`${batchTotalMl.toFixed(0)} ml`, 100, yPos + 2.5);
            doc.text(`${batchTotalBottles} btl`, 130, yPos + 2.5);
            yPos += 6;
          }
        } catch (error) {
          console.error(`Error fetching ingredients for batch ${prod.id}:`, error);
        }
        
        yPos += 3;
      }
      
      yPos += 5;
      
      // TOTAL SUMMARY ACROSS ALL BATCHES
      if (yPos > 200) {
        doc.addPage();
        yPos = 15;
      }
      
      doc.setFillColor(...deepBlue);
      doc.rect(12, yPos, 186, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL INGREDIENTS SUMMARY - ALL BATCHES", 15, yPos + 3.5);
      yPos += 7;
      
      // Calculate total ingredients count
      const uniqueIngredients = new Set<string>();
      if (allIngredients) {
        allIngredients.forEach((ing: any) => {
          uniqueIngredients.add(ing.ingredient_name);
        });
      }
      
      // Calculate grand totals for bottles and ML
      let grandTotalBottles = 0;
      let grandTotalMl = 0;
      
      if (allIngredients && spirits) {
        allIngredients.forEach((ing: any) => {
          const scaledMl = parseFloat(ing.scaled_amount || 0);
          grandTotalMl += scaledMl;
          
          const matchingSpirit = spirits.find(s => s.name === ing.ingredient_name);
          if (matchingSpirit && matchingSpirit.bottle_size_ml) {
            const bottles = Math.floor(scaledMl / matchingSpirit.bottle_size_ml);
            grandTotalBottles += bottles;
          }
        });
      }
      
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...slate);
      doc.text(`Total Unique Ingredients Used: ${uniqueIngredients.size}`, 15, yPos + 2);
      doc.text(`Total Batches Produced: ${productions.length}`, 15, yPos + 6);
      doc.text(`Total Volume: ${totalLitersProduced.toFixed(2)} L`, 15, yPos + 10);
      doc.text(`Total Servings: ${totalServesProduced}`, 15, yPos + 14);
      
      doc.setTextColor(...emerald);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Bottles Consumed: ${grandTotalBottles} bottles`, 15, yPos + 18);
      doc.setTextColor(...deepBlue);
      doc.text(`Total ML Consumed: ${grandTotalMl.toFixed(0)} ml`, 15, yPos + 22);
      
      yPos += 26;
      
      // Detailed Ingredient Breakdown Table
      doc.setFillColor(226, 232, 240);
      doc.rect(12, yPos, 186, 5, 'F');
      doc.setTextColor(...deepBlue);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("INGREDIENT CONSUMPTION BREAKDOWN", 15, yPos + 3.5);
      yPos += 7;
      
      // Calculate detailed ingredient consumption
      const ingredientConsumption = new Map<string, { totalMl: number; bottleSize: number | null }>();
      
      if (allIngredients && spirits) {
        allIngredients.forEach((ing: any) => {
          const scaledMl = parseFloat(ing.scaled_amount || 0);
          const matchingSpirit = spirits.find(s => s.name === ing.ingredient_name);
          
          const existing = ingredientConsumption.get(ing.ingredient_name);
          if (existing) {
            existing.totalMl += scaledMl;
          } else {
            ingredientConsumption.set(ing.ingredient_name, {
              totalMl: scaledMl,
              bottleSize: matchingSpirit?.bottle_size_ml || null
            });
          }
        });
      }
      
      if (ingredientConsumption.size > 0) {
        // Table header
        doc.setFont("helvetica", "bold");
        doc.setFillColor(...deepBlue);
        doc.rect(12, yPos - 1.5, 186, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text("Ingredient", 14, yPos + 1.5);
        doc.text("Total ML", 110, yPos + 1.5);
        doc.text("Bottles", 140, yPos + 1.5);
        doc.text("Extra ML", 165, yPos + 1.5);
        yPos += 5;
        
        doc.setFont("helvetica", "normal");
        let ingredientIndex = 0;
        
        ingredientConsumption.forEach(({ totalMl, bottleSize }, ingredientName) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 15;
            
            // Repeat header
            doc.setFont("helvetica", "bold");
            doc.setFillColor(...deepBlue);
            doc.rect(12, yPos - 1.5, 186, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.text("Ingredient", 14, yPos + 1.5);
            doc.text("Total ML", 110, yPos + 1.5);
            doc.text("Bottles", 140, yPos + 1.5);
            doc.text("Extra ML", 165, yPos + 1.5);
            yPos += 5;
            doc.setFont("helvetica", "normal");
          }
          
          if (ingredientIndex % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(12, yPos - 1.5, 186, 3.5, 'F');
          }
          
          const bottles = bottleSize ? Math.floor(totalMl / bottleSize) : 0;
          const leftoverMl = bottleSize ? totalMl % bottleSize : 0;
          
          doc.setTextColor(...slate);
          doc.setFontSize(6);
          const displayName = ingredientName.length > 45 ? ingredientName.substring(0, 45) + '...' : ingredientName;
          doc.text(displayName, 14, yPos + 1.5);
          
          doc.setTextColor(...deepBlue);
          doc.setFont("helvetica", "bold");
          doc.text(`${totalMl.toFixed(0)} ml`, 110, yPos + 1.5);
          doc.setFont("helvetica", "normal");
          
          doc.setTextColor(...emerald);
          doc.setFont("helvetica", "bold");
          doc.text(bottles > 0 ? `${bottles}` : '-', 140, yPos + 1.5);
          doc.setFont("helvetica", "normal");
          
          doc.setTextColor(...amber);
          doc.text(leftoverMl > 0 ? `${leftoverMl.toFixed(0)} ml` : '-', 165, yPos + 1.5);
          
          yPos += 3.5;
          ingredientIndex++;
        });
        
        // Grand total row
        doc.setFillColor(...deepBlue);
        doc.rect(12, yPos, 186, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("GRAND TOTAL:", 14, yPos + 3.5);
        doc.text(`${grandTotalMl.toFixed(0)} ml`, 110, yPos + 3.5);
        doc.text(`${grandTotalBottles} btl`, 140, yPos + 3.5);
        yPos += 8;
      }
      
      yPos += 2;
      
      // Calculate bottle data for all ingredients
      const bottleData = new Map<string, { name: string; totalMl: number; bottleSize: number | null }>();
      
      if (allIngredients) {
        allIngredients.forEach((ing: any) => {
          const existing = bottleData.get(ing.ingredient_name);
          const scaledMl = parseFloat(ing.scaled_amount || 0);
          
          if (existing) {
            existing.totalMl += scaledMl;
          } else {
            // Try to find bottle size from master spirits
            const matchingSpirit = spirits?.find(s => s.name === ing.ingredient_name);
            bottleData.set(ing.ingredient_name, {
              name: ing.ingredient_name,
              totalMl: scaledMl,
              bottleSize: matchingSpirit?.bottle_size_ml || null
            });
          }
        });
      }
      
      // Separate into sharp bottles and leftover ML
      const sharpBottlesItems: { name: string; bottles: number }[] = [];
      const leftoverMlItems: { name: string; mlNeeded: number }[] = [];
      
      bottleData.forEach(({ name, totalMl, bottleSize }) => {
        if (bottleSize) {
          const wholeBottles = Math.floor(totalMl / bottleSize);
          const leftoverMl = totalMl % bottleSize;
          
          if (wholeBottles > 0) {
            sharpBottlesItems.push({ name, bottles: wholeBottles });
          }
          if (leftoverMl > 0) {
            leftoverMlItems.push({ name, mlNeeded: leftoverMl });
          }
        }
      });
      
      // Sharp Bottles Section
      if (sharpBottlesItems.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 15;
        }
        
        doc.setFillColor(...emerald);
        doc.rect(12, yPos, 186, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("SHARP BOTTLES CONSUMED", 15, yPos + 3.5);
        yPos += 7;
        
        doc.setTextColor(...slate);
        doc.setFontSize(6);
        
        doc.setFont("helvetica", "bold");
        doc.setFillColor(...emerald);
        doc.rect(12, yPos - 1.5, 186, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("#", 14, yPos + 1.5);
        doc.text("Ingredient", 22, yPos + 1.5);
        doc.text("Bottles", 160, yPos + 1.5);
        yPos += 5;
        
        doc.setFont("helvetica", "normal");
        sharpBottlesItems.forEach((item, index) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 15;
          }
          
          if (index % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(12, yPos - 1.5, 186, 3.5, 'F');
          }
          
          doc.setTextColor(...slate);
          doc.text(`${index + 1}`, 14, yPos + 1.5);
          const displayName = item.name.length > 60 ? item.name.substring(0, 60) + '...' : item.name;
          doc.text(displayName, 22, yPos + 1.5);
          doc.setTextColor(...emerald);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.bottles} btl`, 160, yPos + 1.5);
          doc.setFont("helvetica", "normal");
          yPos += 3.5;
        });
        
        yPos += 5;
      }
      
      // Leftover ML Section
      if (leftoverMlItems.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 15;
        }
        
        doc.setFillColor(...amber);
        doc.rect(12, yPos, 186, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("LEFTOVER ML REQUIRED", 15, yPos + 3.5);
        yPos += 7;
        
        doc.setTextColor(...slate);
        doc.setFontSize(6);
        
        doc.setFont("helvetica", "bold");
        doc.setFillColor(...amber);
        doc.rect(12, yPos - 1.5, 186, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("#", 14, yPos + 1.5);
        doc.text("Ingredient", 22, yPos + 1.5);
        doc.text("ML Needed", 160, yPos + 1.5);
        yPos += 5;
        
        doc.setFont("helvetica", "normal");
        leftoverMlItems.forEach((item, index) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 15;
          }
          
          if (index % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(12, yPos - 1.5, 186, 3.5, 'F');
          }
          
          doc.setTextColor(...slate);
          doc.text(`${index + 1}`, 14, yPos + 1.5);
          const displayName = item.name.length > 60 ? item.name.substring(0, 60) + '...' : item.name;
          doc.text(displayName, 22, yPos + 1.5);
          doc.setTextColor(...amber);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.mlNeeded.toFixed(0)} ml`, 160, yPos + 1.5);
          doc.setFont("helvetica", "normal");
          yPos += 3.5;
        });
        
        yPos += 5;
      }
      
      // Production Trends Visualization
      if (yPos > 140) {
        doc.addPage();
        yPos = 20;
      }
      
      // Enhanced section background with gradient effect
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(12, yPos, 186, 75, 3, 3, 'F');
      
      // Section header bar
      doc.setFillColor(...deepBlue);
      doc.roundedRect(12, yPos, 186, 9, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTION VOLUME BY RECIPE TYPE", 15, yPos + 6);
      
      // Top 8 recipes by volume
      const topRecipes = Object.entries(
        productions.reduce((acc, prod) => {
          const key = prod.batch_name;
          if (!acc[key]) acc[key] = { count: 0, liters: 0 };
          acc[key].count += 1;
          acc[key].liters += prod.target_liters;
          return acc;
        }, {} as Record<string, { count: number; liters: number }>)
      )
      .sort(([, a], [, b]) => b.liters - a.liters)
      .slice(0, 8);
      
      if (topRecipes.length > 0) {
        const chartY = yPos + 15;
        const chartHeight = 48;
        const chartX = 15;
        const chartWidth = 180;
        const barWidth = Math.min(20, chartWidth / topRecipes.length - 2);
        const maxLiters = Math.max(...topRecipes.map(([, d]) => d.liters));
        
        topRecipes.forEach(([name, data], index) => {
          const barHeight = (data.liters / maxLiters) * chartHeight;
          const barX = chartX + (index * (barWidth + 2));
          const barY = chartY + chartHeight - barHeight;
          
          // Draw bar
          doc.setFillColor(...emerald);
          doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
          
          // Value on top
          doc.setTextColor(...emerald);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text(data.liters.toFixed(1) + "L", barX + barWidth/2, barY - 2, { align: 'center' });
          
          // Recipe name below (rotated for space)
          doc.setTextColor(...slate);
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "normal");
          const displayName = name.length > 12 ? name.substring(0, 12) + '...' : name;
          doc.text(displayName, barX + barWidth/2, chartY + chartHeight + 4, { align: 'center' });
        });
      }
      
      yPos += 82;
      
      // Forecast Analytics Section - Suggested Par Levels with Graphics
      if (yPos > 140) {
        doc.addPage();
        yPos = 20;
      }
      
      // Section Header with Professional Design
      doc.setFillColor(...deepBlue);
      doc.roundedRect(12, yPos, 186, 11, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("FORECAST ANALYTICS - SUGGESTED PAR LEVELS", 15, yPos + 7);
      yPos += 16;
      
      // Calculate forecast data by batch type
      const forecastData = Object.entries(
        productions.reduce((acc, prod) => {
          const key = prod.batch_name;
          const prodDate = new Date(prod.production_date);
          
          if (!acc[key]) {
            acc[key] = { 
              batches: [],
              firstDate: prodDate,
              lastDate: prodDate
            };
          }
          acc[key].batches.push({ liters: prod.target_liters, date: prodDate });
          if (prodDate < acc[key].firstDate) acc[key].firstDate = prodDate;
          if (prodDate > acc[key].lastDate) acc[key].lastDate = prodDate;
          return acc;
        }, {} as Record<string, { batches: { liters: number; date: Date }[]; firstDate: Date; lastDate: Date }>)
      )
      .sort(([, a], [, b]) => {
        const aTotal = a.batches.reduce((sum, b) => sum + b.liters, 0);
        const bTotal = b.batches.reduce((sum, b) => sum + b.liters, 0);
        return bTotal - aTotal;
      });
      
      forecastData.forEach(([name, data], index) => {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        // Sort batches by date
        const sortedBatches = [...data.batches].sort((a, b) => a.date.getTime() - b.date.getTime());
        const totalLiters = sortedBatches.reduce((sum, b) => sum + b.liters, 0);
        const daysDiff = Math.max(1, Math.ceil((data.lastDate.getTime() - data.firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        
        // Submission frequency metrics
        const totalSubmissions = sortedBatches.length;
        const submissionsPerDay = totalSubmissions / daysDiff;
        const submissionsPerWeek = submissionsPerDay * 7;
        const submissionsPerBiWeek = submissionsPerDay * 14;
        const submissionsPerMonth = submissionsPerDay * 30;
        const submissionsPerQuarter = submissionsPerDay * 90;
        
        // Calculate daily averages for different time windows
        const now = new Date();
        const buffer = 1.2;
        
        const calculateDailyAvgForWindow = (days: number) => {
          const cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          const batchesInWindow = sortedBatches.filter(b => b.date >= cutoffDate);
          if (batchesInWindow.length === 0) {
            return totalLiters / daysDiff;
          }
          
          const totalInWindow = batchesInWindow.reduce((sum, b) => sum + b.liters, 0);
          return totalInWindow / days;
        };
        
        const dailyAvg7Days = calculateDailyAvgForWindow(7);
        
        const dailyAvg30Days = calculateDailyAvgForWindow(30);
        const trendFactor = dailyAvg30Days > 0 ? dailyAvg7Days / dailyAvg30Days : 1;
        const trendPercent = ((trendFactor - 1) * 100).toFixed(1);
        
        const baseDailyAvg = totalLiters / daysDiff;
        
        const suggestedDaily = dailyAvg7Days * buffer;
        const suggestedWeekly = dailyAvg7Days * buffer * 7;
        const suggestedBiWeekly = dailyAvg7Days * buffer * 14;
        const suggestedMonthly = dailyAvg7Days * buffer * 30;
        const suggestedQuarterly = dailyAvg7Days * buffer * 90;
        
        // Enhanced card design with shadow effect
        const bgColor = index % 2 === 0 ? [248, 250, 252] as [number, number, number] : [255, 255, 255] as [number, number, number];
        doc.setFillColor(...bgColor);
        doc.roundedRect(12, yPos, 186, 55, 3, 3, 'F');
        doc.setDrawColor(...skyBlue);
        doc.setLineWidth(0.5);
        doc.roundedRect(12, yPos, 186, 55, 3, 3, 'S');
        
        // Recipe name header with background
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, yPos + 2, 182, 8, 2, 2, 'F');
        doc.setTextColor(...deepBlue);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        const displayName = name.length > 50 ? name.substring(0, 50) + '...' : name;
        doc.text(displayName, 17, yPos + 7);
        
        // Metadata line with icons
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...slate);
        doc.text(`Batches: ${data.batches.length}`, 17, yPos + 13);
        doc.text(`|`, 45, yPos + 13);
        doc.text(`Days: ${daysDiff}`, 50, yPos + 13);
        doc.text(`|`, 73, yPos + 13);
        doc.text(`Submissions: ${totalSubmissions}`, 78, yPos + 13);
        
        // Trend and daily average section with divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(15, yPos + 16, 195, yPos + 16);
        
        const trendColor: [number, number, number] = trendFactor > 1.05 ? emerald : trendFactor < 0.95 ? [249, 115, 22] : slate;
        const trendText = trendFactor > 1.05 ? 'RISING' : trendFactor < 0.95 ? 'FALLING' : 'STABLE';
        const trendSymbol = trendFactor > 1.05 ? '^' : trendFactor < 0.95 ? 'v' : '-';
        doc.setTextColor(...trendColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(`[${trendSymbol}] Trend: ${trendText} ${parseFloat(trendPercent) > 0 ? '+' : ''}${trendPercent}%`, 17, yPos + 21);
        
        doc.setTextColor(...slate);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text(`Daily Avg: ${baseDailyAvg.toFixed(2)} L`, 100, yPos + 21);
        
        // Par levels data section with enhanced layout
        const dataStartY = yPos + 27;
        const dataSpacing = 5.5;
        const labels = ['Daily', 'Weekly', '2-Week', 'Monthly', 'Quarterly'];
        const values = [suggestedDaily, suggestedWeekly, suggestedBiWeekly, suggestedMonthly, suggestedQuarterly];
        const submissions = [submissionsPerDay, submissionsPerWeek, submissionsPerBiWeek, submissionsPerMonth, submissionsPerQuarter];
        
        // Par levels header
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, dataStartY - 1, 182, 5, 1, 1, 'F');
        doc.setTextColor(...deepBlue);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("PAR LEVELS & FORECASTS:", 17, dataStartY + 2.5);
        
        labels.forEach((label, i) => {
          const currentY = dataStartY + 6 + (i * dataSpacing);
          
          // Label with bullet point
          doc.setTextColor(...slate);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text(`• ${label}:`, 17, currentY);
          
          // Value
          doc.setTextColor(...deepBlue);
          doc.setFont("helvetica", "bold");
          doc.text(`${values[i].toFixed(1)} L`, 50, currentY);
          
          // Submission count
          doc.setTextColor(...emerald);
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.text(`(${submissions[i].toFixed(2)} batches)`, 77, currentY);
        });
        
        yPos += 60;
      });
      
      // Add note about par levels
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }
      
      // Info box with enhanced styling
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(12, yPos, 186, 18, 2, 2, 'F');
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(0.4);
      doc.roundedRect(12, yPos, 186, 18, 2, 2, 'S');
      
      // Info icon using simple shape
      doc.setFillColor(...skyBlue);
      doc.circle(17, yPos + 9, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("i", 17, yPos + 10.5, { align: 'center' });
      
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...slate);
      doc.text("Par levels include 20% safety buffer and are dynamically adjusted based on production trends.", 22, yPos + 5);
      doc.text("Growing trends increase par recommendations; declining trends reduce them for optimal inventory.", 22, yPos + 9);
      doc.text("Submission frequency shows average batch production count per period to inform production planning.", 22, yPos + 13);
      doc.text("All forecasts are based on last 7 days daily average multiplied by period length.", 22, yPos + 17);
      
      yPos += 21;
      
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerY = 287;
        doc.setDrawColor(...skyBlue);
        doc.setLineWidth(0.4);
        doc.line(12, footerY, 198, footerY);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                         ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Generated: ${timestamp}`, 15, footerY + 5);
        doc.setFont("helvetica", "bold");
        doc.text(`Page ${i} of ${pageCount}`, 195, footerY + 5, { align: 'right' });
      }
      
      const fileName = "All_Batches_Report.pdf";
      doc.save(fileName);
      toast.success("All batches report download started!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate comprehensive report");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName) {
      toast.error("Please enter a group name");
      return;
    }
    createGroup({ name: newGroupName, description: newGroupDesc });
    setNewGroupName("");
    setNewGroupDesc("");
  };

  const handleGenerateQR = async () => {
    if (!selectedRecipeId || selectedRecipeId === "all") {
      toast.error("Please select a recipe");
      return;
    }

    try {
      const recipe = recipes?.find(r => r.id === selectedRecipeId);
      if (!recipe) {
        toast.error("Recipe not found");
        return;
      }

      const { data, error } = await supabase
        .from("batch_qr_codes")
        .insert({
          user_id: user?.id,
          recipe_id: selectedRecipeId,
          recipe_data: {
            recipe_name: recipe.recipe_name,
            description: recipe.description,
            current_serves: recipe.current_serves,
            ingredients: recipe.ingredients,
          },
          group_id: selectedGroupId,
          is_active: true,
        } as any)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No QR code created");

      const qrUrl = `${window.location.origin}/batch-qr/${data.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 512,
        margin: 2,
      });

      setQrCodeUrl(qrDataUrl);
      setShowQRCode(true);
      toast.success("QR code generated! Share it with your team.");
    } catch (error) {
      console.error("Error generating QR:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const generateGroupQRCode = async (group: any) => {
    const qrData = JSON.stringify({
      groupId: group.id,
      groupName: group.name,
      action: 'submit_batch'
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    // Download QR code
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `${group.name}-submission-qr.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  const batchResults = calculateBatch();
  const totalLiters = batchResults
    ? batchResults.scaledIngredients.reduce((sum, ing) => sum + parseFloat(ing.scaledAmount), 0) / 1000
    : 0;

  return (
    <div className="min-h-screen bg-background pb-32 sm:pb-24 pt-16">
      <TopNav />

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto mb-8 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
            className="glass-hover shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Batch Calculator Pro</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">AI-powered batch management & forecasting</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-0">
            <TabsTrigger value="calculator" className="text-xs sm:text-sm">Calculator</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs sm:text-sm">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-4 sm:space-y-6 pb-4">
            <Card className="glass p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-base sm:text-lg font-semibold">Quick Production</h3>
                <Button
                  variant="outline"
                  onClick={() => navigate("/batch-recipes")}
                  className="glass-hover w-full py-6"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Recipe
                </Button>
              </div>

                <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Saved Recipe *</Label>
                  <Select 
                    value={selectedRecipeId || ""} 
                    onValueChange={(value) => {
                      setSelectedRecipeId(value);
                      if (value === "all") {
                        // Clear form fields for "All" option
                        setRecipeName("");
                        setBatchDescription("");
                        setCurrentServes("");
                        setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
                        setTargetLiters("");
                      } else {
                        const recipe = recipes?.find(r => r.id === value);
                        if (recipe) {
                          setRecipeName(recipe.recipe_name);
                          setBatchDescription(recipe.description || "");
                          setCurrentServes(String(recipe.current_serves));
                          const loadedIngredients = Array.isArray(recipe.ingredients) 
                            ? recipe.ingredients.map((ing: any) => {
                                const ingredient: Ingredient = {
                                  id: ing.id || `${Date.now()}-${Math.random()}`,
                                  name: ing.name || "",
                                  amount: String(ing.amount || ""),
                                  unit: ing.unit || "ml"
                                };
                                
                                // Match with master spirits to get bottle size
                                if (spirits) {
                                  const matchedSpirit = spirits.find(s => s.name === ingredient.name);
                                  if (matchedSpirit) {
                                    ingredient.bottle_size_ml = matchedSpirit.bottle_size_ml;
                                    if (ingredient.amount) {
                                      const liters = parseFloat(ingredient.amount) / 1000;
                                      ingredient.bottles_needed = calculateBottles(liters, matchedSpirit.bottle_size_ml);
                                    }
                                  }
                                }
                                
                                return ingredient;
                              })
                            : [{ id: "1", name: "", amount: "", unit: "ml" }];
                          setIngredients(loadedIngredients);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="glass bg-background/80 backdrop-blur-sm h-12">
                      <SelectValue placeholder="Choose a saved recipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
                      <SelectItem value="all">All Batches</SelectItem>
                      {recipes && recipes.length > 0 ? (
                        recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.recipe_name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          No recipes yet. Create one first!
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowMasterList(!showMasterList)}
                      className="glass-hover"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Paste List
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/master-spirits")}
                      className="glass-hover"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Manage Spirits
                    </Button>
                  </div>
                  
                  {showMasterList && (
                    <Card className="glass p-4 space-y-3">
                      <Label>Paste 3-Column Table Data</Label>
                      <p className="text-xs text-muted-foreground">
                        Copy-paste from spreadsheet with: Item Name | Category | Package
                      </p>
                      <Textarea
                        value={masterList}
                        onChange={(e) => setMasterList(e.target.value)}
                        placeholder="Vodka		Premium		750ml&#10;Gin		London Dry		1L&#10;Rum		Dark		700ml&#10;Tequila		Blanco		750ml"
                        className="glass min-h-[120px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleParseMasterList}
                          className="flex-1"
                        >
                          Parse & Add
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowMasterList(false);
                            setMasterList("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

                {selectedRecipeId && selectedRecipeId !== "all" && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateQR}
                    className="w-full py-6"
                    size="lg"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate QR for Batch Submission
                  </Button>
                )}

                {selectedRecipeId === "all" && (
                  <Button 
                    onClick={downloadAllBatchesReport} 
                    className="w-full py-6"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download All Batches Report
                  </Button>
                )}

                {selectedRecipeId && selectedRecipeId !== "all" && (
                  <>
                    <div className="space-y-2">
                      <Label>Target Liters *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={targetLiters}
                        onChange={(e) => {
                          setTargetLiters(e.target.value);
                          setTargetBatchSize("");
                        }}
                        placeholder="e.g., 1.5"
                        className="glass"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter desired liters to produce
                      </p>
                    </div>

                    {batchResults && targetLiters && (
                      <div className="glass p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Multiplied Ingredients</h4>
                          <span className="text-sm text-primary font-bold">
                            {totalLiters.toFixed(2)} L total
                          </span>
                        </div>
                        <div className="space-y-2">
                          {batchResults.scaledIngredients.map((ing) => {
                            const scaledLiters = parseFloat(ing.scaledAmount) / 1000;
                            const bottlesNeeded = ing.bottle_size_ml 
                              ? calculateBottles(scaledLiters, ing.bottle_size_ml)
                              : null;
                            
                            return (
                              <div key={ing.id} className="flex justify-between items-center py-2 border-b border-border/50">
                                <div className="flex-1">
                                  <span className="font-medium">{ing.name}</span>
                                  {ing.bottle_size_ml && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({ing.bottle_size_ml}ml btl)
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-primary font-bold">
                                    {ing.scaledAmount} {ing.unit}
                                  </div>
                                  {bottlesNeeded !== null && (
                                    <div className="text-xs text-muted-foreground">
                                      ≈ {bottlesNeeded} bottles
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="pt-2 border-t border-border space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total Sharp Bottles:</span>
                            <span className="text-lg text-primary font-bold">
                              {batchResults.scaledIngredients
                                .filter(ing => ing.bottle_size_ml)
                                .reduce((sum, ing) => {
                                  const scaledMl = parseFloat(ing.scaledAmount);
                                  const wholeBottles = Math.floor(scaledMl / ing.bottle_size_ml!);
                                  return sum + wholeBottles;
                                }, 0)} btl
                            </span>
                          </div>
                          {batchResults.scaledIngredients.some(ing => {
                            if (!ing.bottle_size_ml) return false;
                            const scaledMl = parseFloat(ing.scaledAmount);
                            return scaledMl % ing.bottle_size_ml !== 0;
                          }) && (
                            <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded">
                              <div className="font-semibold mb-1">Leftover ML needed:</div>
                              {batchResults.scaledIngredients
                                .filter(ing => ing.bottle_size_ml && parseFloat(ing.scaledAmount) % ing.bottle_size_ml !== 0)
                                .map(ing => {
                                  const scaledMl = parseFloat(ing.scaledAmount);
                                  return (
                                    <div key={ing.id} className="flex justify-between">
                                      <span>{ing.name}:</span>
                                      <span className="text-amber-600 font-medium">{scaledMl.toFixed(0)} ml</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add production notes..."
                         className="glass"
                      />
                    </div>

                    <Button 
                      onClick={handleSubmitBatch} 
                      className="w-full py-6"
                      size="lg"
                      disabled={!targetLiters}
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      {editingProductionId ? "Update Production" : "Submit & Generate QR Code"}
                    </Button>
                    {editingProductionId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProductionId(null);
                          setRecipeName("");
                          setBatchDescription("");
                          setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
                          setTargetLiters("");
                          setNotes("");
                          toast.info("Edit cancelled");
                        }}
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Edit
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 pb-4">
            {selectedGroupId && (
              <Card className="glass p-4 border-primary/50 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="text-sm">
                    Viewing group data: <span className="font-semibold">{groups?.find(g => g.id === selectedGroupId)?.name}</span>
                  </p>
                </div>
              </Card>
            )}
            <Card className="glass p-4 sm:p-6">
              <div className="flex flex-col gap-4 mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Production History
                </h3>
                {productions && productions.length > 0 && (
                  <Button
                    variant="default"
                    onClick={downloadAllBatchesReport}
                    className="w-full py-6"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download All Batches Report
                  </Button>
                )}
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No batch productions recorded yet. Start batching!
                </p>
              ) : (
                 <div className="space-y-4">
                  {productions.map((production) => {
                    // Component for each production with ingredient data
                    const ProductionCard = () => {
                      const [ingredientsData, setIngredientsData] = useState<{
                        ingredients: Array<{ name: string; ml: number; bottles: number; leftoverMl: number }>;
                        totalMl: number;
                        totalBottles: number;
                        totalLeftoverMl: number;
                      } | null>(null);
                      
                      useEffect(() => {
                        const loadIngredients = async () => {
                          try {
                            const ingredients = await getProductionIngredients(production.id);
                            if (!ingredients || ingredients.length === 0) {
                              setIngredientsData(null);
                              return;
                            }
                            
                            let totalMl = 0;
                            let totalBottles = 0;
                            let totalLeftoverMl = 0;
                            const ingredientDetails: any[] = [];
                            
                            ingredients.forEach((ing: any) => {
                              const scaledMl = parseFloat(ing.scaled_amount || 0);
                              totalMl += scaledMl;
                              
                              const matchingSpirit = spirits?.find(s => s.name === ing.ingredient_name);
                              let bottles = 0;
                              let leftoverMl = 0;
                              
                              if (matchingSpirit && matchingSpirit.bottle_size_ml) {
                                bottles = Math.floor(scaledMl / matchingSpirit.bottle_size_ml);
                                leftoverMl = scaledMl % matchingSpirit.bottle_size_ml;
                                totalBottles += bottles;
                                totalLeftoverMl += leftoverMl;
                              }
                              
                              ingredientDetails.push({
                                name: ing.ingredient_name,
                                ml: scaledMl,
                                bottles,
                                leftoverMl
                              });
                            });
                            
                            setIngredientsData({
                              ingredients: ingredientDetails,
                              totalMl,
                              totalBottles,
                              totalLeftoverMl
                            });
                          } catch (error) {
                            console.error('Error loading ingredients:', error);
                            setIngredientsData(null);
                          }
                        };
                        
                        loadIngredients();
                      }, [production.id]);
                      
                      return (
                        <Card className="p-3 sm:p-4 glass hover:bg-accent/10 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-base sm:text-lg">{production.batch_name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(production.production_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadBatchPDF(production)}
                                className="flex-1 sm:flex-none"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditProduction(production)}
                                className="glass-hover"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteProduction(production.id)}
                                className="glass-hover text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm mb-3">
                            <div>
                              <p className="text-muted-foreground">Liters</p>
                              <p className="font-semibold">{production.target_liters} L</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Serves</p>
                              <p className="font-semibold">{production.target_serves}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Produced By</p>
                              {production.produced_by_user_id && producerProfiles.has(production.produced_by_user_id) ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={producerProfiles.get(production.produced_by_user_id).avatar_url || ''} />
                                    <AvatarFallback>
                                      {(producerProfiles.get(production.produced_by_user_id).full_name || 
                                        producerProfiles.get(production.produced_by_user_id).username || '?')[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold">
                                    {producerProfiles.get(production.produced_by_user_id).full_name || 
                                     producerProfiles.get(production.produced_by_user_id).username}
                                  </span>
                                </div>
                              ) : (
                                <p className="font-semibold">{production.produced_by_name || 'Unknown'}</p>
                              )}
                            </div>
                          </div>
                          
                          {ingredientsData && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <h5 className="text-xs font-semibold text-muted-foreground mb-2">Ingredient Consumption</h5>
                              <div className="space-y-2 mb-3">
                                {ingredientsData.ingredients.map((ing, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded">
                                    <span className="font-medium truncate flex-1">{ing.name}</span>
                                    <div className="flex gap-3 text-right">
                                      <span className="text-primary font-bold">{ing.ml.toFixed(0)} ml</span>
                                      {ing.bottles > 0 && (
                                        <span className="text-emerald-600 font-bold">{ing.bottles} btl</span>
                                      )}
                                      {ing.leftoverMl > 0 && (
                                        <span className="text-amber-600">+{ing.leftoverMl.toFixed(0)} ml</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs bg-primary/10 p-2 rounded">
                                <div className="text-center">
                                  <p className="text-muted-foreground mb-1">Total ML</p>
                                  <p className="font-bold text-primary">{ingredientsData.totalMl.toFixed(0)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-muted-foreground mb-1">Bottles</p>
                                  <p className="font-bold text-emerald-600">{ingredientsData.totalBottles}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-muted-foreground mb-1">Extra ML</p>
                                  <p className="font-bold text-amber-600">{ingredientsData.totalLeftoverMl.toFixed(0)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {production.notes && (
                            <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/20 rounded">
                              {production.notes}
                            </p>
                          )}
                        </Card>
                      );
                    };
                    
                    return <ProductionCard key={production.id} />;
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 pb-4">
            {selectedGroupId && (
              <Card className="glass p-4 border-primary/50 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="text-sm">
                    Viewing group data: <span className="font-semibold">{groups?.find(g => g.id === selectedGroupId)?.name}</span>
                  </p>
                </div>
              </Card>
            )}
            <Card className="glass p-4 sm:p-6">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  <h3 className="text-base sm:text-lg font-semibold">Production Analytics</h3>
                </div>
                
                {productions && productions.length > 0 && (
                  <Button
                    variant="default"
                    onClick={downloadAllBatchesReport}
                    className="w-full py-6"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Report
                  </Button>
                )}
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
                  Record some batch productions to see analytics!
                </p>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Batches</p>
                      <p className="text-3xl font-bold text-primary">{productions.length}</p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Liters</p>
                      <p className="text-3xl font-bold text-primary">
                        {productions.reduce((sum, p) => sum + p.target_liters, 0).toFixed(1)} L
                      </p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Servings</p>
                      <p className="text-3xl font-bold text-primary">
                        {productions.reduce((sum, p) => sum + (p.target_serves || 0), 0)}
                      </p>
                    </div>
                  </div>

                  {/* Average & Forecast Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Batch Size</p>
                      <p className="text-2xl font-bold text-primary">
                        {(productions.reduce((sum, p) => sum + p.target_liters, 0) / productions.length).toFixed(2)} L
                      </p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Servings</p>
                      <p className="text-2xl font-bold text-primary">
                        {Math.round(productions.reduce((sum, p) => sum + (p.target_serves || 0), 0) / productions.length)}
                      </p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Daily Average</p>
                      <p className="text-2xl font-bold text-primary">
                        {(productions.reduce((sum, p) => sum + p.target_liters, 0) / 7).toFixed(2)} L
                      </p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Forecast Par</p>
                      <p className="text-2xl font-bold text-primary">
                        {Math.round(productions.reduce((sum, p) => sum + p.target_liters, 0) / 7)} L
                      </p>
                    </div>
                  </div>

                  {/* Production Breakdown */}
                  <div className="glass p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Production by Recipe</h4>
                    <div className="space-y-3">
                      {Object.entries(
                        productions.reduce((acc, prod) => {
                          const key = prod.batch_name;
                          if (!acc[key]) {
                            acc[key] = { count: 0, liters: 0, serves: 0 };
                          }
                          acc[key].count += 1;
                          acc[key].liters += prod.target_liters;
                          acc[key].serves += prod.target_serves || 0;
                          return acc;
                        }, {} as Record<string, { count: number; liters: number; serves: number }>)
                      )
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([name, data]) => (
                        <div key={name} className="p-3 bg-muted/20 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{name}</span>
                            <span className="text-primary font-bold">{data.count}×</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>Total: {data.liters.toFixed(1)} L</div>
                            <div>Servings: {data.serves}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forecast Analytics by Batch Type */}
                  <div className="glass p-4 rounded-lg">
                    <h4 className="font-semibold mb-4">Forecast Analytics - Suggested Par Levels</h4>
                    <div className="space-y-4">
                      {Object.entries(
                        productions.reduce((acc, prod) => {
                          const key = prod.batch_name;
                          const prodDate = new Date(prod.production_date);
                          
                          if (!acc[key]) {
                            acc[key] = { 
                              batches: [],
                              firstDate: prodDate,
                              lastDate: prodDate
                            };
                          }
                          acc[key].batches.push({ liters: prod.target_liters, date: prodDate });
                          if (prodDate < acc[key].firstDate) acc[key].firstDate = prodDate;
                          if (prodDate > acc[key].lastDate) acc[key].lastDate = prodDate;
                          return acc;
                        }, {} as Record<string, { batches: { liters: number; date: Date }[]; firstDate: Date; lastDate: Date }>)
                      )
                      .sort(([, a], [, b]) => {
                        const aTotal = a.batches.reduce((sum, b) => sum + b.liters, 0);
                        const bTotal = b.batches.reduce((sum, b) => sum + b.liters, 0);
                        return bTotal - aTotal;
                      })
                      .map(([name, data]) => {
                        // Sort batches by date
                        const sortedBatches = [...data.batches].sort((a, b) => a.date.getTime() - b.date.getTime());
                        const totalLiters = sortedBatches.reduce((sum, b) => sum + b.liters, 0);
                        const daysDiff = Math.max(1, Math.ceil((data.lastDate.getTime() - data.firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        
                        // Submission frequency metrics
                        const totalSubmissions = sortedBatches.length;
                        const submissionsPerDay = totalSubmissions / daysDiff;
                        const submissionsPerWeek = submissionsPerDay * 7;
                        const submissionsPerBiWeek = submissionsPerDay * 14;
                        const submissionsPerMonth = submissionsPerDay * 30;
                        const submissionsPerQuarter = submissionsPerDay * 90;
                        
                        // Calculate daily averages for different time windows
                        const now = new Date();
                        const buffer = 1.2; // 20% safety buffer
                        
                        // Helper to calculate daily avg for a specific window
                        const calculateDailyAvgForWindow = (days: number) => {
                          const cutoffDate = new Date(now);
                          cutoffDate.setDate(cutoffDate.getDate() - days);
                          
                          const batchesInWindow = sortedBatches.filter(b => b.date >= cutoffDate);
                          if (batchesInWindow.length === 0) {
                            // Fallback to overall average if no data in window
                            return totalLiters / daysDiff;
                          }
                          
                          const totalInWindow = batchesInWindow.reduce((sum, b) => sum + b.liters, 0);
                          return totalInWindow / days;
                        };
                        
                        // Calculate daily average from last 7 days
                        const dailyAvg7Days = calculateDailyAvgForWindow(7);
                        
                        // Calculate trend based on 7-day vs 30-day comparison
                        const dailyAvg30Days = calculateDailyAvgForWindow(30);
                        const trendFactor = dailyAvg30Days > 0 ? dailyAvg7Days / dailyAvg30Days : 1;
                        const trendPercent = ((trendFactor - 1) * 100).toFixed(1);
                        
                        // Overall base daily average
                        const baseDailyAvg = totalLiters / daysDiff;
                        
                        // All par levels based on 7-day daily average × period length × buffer
                        const suggestedDaily = dailyAvg7Days * buffer;
                        const suggestedWeekly = dailyAvg7Days * buffer * 7;
                        const suggestedBiWeekly = dailyAvg7Days * buffer * 14;
                        const suggestedMonthly = dailyAvg7Days * buffer * 30;
                        const suggestedQuarterly = dailyAvg7Days * buffer * 90;

                        return (
                          <div key={name} className="p-4 bg-muted/20 rounded-lg border border-border/50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <span className="font-bold text-base block">{name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {data.batches.length} batch{data.batches.length > 1 ? 'es' : ''} over {daysDiff} day{daysDiff > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className={`text-xs font-semibold ${trendFactor > 1.05 ? 'text-green-500' : trendFactor < 0.95 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                  {trendFactor > 1.05 ? '↗' : trendFactor < 0.95 ? '↘' : '→'} Trend: {parseFloat(trendPercent) > 0 ? '+' : ''}{trendPercent}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Base: {baseDailyAvg.toFixed(2)} Lt/day
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Submissions: {totalSubmissions}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="glass p-3 rounded-lg text-center border-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">Daily Par</p>
                                <p className="text-lg font-bold text-primary">
                                  {suggestedDaily.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Lt</p>
                                <p className="text-xs text-emerald-600 mt-1">{submissionsPerDay.toFixed(2)} batches</p>
                              </div>
                              
                              <div className="glass p-3 rounded-lg text-center border-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">Weekly Par</p>
                                <p className="text-lg font-bold text-primary">
                                  {suggestedWeekly.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Lt</p>
                                <p className="text-xs text-emerald-600 mt-1">{submissionsPerWeek.toFixed(2)} batches</p>
                              </div>
                              
                              <div className="glass p-3 rounded-lg text-center border-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">2-Week Par</p>
                                <p className="text-lg font-bold text-primary">
                                  {suggestedBiWeekly.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Lt</p>
                                <p className="text-xs text-emerald-600 mt-1">{submissionsPerBiWeek.toFixed(2)} batches</p>
                              </div>
                              
                              <div className="glass p-3 rounded-lg text-center border-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">Monthly Par</p>
                                <p className="text-lg font-bold text-primary">
                                  {suggestedMonthly.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Lt</p>
                                <p className="text-xs text-emerald-600 mt-1">{submissionsPerMonth.toFixed(2)} batches</p>
                              </div>
                              
                              <div className="glass p-3 rounded-lg text-center border-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">Quarterly Par</p>
                                <p className="text-lg font-bold text-primary">
                                  {suggestedQuarterly.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Lt</p>
                                <p className="text-xs text-emerald-600 mt-1">{submissionsPerQuarter.toFixed(2)} batches</p>
                              </div>
                            </div>
                            
                            <div className="mt-3 p-2 bg-primary/5 rounded text-xs text-muted-foreground">
                              💡 Par levels include 20% buffer and are adjusted based on {trendFactor > 1.05 ? 'increasing' : trendFactor < 0.95 ? 'decreasing' : 'stable'} production trend
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="glass p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Production Period</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">First Batch</p>
                        <p className="font-medium">
                          {new Date(Math.min(...productions.map(p => new Date(p.production_date).getTime()))).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Latest Batch</p>
                        <p className="font-medium">
                          {new Date(Math.max(...productions.map(p => new Date(p.production_date).getTime()))).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4 pb-4">
            {selectedGroupId && (
              <Card className="glass p-4 sm:p-6 border-primary/50">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-base sm:text-lg font-semibold">Active Group Collaborators</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Currently viewing data for: <span className="font-semibold text-foreground">{groups?.find(g => g.id === selectedGroupId)?.name}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    const group = groups?.find(g => g.id === selectedGroupId);
                    if (group) {
                      setManagingGroup(group);
                      setShowMembersDialog(true);
                    }
                  }}
                  className="glass-hover"
                >
                  <Users className="w-4 h-4 mr-2" />
                  View All Members
                </Button>
              </Card>
            )}
            
            <Card className="glass p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-semibold">Mixologist Groups</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Main Bar Team"
                    className="glass h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Optional group description..."
                    className="glass min-h-[80px]"
                  />
                </div>

                <Button onClick={handleCreateGroup} className="w-full py-6" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Group
                </Button>
              </div>

              {(!groups || groups.length === 0) ? (
                <p className="text-muted-foreground text-center py-4">
                  No groups yet. Create one to collaborate with your team!
                </p>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold">Your Groups</h4>
                  {groups.map((group) => (
                   <Card key={group.id} className="p-4 glass">
                      <div className="space-y-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold truncate">{group.name}</h5>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="lg" 
                            variant="outline"
                            onClick={() => {
                              setManagingGroup(group);
                              setShowMembersDialog(true);
                            }}
                            className="glass-hover flex-1 py-6"
                          >
                            <Users className="w-5 h-5 mr-2" />
                            Members
                          </Button>
                          <Button 
                            size="lg" 
                            onClick={() => setSelectedGroupId(group.id)}
                            className={`flex-1 py-6 ${selectedGroupId === group.id ? "bg-primary text-primary-foreground" : "glass-hover"}`}
                          >
                            {selectedGroupId === group.id ? "✓ Selected" : "Select"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {managingGroup && (
        <MixologistGroupMembersDialog
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
          groupId={managingGroup.id}
          groupName={managingGroup.name}
        />
      )}

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Submission QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code with your team to submit batch productions
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            )}
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = qrCodeUrl;
                link.download = `batch-qr-${selectedRecipeId}.png`;
                link.click();
                toast.success("QR code downloaded!");
              }}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default BatchCalculator;