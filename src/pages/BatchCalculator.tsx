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
import { ArrowLeft, Plus, Trash2, Sparkles, Save, History, Users, QrCode, BarChart3, Download, Loader2, Edit2, X } from "lucide-react";
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

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes();
  const { productions, createProduction } = useBatchProductions(selectedRecipeId || undefined);
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

    // Generate QR code data
    const qrData = JSON.stringify({
      batchName: recipeName,
      date: new Date().toISOString(),
      liters: totalLiters.toFixed(2),
      producedBy: producedByName,
      ingredients: calculation.scaledIngredients
    });

    const recipeId = selectedRecipeId || `temp-${Date.now()}`;

    const selectedUser = registeredUsers.find(u => u.id === producedByUserId);

    createProduction({
      production: {
        recipe_id: recipeId,
        batch_name: recipeName,
        target_serves: parseFloat(targetBatchSize || "0"),
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
      
      // Colors
      const primaryColor: [number, number, number] = [41, 128, 185];
      const accentColor: [number, number, number] = [52, 152, 219];
      const successColor: [number, number, number] = [46, 204, 113];
      const textDark: [number, number, number] = [44, 62, 80];
      
      // Header with colored background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("BATCH PRODUCTION REPORT", 105, 15, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Professional Batch Tracking & Quality Assurance", 105, 25, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(...textDark);
      
      // Production Date - BOLD and prominent
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const productionDate = new Date(production.production_date).toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`PRODUCTION DATE: ${productionDate}`, 105, 48, { align: 'center' });
      
      // Batch Summary Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, 55, 180, 42, 3, 3, 'F');
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, 55, 180, 42, 3, 3, 'S');
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("BATCH SUMMARY", 105, 63, { align: 'center' });
      
      doc.setTextColor(...textDark);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Batch Name:", 20, 72);
      doc.setFont("helvetica", "normal");
      doc.text(production.batch_name, 55, 72);
      
      doc.setFont("helvetica", "bold");
      doc.text("Batch Quantity:", 20, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`${production.target_liters.toFixed(2)} Liters`, 55, 80);
      
      doc.setFont("helvetica", "bold");
      doc.text("Servings Produced:", 20, 88);
      doc.setFont("helvetica", "normal");
      doc.text(`${production.target_serves || 0} Serves`, 55, 88);
      
      doc.setFont("helvetica", "bold");
      doc.text("Made By:", 120, 72);
      doc.setFont("helvetica", "normal");
      doc.text(production.produced_by_name || 'N/A', 145, 72);
      
      // Ingredients Section
      doc.setFillColor(...accentColor);
      doc.rect(15, 102, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("INGREDIENTS USED PER BATCH", 20, 108);
      
      // Ingredients table
      let yPos = 117;
      doc.setTextColor(...textDark);
      doc.setFontSize(10);
      
      // Table header
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(15, yPos - 5, 180, 8, 'F');
      doc.text("No.", 20, yPos);
      doc.text("Ingredient Name", 35, yPos);
      doc.text("Quantity", 130, yPos);
      doc.text("Unit", 165, yPos);
      yPos += 10;
      
      // Table rows
      doc.setFont("helvetica", "normal");
      let totalIngredientsQty = 0;
      
      if (ingredients && ingredients.length > 0) {
        ingredients.forEach((ing: any, index: number) => {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          
          // Alternating row colors
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, yPos - 5, 180, 7, 'F');
          }
          
          doc.text(`${index + 1}`, 20, yPos);
          doc.text(ing.ingredient_name, 35, yPos);
          doc.text(ing.scaled_amount.toString(), 130, yPos);
          doc.text(ing.unit, 165, yPos);
          totalIngredientsQty += parseFloat(ing.scaled_amount);
          yPos += 7;
        });
        
        // Total row
        yPos += 3;
        doc.setFillColor(...primaryColor);
        doc.rect(15, yPos - 5, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL INGREDIENTS:", 35, yPos);
        doc.text(`${ingredients.length} items`, 130, yPos);
        doc.text(`${totalIngredientsQty.toFixed(2)} total`, 165, yPos);
        yPos += 15;
      } else {
        doc.text("No ingredient details available", 35, yPos);
        yPos += 15;
      }
      
      // OVERALL PRODUCTION SUMMARY Section
      doc.setFillColor(...successColor);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("OVERALL PRODUCTION SUMMARY", 20, yPos + 6);
      yPos += 15;
      
      doc.setTextColor(...textDark);
      doc.setFillColor(240, 255, 245);
      doc.roundedRect(15, yPos, 180, 35, 3, 3, 'F');
      doc.setDrawColor(...successColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, yPos, 180, 35, 3, 3, 'S');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Total Batches Produced:", 20, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`${totalBatchesProduced} Batches`, 75, yPos + 10);
      
      doc.setFont("helvetica", "bold");
      doc.text("Total Liters Produced:", 20, yPos + 18);
      doc.setFont("helvetica", "normal");
      doc.text(`${totalLitersProduced.toFixed(2)} Liters`, 75, yPos + 18);
      
      doc.setFont("helvetica", "bold");
      doc.text("Total Ingredients Used:", 20, yPos + 26);
      doc.setFont("helvetica", "normal");
      doc.text(`${overallIngredientsMap.size} Unique Ingredients`, 75, yPos + 26);
      yPos += 42;
      
      // Overall Ingredients Breakdown
      if (overallIngredientsMap.size > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textDark);
        doc.text("Total Ingredients Consumed Across All Batches:", 20, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        let col = 0;
        let rowY = yPos;
        Array.from(overallIngredientsMap.entries()).forEach(([name, data], index) => {
          if (rowY > 240) {
            doc.addPage();
            rowY = 20;
            col = 0;
          }
          
          const xPos = 20 + (col * 90);
          doc.text(`• ${name}: ${data.amount.toFixed(2)} ${data.unit}`, xPos, rowY);
          
          col++;
          if (col >= 2) {
            col = 0;
            rowY += 6;
          }
        });
        
        if (col > 0) rowY += 6;
        yPos = rowY + 8;
      }
      
      
      // QR Code Section with box
      doc.setTextColor(...textDark);
      if (production.qr_code_data) {
        // Check if we need a new page for QR code section
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(245, 250, 255);
        doc.roundedRect(15, yPos, 180, 80, 3, 3, 'F');
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, yPos, 180, 80, 3, 3, 'S');
        
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("UNIQUE BATCH QR CODE", 105, yPos + 8, { align: 'center' });
        
        // QR code data content
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textDark);
        doc.text("QR CODE CONTAINS:", 25, yPos + 18);
        doc.setFont("helvetica", "normal");
        doc.text(`• Batch: ${production.batch_name}`, 25, yPos + 24);
        doc.text(`• Date: ${productionDate}`, 25, yPos + 30);
        doc.text(`• Volume: ${production.target_liters.toFixed(2)}L`, 25, yPos + 36);
        doc.text(`• Producer: ${production.produced_by_name || 'N/A'}`, 25, yPos + 42);
        doc.text(`• All Ingredients & Quantities`, 25, yPos + 48);
        
        const qrCodeDataUrl = await QRCode.toDataURL(production.qr_code_data, {
          width: 500,
          margin: 2,
          color: {
            dark: '#2980b9',
            light: '#ffffff'
          }
        });
        doc.addImage(qrCodeDataUrl, 'PNG', 135, yPos + 12, 55, 55);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Scan to access complete batch details and traceability", 105, yPos + 73, { align: 'center' });
        yPos += 85;
      }

      // Notes Section
      if (production.notes && yPos < 250) {
        doc.setFillColor(255, 250, 240);
        doc.roundedRect(15, yPos, 180, 25, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textDark);
        doc.text("Production Notes:", 20, yPos + 7);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(production.notes, 170);
        doc.text(splitNotes, 20, yPos + 14);
      }
      
      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 280, 195, 280);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 105, 287, { align: 'center' });
      
      doc.save(`Batch_Report_${production.batch_name}_${new Date(production.production_date).toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`);
      toast.success("Professional batch report downloaded!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName) {
      toast.error("Please enter a group name");
      return;
    }

    // Generate QR code for batch submissions
    const groupData = {
      name: newGroupName,
      description: newGroupDesc,
      action: 'submit_batch'
    };
    const submissionQRCode = await QRCode.toDataURL(JSON.stringify(groupData));

    createGroup({
      name: newGroupName,
      description: newGroupDesc
    });

    setNewGroupName("");
    setNewGroupDesc("");
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
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Calculator Pro</h1>
            <p className="text-sm text-muted-foreground">AI-powered batch management & forecasting</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <Card className="glass p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quick Production</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/batch-recipes")}
                  className="glass-hover"
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
                    }}
                  >
                    <SelectTrigger className="glass bg-background/80 backdrop-blur-sm">
                      <SelectValue placeholder="Choose a saved recipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
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

                {selectedRecipeId && (
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
                      className="w-full"
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

          <TabsContent value="history" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Production History
                </h3>
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No batch productions recorded yet. Start batching!
                </p>
              ) : (
                <div className="space-y-4">
                  {productions.map((production) => (
                    <Card key={production.id} className="p-4 glass hover:bg-accent/10 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg">{production.batch_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(production.production_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBatchPDF(production)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
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

          <TabsContent value="analytics" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Production Analytics & Forecasting</h3>
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Record some batch productions to see analytics and forecasts!
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Popular Recipes</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        productions.reduce((acc, prod) => {
                          acc[prod.batch_name] = (acc[prod.batch_name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center">
                          <span className="font-medium">{name}</span>
                          <span className="text-primary">{count} batches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Mixologist Groups</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Main Bar Team"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Optional group description..."
                    className="glass"
                  />
                </div>

                <Button onClick={handleCreateGroup} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-bold">{group.name}</h5>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setManagingGroup(group);
                              setShowMembersDialog(true);
                            }}
                            className="glass-hover"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                          onClick={() => setSelectedGroupId(group.id)}
                            className={selectedGroupId === group.id ? "bg-primary text-primary-foreground" : "glass-hover"}
                          >
                            {selectedGroupId === group.id ? "Selected" : "Select"}
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

      <BottomNav />
    </div>
  );
};

export default BatchCalculator;