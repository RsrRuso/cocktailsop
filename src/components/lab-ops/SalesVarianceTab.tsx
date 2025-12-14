import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PourerManagement } from './PourerManagement';
import { SalesTracking } from './SalesTracking';
import { VarianceAnalysis } from './VarianceAnalysis';
import { Wine, DollarSign, Scale } from 'lucide-react';

interface SalesVarianceTabProps {
  outletId: string;
  outletName?: string;
}

export function SalesVarianceTab({ outletId, outletName }: SalesVarianceTabProps) {
  const [activeTab, setActiveTab] = useState('variance');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="variance" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Variance</span>
          </TabsTrigger>
          <TabsTrigger value="pourers" className="gap-2">
            <Wine className="h-4 w-4" />
            <span className="hidden sm:inline">Pourers</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Sales</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variance" className="mt-4">
          <VarianceAnalysis outletId={outletId} outletName={outletName} />
        </TabsContent>

        <TabsContent value="pourers" className="mt-4">
          <PourerManagement outletId={outletId} />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <SalesTracking outletId={outletId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
