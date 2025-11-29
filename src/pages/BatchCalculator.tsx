import { useState, useEffect } from "react";
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

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes();
  const { productions, createProduction } = useBatchProductions(
    selectedRecipeId && selectedRecipeId !== "all" ? selectedRecipeId : undefined
  );
  const { groups, createGroup } = useMixologistGroups();

  // Set default producer to current user
  useEffect(() => {
    if (user?.id && !producedByUserId) {
      setProducedByUserId(user.id);
    }
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

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
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

    const recipeId = selectedRecipeId || `temp-${Date.now()}`;

    const selectedUser = registeredUsers.find(u => u.id === producedByUserId);

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

    // Reset form after submission
    setProducedByName("");
    setProducedByUserId("");
    setNotes("");
    setTargetBatchSize("");
    setTargetLiters("");
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

      // Fetch ALL productions to calculate overall totals
      const { data: allProductions, error: allError } = await supabase
        .from('batch_productions')
        .select('*, batch_production_ingredients(*)')
        .eq('user_id', user?.id);
      
      if (allError) console.error("Error fetching all productions:", allError);

      const doc = new jsPDF();
      
      // Calculate overall production totals
      let totalBatchesProduced = allProductions?.length || 0;
      let totalLitersProduced = 0;
      let overallIngredientsMap = new Map<string, { amount: number; unit: string }>();
      
      if (allProductions) {
        allProductions.forEach((prod: any) => {
          totalLitersProduced += prod.target_liters || 0;
          
          if (prod.batch_production_ingredients) {
            prod.batch_production_ingredients.forEach((ing: any) => {
              const key = `${ing.ingredient_name}`;
              const existing = overallIngredientsMap.get(key);
              if (existing) {
                existing.amount += parseFloat(ing.scaled_amount || 0);
              } else {
                overallIngredientsMap.set(key, {
                  amount: parseFloat(ing.scaled_amount || 0),
                  unit: ing.unit
                });
              }
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
      }
      
      doc.setTextColor(...slate);
      
      // Overall Production Summary - Eye-catching design
      doc.setFillColor(...emerald);
      doc.rect(12, yPos, 186, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("OVERALL PRODUCTION SUMMARY", 15, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(...slate);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(12, yPos, 186, 24, 3, 3, 'F');
      doc.setDrawColor(...emerald);
      doc.setLineWidth(0.4);
      doc.roundedRect(12, yPos, 186, 24, 3, 3, 'S');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Total Batches:", 16, yPos + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...deepBlue);
      doc.text(`${totalBatchesProduced} Batches`, 52, yPos + 7);
      
      doc.setTextColor(...slate);
      doc.setFont("helvetica", "bold");
      doc.text("Total Volume:", 16, yPos + 13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...emerald);
      doc.setFontSize(10);
      doc.text(`${totalLitersProduced.toFixed(2)} L`, 52, yPos + 13);
      
      doc.setTextColor(...slate);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Unique Ingredients:", 16, yPos + 19);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...amber);
      doc.text(`${overallIngredientsMap.size} Types`, 56, yPos + 19);
      yPos += 28;
      
      // Ingredients consumed breakdown - expanded multi-column
      if (overallIngredientsMap.size > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...slate);
        doc.text("Total Ingredients Consumed:", 16, yPos);
        yPos += 6;
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        
        let col = 0;
        let rowY = yPos;
        Array.from(overallIngredientsMap.entries()).forEach(([name, data]) => {
          const xPos = 16 + (col * 62);
          const displayName = name.length > 18 ? name.substring(0, 18) + '...' : name;
          doc.setTextColor(...slate);
          doc.text(`• ${displayName}:`, xPos, rowY);
          doc.setTextColor(...emerald);
          doc.setFont("helvetica", "bold");
          doc.text(`${data.amount.toFixed(1)} ${data.unit}`, xPos + 30, rowY);
          doc.setFont("helvetica", "normal");
          
          col++;
          if (col >= 3) {
            col = 0;
            rowY += 5;
          }
        });
        
        if (col > 0) rowY += 5;
        yPos = rowY + 6;
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
      
      doc.save(`Batch_${production.batch_name.replace(/[^a-z0-9]/gi, '_')}_${new Date(production.production_date).toISOString().split('T')[0]}.pdf`);
      toast.success("Modern batch report downloaded!");
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
      
      // Header
      doc.setFillColor(...deepBlue);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setFillColor(...skyBlue);
      doc.rect(0, 28, 210, 2.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("ALL BATCHES PRODUCTION REPORT", 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Complete Production Summary & Spirits Consumption", 105, 23, { align: 'center' });
      
      let yPos = 38;
      
      // Overall Summary Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, yPos, 186, 32, 3, 3, 'F');
      doc.setDrawColor(...emerald);
      doc.setLineWidth(0.5);
      doc.roundedRect(12, yPos, 186, 32, 3, 3, 'S');
      
      doc.setFillColor(...emerald);
      doc.roundedRect(12, yPos, 186, 8, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTION OVERVIEW", 105, yPos + 5.5, { align: 'center' });
      
      doc.setTextColor(...slate);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Total Productions:", 18, yPos + 15);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...deepBlue);
      doc.text(`${productions.length}`, 60, yPos + 15);
      
      doc.setTextColor(...slate);
      doc.setFont("helvetica", "bold");
      doc.text("Total Volume:", 18, yPos + 21);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...emerald);
      doc.setFontSize(11);
      doc.text(`${totalLitersProduced.toFixed(2)} L`, 60, yPos + 21);
      
      doc.setTextColor(...slate);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Total Servings:", 120, yPos + 15);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...amber);
      doc.text(`${totalServesProduced}`, 165, yPos + 15);
      
      doc.setFont("helvetica", "bold");
      doc.text("Report Date:", 120, yPos + 21);
      doc.setFont("helvetica", "normal");
      const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(reportDate, 165, yPos + 21);
      
      yPos += 38;
      
      // AI Par Level Suggestions Section
      if (aiSuggestions) {
        doc.setFillColor(...deepBlue);
        doc.rect(12, yPos, 186, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("AI-POWERED PAR LEVEL SUGGESTIONS", 15, yPos + 5.5);
        yPos += 12;
        
        doc.setFontSize(8);
        doc.setTextColor(...slate);
        doc.setFont("helvetica", "normal");
        
        const suggestionLines = doc.splitTextToSize(aiSuggestions, 180);
        suggestionLines.forEach((line: string) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 15, yPos);
          yPos += 4;
        });
        
        yPos += 10;
      }
      
      // Master List - All Individual Batches
      doc.setFillColor(...deepBlue);
      doc.rect(12, yPos, 186, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("MASTER BATCH LIST - ALL PRODUCTIONS", 15, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(...slate);
      doc.setFontSize(7);
      
      // Master list table header
      doc.setFont("helvetica", "bold");
      doc.setFillColor(...deepBlue);
      doc.rect(12, yPos - 2, 186, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("#", 15, yPos + 2);
      doc.text("Batch Name", 25, yPos + 2);
      doc.text("Date", 90, yPos + 2);
      doc.text("Volume (L)", 125, yPos + 2);
      doc.text("Serves", 155, yPos + 2);
      doc.text("Producer", 175, yPos + 2);
      yPos += 7;
      
      // Master list table rows - EVERY batch
      doc.setFont("helvetica", "normal");
      productions.forEach((prod: any, index: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          
          // Repeat header on new page
          doc.setFont("helvetica", "bold");
          doc.setFillColor(...deepBlue);
          doc.rect(12, yPos - 2, 186, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text("#", 15, yPos + 2);
          doc.text("Batch Name", 25, yPos + 2);
          doc.text("Date", 90, yPos + 2);
          doc.text("Volume (L)", 125, yPos + 2);
          doc.text("Serves", 155, yPos + 2);
          doc.text("Producer", 175, yPos + 2);
          yPos += 7;
          doc.setFont("helvetica", "normal");
        }
        
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(12, yPos - 2, 186, 5, 'F');
        }
        
        doc.setTextColor(...slate);
        doc.text(`${index + 1}`, 15, yPos + 2);
        const displayName = prod.batch_name.length > 30 ? prod.batch_name.substring(0, 30) + '...' : prod.batch_name;
        doc.text(displayName, 25, yPos + 2);
        
        const prodDate = new Date(prod.production_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        doc.text(prodDate, 90, yPos + 2);
        
        doc.setTextColor(...emerald);
        doc.setFont("helvetica", "bold");
        doc.text(`${prod.target_liters.toFixed(1)}`, 125, yPos + 2);
        doc.setFont("helvetica", "normal");
        
        doc.setTextColor(...amber);
        doc.text(`${prod.target_serves}`, 155, yPos + 2);
        
        doc.setTextColor(...slate);
        const producerName = prod.produced_by_name || 'N/A';
        const displayProducer = producerName.length > 15 ? producerName.substring(0, 15) + '...' : producerName;
        doc.text(displayProducer, 175, yPos + 2);
        
        yPos += 5;
      });
      
      yPos += 5;
      
      // Total Spirits Consumed Section
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(...emerald);
      doc.rect(12, yPos, 186, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL SPIRITS & INGREDIENTS CONSUMED", 15, yPos + 5.5);
      yPos += 12;
      
      doc.setTextColor(...slate);
      doc.setFontSize(8);
      
      // Spirits table header
      doc.setFont("helvetica", "bold");
      doc.setFillColor(...emerald);
      doc.rect(12, yPos - 2, 186, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("#", 15, yPos + 2);
      doc.text("Spirit / Ingredient Name", 25, yPos + 2);
      doc.text("Total Quantity", 140, yPos + 2);
      doc.text("Unit", 175, yPos + 2);
      yPos += 7;
      
      // Spirits table rows
      doc.setFont("helvetica", "normal");
      let spiritIndex = 0;
      Array.from(ingredientsMap.entries()).forEach(([name, data]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        if (spiritIndex % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(12, yPos - 2, 186, 5.5, 'F');
        }
        
        doc.setTextColor(...slate);
        doc.text(`${spiritIndex + 1}`, 15, yPos + 2);
        const spiritName = name.length > 50 ? name.substring(0, 50) + '...' : name;
        doc.text(spiritName, 25, yPos + 2);
        doc.setTextColor(...emerald);
        doc.setFont("helvetica", "bold");
        doc.text(`${data.amount.toFixed(1)}`, 140, yPos + 2);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...slate);
        doc.text(data.unit, 175, yPos + 2);
        yPos += 5.5;
        spiritIndex++;
      });
      
      // Footer
      const footerY = 287;
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(0.4);
      doc.line(12, footerY, 198, footerY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                       ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Generated: ${timestamp} | Professional Batch Tracking System`, 105, footerY + 5, { align: 'center' });
      
      doc.save(`All_Batches_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Complete batches report downloaded!");
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
                          setIngredients(Array.isArray(recipe.ingredients) 
                            ? recipe.ingredients.map((ing: any) => ({
                                id: ing.id || `${Date.now()}-${Math.random()}`,
                                name: ing.name || "",
                                amount: String(ing.amount || ""),
                                unit: ing.unit || "ml"
                              }))
                            : [{ id: "1", name: "", amount: "", unit: "ml" }]
                          );
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
                          {batchResults.scaledIngredients.map((ing) => (
                            <div key={ing.id} className="flex justify-between items-center py-2 border-b border-border/50">
                              <span className="font-medium">{ing.name}</span>
                              <span className="text-primary font-bold">
                                {ing.scaledAmount} {ing.unit}
                              </span>
                            </div>
                          ))}
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
                      Submit & Generate QR Code
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 pb-4">
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
                  {productions.map((production) => (
                    <Card key={production.id} className="p-3 sm:p-4 glass hover:bg-accent/10 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-base sm:text-lg">{production.batch_name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(production.production_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBatchPDF(production)}
                          className="w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
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

                      {production.notes && (
                        <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/20 rounded">
                          {production.notes}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 pb-4">
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