import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper, BadgeCheck, Music, Star, Medal, Diamond, RefreshCw, Zap, ChevronDown, Map, Film, Compass, Brain, Newspaper, Share2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getProfessionalBadge } from "@/lib/profileUtils";
import { useHaptic } from "@/hooks/useHaptic";
import { clearAppCache } from "@/lib/clearCache";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";
import MusicSelectionDialog from "@/components/MusicSelectionDialog";
import SpotifyConnect from "@/components/SpotifyConnect";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { EventsListDialog } from "@/components/EventsListDialog";
import { useManagerRole } from "@/hooks/useManagerRole";
import { useToast } from "@/hooks/use-toast";
import { MatrixBrainLogo } from "@/components/MatrixBrainLogo";
import { MatrixAIButton } from "@/components/MatrixAIButton";
import ShareSpecVerseDialog from "@/components/ShareSpecVerseDialog";
import SVLogo from "@/components/SVLogo";

const CreateStatusDialog = lazy(() => import("@/components/CreateStatusDialog"));

interface TopNavProps {
  isVisible?: boolean;
}

const TopNav = ({ isVisible = true }: TopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hide on fullscreen pages (Reels, Story Viewer)
  const hideOnRoutes = ['/reels', '/story-viewer'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));
  
  const { user, profile } = useAuth(); // Use cached auth
  const { lightTap } = useHaptic();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(profile);
  const [viewedUserProfile, setViewedUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState({ isFounder: false, isVerified: false });
  const professionalBadge = getProfessionalBadge(currentUser?.professional_title || null);
  const BadgeIcon = professionalBadge.icon;
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark' | 'black' | 'mocha' | 'espresso' | 'champagne' | 'pearl' | 'silver' | 'sunset' | 'ruby' | 'bronze'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as any) || 'dark';
  });
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    return localStorage.getItem('selectedRegion') || null;
  });
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [shareSpecVerseOpen, setShareSpecVerseOpen] = useState(false);
  const { isManager } = useManagerRole();
  
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    region: 'All',
    event_date: '',
    venue_name: '',
    address: '',
  });
  const [eventLoading, setEventLoading] = useState(false);

  const REGIONS = ['USA', 'UK', 'Europe', 'Asia', 'Middle East', 'Africa', 'All'];

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setEventLoading(true);
    try {
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        title: eventFormData.title,
        description: eventFormData.description || null,
        region: eventFormData.region,
        event_date: eventFormData.event_date || null,
        venue_name: eventFormData.venue_name || null,
        address: eventFormData.address || null,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Event created successfully!",
      });
      setCreateEventDialogOpen(false);
      setEventFormData({ title: '', description: '', region: 'All', event_date: '', venue_name: '', address: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create event',
        variant: "destructive",
      });
    } finally {
      setEventLoading(false);
    }
  };

  // Determine which badge to show
  const displayBadgeProfile = viewedUserProfile || currentUser;

  const regions = [
    { name: "All", flag: "🌐" },
    { name: "USA", flag: "🗽" },
    { name: "UK", flag: "👑" },
    { name: "Europe", flag: "🏰" },
    { name: "Asia", flag: "🏯" },
    { name: "Middle East", flag: "🌙" },
    { name: "Africa", flag: "🦁" },
  ];

  const handleRegionChange = (region: string) => {
    const newRegion = region === 'All' ? null : region;
    setSelectedRegion(newRegion);
    localStorage.setItem('selectedRegion', newRegion || '');
    // Dispatch custom event for same-window communication
    window.dispatchEvent(new CustomEvent('regionChange', { detail: newRegion }));
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeNav = async () => {
      // Use cached profile
      if (profile && isMounted) {
        setCurrentUser(profile);
        
        // Fetch user roles ONLY ONCE in background
        if (user && !userRoles.isFounder && !userRoles.isVerified) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(2); // Only need to check for 2 roles
          
          if (rolesData && isMounted) {
            setUserRoles({
              isFounder: rolesData.some(r => r.role === 'founder'),
              isVerified: rolesData.some(r => r.role === 'verified')
            });
          }
        }
      }
      
      // Fetch counts ONCE
      if (user && isMounted) {
        await Promise.all([
          fetchUnreadNotifications(),
          fetchUnreadMessages()
        ]);
      }
    };

    initializeNav();

    // Remove realtime subscriptions - they cause too much overhead
    // Use polling only when user interacts with notifications/messages
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only re-run if user ID changes

  // Fetch viewed user's profile when on user profile page
  useEffect(() => {
    const fetchViewedUserProfile = async () => {
      const match = location.pathname.match(/^\/user\/([a-f0-9-]+)$/);
      
      if (match) {
        const viewedUserId = match[1];
        
        // Don't fetch if viewing own profile
        if (viewedUserId === user?.id) {
          setViewedUserProfile(null);
          return;
        }
        
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viewedUserId)
          .single();
        
        if (data) {
          setViewedUserProfile(data);
        }
      } else {
        // Not on a user profile page, clear viewed user
        setViewedUserProfile(null);
      }
    };

    fetchViewedUserProfile();
  }, [location.pathname, user?.id]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .neq("type", "message");

    setUnreadNotificationsCount(count || 0);
  };

  const fetchUnreadMessages = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("read", false)
      .neq("sender_id", user.id);

    setUnreadMessagesCount(count || 0);
  };

  const changeTheme = (newTheme: string) => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark', 'black', 'mocha', 'espresso', 'champagne', 'pearl', 'silver', 'sunset', 'ruby', 'bronze');
    html.classList.add(newTheme);
    setTheme(newTheme as any);
    localStorage.setItem('theme', newTheme);
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'diamond':
        return 'from-cyan-400 to-cyan-600';
      case 'platinum':
        return 'from-blue-400 via-blue-500 to-purple-600';
      case 'gold':
        return 'from-yellow-400 to-yellow-600';
      case 'silver':
        return 'from-gray-400 to-gray-600';
      case 'bronze':
      default:
        return 'from-amber-700 to-amber-900';
    }
  };

  // Don't render on fullscreen pages
  if (shouldHide) return null;

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-transparent">
          {/* Left section - SpecVerse Brand with Logo and Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={lightTap}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <SVLogo size="sm" clickable={false} />
                <span className="text-2xl sm:text-3xl font-instagram text-foreground tracking-tight">
                  SpecVerse
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[60] bg-black/40 backdrop-blur-xl border-0 w-48 p-1.5 shadow-none rounded-xl">
              {/* Features */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/10 rounded flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Features
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/matrix-ai"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Brain className="w-3.5 h-3.5 mr-2 text-primary" />Matrix AI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/music-box"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Music className="w-3.5 h-3.5 mr-2 text-pink-400" />Music Box
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/industry-digest"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Newspaper className="w-3.5 h-3.5 mr-2 text-blue-400" />Industry Digest
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/business-hub"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Users className="w-3.5 h-3.5 mr-2 text-green-400" />Business Hub
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/shop"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <ShoppingCart className="w-3.5 h-3.5 mr-2 text-amber-400" />Shop
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/email"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <MessageCircle className="w-3.5 h-3.5 mr-2 text-cyan-400" />Internal Email
                  </DropdownMenuItem>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Region */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/10 rounded flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>{regions.find(r => r.name === (selectedRegion || 'All'))?.flag}</span>
                    {selectedRegion || 'All'} Region
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {regions.map((region) => (
                    <DropdownMenuItem
                      key={region.name}
                      onClick={() => { lightTap(); handleRegionChange(region.name); }}
                      className={`cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10 ${selectedRegion === region.name ? 'text-primary font-medium' : ''}`}
                    >
                      <span className="mr-2">{region.flag}</span>{region.name}
                    </DropdownMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              
              {selectedRegion && (
                <>
                  <DropdownMenuItem onClick={() => { lightTap(); setEventsDialogOpen(true); }} className="cursor-pointer px-2 py-1.5 text-sm hover:bg-white/10">
                    <Calendar className="w-3.5 h-3.5 mr-2 text-violet-400" />View Events
                  </DropdownMenuItem>
                  {isManager && (
                    <DropdownMenuItem onClick={() => { lightTap(); setCreateEventDialogOpen(true); }} className="cursor-pointer px-2 py-1.5 text-sm hover:bg-white/10">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-violet-400" />Create Event
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {/* Tools */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/10 rounded flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 opacity-60" />
                    Tools & Resources
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/automations"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Zap className="w-3.5 h-3.5 mr-2 text-yellow-400" />Automation Hub
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/ops-tools"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Wrench className="w-3.5 h-3.5 mr-2 text-slate-400" />Operations Tools
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/exam-center"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <GraduationCap className="w-3.5 h-3.5 mr-2 text-indigo-400" />Exam Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); navigate("/introduction"); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <BookOpen className="w-3.5 h-3.5 mr-2 text-emerald-400" />Introduction
                  </DropdownMenuItem>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Theme */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/10 rounded flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4 opacity-60" />
                    Theme Modes
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </CollapsibleTrigger>
                <CollapsibleContent className="max-h-[160px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('light'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Sun className="w-3.5 h-3.5 mr-2 text-amber-400" />Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('dark'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Moon className="w-3.5 h-3.5 mr-2 text-slate-400" />Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('black'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <Moon className="w-3.5 h-3.5 mr-2 fill-current" />Black
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('pearl'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-slate-100 to-zinc-300" />Pearl
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('silver'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-gray-400 to-slate-600" />Silver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('champagne'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-amber-200 to-yellow-400" />Champagne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('sunset'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-orange-400 to-pink-600" />Sunset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('ruby'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-red-500 to-pink-700" />Ruby
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('mocha'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-amber-700 to-stone-800" />Mocha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('espresso'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-stone-800 to-zinc-950" />Espresso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('bronze'); }} className="cursor-pointer pl-7 py-1.5 text-sm hover:bg-white/10">
                    <div className="w-3.5 h-3.5 mr-2 rounded-full bg-gradient-to-br from-amber-600 to-stone-700" />Bronze
                  </DropdownMenuItem>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Share SpecVerse - clean B&W button style */}
              <DropdownMenuItem 
                onClick={() => { lightTap(); setShareSpecVerseOpen(true); }} 
                className="cursor-pointer mx-2 my-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share SpecVerse
              </DropdownMenuItem>
              
              {/* Clear Cache - clean B&W outlined button style */}
              <DropdownMenuItem 
                onClick={() => { lightTap(); clearAppCache(); }} 
                className="cursor-pointer mx-2 my-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border border-white/30 text-white bg-transparent hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Cache
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right section - Only Notifications and Messages */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <button
              onClick={() => {
                lightTap();
                navigate("/notifications");
              }}
              className="flex items-center justify-center w-10 h-10 transition-all text-white/80 relative"
            >
              <Bell className="w-6 h-6" />
              {unreadNotificationsCount > 0 && (
                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-medium text-white">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </div>
              )}
            </button>

            {/* Messages */}
            <button
              onClick={() => {
                lightTap();
                navigate("/messages");
              }}
              className="flex items-center justify-center w-10 h-10 transition-all text-white/80 relative"
            >
              <Send className="w-6 h-6" />
              {unreadMessagesCount > 0 && (
                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-medium text-white">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {user && (
        <Suspense fallback={null}>
          <CreateStatusDialog
            open={showStatusDialog}
            onOpenChange={setShowStatusDialog}
            userId={user.id}
          />
        </Suspense>
      )}

      <MusicSelectionDialog
        open={musicDialogOpen}
        onOpenChange={setMusicDialogOpen}
      />

      <BadgeInfoDialog 
        open={badgeDialogOpen}
        onOpenChange={setBadgeDialogOpen}
        badgeLevel={currentUser?.badge_level || 'bronze'}
        username={currentUser?.username}
        isFounder={userRoles.isFounder}
        isVerified={userRoles.isVerified}
        isOwnProfile={true}
      />

      {selectedRegion && (
        <>
          <EventsListDialog
            region={selectedRegion}
            open={eventsDialogOpen}
            onOpenChange={setEventsDialogOpen}
          />
          
          <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Create New Event
                </DialogTitle>
                <DialogDescription>
                  Create an event announcement that will appear in the ticker for the selected region.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={eventFormData.title}
                    onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                    placeholder="Annual Mixology Competition"
                    required
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                    placeholder="Join us for the biggest mixology event of the year..."
                    rows={3}
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select
                    value={eventFormData.region}
                    onValueChange={(value) => setEventFormData({ ...eventFormData, region: value })}
                  >
                    <SelectTrigger className="glass">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_date">Event Date</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={eventFormData.event_date}
                    onChange={(e) => setEventFormData({ ...eventFormData, event_date: e.target.value })}
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_name">Venue Name</Label>
                  <Input
                    id="venue_name"
                    value={eventFormData.venue_name}
                    onChange={(e) => setEventFormData({ ...eventFormData, venue_name: e.target.value })}
                    placeholder="The Grand Hotel"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={eventFormData.address}
                    onChange={(e) => setEventFormData({ ...eventFormData, address: e.target.value })}
                    placeholder="123 Main Street, Dubai"
                    className="glass"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateEventDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={eventLoading}>
                    {eventLoading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      
      <ShareSpecVerseDialog 
        open={shareSpecVerseOpen} 
        onOpenChange={setShareSpecVerseOpen} 
      />
    </>
  );
};

export default TopNav;
