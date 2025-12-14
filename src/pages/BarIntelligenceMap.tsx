import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, TrendingUp, Flame, Wine, Users, Calendar, 
  Search, X, Filter, ChevronRight, Activity, 
  Sparkles, Globe, ArrowLeft, Zap, BarChart3,
  Music, Clock, Star, Eye, Heart, MessageCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

interface VenueData {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  buzzScore: number;
  trendingCocktails: string[];
  activeEvents: number;
  recentActivity: number;
}

interface TrendingCocktail {
  name: string;
  mentions: number;
  growth: number;
  venues: string[];
}

interface LiveEvent {
  id: string;
  title: string;
  venue: string;
  attendees: number;
  startTime: string;
}

const BarIntelligenceMap = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('live');
  const [selectedVenue, setSelectedVenue] = useState<VenueData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Intelligence data
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [trendingCocktails, setTrendingCocktails] = useState<TrendingCocktail[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [globalStats, setGlobalStats] = useState({
    activeVenues: 0,
    totalActivity: 0,
    trendingDrinks: 0,
    liveEvents: 0
  });

  // Simulated real-time data (would connect to real data in production)
  const generateMockVenues = useCallback(() => {
    const mockVenues: VenueData[] = [
      { id: '1', name: 'Attiko Dubai', type: 'rooftop', lat: 25.0921, lon: 55.1444, buzzScore: 92, trendingCocktails: ['Espresso Martini', 'Negroni'], activeEvents: 2, recentActivity: 156 },
      { id: '2', name: 'Galaxy Bar', type: 'sky-bar', lat: 25.2208, lon: 55.2818, buzzScore: 88, trendingCocktails: ['Old Fashioned'], activeEvents: 1, recentActivity: 89 },
      { id: '3', name: 'Penthouse', type: 'rooftop', lat: 25.0769, lon: 55.1343, buzzScore: 95, trendingCocktails: ['Mojito', 'Daiquiri'], activeEvents: 3, recentActivity: 234 },
      { id: '4', name: 'VOID Dubai', type: 'lounge', lat: 25.1988, lon: 55.2773, buzzScore: 78, trendingCocktails: ['Whiskey Sour'], activeEvents: 0, recentActivity: 45 },
      { id: '5', name: 'CÉ LA VI', type: 'sky-bar', lat: 25.2086, lon: 55.2681, buzzScore: 85, trendingCocktails: ['Singapore Sling', 'Mai Tai'], activeEvents: 1, recentActivity: 112 },
      { id: '6', name: 'Zuma Dubai', type: 'restaurant-bar', lat: 25.2175, lon: 55.2797, buzzScore: 91, trendingCocktails: ['Japanese Highball', 'Sake Martini'], activeEvents: 2, recentActivity: 189 },
      { id: '7', name: 'Gold On 27', type: 'luxury', lat: 25.1413, lon: 55.1853, buzzScore: 97, trendingCocktails: ['Gold Rush', 'Champagne Cocktail'], activeEvents: 1, recentActivity: 78 },
      { id: '8', name: 'Twiggy', type: 'beach-club', lat: 25.0905, lon: 55.1378, buzzScore: 82, trendingCocktails: ['Aperol Spritz', 'Frozen Margarita'], activeEvents: 2, recentActivity: 145 },
    ];
    return mockVenues;
  }, []);

  const generateMockTrending = useCallback(() => {
    return [
      { name: 'Espresso Martini', mentions: 1247, growth: 23, venues: ['Attiko', 'Penthouse', 'Galaxy Bar'] },
      { name: 'Negroni', mentions: 892, growth: 15, venues: ['Zuma', 'VOID', 'CÉ LA VI'] },
      { name: 'Old Fashioned', mentions: 756, growth: 8, venues: ['Galaxy Bar', 'Gold On 27'] },
      { name: 'Aperol Spritz', mentions: 634, growth: 31, venues: ['Twiggy', 'Nammos', 'WHITE Beach'] },
      { name: 'Mojito', mentions: 589, growth: 5, venues: ['Penthouse', 'Mercury Lounge'] },
    ];
  }, []);

  const generateMockEvents = useCallback(() => {
    return [
      { id: '1', title: 'Sunset Sessions', venue: 'Attiko Dubai', attendees: 156, startTime: '18:00' },
      { id: '2', title: 'Jazz Night', venue: 'Galaxy Bar', attendees: 89, startTime: '20:00' },
      { id: '3', title: 'DJ Set by Solomun', venue: 'Penthouse', attendees: 342, startTime: '22:00' },
      { id: '4', title: 'Cocktail Masterclass', venue: 'Zuma Dubai', attendees: 45, startTime: '17:00' },
    ];
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapRef.current = L.map(mapContainer.current, {
      center: [25.15, 55.22],
      zoom: 11,
      zoomControl: false,
    });

    // Dark elegant tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    // Create heat layer group
    heatLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Load data and update markers
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Load mock data (replace with real data queries)
      const venueData = generateMockVenues();
      const trending = generateMockTrending();
      const events = generateMockEvents();
      
      setVenues(venueData);
      setTrendingCocktails(trending);
      setLiveEvents(events);
      setGlobalStats({
        activeVenues: venueData.length,
        totalActivity: venueData.reduce((sum, v) => sum + v.recentActivity, 0),
        trendingDrinks: trending.length,
        liveEvents: events.length
      });

      // Update map markers
      if (mapRef.current) {
        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add venue markers with buzz intensity
        venueData.forEach(venue => {
          const buzzColor = venue.buzzScore > 90 ? '#ef4444' : 
                           venue.buzzScore > 80 ? '#f97316' : 
                           venue.buzzScore > 70 ? '#eab308' : '#22c55e';
          
          const pulseClass = venue.buzzScore > 85 ? 'animate-pulse' : '';
          
          const icon = L.divIcon({
            html: `
              <div class="relative cursor-pointer group">
                <div class="${pulseClass} w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20"
                     style="background: ${buzzColor}; box-shadow: 0 0 20px ${buzzColor}50;">
                  <span class="text-white text-xs font-bold">${venue.buzzScore}</span>
                </div>
                ${venue.activeEvents > 0 ? `
                  <div class="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
                    ${venue.activeEvents}
                  </div>
                ` : ''}
              </div>
            `,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const marker = L.marker([venue.lat, venue.lon], { icon })
            .addTo(mapRef.current!)
            .on('click', () => setSelectedVenue(venue));
          
          markersRef.current.push(marker);
        });

        // Add heat circles
        if (heatLayerRef.current) {
          heatLayerRef.current.clearLayers();
          venueData.forEach(venue => {
            const radius = (venue.buzzScore / 100) * 800;
            const opacity = venue.buzzScore / 200;
            
            L.circle([venue.lat, venue.lon], {
              radius,
              fillColor: '#f97316',
              fillOpacity: opacity,
              stroke: false,
            }).addTo(heatLayerRef.current!);
          });
        }
      }
      
      setIsLoading(false);
    };

    loadData();
    
    // Refresh every 30 seconds for live feel
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [generateMockVenues, generateMockTrending, generateMockEvents]);

  const getBuzzLabel = (score: number) => {
    if (score > 90) return { label: '🔥 On Fire', color: 'bg-red-500' };
    if (score > 80) return { label: '⚡ Hot', color: 'bg-orange-500' };
    if (score > 70) return { label: '📈 Rising', color: 'bg-yellow-500' };
    return { label: '🌙 Chill', color: 'bg-green-500' };
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 safe-top">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Bar Intelligence Map
            </h1>
            <p className="text-xs text-muted-foreground">Live nightlife data</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search venues, cocktails, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10 rounded-full bg-muted/50 border-border/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Live Stats Ticker */}
      <div className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-primary/10 via-orange-500/10 to-red-500/10 border-b border-border/30">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">{globalStats.activeVenues} Active</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Activity className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium">{globalStats.totalActivity} interactions</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">{globalStats.trendingDrinks} trending</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">{globalStats.liveEvents} live events</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading intelligence...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Panel */}
        <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 rounded-t-3xl z-20 safe-bottom">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-around bg-transparent border-b border-border/30 rounded-none h-12 px-2">
              <TabsTrigger value="live" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 rounded-lg">
                <Zap className="w-4 h-4" />
                <span className="text-xs">Live</span>
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Trending</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 rounded-lg">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Events</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 rounded-lg">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-0 p-3 max-h-[200px]">
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {venues.sort((a, b) => b.buzzScore - a.buzzScore).slice(0, 5).map(venue => {
                    const buzz = getBuzzLabel(venue.buzzScore);
                    return (
                      <motion.div
                        key={venue.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedVenue(venue);
                          mapRef.current?.setView([venue.lat, venue.lon], 14);
                        }}
                      >
                        <div className={`w-10 h-10 rounded-xl ${buzz.color} flex items-center justify-center`}>
                          <span className="text-white text-sm font-bold">{venue.buzzScore}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{venue.name}</p>
                          <p className="text-xs text-muted-foreground">{buzz.label} • {venue.recentActivity} activity</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-[10px]">{venue.type}</Badge>
                          {venue.activeEvents > 0 && (
                            <span className="text-[10px] text-purple-400">{venue.activeEvents} events</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="trending" className="mt-0 p-3 max-h-[200px]">
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {trendingCocktails.map((cocktail, idx) => (
                    <motion.div
                      key={cocktail.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-xl bg-muted/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Wine className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cocktail.name}</p>
                        <p className="text-xs text-muted-foreground">{cocktail.venues.slice(0, 2).join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{cocktail.mentions}</span>
                        <Badge className={`text-[10px] ${cocktail.growth > 20 ? 'bg-green-500' : 'bg-blue-500'}`}>
                          +{cocktail.growth}%
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="events" className="mt-0 p-3 max-h-[200px]">
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {liveEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-xl bg-muted/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.venue}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {event.startTime}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Users className="w-3 h-3" />
                          {event.attendees}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="insights" className="mt-0 p-3 max-h-[200px]">
              <ScrollArea className="h-[180px]">
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-medium">Hottest Venue</span>
                    </div>
                    <p className="font-bold text-sm">Gold On 27</p>
                    <p className="text-xs text-muted-foreground">97 buzz score</p>
                  </Card>
                  <Card className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium">Rising Fast</span>
                    </div>
                    <p className="font-bold text-sm">Aperol Spritz</p>
                    <p className="text-xs text-muted-foreground">+31% this week</p>
                  </Card>
                  <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium">Top Event</span>
                    </div>
                    <p className="font-bold text-sm">DJ Solomun</p>
                    <p className="text-xs text-muted-foreground">342 attending</p>
                  </Card>
                  <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium">Peak Hours</span>
                    </div>
                    <p className="font-bold text-sm">10PM - 1AM</p>
                    <p className="text-xs text-muted-foreground">Highest activity</p>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Venue Detail Sheet */}
      <AnimatePresence>
        {selectedVenue && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-3xl p-4 z-30 safe-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${getBuzzLabel(selectedVenue.buzzScore).color} flex items-center justify-center`}>
                  <span className="text-white font-bold">{selectedVenue.buzzScore}</span>
                </div>
                <div>
                  <h3 className="font-bold">{selectedVenue.name}</h3>
                  <p className="text-sm text-muted-foreground">{getBuzzLabel(selectedVenue.buzzScore).label}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedVenue(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-xl bg-muted/30">
                <Activity className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-bold">{selectedVenue.recentActivity}</p>
                <p className="text-[10px] text-muted-foreground">Activity</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/30">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p className="text-sm font-bold">{selectedVenue.activeEvents}</p>
                <p className="text-[10px] text-muted-foreground">Events</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/30">
                <Wine className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-sm font-bold">{selectedVenue.trendingCocktails.length}</p>
                <p className="text-[10px] text-muted-foreground">Trending</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedVenue.trendingCocktails.map(drink => (
                <Badge key={drink} variant="secondary" className="text-xs">
                  {drink}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BarIntelligenceMap;
