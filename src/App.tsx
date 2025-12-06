import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { InAppNotificationProvider } from "@/contexts/InAppNotificationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { FifoWorkspaceProvider } from "@/hooks/useFifoWorkspace";
import { RoutePreloader } from "@/components/RoutePreloader";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { usePageTransition } from "@/hooks/usePageTransition";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAutomationProcessor } from "@/hooks/useAutomationProcessor";

// Eager load ONLY index/landing/auth (no user data)
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";

// Lazy load ALL other routes including Home for code splitting
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const EditPost = lazy(() => import("./pages/EditPost"));
const EditReel = lazy(() => import("./pages/EditReel"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Thunder = lazy(() => import("./pages/Thunder"));
const Messages = lazy(() => import("./pages/Messages"));
const MessageThread = lazy(() => import("./pages/MessageThread"));
const Email = lazy(() => import("./pages/Email"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Tools = lazy(() => import("./pages/Tools"));
const BusinessHub = lazy(() => import("./pages/BusinessHub"));
const OpsTools = lazy(() => import("./pages/OpsTools"));
const TaskManager = lazy(() => import("./pages/TaskManager"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const AdvancedEditor = lazy(() => import("./pages/AdvancedEditor"));
const ReelEditor = lazy(() => import("./pages/ReelEditor"));
const ReelEditorPro = lazy(() => import("./pages/ReelEditorPro"));
const TeamInvitation = lazy(() => import("./pages/TeamInvitation"));
const InventoryManager = lazy(() => import("./pages/InventoryManager"));
const TemperatureLog = lazy(() => import("./pages/TemperatureLog"));
const BatchCalculator = lazy(() => import("./pages/BatchCalculator"));
const BatchRecipes = lazy(() => import("./pages/BatchRecipes"));
const BatchQRSubmit = lazy(() => import("./pages/BatchQRSubmit"));
const BatchView = lazy(() => import("./pages/BatchView"));
const MasterSpirits = lazy(() => import("./pages/MasterSpirits"));
const ABVCalculator = lazy(() => import("./pages/ABVCalculator"));
const ScalingTool = lazy(() => import("./pages/ScalingTool"));
const CostCalculator = lazy(() => import("./pages/CostCalculator"));
const PourCostAnalysis = lazy(() => import("./pages/PourCostAnalysis"));
const WastageTracker = lazy(() => import("./pages/WastageTracker"));
const MenuEngineering = lazy(() => import("./pages/MenuEngineering"));
const MenuEngineeringPro = lazy(() => import("./pages/MenuEngineeringPro"));
const StockAudit = lazy(() => import("./pages/StockAudit"));
const YieldCalculator = lazy(() => import("./pages/YieldCalculator"));
const SalesReport = lazy(() => import("./pages/SalesReport"));
const InventoryValuationReport = lazy(() => import("./pages/InventoryValuationReport"));
const VarianceReport = lazy(() => import("./pages/VarianceReport"));
const RecipeVault = lazy(() => import("./pages/RecipeVault"));
const CocktailSpecs = lazy(() => import("./pages/CocktailSpecs"));
const CocktailSOP = lazy(() => import("./pages/CocktailSOP"));
const CocktailSOPLibrary = lazy(() => import("./pages/CocktailSOPLibrary"));
const CRM = lazy(() => import("./pages/CRM"));
const CRMLeads = lazy(() => import("./pages/CRMLeads"));
const CRMContacts = lazy(() => import("./pages/CRMContacts"));
const CRMDeals = lazy(() => import("./pages/CRMDeals"));
const CRMActivities = lazy(() => import("./pages/CRMActivities"));
const Explore = lazy(() => import("./pages/Explore"));
const Create = lazy(() => import("./pages/Create"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const CreateReel = lazy(() => import("./pages/CreateReel"));
const StoryOptions = lazy(() => import("./pages/StoryOptions"));
const Reels = lazy(() => import("./pages/Reels"));
const Reposted = lazy(() => import("./pages/Reposted"));
const StoryViewer = lazy(() => import("./pages/StoryViewer"));
const UpdateMusicLibrary = lazy(() => import("./pages/UpdateMusicLibrary"));
const Music = lazy(() => import("./pages/Music"));
const Introduction = lazy(() => import("./pages/Introduction"));
const Chat = lazy(() => import("./pages/Chat"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Documents = lazy(() => import("./pages/Documents"));
const Company = lazy(() => import("./pages/Company"));
const TimeOff = lazy(() => import("./pages/TimeOff"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const PaymentOptions = lazy(() => import("./pages/PaymentOptions"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ShopAuth = lazy(() => import("./pages/ShopAuth"));
const Orders = lazy(() => import("./pages/Orders"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const StaffScheduling = lazy(() => import("./pages/StaffScheduling"));
const QRAccessCode = lazy(() => import("./pages/QRAccessCode"));
const ScanAccess = lazy(() => import("./pages/ScanAccess"));
const AccessApproval = lazy(() => import("./pages/AccessApproval"));
const LowStockInventory = lazy(() => import("./pages/LowStockInventory"));
const EventDetail = lazy(() => import("./pages/EventDetail"));

const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const AllInventory = lazy(() => import("./pages/AllInventory"));
const InventoryTransactions = lazy(() => import("./pages/InventoryTransactions"));
const StoresAdmin = lazy(() => import("./pages/StoresAdmin"));
const MasterItems = lazy(() => import("./pages/MasterItems"));
const WorkspaceManagement = lazy(() => import("./pages/WorkspaceManagement"));
const FifoWorkspaceManagement = lazy(() => import("./pages/FifoWorkspaceManagement"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const FifoQRAccessCode = lazy(() => import("./pages/FifoQRAccessCode"));
const FifoScanAccess = lazy(() => import("./pages/FifoScanAccess"));
const FifoAccessApproval = lazy(() => import("./pages/FifoAccessApproval"));
const FifoRequestAccess = lazy(() => import("./pages/FifoRequestAccess"));
const FifoAccessApprovalPage = lazy(() => import("./pages/FifoAccessApprovalPage"));
const TransferQRGenerator = lazy(() => import("@/pages/TransferQRGenerator"));
const ScanTransfer = lazy(() => import("@/pages/ScanTransfer"));
const ScanReceive = lazy(() => import("@/pages/ScanReceive"));
const MapPlanner = lazy(() => import("@/pages/MapPlanner"));
const Install = lazy(() => import("@/pages/Install"));
const MatrixAI = lazy(() => import("@/pages/MatrixAI"));
const LiveMap = lazy(() => import("@/pages/LiveMap"));
const VenueDetail = lazy(() => import("@/pages/VenueDetail"));
const Automations = lazy(() => import("@/pages/Automations"));
const FinancialReportsHub = lazy(() => import("@/pages/FinancialReportsHub"));
const ProfitLossReport = lazy(() => import("@/pages/reports/ProfitLossReport"));
const DailySalesReport = lazy(() => import("@/pages/reports/DailySalesReport"));
const CashFlowReport = lazy(() => import("@/pages/reports/CashFlowReport"));
const COGSReport = lazy(() => import("@/pages/reports/COGSReport"));
const LaborCostReport = lazy(() => import("@/pages/reports/LaborCostReport"));
const BudgetActualReport = lazy(() => import("@/pages/reports/BudgetActualReport"));
const StockMovementReport = lazy(() => import("@/pages/reports/StockMovementReport"));
const RevenueByCategory = lazy(() => import("@/pages/reports/RevenueByCategory"));
const BreakevenReport = lazy(() => import("@/pages/reports/BreakevenReport"));
const DailyOpsReport = lazy(() => import("@/pages/reports/DailyOpsReport"));
const LabOps = lazy(() => import("@/pages/LabOps"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

// Wrapper component inside Router to use routing hooks
const AppContent = () => {
  usePageTransition(); // Now inside Router context
  const { requestPermission } = usePushNotifications();
  useAutomationProcessor(); // Process automation webhooks in background
  
  useEffect(() => {
    // Request notification permission on app load
    const initNotifications = async () => {
      await requestPermission();
    };
    initNotifications();
  }, [requestPermission]);
  
  return (
    <>
      <RoutePreloader />
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <PWAUpdatePrompt />
      <Suspense fallback={<PageLoader />}>
              <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/edit-post/:id" element={<EditPost />} />
          <Route path="/edit-reel/:id" element={<EditReel />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/thunder" element={<Thunder />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<MessageThread />} />
          <Route path="/email" element={<Email />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/business-hub" element={<BusinessHub />} />
          <Route path="/ops-tools" element={<OpsTools />} />
          <Route path="/task-manager" element={<TaskManager />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/team-dashboard" element={<TeamDashboard />} />
          <Route path="/advanced-editor" element={<AdvancedEditor />} />
          <Route path="/reel-editor" element={<ReelEditor />} />
          <Route path="/reel-editor-pro" element={<ReelEditorPro />} />
          <Route path="/team-invitation" element={<TeamInvitation />} />
               <Route path="/inventory-manager" element={<InventoryManager />} />
               <Route path="/qr-access-code" element={<QRAccessCode />} />
               <Route path="/scan-access/:workspaceId" element={<ScanAccess />} />
               <Route path="/access-approval" element={<AccessApproval />} />
               <Route path="/transfer-qr" element={<TransferQRGenerator />} />
               <Route path="/scan-transfer/:qrCodeId" element={<ScanTransfer />} />
               <Route path="/scan-receive/:qrCodeId" element={<ScanReceive />} />
               <Route path="/low-stock-inventory/:workspaceId" element={<LowStockInventory />} />
               <Route path="/store-management" element={<StoreManagement />} />
               <Route path="/store/:id" element={<StoreDetail />} />
               <Route path="/all-inventory" element={<AllInventory />} />
               <Route path="/inventory-transactions" element={<InventoryTransactions />} />
               <Route path="/stores-admin" element={<StoresAdmin />} />
               <Route path="/master-items" element={<MasterItems />} />
               <Route path="/workspace-management" element={<WorkspaceManagement />} />
               <Route path="/fifo-workspace-management" element={<FifoWorkspaceManagement />} />
                <Route path="/fifo-qr-access-code" element={<FifoQRAccessCode />} />
                <Route path="/fifo-scan-access/:qrCodeId" element={<FifoScanAccess />} />
                <Route path="/fifo-access-approval" element={<FifoAccessApproval />} />
                <Route path="/fifo-request-access" element={<FifoRequestAccess />} />
                <Route path="/fifo-access-approval-page" element={<FifoAccessApprovalPage />} />
                <Route path="/temperature-log" element={<TemperatureLog />} />
          <Route path="/batch-calculator" element={<BatchCalculator />} />
          <Route path="/batch-recipes" element={<BatchRecipes />} />
          <Route path="/batch-qr/:qrId" element={<BatchQRSubmit />} />
          <Route path="/batch-view/:productionId" element={<BatchView />} />
          <Route path="/master-spirits" element={<MasterSpirits />} />
          <Route path="/abv-calculator" element={<ABVCalculator />} />
          <Route path="/scaling-tool" element={<ScalingTool />} />
          <Route path="/cost-calculator" element={<CostCalculator />} />
          <Route path="/pour-cost-analysis" element={<PourCostAnalysis />} />
          <Route path="/wastage-tracker" element={<WastageTracker />} />
          <Route path="/menu-engineering" element={<MenuEngineering />} />
          <Route path="/menu-engineering-pro" element={<MenuEngineeringPro />} />
          <Route path="/stock-audit" element={<StockAudit />} />
          <Route path="/yield-calculator" element={<YieldCalculator />} />
          <Route path="/sales-report" element={<SalesReport />} />
          <Route path="/inventory-valuation-report" element={<InventoryValuationReport />} />
          <Route path="/variance-report" element={<VarianceReport />} />
          <Route path="/recipe-vault" element={<RecipeVault />} />
          <Route path="/cocktail-specs" element={<CocktailSpecs />} />
          <Route path="/cocktail-sop" element={<CocktailSOP />} />
          <Route path="/cocktail-sop-library" element={<CocktailSOPLibrary />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/leads" element={<CRMLeads />} />
          <Route path="/crm/contacts" element={<CRMContacts />} />
          <Route path="/crm/deals" element={<CRMDeals />} />
          <Route path="/crm/activities" element={<CRMActivities />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/create/post" element={<CreatePost />} />
          <Route path="/create/story" element={<CreateStory />} />
          <Route path="/create/reel" element={<CreateReel />} />
          <Route path="/story-options" element={<StoryOptions />} />
          <Route path="/story/:userId" element={<StoryViewer />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reposted" element={<Reposted />} />
          <Route path="/update-music-library" element={<UpdateMusicLibrary />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/financial-reports" element={<FinancialReportsHub />} />
          <Route path="/reports/profit-loss" element={<ProfitLossReport />} />
          <Route path="/reports/daily-sales" element={<DailySalesReport />} />
          <Route path="/reports/cash-flow" element={<CashFlowReport />} />
          <Route path="/reports/cogs" element={<COGSReport />} />
          <Route path="/reports/labor-cost" element={<LaborCostReport />} />
          <Route path="/reports/budget-actual" element={<BudgetActualReport />} />
          <Route path="/reports/stock-movement" element={<StockMovementReport />} />
          <Route path="/reports/revenue-category" element={<RevenueByCategory />} />
          <Route path="/reports/breakeven" element={<BreakevenReport />} />
          <Route path="/reports/daily-ops" element={<DailyOpsReport />} />
          <Route path="/music" element={<Music />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/company" element={<Company />} />
          <Route path="/time-off" element={<TimeOff />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/payment-options" element={<PaymentOptions />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/shop-auth" element={<ShopAuth />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/staff-scheduling" element={<StaffScheduling />} />
          <Route path="/map-planner" element={<MapPlanner />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/venue/:venueId" element={<VenueDetail />} />
          <Route path="/install" element={<Install />} />
          <Route path="/matrix-ai" element={<MatrixAI />} />
          <Route path="/lab-ops" element={<LabOps />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
    </>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <InAppNotificationProvider>
            <WorkspaceProvider>
              <FifoWorkspaceProvider>
                <CartProvider>
                  <AppContent />
                </CartProvider>
              </FifoWorkspaceProvider>
            </WorkspaceProvider>
          </InAppNotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
