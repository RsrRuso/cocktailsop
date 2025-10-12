import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper, BadgeCheck, Music, Star, Medal, Diamond } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getProfessionalBadge } from "@/lib/profileUtils";
import { useHaptic } from "@/hooks/useHaptic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const TopNav = () => {
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
  const [theme, setTheme] = useState<'light' | 'grey' | 'dark' | 'black'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'grey' | 'dark' | 'black') || 'dark';
  });
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    return localStorage.getItem('selectedRegion') || null;
  });
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
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

  const changeTheme = (newTheme: 'light' | 'grey' | 'dark' | 'black') => {
    const html = document.documentElement;
    html.classList.remove('light', 'grey', 'dark', 'black');
    html.classList.add(newTheme);
    setTheme(newTheme);
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
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Badge Level Indicator - Moved to left corner */}
            {displayBadgeProfile?.badge_level && (
              <div className="relative group">
                <div className={`absolute -inset-2 bg-gradient-to-br ${getBadgeColor(displayBadgeProfile.badge_level)} blur-lg opacity-50 group-hover:opacity-75 transition-all duration-300 ${displayBadgeProfile.badge_level === 'platinum' ? 'rounded-xl' : 'rounded-full'} animate-pulse`} />
                {displayBadgeProfile.badge_level === 'platinum' ? (
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${getBadgeColor(displayBadgeProfile.badge_level)} flex items-center justify-center shadow-2xl ring-2 ring-white/40 group-hover:scale-110 transition-transform duration-200`}>
                    <Star className="w-5 h-5 text-white" strokeWidth={2.5} fill="none" />
                  </div>
                ) : displayBadgeProfile.badge_level === 'gold' ? (
                  <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(displayBadgeProfile.badge_level)} flex items-center justify-center shadow-2xl ring-2 ring-white/40 group-hover:scale-110 transition-transform duration-200`}>
                    <Star className="w-5 h-5 text-yellow-900" strokeWidth={2.5} fill="currentColor" />
                  </div>
                ) : displayBadgeProfile.badge_level === 'diamond' ? (
                  <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(displayBadgeProfile.badge_level)} flex items-center justify-center shadow-2xl ring-2 ring-white/40 group-hover:scale-110 transition-transform duration-200`}>
                    <Diamond className="w-5 h-5 text-cyan-900" strokeWidth={2} fill="none" />
                  </div>
                ) : (
                  <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(displayBadgeProfile.badge_level)} flex items-center justify-center shadow-2xl ring-2 ring-white/40 group-hover:scale-110 transition-transform duration-200`}>
                    <Medal className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                )}
              </div>
            )}

            {/* Music Button */}
            <button
              onClick={() => {
                lightTap();
                setMusicDialogOpen(true);
              }}
              className="glass-hover p-2.5 rounded-2xl"
            >
              <Music className="w-5 h-5" />
            </button>

            {/* Region Dropdown */}
            <DropdownMenu open={regionDropdownOpen} onOpenChange={setRegionDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={lightTap}
                  className="glass-hover p-2.5 rounded-2xl flex items-center gap-1.5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedRegion && (
                    <span className="text-xs">{regions.find(r => r.name === selectedRegion)?.flag}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="glass z-[60] bg-background/95 backdrop-blur-xl border border-border/50">
                {regions.map((region) => (
                  <DropdownMenuItem
                    key={region.name}
                    onClick={() => { 
                      lightTap(); 
                      handleRegionChange(region.name);
                    }}
                    className={`cursor-pointer ${selectedRegion === region.name ? 'bg-primary/20 text-primary font-semibold' : ''}`}
                  >
                    <span className="mr-2 text-lg">{region.flag}</span>
                    {region.name}
                  </DropdownMenuItem>
                ))}
                
                {selectedRegion && (
                  <>
                    <div className="my-1 h-px bg-border/50" />
                    <DropdownMenuItem
                      onClick={() => {
                        lightTap();
                        setEventsDialogOpen(true);
                        setRegionDropdownOpen(false);
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
                          setRegionDropdownOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Create Event
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Spotify Connect */}
            {/* <SpotifyConnect /> */}
          </div>

          <div className="flex items-center gap-2">
          <button
            onClick={() => {
              lightTap();
              navigate("/notifications");
            }}
            className="glass-hover p-2.5 rounded-2xl relative"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </div>
            )}
          </button>

          <button
            onClick={() => {
              lightTap();
              navigate("/messages");
            }}
            className="glass-hover p-2.5 rounded-2xl relative"
          >
            <Send className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </div>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={lightTap}
                className="glass-hover p-2.5 rounded-2xl"
              >
                <Palette className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={() => { lightTap(); changeTheme('light'); }}>
                <Sun className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { lightTap(); changeTheme('grey'); }}>
                <Palette className="w-4 h-4 mr-2" />
                Grey
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { lightTap(); changeTheme('dark'); }}>
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { lightTap(); changeTheme('black'); }}>
                <Moon className="w-4 h-4 mr-2 fill-current" />
                Black
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => {
              lightTap();
              navigate("/ops-tools");
            }}
            className="glass-hover p-2 rounded-2xl font-semibold text-[10px]"
          >
            OPS
          </button>
          
          <button
            onClick={() => {
              lightTap();
              navigate("/introduction");
            }}
            className="glass-hover p-2 rounded-2xl font-semibold text-[10px]"
          >
            INFO
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
