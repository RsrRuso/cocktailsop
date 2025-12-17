import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  Zap, Bluetooth, Scale, Activity, Clock, Brain, 
  ShoppingCart, Database, Package, BookOpen, Link2,
  CheckCircle2, AlertTriangle, TrendingUp, ArrowRight,
  Wifi, Server, BarChart3, Shield, ArrowDown, ArrowRightLeft
} from 'lucide-react';
import smartPourerDevice from '@/assets/smart-pourer-device.jpeg';

interface SmartPourerGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmartPourerGuide({ open, onOpenChange }: SmartPourerGuideProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none p-0 gap-0 flex flex-col sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95vw] sm:h-[85vh] sm:max-w-4xl sm:rounded-lg">
        <DialogHeader className="p-4 md:p-6 pb-2 border-b pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-6">
          <DialogTitle className="flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base md:text-xl font-bold block truncate">Smart Pourer System</span>
              <p className="text-xs md:text-sm text-muted-foreground font-normal truncate">
                Hardware-Powered Consumption Intelligence
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 md:px-6 pt-3 md:pt-4 border-b overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 rounded-xl min-w-max">
              <TabsTrigger value="overview" className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="dataflow" className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm">Data Flow</TabsTrigger>
              <TabsTrigger value="variance" className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm">Variance</TabsTrigger>
              <TabsTrigger value="setup" className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm">Setup</TabsTrigger>
              <TabsTrigger value="features" className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm">Features</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-6 overscroll-contain pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0 space-y-4 md:space-y-6">
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3">What is Smart Pourer?</h3>
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4">
                    Smart Pourer transforms your bar operations into a data-driven intelligence system. 
                    BLE-enabled sensors measure every pour in real-time, creating an irrefutable record 
                    of physical consumption.
                  </p>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Hardware Truth</Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Real-time</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">AI-Powered</Badge>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Variance</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Device Diagram */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
                    <Bluetooth className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                    The Smart Pourer Device
                  </h3>
                  <div className="flex justify-center p-4 md:p-8 rounded-xl bg-gradient-to-b from-background to-muted/30 border">
                    <img 
                      src={smartPourerDevice} 
                      alt="Smart Pourer Device" 
                      className="max-h-48 md:max-h-72 w-auto object-contain"
                    />
                  </div>
                  <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                    <div className="p-2 md:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-[10px] md:text-xs font-medium text-blue-400">BLE Transmitter</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Sends pour data</div>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-[10px] md:text-xs font-medium text-green-400">Flow Sensor</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Measures ml</div>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <div className="text-[10px] md:text-xs font-medium text-purple-400">LED Status</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Connection</div>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <div className="text-[10px] md:text-xs font-medium text-amber-400">Pour Spout</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Dispensing</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Core Concept Diagram */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                    Core Concept: The Three Pillars
                  </h3>
                  
                  {/* Visual Flow Diagram */}
                  <div className="space-y-3 md:space-y-4">
                    {/* Three Input Pillars */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      <div className="p-2 md:p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30 text-center">
                        <div className="text-lg md:text-2xl mb-1 md:mb-2">🍾</div>
                        <div className="font-bold text-green-400 text-xs md:text-base mb-0.5 md:mb-1">PHYSICAL</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Smart Pourer Device</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">BLE Sensor</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Pour (ml)</div>
                      </div>
                      <div className="p-2 md:p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 text-center">
                        <div className="text-lg md:text-2xl mb-1 md:mb-2">💻</div>
                        <div className="font-bold text-blue-400 text-xs md:text-base mb-0.5 md:mb-1">VIRTUAL</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">POS System</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Sales Records</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Sales</div>
                      </div>
                      <div className="p-2 md:p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-center">
                        <div className="text-lg md:text-2xl mb-1 md:mb-2">📦</div>
                        <div className="font-bold text-amber-400 text-xs md:text-base mb-0.5 md:mb-1">INVENTORY</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Stock Count</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Opening Stock</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Stock</div>
                      </div>
                    </div>

                    {/* Arrows Down */}
                    <div className="flex justify-center gap-8 md:gap-20">
                      <ArrowDown className="w-4 h-4 md:w-6 md:h-6 text-green-500" />
                      <ArrowDown className="w-4 h-4 md:w-6 md:h-6 text-blue-500" />
                      <ArrowDown className="w-4 h-4 md:w-6 md:h-6 text-amber-500" />
                    </div>

                    {/* Variance Engine */}
                    <div className="flex justify-center">
                      <div className="p-3 md:p-4 rounded-xl bg-purple-500/20 border-2 border-purple-500/40 text-center w-48 md:w-64">
                        <Scale className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 text-purple-400" />
                        <div className="font-bold text-purple-400 text-sm md:text-base">VARIANCE ENGINE</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Compare • Analyze • Alert</div>
                      </div>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 md:w-6 md:h-6 text-purple-500" />
                    </div>

                    {/* Output */}
                    <div className="flex justify-center">
                      <div className="p-3 md:p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-blue-500/20 border-2 border-green-500/30 text-center w-full max-w-xs md:w-80">
                        <div className="text-lg md:text-2xl mb-1 md:mb-2">📊</div>
                        <div className="font-bold text-sm md:text-base">Actionable Insights</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Loss Prevention • Cost Control • Performance</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4 mt-4 md:mt-6">
                    <div className="p-3 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <Bluetooth className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                        <span className="font-semibold text-green-400 text-sm md:text-base">Physical</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Hardware sensors measure actual liquid poured - the "truth source".
                      </p>
                    </div>
                    <div className="p-3 md:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                        <span className="font-semibold text-blue-400 text-sm md:text-base">Virtual</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        POS records what was sold. If poured ≠ sold, investigate.
                      </p>
                    </div>
                    <div className="p-3 md:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <Package className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                        <span className="font-semibold text-amber-400 text-sm md:text-base">Inventory</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Physical stock counts validate pours and sales.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Benefits */}
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="h-6 w-6 md:h-8 md:w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Shield className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                      </div>
                      <span className="font-semibold text-xs md:text-sm">Loss Prevention</span>
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground">
                      Detect theft and over-pouring.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="h-6 w-6 md:h-8 md:w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                      </div>
                      <span className="font-semibold text-xs md:text-sm">Cost Control</span>
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground">
                      Monitor pour costs in real-time.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="h-6 w-6 md:h-8 md:w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Brain className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                      </div>
                      <span className="font-semibold text-xs md:text-sm">AI Detection</span>
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground">
                      Identify unusual patterns.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="h-6 w-6 md:h-8 md:w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Activity className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
                      </div>
                      <span className="font-semibold text-xs md:text-sm">Accountability</span>
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground">
                      Track performance per staff.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* DATA FLOW TAB */}
            <TabsContent value="dataflow" className="mt-0 space-y-4 md:space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
                    <Wifi className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                    Real-time Data Flow
                  </h3>

                  {/* Sequence Diagram as Visual Cards */}
                  <div className="space-y-2 md:space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg md:text-2xl">🍾</span>
                      </div>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 p-2 md:p-3 rounded-lg bg-muted/30 border">
                        <div className="font-medium text-xs md:text-sm">Pour Detected</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Flow sensor measures ml</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg md:text-2xl">📡</span>
                      </div>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 p-2 md:p-3 rounded-lg bg-muted/30 border">
                        <div className="font-medium text-xs md:text-sm">BLE Transmission</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Sent to phone hub</div>
                      </div>
                    </div>

                    {/* Step 3 - Branch */}
                    <div className="ml-12 md:ml-16 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] md:text-xs font-medium text-green-400">Online</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">→ Cloud sync → Dashboard update</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] md:text-xs font-medium text-amber-400">Offline</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">→ Queue locally → Sync later</span>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-center gap-2 md:gap-3 pt-2">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg md:text-2xl">📱</span>
                      </div>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 p-2 md:p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                        <div className="font-medium text-xs md:text-sm">Dashboard Updated</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Variance + alerts</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Pairing Flow */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-green-500" />
                    Device Pairing Logic
                  </h3>

                  {/* Pairing Flow Diagram */}
                  <div className="space-y-4">
                    {/* Setup Phase */}
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <div className="text-sm font-semibold mb-3 text-muted-foreground">INITIAL SETUP</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">1. Register Device</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">2. Create SKU</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">3. Add Bottle</div>
                      </div>
                    </div>

                    {/* Pairing Phase */}
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="text-sm font-semibold mb-3 text-blue-400">PAIRING PROCESS</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Select Device</div>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Select Bottle</div>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Confirm Pairing</div>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        <div className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-sm text-green-400 font-medium">✓ Active</div>
                      </div>
                    </div>

                    {/* Tracking Phase */}
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="text-sm font-semibold mb-3 text-green-400">POUR TRACKING</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Pour Detected</div>
                        <ArrowRight className="w-4 h-4 text-green-400" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Lookup Pairing</div>
                        <ArrowRight className="w-4 h-4 text-green-400" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Get SKU + Bottle</div>
                        <ArrowRight className="w-4 h-4 text-green-400" />
                        <div className="px-3 py-2 rounded-lg bg-background border text-sm">Record Event</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-amber-400">Important: No Pairing = No Data</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pour events from unpaired devices are rejected. Every pourer must be paired 
                      to a registered bottle before it can record data. This ensures data integrity.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* VARIANCE LOGIC TAB */}
            <TabsContent value="variance" className="mt-0 space-y-4 md:space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
                    <Scale className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                    Variance Calculation Engine
                  </h3>

                  {/* Variance Flow Diagram */}
                  <div className="space-y-4">
                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                        <Activity className="w-5 h-5 mx-auto mb-1 text-green-500" />
                        <div className="text-xs font-medium">Pour Events</div>
                        <div className="text-xs text-muted-foreground">Actual ml poured</div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                        <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                        <div className="text-xs font-medium">POS Sales</div>
                        <div className="text-xs text-muted-foreground">Expected ml sold</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <Package className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                        <div className="text-xs font-medium">Inventory</div>
                        <div className="text-xs text-muted-foreground">Opening - Closing</div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowDown className="w-6 h-6 text-purple-500" />
                    </div>

                    {/* Calculations */}
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <div className="text-center mb-3">
                        <Scale className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                        <div className="font-semibold text-purple-400">Variance Calculations</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 text-center text-xs">
                        <div>
                          <div className="font-medium">vs SOP</div>
                          <div className="text-muted-foreground">(Poured - Recipe)</div>
                        </div>
                        <div>
                          <div className="font-medium">vs Sales</div>
                          <div className="text-muted-foreground">(Poured - Sold)</div>
                        </div>
                        <div>
                          <div className="font-medium">vs Stock</div>
                          <div className="text-muted-foreground">(Poured - Δ Stock)</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowDown className="w-6 h-6 text-purple-500" />
                    </div>

                    {/* Output Thresholds */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                      <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
                        <div className="text-xs font-medium text-green-400">&lt; 5% Variance</div>
                        <div className="text-xs text-muted-foreground">Normal - Within tolerance</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                        <div className="text-xs font-medium text-amber-400">5-15% Variance</div>
                        <div className="text-xs text-muted-foreground">Warning - Investigate</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                        <div className="text-xs font-medium text-red-400">&gt; 15% Variance</div>
                        <div className="text-xs text-muted-foreground">Critical - Immediate action</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        Variance vs SOP
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Compares actual pour volume against the recipe standard. 
                        Detects over-pouring or under-pouring per drink.
                      </p>
                      <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded">
                        (Poured - Recipe) / Recipe × 100
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        Variance vs Sales
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Compares physical pours against POS records. 
                        High variance indicates theft, comps, or wastage.
                      </p>
                      <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded">
                        (Poured - Sold) / Sold × 100
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        Variance vs Stock
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Cross-validates pours against physical inventory change. 
                        Catches discrepancies in all systems.
                      </p>
                      <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded">
                        (Poured - Stock Δ) / Stock Δ × 100
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Anomaly Detection Flow */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                    AI Anomaly Detection Flow
                  </h3>

                  {/* Anomaly Flow */}
                  <div className="space-y-4">
                    {/* Data Collection */}
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <div className="text-sm font-semibold mb-3 text-muted-foreground">DATA COLLECTION</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-background border text-center text-xs">Pour Events</div>
                        <div className="p-2 rounded-lg bg-background border text-center text-xs">Time Patterns</div>
                        <div className="p-2 rounded-lg bg-background border text-center text-xs">Staff Data</div>
                        <div className="p-2 rounded-lg bg-background border text-center text-xs">Historical Avg</div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowDown className="w-5 h-5 text-pink-500" />
                    </div>

                    {/* AI Analysis */}
                    <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                      <div className="text-sm font-semibold mb-3 text-pink-400 text-center">AI ANALYSIS</div>
                      <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-xs">
                        <div className="p-2 rounded-lg bg-background border">Pattern Recognition</div>
                        <div className="p-2 rounded-lg bg-background border">Threshold Comparison</div>
                        <div className="p-2 rounded-lg bg-background border">Time-based Rules</div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowDown className="w-5 h-5 text-pink-500" />
                    </div>

                    {/* Anomaly Types */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                        <div className="text-lg mb-1">🌙</div>
                        <div className="text-xs font-medium text-red-400">After-hours pour</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <div className="text-lg mb-1">📈</div>
                        <div className="text-xs font-medium text-amber-400">Volume spike</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <div className="text-lg mb-1">⏱️</div>
                        <div className="text-xs font-medium text-amber-400">Rapid succession</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                        <div className="text-lg mb-1">👤</div>
                        <div className="text-xs font-medium text-red-400">Staff variance</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-red-500/20 text-red-400">Critical</Badge>
                      <span className="text-muted-foreground">After-hours pour when venue is closed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-amber-500/20 text-amber-400">Warning</Badge>
                      <span className="text-muted-foreground">Volume 2x higher than shift average</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-amber-500/20 text-amber-400">Warning</Badge>
                      <span className="text-muted-foreground">5+ pours from same bottle within 60 seconds</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-red-500/20 text-red-400">Critical</Badge>
                      <span className="text-muted-foreground">Staff variance consistently 20%+ above average</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETUP GUIDE TAB */}
            <TabsContent value="setup" className="mt-0 space-y-4 md:space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Quick Start Setup</h3>
                  
                  {/* Setup Flow */}
                  <div className="flex items-center gap-2 flex-wrap justify-center mb-6 p-4 rounded-xl bg-muted/30">
                    <div className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-medium">1️⃣ Add SKUs</div>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <div className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-medium">2️⃣ Register Bottles</div>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <div className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-medium">3️⃣ Add Devices</div>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <div className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-medium">4️⃣ Pair</div>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <div className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-medium">5️⃣ Start Shift</div>
                    <ArrowRight className="w-4 h-4 text-green-500" />
                    <div className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-sm font-medium text-green-400">✅ Go Live!</div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Add SKUs
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Go to SKUs tab and add your products (e.g., "Absolut Vodka 750ml", "Hendricks Gin 1L"). 
                          Include category, cost per bottle, and standard pour size.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Register Bottles
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add individual bottles to your inventory. Each bottle links to a SKU 
                          and tracks remaining volume, batch number, and location.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Bluetooth className="w-4 h-4" />
                          Add Devices
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Register your Smart Pourer devices. Each device has a unique code. 
                          Scan for nearby BLE devices or manually enter the device code.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">4</div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          Pair Device to Bottle
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Link each Smart Pourer device to its bottle. This tells the system 
                          which product each pour event belongs to.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">5</div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Start Shift
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Open a shift in the Shifts tab. Record opening stock levels. 
                          All pour events during the shift will be tracked and analyzed.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">✓</div>
                      <div>
                        <h4 className="font-semibold text-green-400">You're Live!</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Monitor real-time pours in the Live tab. Close shift to generate 
                          variance reports and track performance over time.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FEATURES TAB */}
            <TabsContent value="features" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-green-500" />
                      </div>
                      <h4 className="font-semibold">Live Bar View</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Real-time dashboard showing all active bottles, current pour activity, 
                      and instant consumption metrics. See every pour as it happens.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-amber-500" />
                      </div>
                      <h4 className="font-semibold">Variance Dashboard</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Compare physical pours vs. POS sales vs. inventory changes. 
                      Export variance reports as PDF for management review.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-500" />
                      </div>
                      <h4 className="font-semibold">POS Integration</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sync with your POS system to compare recorded sales against 
                      physical consumption. Auto-match or manually link orders.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-pink-500" />
                      </div>
                      <h4 className="font-semibold">AI Anomaly Detection</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Machine learning identifies suspicious patterns: after-hours pours, 
                      volume spikes, rapid succession, and staff-specific variances.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-purple-500" />
                      </div>
                      <h4 className="font-semibold">Shift Management</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Open/close shifts with automatic inventory snapshots. 
                      Track variance per shift and identify problematic periods.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Database className="h-5 w-5 text-cyan-500" />
                      </div>
                      <h4 className="font-semibold">Offline Sync</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Works offline. Pour events queue locally and sync 
                      automatically when connection is restored. Zero data loss.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-orange-500" />
                      </div>
                      <h4 className="font-semibold">Recipe Engine</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Define standard pour recipes per cocktail. System calculates 
                      expected consumption and flags over/under-pours automatically.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <h4 className="font-semibold">Real-time Alerts</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Instant notifications for critical events: high variance, 
                      anomalies detected, low stock warnings, and device issues.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-4 md:p-6 border-t pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
