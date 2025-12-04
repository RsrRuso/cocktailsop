import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Download, Calendar, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportLayoutProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  onExportPDF?: () => void;
  showDateFilter?: boolean;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
}

const ReportLayout: React.FC<ReportLayoutProps> = ({
  title,
  description,
  icon: Icon,
  color,
  children,
  onExportPDF,
  showDateFilter = true,
  dateRange = 'today',
  onDateRangeChange,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financial-reports')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {showDateFilter && (
              <Select value={dateRange} onValueChange={onDateRangeChange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {onExportPDF && (
              <Button onClick={onExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {children}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportLayout;
