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

export default function CocktailSOP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sops, setSops] = useState<CocktailSOP[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<CocktailSOP | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states with auto-calculation
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
    // Auto-calculate metrics
    const total = ingredients.reduce((sum, ing) => ing.unit === 'ml' ? sum + (ing.amount || 0) : sum, 0);
    setTotalMl(total);
    
    const alcoholVol = ingredients.reduce((sum, ing) => 
      ing.unit === 'ml' && ing.abv > 0 ? sum + ((ing.amount || 0) * (ing.abv / 100)) : sum, 0
    );
    setAbvPercentage(total > 0 ? Number((alcoholVol / total * 100).toFixed(1)) : 0);
    setKcal(Math.round(alcoholVol * 7));
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
    setIngredients([...ingredients, { id: crypto.randomUUID(), ingredient: '', amount: 0, unit: 'ml', type: '', abv: 0, notes: '' }]);
  };

  const handleSave = async () => {
    if (!user || !drinkName || !technique) {
      toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('cocktail_sops').insert([{
      user_id: user.id, drink_name: drinkName, technique, glass, ice, garnish, main_image: mainImage,
      total_ml: totalMl, abv_percentage: abvPercentage, ratio, ph, brix, kcal,
      method_sop: methodSOP, service_notes: serviceNotes,
      taste_sweet: tasteSweet, taste_sour: tasteSour, taste_salty: tasteSalty,
      taste_umami: tasteUmami, taste_bitter: tasteBitter, recipe: ingredients as unknown as any
    }]);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: 'SOP saved' });
    setIsModalOpen(false);
    fetchSOPs();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">COCKTAIL SOP</h1>
            <p className="text-muted-foreground">Professional Standard Operating Procedures</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />Create SOP
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.map((sop) => (
            <Card key={sop.id} className="p-6 hover:border-primary transition-colors">
              <h3 className="text-xl font-bold mb-2">{sop.drink_name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{sop.technique} • {sop.glass}</p>
              <div className="text-2xl font-bold text-primary mb-4">{sop.abv_percentage?.toFixed(1)}% ABV</div>
              <Button onClick={() => { setSelectedSOP(sop); setIsDetailOpen(true); }} variant="outline" size="sm" className="w-full">
                <Eye className="w-4 h-4 mr-2" />View Details
              </Button>
            </Card>
          ))}
        </div>

        {sops.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No SOPs Yet</h3>
            <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Create First SOP</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
