import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, ClipboardCheck, Users, Building2, FileText, 
  UtensilsCrossed, Shield, Boxes, ChevronRight, Sparkles,
  Hotel, Wine, Coffee, PartyPopper, Truck, Store, ChefHat
} from "lucide-react";

const venueTypes = [
  { id: 'bar', name: 'Bar / Cocktail Lounge', icon: Wine, color: 'from-purple-500 to-pink-500' },
  { id: 'restaurant', name: 'Restaurant', icon: UtensilsCrossed, color: 'from-orange-500 to-red-500' },
  { id: 'hotel', name: 'Hotel F&B', icon: Hotel, color: 'from-blue-500 to-cyan-500' },
  { id: 'cafe', name: 'Café / Coffee Shop', icon: Coffee, color: 'from-amber-500 to-yellow-500' },
  { id: 'nightclub', name: 'Nightclub', icon: PartyPopper, color: 'from-fuchsia-500 to-purple-500' },
  { id: 'catering', name: 'Catering Company', icon: Truck, color: 'from-green-500 to-emerald-500' },
  { id: 'ghost_kitchen', name: 'Ghost Kitchen', icon: ChefHat, color: 'from-slate-500 to-gray-500' },
  { id: 'food_hall', name: 'Food Hall / Market', icon: Store, color: 'from-teal-500 to-cyan-500' },
];

const packageTools = [
  {
    id: 'checklist',
    name: 'Pre-Opening Checklist',
    description: 'Project timeline, milestones, departmental tasks',
    icon: ClipboardCheck,
    path: '/pre-opening-checklist',
    color: 'from-violet-600 to-purple-500',
    status: 'ready'
  },
  {
    id: 'vendors',
    name: 'Vendor Database',
    description: 'Suppliers, contracts, lead times, pricing',
    icon: Package,
    path: '/vendor-database',
    color: 'from-emerald-600 to-teal-500',
    status: 'ready'
  },
  {
    id: 'orgchart',
    name: 'Org Chart Builder',
    description: 'Visual department hierarchy & positions',
    icon: Users,
    path: '/org-chart',
    color: 'from-blue-600 to-cyan-500',
    status: 'ready'
  },
  {
    id: 'sop',
    name: 'SOP Library',
    description: 'Standard operating procedures by department',
    icon: FileText,
    path: '/sop-library',
    color: 'from-orange-600 to-amber-500',
    status: 'ready'
  },
  {
    id: 'menu',
    name: 'Menu Builder Pro',
    description: 'Full menu management with hierarchy',
    icon: UtensilsCrossed,
    path: '/menu-builder',
    color: 'from-pink-600 to-rose-500',
    status: 'ready'
  },
  {
    id: 'licenses',
    name: 'License & Compliance',
    description: 'Permits, licenses, expiry tracking',
    icon: Shield,
    path: '/licenses-compliance',
    color: 'from-red-600 to-orange-500',
    status: 'ready'
  },
  {
    id: 'assets',
    name: 'Asset Registry',
    description: 'FF&E, equipment, warranties',
    icon: Boxes,
    path: '/asset-registry',
    color: 'from-indigo-600 to-blue-500',
    status: 'ready'
  },
];

const PreOpeningPackage = () => {
  const navigate = useNavigate();
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Pre-Opening Venue Package</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Complete automation system for opening new venues - from concept to grand opening
          </p>
        </div>

        {/* Venue Type Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Select Venue Concept
            </CardTitle>
            <CardDescription>Choose your venue type to customize the package</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {venueTypes.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedVenue === venue.id 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${venue.color} flex items-center justify-center mx-auto mb-2`}>
                    <venue.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium text-center">{venue.name}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Package Tools Grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Package Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packageTools.map((tool) => (
              <Card 
                key={tool.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                onClick={() => navigate(tool.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${tool.color} shrink-0`}>
                      <tool.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{tool.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {tool.status === 'ready' ? 'Ready' : 'Coming Soon'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-violet-600">7</p>
                <p className="text-sm text-muted-foreground">Core Tools</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">8</p>
                <p className="text-sm text-muted-foreground">Venue Types</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-pink-600">∞</p>
                <p className="text-sm text-muted-foreground">Automations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">100%</p>
                <p className="text-sm text-muted-foreground">Integrated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => navigate('/pre-opening-checklist')}
          >
            <ClipboardCheck className="w-5 h-5" />
            Start New Project
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PreOpeningPackage;
