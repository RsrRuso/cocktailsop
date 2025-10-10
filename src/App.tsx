// App Root Component
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
const Thunder = lazy(() => import("./pages/Thunder"));
const Messages = lazy(() => import("./pages/Messages"));
const MessageThread = lazy(() => import("./pages/MessageThread"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Tools = lazy(() => import("./pages/Tools"));
const OpsTools = lazy(() => import("./pages/OpsTools"));
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
const RecipeVault = lazy(() => import("./pages/RecipeVault"));
const CocktailSpecs = lazy(() => import("./pages/CocktailSpecs"));
const Explore = lazy(() => import("./pages/Explore"));
const Create = lazy(() => import("./pages/Create"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const CreateReel = lazy(() => import("./pages/CreateReel"));
const StoryOptions = lazy(() => import("./pages/StoryOptions"));
const Reels = lazy(() => import("./pages/Reels"));
const Reposted = lazy(() => import("./pages/Reposted"));
const StoryViewer = lazy(() => import("./pages/StoryViewer"));
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
  <TooltipProvider>
    <BrowserRouter>
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
          <Route path="/thunder" element={<Thunder />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<MessageThread />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/ops-tools" element={<OpsTools />} />
          <Route path="/inventory-manager" element={<InventoryManager />} />
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
          <Route path="/recipe-vault" element={<RecipeVault />} />
          <Route path="/cocktail-specs" element={<CocktailSpecs />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/create/post" element={<CreatePost />} />
          <Route path="/create/story" element={<CreateStory />} />
          <Route path="/create/reel" element={<CreateReel />} />
          <Route path="/story-options" element={<StoryOptions />} />
          <Route path="/story/:userId" element={<StoryViewer />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reposted" element={<Reposted />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
