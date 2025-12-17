import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartPourerDeviceManagement } from './SmartPourerDeviceManagement';
import { SmartPourerBottlePairing } from './SmartPourerBottlePairing';
import { SmartPourerLiveBarView } from './SmartPourerLiveBarView';
import { SmartPourerVarianceDashboard } from './SmartPourerVarianceDashboard';
import { SmartPourerSOPWorkflows } from './SmartPourerSOPWorkflows';
import { SmartPourerSKUManagement } from './SmartPourerSKUManagement';
import { SmartPourerRecipeEngine } from './SmartPourerRecipeEngine';
import { 
  Bluetooth, Link2, Activity, Scale, Clock, Package, 
  BookOpen, Zap
} from 'lucide-react';

interface SmartPourerModuleProps {
  outletId: string;
  outletName?: string;
}

export function SmartPourerModule({ outletId, outletName }: SmartPourerModuleProps) {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Smart Pourer</h2>
          <p className="text-xs text-muted-foreground">Hardware-powered consumption intelligence</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 rounded-xl min-w-max">
            <TabsTrigger value="live" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Activity className="h-4 w-4" />
              <span className="text-[10px] font-medium">Live</span>
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-medium">Shifts</span>
            </TabsTrigger>
            <TabsTrigger value="variance" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Scale className="h-4 w-4" />
              <span className="text-[10px] font-medium">Variance</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Bluetooth className="h-4 w-4" />
              <span className="text-[10px] font-medium">Devices</span>
            </TabsTrigger>
            <TabsTrigger value="pairing" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Link2 className="h-4 w-4" />
              <span className="text-[10px] font-medium">Pairing</span>
            </TabsTrigger>
            <TabsTrigger value="skus" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-medium">SKUs</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex-col gap-1 py-2 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[60px]">
              <BookOpen className="h-4 w-4" />
              <span className="text-[10px] font-medium">Recipes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="live" className="mt-4">
          <SmartPourerLiveBarView outletId={outletId} />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <SmartPourerSOPWorkflows outletId={outletId} />
        </TabsContent>

        <TabsContent value="variance" className="mt-4">
          <SmartPourerVarianceDashboard outletId={outletId} outletName={outletName} />
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <SmartPourerDeviceManagement outletId={outletId} />
        </TabsContent>

        <TabsContent value="pairing" className="mt-4">
          <SmartPourerBottlePairing outletId={outletId} />
        </TabsContent>

        <TabsContent value="skus" className="mt-4">
          <SmartPourerSKUManagement outletId={outletId} />
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <SmartPourerRecipeEngine outletId={outletId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
