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
    <div className="space-y-3 sm:space-y-4 px-1">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="variance" className="gap-1.5 py-2 text-xs sm:text-sm">
            <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Variance</span>
          </TabsTrigger>
          <TabsTrigger value="pourers" className="gap-1.5 py-2 text-xs sm:text-sm">
            <Wine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Pourers</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5 py-2 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Sales</span>
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
