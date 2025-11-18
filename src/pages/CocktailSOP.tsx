import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Download, FileText, Eye } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Ingredient {
  id: string;
  ingredient: string;
  amount: number;
  unit: string;
  type: string;
  abv: number;
  notes: string;
}

interface CocktailSOP {
  id: string;
  drink_name: string;
  technique: string;
  glass: string;
  ice: string;
  garnish: string;
  main_image: string;
  total_ml: number;
  abv_percentage: number;
  ratio: string;
  ph: number;
  brix: number;
  kcal: number;
  method_sop: string;
  service_notes: string;
  taste_sweet: number;
  taste_sour: number;
  taste_salty: number;
  taste_umami: number;
  taste_bitter: number;
  recipe: Ingredient[];
  created_at: string;
}

const TECHNIQUES = ['STIR', 'SHAKE', 'BUILD', 'BLEND', 'THROW', 'SWIZZLE', 'MUDDLE'];
const GLASS_TYPES = ['ROCKS GLASS', 'COUPE', 'HIGHBALL', 'COLLINS', 'MARTINI', 'SINGLE MALT ROCK GLASS', 'NICK & NORA'];
const ICE_TYPES = ['CUBED ICE', 'BLOCK ICE', 'CRUSHED ICE', 'NO ICE', 'PEBBLE ICE'];

const SPIRIT_DATABASE: Record<string, { type: string; abv: number; unit: string }> = {
  'vodka': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'gin': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'rum': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'whiskey': { type: 'WHISKEY', abv: 40, unit: 'ml' },
  'bourbon': { type: 'WHISKEY', abv: 43, unit: 'ml' },
  'woodford': { type: 'WHISKEY', abv: 35, unit: 'ml' },
  'tequila': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'mezcal': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'cognac': { type: 'SPIRIT', abv: 40, unit: 'ml' },
  'campari': { type: 'BITTER', abv: 25, unit: 'ml' },
  'vermouth': { type: 'WINE', abv: 18, unit: 'ml' },
  'lime juice': { type: 'JUICE', abv: 0, unit: 'ml' },
  'lemon juice': { type: 'JUICE', abv: 0, unit: 'ml' },
  'simple syrup': { type: 'SYRUP', abv: 0, unit: 'ml' },
  'syrup': { type: 'SYRUP', abv: 0, unit: 'ml' },
  'angostura': { type: 'BITTER', abv: 44.7, unit: 'drops' },
  'bitter': { type: 'BITTER', abv: 0.1, unit: 'drops' },
  'saline': { type: 'SOLUTION', abv: 0, unit: 'drops' },
};

export default function CocktailSOP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sops, setSops] = useState<CocktailSOP[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<CocktailSOP | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [drinkName, setDrinkName] = useState('');
  const [technique, setTechnique] = useState('');
  const [glass, setGlass] = useState('');
  const [ice, setIce] = useState('');
  const [garnish, setGarnish] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [totalMl, setTotalMl] = useState(0);
  const [abvPercentage, setAbvPercentage] = useState(0);
  const [ratio, setRatio] = useState('');
  const [ph, setPh] = useState(0);
  const [brix, setBrix] = useState(0);
  const [kcal, setKcal] = useState(0);
  const [methodSOP, setMethodSOP] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [tasteSweet, setTasteSweet] = useState(0);
  const [tasteSour, setTasteSour] = useState(0);
  const [tasteSalty, setTasteSalty] = useState(0);
  const [tasteUmami, setTasteUmami] = useState(0);
  const [tasteBitter, setTasteBitter] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSOPs();
  }, [user, navigate]);

  useEffect(() => {
    let totalVolume = 0;
    let totalAlcohol = 0;
    let totalCalories = 0;
    let totalSugar = 0;
    let acidVolume = 0;

    ingredients.forEach(ing => {
      if (ing.amount > 0) {
        // Convert to ml if needed (drops to ml approximation)
        const volumeInMl = ing.unit === 'ml' ? ing.amount : ing.amount * 0.05;
        
        if (ing.unit === 'ml') {
          totalVolume += ing.amount;
        }
        
        // Calculate alcohol content
        if (ing.abv > 0) {
          totalAlcohol += (volumeInMl * ing.abv) / 100;
        }
        
        // Calculate calories based on ingredient type
        const ingType = ing.type.toUpperCase();
        const ingName = ing.ingredient.toLowerCase();
        
        if (ingType === 'SPIRIT' || ingType === 'WHISKEY') {
          totalCalories += volumeInMl * 7 * (ing.abv / 100); // 7 cal per ml of pure alcohol
        } else if (ingType === 'SYRUP' || ingType === 'LIQUEUR') {
          totalCalories += volumeInMl * 3; // ~3 cal per ml for sugar
          totalSugar += volumeInMl * 0.5; // ~50% sugar content
        } else if (ingType === 'JUICE') {
          totalCalories += volumeInMl * 0.4; // ~0.4 cal per ml for juice
          totalSugar += volumeInMl * 0.1; // ~10% sugar in citrus juice
          
          if (ingName.includes('lime') || ingName.includes('lemon') || ingName.includes('citrus')) {
            acidVolume += volumeInMl;
          }
        } else if (ingType === 'WINE' || ingType === 'VERMOUTH') {
          totalCalories += volumeInMl * 0.8; // ~0.8 cal per ml
          totalSugar += volumeInMl * 0.15; // ~15% sugar
        }
      }
    });

    // Set total ml
    setTotalMl(Math.round(totalVolume));
    
    // Set ABV percentage
    setAbvPercentage(totalVolume > 0 ? Number(((totalAlcohol / totalVolume) * 100).toFixed(1)) : 0);
    
    // Set calories
    setKcal(Math.round(totalCalories));
    
    // Set Brix (sugar content percentage) - rough approximation
    const brixValue = totalVolume > 0 ? (totalSugar / totalVolume) * 100 : 0;
    setBrix(Number(brixValue.toFixed(1)));
    
    // Set pH (acidity) - rough approximation
    if (acidVolume > 0 && totalVolume > 0) {
      const acidRatio = acidVolume / totalVolume;
      const phValue = Math.max(2.5, 7 - (acidRatio * 4.5)); // More acid = lower pH
      setPh(Number(phValue.toFixed(1)));
    } else {
      setPh(7);
    }
  }, [ingredients]);

  const fetchSOPs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cocktail_sops')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch SOPs', variant: 'destructive' });
      return;
    }
    setSops((data || []).map(sop => ({ 
      ...sop, 
      recipe: (Array.isArray(sop.recipe) ? sop.recipe : []) as unknown as Ingredient[]
    })) as CocktailSOP[]);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { 
      id: crypto.randomUUID(), 
      ingredient: '', 
      amount: 0, 
      unit: 'ml', 
      type: '', 
      abv: 0, 
      notes: '' 
    }]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(ingredients.map(ing => {
      if (ing.id === id) {
        const updated = { ...ing, [field]: value };
        
        if (field === 'ingredient') {
          const searchKey = value.toLowerCase();
          const match = Object.keys(SPIRIT_DATABASE).find(key => searchKey.includes(key));
          if (match) {
            const data = SPIRIT_DATABASE[match];
            updated.type = data.type;
            updated.abv = data.abv;
            updated.unit = data.unit;
          }
        }
        
        return updated;
      }
      return ing;
    }));
  };

  const resetForm = () => {
    setDrinkName('');
    setTechnique('');
    setGlass('');
    setIce('');
    setGarnish('');
    setMainImage('');
    setTotalMl(0);
    setAbvPercentage(0);
    setRatio('');
    setPh(0);
    setBrix(0);
    setKcal(0);
    setMethodSOP('');
    setServiceNotes('');
    setTasteSweet(0);
    setTasteSour(0);
    setTasteSalty(0);
    setTasteUmami(0);
    setTasteBitter(0);
    setIngredients([]);
  };

  const handleSave = async () => {
    if (!user || !drinkName || !technique) {
      toast({ title: 'Error', description: 'Please fill in drink name and technique', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('cocktail_sops').insert([{
      user_id: user.id,
      drink_name: drinkName,
      technique,
      glass,
      ice,
      garnish,
      main_image: mainImage,
      total_ml: totalMl,
      abv_percentage: abvPercentage,
      ratio,
      ph,
      brix,
      kcal,
      method_sop: methodSOP,
      service_notes: serviceNotes,
      taste_sweet: tasteSweet,
      taste_sour: tasteSour,
      taste_salty: tasteSalty,
      taste_umami: tasteUmami,
      taste_bitter: tasteBitter,
      recipe: ingredients as unknown as any
    }]);

    if (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Failed to save SOP', variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: 'Cocktail SOP saved successfully' });
    setIsModalOpen(false);
    resetForm();
    fetchSOPs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SOP?')) return;
    const { error } = await supabase.from('cocktail_sops').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: 'SOP deleted' });
    fetchSOPs();
  };

  const exportToPDF = (sop: CocktailSOP) => {
    const doc = new jsPDF();
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text('ATTIKO — COCKTAIL SOP', 14, 15);

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(sop.drink_name.toUpperCase(), 14, 30);

    doc.setFontSize(12);
    doc.text('Identity', 14, 45);
    doc.text('Metrics', 110, 45);

    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    const y = 53, lh = 7;
    doc.text(`Drink Name: ${sop.drink_name}`, 14, y);
    doc.text(`Technique: ${sop.technique}`, 14, y + lh);
    doc.text(`Glass: ${sop.glass}`, 14, y + lh * 2);
    doc.text(`Ice: ${sop.ice}`, 14, y + lh * 3);
    doc.text(`Garnish: ${sop.garnish}`, 14, y + lh * 4);
    
    doc.text(`Total (ml): ${sop.total_ml}`, 110, y);
    doc.text(`ABV (%): ${sop.abv_percentage?.toFixed(1)}`, 110, y + lh);
    doc.text(`Ratio: ${sop.ratio || '—'}`, 110, y + lh * 2);
    doc.text(`pH: ${sop.ph || 0}`, 110, y + lh * 3);
    doc.text(`Brix: ${sop.brix || 0}`, 110, y + lh * 4);
    doc.text(`Kcal: ${sop.kcal || 0}`, 110, y + lh * 5);

    let currentY = 110;
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Method (SOP)', 14, currentY);
    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    const methodLines = doc.splitTextToSize(sop.method_sop, 180);
    doc.text(methodLines, 14, currentY + 7);
    currentY += 7 + (methodLines.length * 5);

    if (sop.service_notes) {
      currentY += 10;
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('Service Notes', 14, currentY);
      doc.setFontSize(10);
      doc.setTextColor(209, 213, 219);
      const notesLines = doc.splitTextToSize(sop.service_notes, 180);
      doc.text(notesLines, 14, currentY + 7);
      currentY += 7 + (notesLines.length * 5);
    }

    currentY += 10;
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Taste Profile', 14, currentY);
    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    currentY += 7;
    doc.text(`Sweet: ${sop.taste_sweet} | Sour: ${sop.taste_sour} | Salty: ${sop.taste_salty}`, 14, currentY);
    currentY += 5;
    doc.text(`Umami: ${sop.taste_umami} | Bitter: ${sop.taste_bitter}`, 14, currentY);

    doc.addPage();
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Recipe', 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['INGREDIENT', 'AMOUNT', 'UNIT', 'TYPE', '%ABV', 'NOTES']],
      body: sop.recipe.map(ing => [
        ing.ingredient,
        ing.amount?.toString() || '',
        ing.unit,
        ing.type,
        ing.abv?.toString() || '',
        ing.notes || '',
      ]),
      theme: 'plain',
      styles: { fillColor: [17, 24, 39], textColor: [209, 213, 219], fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 285);

    doc.save(`${sop.drink_name.replace(/\s+/g, '_')}_SOP.pdf`);
  };

  const getRadarData = (sop: CocktailSOP) => [
    { taste: 'Sweet', value: sop.taste_sweet || 0 },
    { taste: 'Sour', value: sop.taste_sour || 0 },
    { taste: 'Salty', value: sop.taste_salty || 0 },
    { taste: 'Umami', value: sop.taste_umami || 0 },
    { taste: 'Bitter', value: sop.taste_bitter || 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">COCKTAIL SOP</h1>
            <p className="text-muted-foreground">Professional Standard Operating Procedures</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />Create SOP
          </Button>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Cocktail SOP</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-4">Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Drink Name *</Label>
                      <Input value={drinkName} onChange={(e) => setDrinkName(e.target.value)} placeholder="THE ATATAKAI" />
                    </div>
                    <div>
                      <Label>Technique *</Label>
                      <Select value={technique} onValueChange={setTechnique}>
                        <SelectTrigger><SelectValue placeholder="Select technique" /></SelectTrigger>
                        <SelectContent>
                          {TECHNIQUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass</Label>
                      <Select value={glass} onValueChange={setGlass}>
                        <SelectTrigger><SelectValue placeholder="Select glass" /></SelectTrigger>
                        <SelectContent>
                          {GLASS_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ice</Label>
                      <Select value={ice} onValueChange={setIce}>
                        <SelectTrigger><SelectValue placeholder="Select ice" /></SelectTrigger>
                        <SelectContent>
                          {ICE_TYPES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Garnish</Label>
                      <Input value={garnish} onChange={(e) => setGarnish(e.target.value)} placeholder="CANDIED EDAMAME 3 PEACE" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-4">Metrics (Auto-calculated)</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Total (ml)</Label>
                      <Input value={totalMl} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <Label>ABV (%)</Label>
                      <Input value={abvPercentage.toFixed(1)} readOnly className="bg-muted" />
                    </div>
                    <div>
                      <Label>Ratio (Optional)</Label>
                      <Input value={ratio} onChange={(e) => setRatio(e.target.value)} placeholder="2:1:1" />
                    </div>
                    <div>
                      <Label>pH</Label>
                      <Input type="number" value={ph} onChange={(e) => setPh(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Brix</Label>
                      <Input type="number" value={brix} onChange={(e) => setBrix(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Kcal (Estimated)</Label>
                      <Input value={kcal} readOnly className="bg-muted" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 bg-muted/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Recipe</h3>
                  <Button onClick={addIngredient} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />Add Ingredient
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">Ingredient</Label>
                        <Input
                          value={ing.ingredient}
                          onChange={(e) => updateIngredient(ing.id, 'ingredient', e.target.value)}
                          placeholder="Infused Woodford"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          value={ing.amount}
                          onChange={(e) => updateIngredient(ing.id, 'amount', Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Unit</Label>
                        <Input value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Type</Label>
                        <Input value={ing.type} onChange={(e) => updateIngredient(ing.id, 'type', e.target.value)} placeholder="WHISKEY" />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">ABV</Label>
                        <Input type="number" value={ing.abv} onChange={(e) => updateIngredient(ing.id, 'abv', Number(e.target.value))} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Notes</Label>
                        <Input value={ing.notes} onChange={(e) => updateIngredient(ing.id, 'notes', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <Button onClick={() => removeIngredient(ing.id)} variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-4">Method (SOP)</h3>
                  <Textarea value={methodSOP} onChange={(e) => setMethodSOP(e.target.value)} 
                    placeholder="Chill glass. In mixing glass add ingredients with cubed ice. Stir 20-30s..." className="min-h-[120px]" />
                </Card>

                <Card className="p-6 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-4">Service Notes</h3>
                  <Textarea value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} 
                    placeholder="Descriptive notes about the cocktail experience..." className="min-h-[120px]" />
                </Card>
              </div>

              <Card className="p-6 bg-muted/50">
                <h3 className="text-lg font-semibold mb-4">Taste Profile (0-10)</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Sweet', value: tasteSweet, setter: setTasteSweet },
                    { label: 'Sour', value: tasteSour, setter: setTasteSour },
                    { label: 'Salty', value: tasteSalty, setter: setTasteSalty },
                    { label: 'Umami', value: tasteUmami, setter: setTasteUmami },
                    { label: 'Bitter', value: tasteBitter, setter: setTasteBitter },
                  ].map((taste) => (
                    <div key={taste.label}>
                      <Label className="mb-2 block">{taste.label}: {taste.value}</Label>
                      <Slider value={[taste.value]} onValueChange={([v]) => taste.setter(v)} max={10} step={1} />
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save SOP</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.map((sop) => (
            <Card key={sop.id} className="overflow-hidden hover:border-primary transition-colors">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{sop.drink_name}</h3>
                    <p className="text-sm text-muted-foreground">{sop.technique} • {sop.glass}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{sop.abv_percentage?.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">ABV</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium">{sop.total_ml}ml</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kcal:</span>
                    <span className="font-medium">{sop.kcal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">pH:</span>
                    <span className="font-medium">{sop.ph || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brix:</span>
                    <span className="font-medium">{sop.brix || '—'}</span>
                  </div>
                </div>

                <div className="h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={getRadarData(sop)}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="taste" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
                      <Radar name="Taste" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => { setSelectedSOP(sop); setIsDetailOpen(true); }} variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />View
                  </Button>
                  <Button onClick={() => exportToPDF(sop)} variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />PDF
                  </Button>
                  <Button onClick={() => handleDelete(sop.id)} variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {sops.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No SOPs Yet</h3>
            <p className="text-muted-foreground mb-6">Create your first cocktail SOP to get started</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Create Your First SOP
            </Button>
          </div>
        )}

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
            {selectedSOP && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <p className="text-xs text-muted-foreground mb-2">ATTIKO — COCKTAIL SOP</p>
                  <h2 className="text-3xl font-bold">{selectedSOP.drink_name.toUpperCase()}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Identity</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Drink Name:</span>
                        <span className="font-medium">{selectedSOP.drink_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Technique:</span>
                        <span className="font-medium">{selectedSOP.technique}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Glass:</span>
                        <span className="font-medium">{selectedSOP.glass}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ice:</span>
                        <span className="font-medium">{selectedSOP.ice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Garnish:</span>
                        <span className="font-medium">{selectedSOP.garnish}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total (ml):</span>
                        <span className="font-medium">{selectedSOP.total_ml}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ABV (%):</span>
                        <span className="font-medium">{selectedSOP.abv_percentage?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ratio:</span>
                        <span className="font-medium">{selectedSOP.ratio || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">pH:</span>
                        <span className="font-medium">{selectedSOP.ph || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brix:</span>
                        <span className="font-medium">{selectedSOP.brix || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kcal:</span>
                        <span className="font-medium">{selectedSOP.kcal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Method (SOP)</h3>
                  <p className="text-sm text-muted-foreground">{selectedSOP.method_sop}</p>
                </div>

                {selectedSOP.service_notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Service Notes</h3>
                    <p className="text-sm text-muted-foreground">{selectedSOP.service_notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-4">Taste Profile</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData(selectedSOP)}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="taste" tick={{ fill: 'hsl(var(--foreground))' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Radar name="Taste" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Recipe</h3>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">INGREDIENT</th>
                          <th className="text-left py-2 px-3 font-semibold">AMOUNT</th>
                          <th className="text-left py-2 px-3 font-semibold">UNIT</th>
                          <th className="text-left py-2 px-3 font-semibold">TYPE</th>
                          <th className="text-left py-2 px-3 font-semibold">%ABV</th>
                          <th className="text-left py-2 px-3 font-semibold">NOTES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSOP.recipe.map((ing, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="py-2 px-3">{ing.ingredient}</td>
                            <td className="py-2 px-3">{ing.amount}</td>
                            <td className="py-2 px-3">{ing.unit}</td>
                            <td className="py-2 px-3">{ing.type}</td>
                            <td className="py-2 px-3">{ing.abv}</td>
                            <td className="py-2 px-3">{ing.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
}
