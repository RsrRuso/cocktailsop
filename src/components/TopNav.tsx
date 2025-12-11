import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper, BadgeCheck, Music, Star, Medal, Diamond, RefreshCw, Zap, ChevronDown, Map, Film, Compass, Brain, Newspaper } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useEffect, useState } from "react";
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
import CreateStatusDialog from "@/components/CreateStatusDialog";
import MusicSelectionDialog from "@/components/MusicSelectionDialog";
import SpotifyConnect from "@/components/SpotifyConnect";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { EventsListDialog } from "@/components/EventsListDialog";
import { useManagerRole } from "@/hooks/useManagerRole";
import { useToast } from "@/hooks/use-toast";
import { MatrixBrainLogo } from "@/components/MatrixBrainLogo";
import { MatrixAIButton } from "@/components/MatrixAIButton";

interface TopNavProps {
  isVisible?: boolean;
}

const TopNav = ({ isVisible = true }: TopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          {/* Left section - SpecVerse Brand with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={lightTap}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
              <span className="text-xl sm:text-2xl font-bold text-foreground italic">
                SpecVerse
              </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="glass z-[60] bg-background/95 backdrop-blur-xl border border-border/50 w-56">
              {/* Features Submenu - Matrix AI to Internal Email */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span>Features</span>
                  </span>
                  <span className="text-xs">▼</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/matrix-ai"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <Brain className="w-4 h-4 mr-2 text-primary" />
                    Matrix AI
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/music-box"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Music Box
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/industry-digest"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <Newspaper className="w-4 h-4 mr-2" />
                    Industry Digest
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/business-hub"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Business Hub
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/shop"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Shop
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => { 
                      lightTap(); 
                      navigate("/email"); 
                    }}
                    className="cursor-pointer ml-4"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Internal Email
                  </DropdownMenuItem>
                </CollapsibleContent>
              </Collapsible>
              
              <DropdownMenuSeparator />
              
              {/* Region Selector with Collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>{regions.find(r => r.name === (selectedRegion || 'All'))?.flag}</span>
                    <span>{selectedRegion || 'All'} Region</span>
                  </span>
                  <span className="text-xs">▼</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {regions.map((region) => (
                    <DropdownMenuItem
                      key={region.name}
                      onClick={() => { 
                        lightTap(); 
                        handleRegionChange(region.name);
                      }}
                      className={`cursor-pointer ml-4 ${selectedRegion === region.name ? 'bg-primary/20 text-primary font-semibold' : ''}`}
                    >
                      <span className="mr-2 text-lg">{region.flag}</span>
                      {region.name}
                    </DropdownMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              
              {selectedRegion && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      lightTap();
                      setEventsDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Events
                  </DropdownMenuItem>
                  
                  {isManager && (
                    <DropdownMenuItem
                      onClick={() => {
                        lightTap();
                        setCreateEventDialogOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Create Event
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => { 
                  lightTap(); 
                  navigate("/automations"); 
                }}
                className="cursor-pointer"
              >
                <Zap className="w-4 h-4 mr-2" />
                Automation Hub
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => { 
                  lightTap(); 
                  navigate("/ops-tools"); 
                }}
                className="cursor-pointer"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Operations Tools
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { 
                  lightTap(); 
                  navigate("/exam-center"); 
                }}
                className="cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Exam Center
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { 
                  lightTap(); 
                  navigate("/introduction"); 
                }}
                className="cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Introduction
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Theme Modes with Collapsible and Scroll */}
              <Collapsible>
                <CollapsibleTrigger className="w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span>Theme Modes</span>
                  </span>
                  <span className="text-xs">▼</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="max-h-[300px] overflow-y-auto scrollbar-thin">
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('light'); }} className="cursor-pointer ml-4">
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('dark'); }} className="cursor-pointer ml-4">
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('black'); }} className="cursor-pointer ml-4">
                    <Moon className="w-4 h-4 mr-2 fill-current" />
                    Black
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('pearl'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-slate-100 to-zinc-300" />
                    Pearl
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('silver'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-gray-400 to-slate-600" />
                    Silver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('champagne'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-amber-200 to-yellow-400" />
                    Champagne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('sunset'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-orange-400 to-pink-600" />
                    Sunset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('ruby'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-red-500 to-pink-700" />
                    Ruby
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('mocha'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-amber-700 to-stone-800" />
                    Mocha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('espresso'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-stone-800 to-zinc-950" />
                    Espresso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { lightTap(); changeTheme('bronze'); }} className="cursor-pointer ml-4">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-br from-amber-600 to-stone-700" />
                    Bronze
                  </DropdownMenuItem>
                </CollapsibleContent>
              </Collapsible>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => { 
                  lightTap(); 
                  clearAppCache();
                }}
                className="cursor-pointer text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache & Reload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right section - Only Notifications and Messages */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              onClick={() => {
                lightTap();
                navigate("/notifications");
              }}
              className="flex items-center justify-center w-12 h-12 transition-all text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-7 h-7" />
              {unreadNotificationsCount > 0 && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </div>
              )}
            </button>

            {/* Messages / Neuron */}
            <button
              onClick={() => {
                lightTap();
                navigate("/messages");
              }}
              className="flex items-center justify-center w-12 h-12 transition-all text-muted-foreground hover:text-foreground relative"
              title="Neuron"
            >
              <Send className="w-7 h-7" />
              {unreadMessagesCount > 0 && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {user && (
        <CreateStatusDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          userId={user.id}
        />
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
    </>
  );
};

export default TopNav;
