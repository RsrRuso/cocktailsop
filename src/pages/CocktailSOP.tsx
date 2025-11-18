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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Download, FileText, ArrowLeft } from 'lucide-react';
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
  descriptors: string;
  allergens: string;
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

export default function CocktailSOP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sops, setSops] = useState<CocktailSOP[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<CocktailSOP | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states
  const [drinkName, setDrinkName] = useState('');
  const [technique, setTechnique] = useState('');
  const [glass, setGlass] = useState('');
  const [ice, setIce] = useState('');
  const [garnish, setGarnish] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [totalMl, setTotalMl] = useState(120);
  const [abvPercentage, setAbvPercentage] = useState(14);
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

  const fetchSOPs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cocktail_sops')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SOPs:', error);
      toast({ title: 'Error', description: 'Failed to fetch cocktail SOPs', variant: 'destructive' });
      return;
    }

    setSops((data || []).map(sop => ({
      ...sop,
      recipe: (Array.isArray(sop.recipe) ? sop.recipe : []) as unknown as Ingredient[]
    })) as CocktailSOP[]);
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: crypto.randomUUID(),
        ingredient: '',
        amount: 0,
        unit: 'ml',
        type: '',
        abv: 0,
        notes: '',
        descriptors: '',
        allergens: '',
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(ingredients.map(ing =>
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const resetForm = () => {
    setDrinkName('');
    setTechnique('');
    setGlass('');
    setIce('');
    setGarnish('');
    setMainImage('');
    setTotalMl(120);
    setAbvPercentage(14);
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
    if (!user || !drinkName || !technique || !glass || !ice || !garnish || !methodSOP) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
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
      recipe: ingredients as any,
    }]);

    if (error) {
      console.error('Error saving SOP:', error);
      toast({ title: 'Error', description: 'Failed to save cocktail SOP', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Cocktail SOP saved successfully' });
    setIsModalOpen(false);
    resetForm();
    fetchSOPs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SOP?')) return;

    const { error } = await supabase
      .from('cocktail_sops')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting SOP:', error);
      toast({ title: 'Error', description: 'Failed to delete SOP', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'SOP deleted successfully' });
    fetchSOPs();
  };

  const exportToPDF = (sop: CocktailSOP) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('ATTIKO — COCKTAIL SOP', 14, 15);

    // Cocktail Name
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text(sop.drink_name.toUpperCase(), 14, 30);

    // Identity/Metrics Table
    doc.setFontSize(10);
    autoTable(doc, {
      startY: 40,
      head: [['Identity', 'Metrics']],
      body: [
        ['Drink Name', sop.drink_name],
        ['Technique', sop.technique],
        ['Glass', sop.glass],
        ['Ice', sop.ice],
        ['Garnish', sop.garnish],
        ['Main Image', sop.main_image || 'N/A'],
        ['Total (ml)', sop.total_ml.toString()],
        ['ABV (%)', sop.abv_percentage?.toString() || 'N/A'],
        ['Ratio', sop.ratio || '—'],
        ['pH', sop.ph?.toString() || '—'],
        ['Brix', sop.brix?.toString() || '—'],
        ['Kcal', sop.kcal?.toString() || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] },
    });

    // Method (SOP)
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Method (SOP)', 14, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const methodLines = doc.splitTextToSize(sop.method_sop, 180);
    doc.text(methodLines, 14, currentY + 7);
    currentY += 7 + (methodLines.length * 5);

    // Service Notes
    if (sop.service_notes) {
      currentY += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Service Notes', 14, currentY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(sop.service_notes, 180);
      doc.text(notesLines, 14, currentY + 7);
      currentY += 7 + (notesLines.length * 5);
    }

    // Taste Bar
    currentY += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Taste Bar', 14, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const tastes = [
      { name: 'SWEET', value: sop.taste_sweet },
      { name: 'SOUR', value: sop.taste_sour },
      { name: 'SALTY', value: sop.taste_salty },
      { name: 'UMAMI', value: sop.taste_umami },
      { name: 'BITTER', value: sop.taste_bitter },
    ];

    currentY += 10;
    tastes.forEach((taste, idx) => {
      doc.text(taste.name, 14, currentY);
      doc.text(taste.value.toString(), 50, currentY);
      currentY += 5;
    });

    // Recipe Table - New Page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recipe', 14, 20);

    const recipeData = sop.recipe.map(ing => [
      ing.ingredient,
      ing.amount?.toString() || '',
      ing.unit,
      ing.type,
      ing.abv?.toString() || '',
      [ing.notes, ing.descriptors, ing.allergens].filter(Boolean).join('\n'),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['INGREDIENT', 'AMOUNT', 'UNIT', 'TYPE', '%ABV', 'NOTES']],
      body: recipeData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] },
    });

    doc.save(`${sop.drink_name.toLowerCase().replace(/\s+/g, '-')}-sop.pdf`);
    toast({ title: 'Success', description: 'PDF exported successfully' });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container mx-auto px-4 pt-20 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tools')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Cocktail SOP</h1>
              <p className="text-muted-foreground mt-1">Manage standardized cocktail specifications</p>
            </div>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New SOP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Cocktail SOP</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Identity Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Identity & Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Drink Name *</Label>
                      <Input value={drinkName} onChange={(e) => setDrinkName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Technique *</Label>
                      <Input value={technique} onChange={(e) => setTechnique(e.target.value)} placeholder="SHAKE, STIR, BUILD" />
                    </div>
                    <div>
                      <Label>Glass *</Label>
                      <Input value={glass} onChange={(e) => setGlass(e.target.value)} />
                    </div>
                    <div>
                      <Label>Ice *</Label>
                      <Input value={ice} onChange={(e) => setIce(e.target.value)} placeholder="CUBED, CRUSHED, BLOCK" />
                    </div>
                    <div>
                      <Label>Garnish *</Label>
                      <Input value={garnish} onChange={(e) => setGarnish(e.target.value)} />
                    </div>
                    <div>
                      <Label>Main Image</Label>
                      <Input value={mainImage} onChange={(e) => setMainImage(e.target.value)} />
                    </div>
                    <div>
                      <Label>Total (ml)</Label>
                      <Input type="number" value={totalMl} onChange={(e) => setTotalMl(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>ABV (%)</Label>
                      <Input type="number" step="0.1" value={abvPercentage} onChange={(e) => setAbvPercentage(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Ratio</Label>
                      <Input value={ratio} onChange={(e) => setRatio(e.target.value)} />
                    </div>
                    <div>
                      <Label>pH</Label>
                      <Input type="number" step="0.01" value={ph} onChange={(e) => setPh(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Brix</Label>
                      <Input type="number" step="0.1" value={brix} onChange={(e) => setBrix(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Kcal</Label>
                      <Input type="number" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* Method & Notes */}
                <div>
                  <Label>Method (SOP) *</Label>
                  <Textarea value={methodSOP} onChange={(e) => setMethodSOP(e.target.value)} rows={4} />
                </div>
                <div>
                  <Label>Service Notes</Label>
                  <Textarea value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} rows={3} />
                </div>

                {/* Taste Profile */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Taste Profile (0-10)</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Sweet</Label>
                        <span className="text-sm">{tasteSweet}</span>
                      </div>
                      <Slider value={[tasteSweet]} onValueChange={([v]) => setTasteSweet(v)} max={10} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Sour</Label>
                        <span className="text-sm">{tasteSour}</span>
                      </div>
                      <Slider value={[tasteSour]} onValueChange={([v]) => setTasteSour(v)} max={10} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Salty</Label>
                        <span className="text-sm">{tasteSalty}</span>
                      </div>
                      <Slider value={[tasteSalty]} onValueChange={([v]) => setTasteSalty(v)} max={10} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Umami</Label>
                        <span className="text-sm">{tasteUmami}</span>
                      </div>
                      <Slider value={[tasteUmami]} onValueChange={([v]) => setTasteUmami(v)} max={10} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Bitter</Label>
                        <span className="text-sm">{tasteBitter}</span>
                      </div>
                      <Slider value={[tasteBitter]} onValueChange={([v]) => setTasteBitter(v)} max={10} step={1} />
                    </div>
                  </div>
                </div>

                {/* Recipe/Ingredients */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Recipe</h3>
                    <Button type="button" onClick={addIngredient} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Ingredient
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {ingredients.map(ing => (
                      <Card key={ing.id} className="p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Ingredient</Label>
                            <Input value={ing.ingredient} onChange={(e) => updateIngredient(ing.id, 'ingredient', e.target.value)} />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Input value={ing.type} onChange={(e) => updateIngredient(ing.id, 'type', e.target.value)} placeholder="LIQUEUR, JUICE, SYRUP" />
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input type="number" value={ing.amount} onChange={(e) => updateIngredient(ing.id, 'amount', Number(e.target.value))} />
                          </div>
                          <div>
                            <Label>Unit</Label>
                            <Input value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} placeholder="ml, drops" />
                          </div>
                          <div>
                            <Label>ABV %</Label>
                            <Input type="number" step="0.1" value={ing.abv} onChange={(e) => updateIngredient(ing.id, 'abv', Number(e.target.value))} />
                          </div>
                          <div>
                            <Label>Notes</Label>
                            <Input value={ing.notes} onChange={(e) => updateIngredient(ing.id, 'notes', e.target.value)} />
                          </div>
                          <div>
                            <Label>Descriptors</Label>
                            <Input value={ing.descriptors} onChange={(e) => updateIngredient(ing.id, 'descriptors', e.target.value)} placeholder="SWEET SOUR NUTTY" />
                          </div>
                          <div>
                            <Label>Allergens</Label>
                            <Input value={ing.allergens} onChange={(e) => updateIngredient(ing.id, 'allergens', e.target.value)} placeholder="NUTS, DAIRY" />
                          </div>
                        </div>
                        <Button type="button" variant="destructive" size="sm" className="mt-3" onClick={() => removeIngredient(ing.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full" size="lg">Save SOP</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* SOP List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.length === 0 ? (
            <Card className="col-span-full p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No cocktail SOPs yet. Create your first one!</p>
            </Card>
          ) : (
            sops.map(sop => (
              <Card key={sop.id} className="p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-2">{sop.drink_name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <p>Technique: {sop.technique}</p>
                  <p>Glass: {sop.glass}</p>
                  <p>ABV: {sop.abv_percentage}%</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedSOP(sop); setIsDetailOpen(true); }} className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" onClick={() => exportToPDF(sop)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(sop.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedSOP && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedSOP.drink_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Identity & Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">Technique:</span> {selectedSOP.technique}</div>
                      <div><span className="font-medium">Glass:</span> {selectedSOP.glass}</div>
                      <div><span className="font-medium">Ice:</span> {selectedSOP.ice}</div>
                      <div><span className="font-medium">Garnish:</span> {selectedSOP.garnish}</div>
                      <div><span className="font-medium">Total:</span> {selectedSOP.total_ml}ml</div>
                      <div><span className="font-medium">ABV:</span> {selectedSOP.abv_percentage}%</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Method (SOP)</h4>
                    <p className="text-sm">{selectedSOP.method_sop}</p>
                  </div>
                  {selectedSOP.service_notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Service Notes</h4>
                      <p className="text-sm">{selectedSOP.service_notes}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Taste Profile</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-sm">Sweet:</span>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${selectedSOP.taste_sweet * 10}%` }} />
                        </div>
                        <span className="text-sm">{selectedSOP.taste_sweet}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-sm">Sour:</span>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${selectedSOP.taste_sour * 10}%` }} />
                        </div>
                        <span className="text-sm">{selectedSOP.taste_sour}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-sm">Salty:</span>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${selectedSOP.taste_salty * 10}%` }} />
                        </div>
                        <span className="text-sm">{selectedSOP.taste_salty}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-sm">Umami:</span>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${selectedSOP.taste_umami * 10}%` }} />
                        </div>
                        <span className="text-sm">{selectedSOP.taste_umami}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-16 text-sm">Bitter:</span>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${selectedSOP.taste_bitter * 10}%` }} />
                        </div>
                        <span className="text-sm">{selectedSOP.taste_bitter}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Recipe</h4>
                    <div className="space-y-3">
                      {selectedSOP.recipe.map((ing, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="font-medium">{ing.ingredient}</div>
                          <div className="text-sm text-muted-foreground">
                            {ing.amount} {ing.unit} • {ing.type} {ing.abv > 0 && `• ${ing.abv}% ABV`}
                          </div>
                          {ing.descriptors && <div className="text-xs mt-1">Descriptors: {ing.descriptors}</div>}
                          {ing.allergens && <div className="text-xs text-destructive">Allergens: {ing.allergens}</div>}
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
}
