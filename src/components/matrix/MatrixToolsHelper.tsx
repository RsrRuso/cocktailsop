import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Package, Calculator, Calendar, Users, FileText, 
  Thermometer, Trash2, ClipboardCheck, ChefHat, 
  ShoppingCart, DollarSign, BarChart3, Briefcase,
  Search, ChevronRight, Sparkles, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  category: string;
  keywords: string[];
  quickTips: string[];
}

const tools: Tool[] = [
  {
    id: 'inventory',
    name: 'Inventory Manager',
    description: 'Track stock levels, receive items, and manage transfers',
    icon: <Package className="w-5 h-5" />,
    route: '/inventory-manager',
    category: 'Operations',
    keywords: ['stock', 'inventory', 'items', 'receive', 'transfer', 'count'],
    quickTips: [
      'Use QR codes for faster receiving',
      'Set up low-stock alerts for critical items',
      'Log transfers between stores instantly'
    ]
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    description: 'Scale recipes and track batch production',
    icon: <Calculator className="w-5 h-5" />,
    route: '/batch-calculator',
    category: 'Production',
    keywords: ['batch', 'recipe', 'scale', 'production', 'cocktail', 'prep'],
    quickTips: [
      'Create recipes with base serving sizes',
      'Auto-calculate ingredient quantities',
      'Generate QR codes for batch tracking'
    ]
  },
  {
    id: 'staff-scheduling',
    name: 'Staff Scheduling',
    description: 'Create weekly schedules and assign stations',
    icon: <Calendar className="w-5 h-5" />,
    route: '/staff-scheduling',
    category: 'Team',
    keywords: ['staff', 'schedule', 'roster', 'shifts', 'stations', 'team'],
    quickTips: [
      'Auto-rotate bartenders across stations',
      'Set indoor/outdoor area allocations',
      'Export PDF schedules for posting'
    ]
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOPs',
    description: 'Create and manage standardized cocktail recipes',
    icon: <ChefHat className="w-5 h-5" />,
    route: '/cocktail-sop',
    category: 'Recipes',
    keywords: ['cocktail', 'recipe', 'sop', 'drink', 'spec', 'method'],
    quickTips: [
      'Include photos for each recipe',
      'Calculate pour costs automatically',
      'Track taste profiles and allergens'
    ]
  },
  {
    id: 'purchase-orders',
    name: 'Purchase Orders',
    description: 'Create and track purchase orders from suppliers',
    icon: <ShoppingCart className="w-5 h-5" />,
    route: '/purchase-orders',
    category: 'Procurement',
    keywords: ['purchase', 'order', 'supplier', 'buy', 'procurement'],
    quickTips: [
      'Upload order documents for parsing',
      'Track received vs ordered items',
      'Analyze variances automatically'
    ]
  },
  {
    id: 'temperature-log',
    name: 'Temperature Log',
    description: 'Track equipment temperatures for compliance',
    icon: <Thermometer className="w-5 h-5" />,
    route: '/temperature-log',
    category: 'Compliance',
    keywords: ['temperature', 'fridge', 'freezer', 'compliance', 'health'],
    quickTips: [
      'Set target temperatures per equipment',
      'Get alerts for out-of-range readings',
      'Export logs for health inspections'
    ]
  },
  {
    id: 'wastage-tracker',
    name: 'Wastage Tracker',
    description: 'Track product waste and breakage',
    icon: <Trash2 className="w-5 h-5" />,
    route: '/wastage-tracker',
    category: 'Operations',
    keywords: ['waste', 'breakage', 'loss', 'spillage', 'expired'],
    quickTips: [
      'Log waste by reason (spilled, broken, expired)',
      'Track cost impact over time',
      'Identify patterns to reduce waste'
    ]
  },
  {
    id: 'stock-audit',
    name: 'Stock Audit',
    description: 'Conduct inventory counts and variance analysis',
    icon: <ClipboardCheck className="w-5 h-5" />,
    route: '/stock-audit',
    category: 'Operations',
    keywords: ['audit', 'count', 'variance', 'discrepancy', 'check'],
    quickTips: [
      'Count items systematically by category',
      'System shows variance from expected',
      'Document discrepancies with notes'
    ]
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Manage customers, leads, and deals',
    icon: <Users className="w-5 h-5" />,
    route: '/crm',
    category: 'Business',
    keywords: ['customer', 'lead', 'deal', 'contact', 'sales', 'client'],
    quickTips: [
      'Track leads through pipeline stages',
      'Log activities and follow-ups',
      'Convert leads to deals easily'
    ]
  },
  {
    id: 'menu-engineering',
    name: 'Menu Engineering',
    description: 'BCG matrix analysis for menu profitability',
    icon: <BarChart3 className="w-5 h-5" />,
    route: '/menu-engineering-pro',
    category: 'Analytics',
    keywords: ['menu', 'profit', 'bcg', 'stars', 'dogs', 'engineering'],
    quickTips: [
      'Identify Stars, Plowhorses, Puzzles, Dogs',
      'Optimize pricing with AI suggestions',
      'Track ingredient cross-utilization'
    ]
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    description: 'Complete restaurant & bar management system',
    icon: <Briefcase className="w-5 h-5" />,
    route: '/lab-ops',
    category: 'Operations',
    keywords: ['pos', 'kds', 'restaurant', 'bar', 'operations', 'orders'],
    quickTips: [
      'Mobile POS for tableside ordering',
      'Kitchen and Bar display systems',
      'Real-time analytics and reports'
    ]
  },
  {
    id: 'gm-command',
    name: 'GM Command',
    description: 'General Manager intelligence dashboard',
    icon: <DollarSign className="w-5 h-5" />,
    route: '/gm-command',
    category: 'Management',
    keywords: ['gm', 'manager', 'dashboard', 'approval', 'financial', 'reports'],
    quickTips: [
      'One-click meeting packet generation',
      'Approve equipment and staff requests',
      'Risk alerts and opportunity tracking'
    ]
  }
];

interface MatrixToolsHelperProps {
  onSelectTool?: (tool: Tool) => void;
}

export function MatrixToolsHelper({ onSelectTool }: MatrixToolsHelperProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const filteredTools = tools.filter(tool => {
    const searchLower = search.toLowerCase();
    return (
      tool.name.toLowerCase().includes(searchLower) ||
      tool.description.toLowerCase().includes(searchLower) ||
      tool.category.toLowerCase().includes(searchLower) ||
      tool.keywords.some(k => k.includes(searchLower))
    );
  });

  const categories = [...new Set(tools.map(t => t.category))];

  const handleToolClick = (tool: Tool) => {
    if (expandedTool === tool.id) {
      navigate(tool.route);
    } else {
      setExpandedTool(tool.id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Quick Tool Access</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-3">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              className="border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => handleToolClick(tool)}
                className="w-full p-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tool.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedTool === tool.id ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedTool === tool.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t bg-muted/30"
                  >
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Quick Tips:</p>
                      <ul className="space-y-1">
                        {tool.quickTips.map((tip, i) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs mt-2"
                        onClick={() => navigate(tool.route)}
                      >
                        Open {tool.name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {filteredTools.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tools found for "{search}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
