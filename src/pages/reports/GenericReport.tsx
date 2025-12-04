import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { LucideIcon, Construction } from 'lucide-react';
import { toast } from 'sonner';

interface GenericReportProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  metrics?: { title: string; value: number; format?: 'currency' | 'percent' | 'number'; trend?: number }[];
}

const GenericReport: React.FC<GenericReportProps> = ({
  title,
  description,
  icon,
  color,
  metrics = [],
}) => {
  const [dateRange, setDateRange] = useState('month');

  const exportPDF = () => {
    toast.info('PDF export coming soon for this report');
  };

  return (
    <ReportLayout
      title={title}
      description={description}
      icon={icon}
      color={color}
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, idx) => (
            <MetricCard
              key={idx}
              title={metric.title}
              value={metric.value}
              format={metric.format}
              icon={icon}
              trend={metric.trend}
              color={color}
            />
          ))}
        </div>
      )}

      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Construction className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Report Under Development</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This report is being built with comprehensive data visualization and analysis tools.
            Check back soon for full functionality.
          </p>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default GenericReport;
