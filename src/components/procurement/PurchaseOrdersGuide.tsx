import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Upload, Package, CheckCircle, AlertTriangle, TrendingUp, 
  ArrowRight, BarChart3, Coins, Search, Download, History, Clock,
  HelpCircle, BookOpen, Lightbulb, Shield, Users, Zap
} from "lucide-react";

interface PurchaseOrdersGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseOrdersGuide = ({ open, onOpenChange }: PurchaseOrdersGuideProps) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'upload' | 'receive' | 'tracking' | 'tips'>('overview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            Purchase Orders Guide
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Complete guide to managing procurement and receiving
          </p>
        </DialogHeader>

        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">Upload PO</TabsTrigger>
              <TabsTrigger value="receive" className="text-xs">Receiving</TabsTrigger>
              <TabsTrigger value="tracking" className="text-xs">Tracking</TabsTrigger>
              <TabsTrigger value="tips" className="text-xs">Tips</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[60vh] px-6 pb-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-primary" />
                  What is Purchase Orders Tool?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Purchase Orders tool is your complete procurement management system. Upload purchase order documents, 
                  track received items, analyze variances, monitor price changes, and forecast spending—all in one place.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Upload POs</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload PDF, Excel, CSV, or image files containing purchase orders
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-green-500/20 bg-green-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Package className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Receive Items</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload receiving documents and match against purchase orders
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Variance Analysis</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Identify discrepancies between ordered and received items
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Price Tracking</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Monitor price changes and trends over time
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4 border-primary/20">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Workspace Collaboration
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create procurement workspaces and invite team members to collaborate. 
                  All purchase orders and receiving records are shared across the workspace, 
                  with full accountability tracking showing who submitted each document.
                </p>
              </Card>
            </TabsContent>

            {/* Upload PO Tab */}
            <TabsContent value="upload" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">How to Upload Purchase Orders</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">1</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Navigate to Purchase Orders</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Go to Ops Tools → Inventory → Purchase Orders
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">2</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Click Upload</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click the upload button and select your PO file (PDF, Excel, CSV, or image)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">3</Badge>
                  <div>
                    <h4 className="font-medium text-sm">AI Parsing</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI automatically extracts document code (ML/RQ), supplier, date, and line items
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">4</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Review & Save</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review parsed items and confirm to save the purchase order
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Supported Document Formats
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">PDF</Badge>
                  <Badge variant="secondary">Excel (.xlsx, .xls)</Badge>
                  <Badge variant="secondary">CSV</Badge>
                  <Badge variant="secondary">Images (PNG, JPG)</Badge>
                  <Badge variant="secondary">Text files</Badge>
                </div>
              </Card>

              <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Important: Document Codes
                </h4>
                <p className="text-xs text-muted-foreground">
                  Each PO must have a unique document code (ML for market list, RQ for requisition). 
                  Duplicate codes will be rejected to prevent double entries.
                </p>
              </Card>
            </TabsContent>

            {/* Receiving Tab */}
            <TabsContent value="receive" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">How to Receive Items</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">1</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Navigate to Received Items</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Go to Ops Tools → Inventory → Received Items
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">2</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Upload Receiving Document</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload the delivery note or receiving document with the same document code as the PO
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">3</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Document Code Validation</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      System validates that the document code exists in your purchase orders
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">4</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Tick Received Items</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check/uncheck items to indicate what was actually received
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5 min-w-6 h-6 justify-center">5</Badge>
                  <div>
                    <h4 className="font-medium text-sm">Confirm & Generate Report</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirm selection to save and generate variance report
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-4 border-green-500/20 bg-green-500/5">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Variance Analysis
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  The system automatically compares received items against the original PO:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Matched - Delivered as ordered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Short - Less than ordered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Over - More than ordered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Missing - Not received</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Tracking & Analytics</h3>

              <Card className="p-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  PO Completion Status
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Total POs</p>
                    <p className="text-xs text-muted-foreground">All uploaded</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground">Items received</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Pending</p>
                    <p className="text-xs text-muted-foreground">Awaiting delivery</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Click on "Pending" card to view all purchase orders awaiting receiving.
                </p>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Available Reports
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Recent Received</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Latest deliveries</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Summary</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Aggregated totals</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Forecast</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Spending predictions</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Price Changes</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Price history</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  Export Options
                </h4>
                <p className="text-xs text-muted-foreground">
                  Download variance reports and summaries as PDF documents for record-keeping and auditing.
                </p>
              </Card>
            </TabsContent>

            {/* Tips Tab */}
            <TabsContent value="tips" className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Pro Tips & Best Practices</h3>

              <div className="space-y-3">
                <Card className="p-4 border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Upload POs First</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Always upload purchase orders before receiving documents. The system validates 
                        receiving docs against existing POs using document codes.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Document Code Format</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use consistent document codes: <strong>ML-XXXXX</strong> for Market List orders 
                        and <strong>RQ-XXXXX</strong> for Material Requisitions.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Review Before Confirming</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        When receiving items, carefully tick/untick each item to accurately reflect 
                        what was actually delivered. This ensures accurate variance reporting.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">No Duplicates Allowed</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        The system prevents duplicate uploads. If you see a rejection message, 
                        check if the document was already uploaded.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-primary/20">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Team Accountability</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Every upload and receiving record shows who submitted it. Use workspaces 
                        to share procurement data across your team.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Need Help?
                </h4>
                <p className="text-xs text-muted-foreground">
                  If you encounter issues or have questions, check that your document has a valid 
                  document code and is in a supported format. The AI parser works best with 
                  clear, well-formatted documents.
                </p>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 border-t">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Got it, let's get started!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
