// App Root Component
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InAppNotificationProvider } from "@/contexts/InAppNotificationContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { RoutePreloader } from "@/components/RoutePreloader";

// Eager load ONLY index/landing/auth (no user data)
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

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
const Notifications = lazy(() => import("./pages/Notifications"));
const Tools = lazy(() => import("./pages/Tools"));
const BusinessHub = lazy(() => import("./pages/BusinessHub"));
const OpsTools = lazy(() => import("./pages/OpsTools"));
const TaskManager = lazy(() => import("./pages/TaskManager"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const AdvancedEditor = lazy(() => import("./pages/AdvancedEditor"));
const ReelEditor = lazy(() => import("./pages/ReelEditor"));
const TeamInvitation = lazy(() => import("./pages/TeamInvitation"));
const InventoryManager = lazy(() => import("./pages/InventoryManager"));
const TemperatureLog = lazy(() => import("./pages/TemperatureLog"));
const BatchCalculator = lazy(() => import("./pages/BatchCalculator"));
const ABVCalculator = lazy(() => import("./pages/ABVCalculator"));
const ScalingTool = lazy(() => import("./pages/ScalingTool"));
const CostCalculator = lazy(() => import("./pages/CostCalculator"));
const PourCostAnalysis = lazy(() => import("./pages/PourCostAnalysis"));
const WastageTracker = lazy(() => import("./pages/WastageTracker"));
const MenuEngineering = lazy(() => import("./pages/MenuEngineering"));
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
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ShopAuth = lazy(() => import("./pages/ShopAuth"));
const Orders = lazy(() => import("./pages/Orders"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const StaffScheduling = lazy(() => import("./pages/StaffScheduling"));
const QRAccessCode = lazy(() => import("./pages/QRAccessCode"));
const ScanAccess = lazy(() => import("./pages/ScanAccess"));
const AccessApproval = lazy(() => import("./pages/AccessApproval"));
const ExpiringInventory = lazy(() => import("./pages/ExpiringInventory"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const AllInventory = lazy(() => import("./pages/AllInventory"));
const InventoryTransactions = lazy(() => import("./pages/InventoryTransactions"));
const StoresAdmin = lazy(() => import("./pages/StoresAdmin"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <InAppNotificationProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <CartProvider>
                <RoutePreloader />
                <Toaster />
                <Sonner />
                <Suspense fallback={<PageLoader />}>
                <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/edit-post/:id" element={<EditPost />} />
          <Route path="/edit-reel/:id" element={<EditReel />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/thunder" element={<Thunder />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<MessageThread />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/business-hub" element={<BusinessHub />} />
          <Route path="/ops-tools" element={<OpsTools />} />
          <Route path="/task-manager" element={<TaskManager />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/team-dashboard" element={<TeamDashboard />} />
          <Route path="/advanced-editor" element={<AdvancedEditor />} />
          <Route path="/reel-editor" element={<ReelEditor />} />
          <Route path="/team-invitation" element={<TeamInvitation />} />
              <Route path="/inventory-manager" element={<InventoryManager />} />
              <Route path="/qr-access-code" element={<QRAccessCode />} />
              <Route path="/scan-access/:workspaceId" element={<ScanAccess />} />
              <Route path="/access-approval" element={<AccessApproval />} />
              <Route path="/expiring-inventory/:workspaceId" element={<ExpiringInventory />} />
              <Route path="/store-management" element={<StoreManagement />} />
              <Route path="/store/:id" element={<StoreDetail />} />
              <Route path="/all-inventory" element={<AllInventory />} />
              <Route path="/inventory-transactions" element={<InventoryTransactions />} />
              <Route path="/stores-admin" element={<StoresAdmin />} />
              <Route path="/temperature-log" element={<TemperatureLog />} />
          <Route path="/batch-calculator" element={<BatchCalculator />} />
          <Route path="/abv-calculator" element={<ABVCalculator />} />
          <Route path="/scaling-tool" element={<ScalingTool />} />
          <Route path="/cost-calculator" element={<CostCalculator />} />
          <Route path="/pour-cost-analysis" element={<PourCostAnalysis />} />
          <Route path="/wastage-tracker" element={<WastageTracker />} />
          <Route path="/menu-engineering" element={<MenuEngineering />} />
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
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/shop-auth" element={<ShopAuth />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/staff-scheduling" element={<StaffScheduling />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CartProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </InAppNotificationProvider>
    </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
