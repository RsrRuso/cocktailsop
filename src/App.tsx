// App Root Component
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import EditPost from "./pages/EditPost";
import EditReel from "./pages/EditReel";
import Thunder from "./pages/Thunder";
import Messages from "./pages/Messages";
import MessageThread from "./pages/MessageThread";
import Notifications from "./pages/Notifications";
import Tools from "./pages/Tools";
import OpsTools from "./pages/OpsTools";
import Explore from "./pages/Explore";
import Create from "./pages/Create";
import CreatePost from "./pages/CreatePost";
import CreateStory from "./pages/CreateStory";
import CreateReel from "./pages/CreateReel";
import StoryOptions from "./pages/StoryOptions";
import Reels from "./pages/Reels";
import Reposted from "./pages/Reposted";
import StoryViewer from "./pages/StoryViewer";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <Toaster />
      <Sonner />
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
      </BrowserRouter>
    </TooltipProvider>
);

export default App;
