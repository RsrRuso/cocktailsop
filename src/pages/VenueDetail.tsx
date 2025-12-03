import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Globe, Clock, Star, Award, Navigation, ExternalLink, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const AWARD_ORGANIZATIONS = [
  { id: 'michelin', name: 'Michelin Guide', icon: '⭐', color: 'bg-red-500' },
  { id: 'worlds50best', name: "World's 50 Best", icon: '🌍', color: 'bg-blue-500' },
  { id: 'jamesbeard', name: 'James Beard Foundation', icon: '🏆', color: 'bg-amber-600' },
  { id: 'aaa', name: 'AAA Diamond', icon: '💎', color: 'bg-purple-500' },
  { id: 'spirited', name: 'Tales of the Cocktail', icon: '🍸', color: 'bg-teal-500' },
  { id: 'winespectator', name: 'Wine Spectator', icon: '🍷', color: 'bg-rose-600' },
  { id: 'zagat', name: 'Zagat', icon: '📖', color: 'bg-orange-500' },
  { id: 'forbes', name: 'Forbes Travel Guide', icon: '🌟', color: 'bg-slate-700' },
  { id: 'tripadvisor', name: 'TripAdvisor', icon: '🦉', color: 'bg-green-500' },
  { id: 'timeout', name: 'Time Out', icon: '⏱️', color: 'bg-pink-500' },
];

interface PlaceAward {
  award: string;
  organization: string;
}

interface Place {
  id: number;
  name: string;
  type: 'bar' | 'restaurant' | 'cafe';
  lat: number;
  lon: number;
  rating?: number;
  cuisine?: string;
  awards?: PlaceAward[];
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
}

const VenueDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const place = location.state?.place as Place | undefined;
  
  if (!place) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Venue not found</p>
          <Button onClick={() => navigate('/map')}>Back to Map</Button>
        </div>
      </div>
    );
  }

  const typeConfig = {
    bar: { emoji: '🍺', color: 'bg-purple-500', label: 'Bar' },
    restaurant: { emoji: '🍽️', color: 'bg-orange-500', label: 'Restaurant' },
    cafe: { emoji: '☕', color: 'bg-amber-500', label: 'Cafe' }
  };

  const config = typeConfig[place.type];
  const hasAwards = place.awards && place.awards.length > 0;

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: place.name,
      text: `Check out ${place.name} - ${config.label}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(`${place.name}\n${place.address || ''}`);
      toast({ title: 'Copied to clipboard' });
    }
  };

  const handleCall = () => {
    if (place.phone) {
      window.open(`tel:${place.phone}`, '_self');
    }
  };

  const handleWebsite = () => {
    if (place.website) {
      window.open(place.website, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className={`relative h-64 ${config.color}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        
        {/* Back button */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-10"
        >
          <Button
            onClick={() => navigate('/map')}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Share button */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 z-10"
        >
          <Button
            onClick={handleShare}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Venue icon */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
          <div className="w-24 h-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-4xl">
            {config.emoji}
          </div>
          {hasAwards && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg shadow-lg">
              🏆
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-16 pb-24 max-w-lg mx-auto">
        {/* Name and type */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">{place.name}</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className={`${config.color} text-white`}>
              {config.label}
            </Badge>
            {place.cuisine && (
              <Badge variant="outline">{place.cuisine}</Badge>
            )}
          </div>
        </motion.div>

        {/* Rating */}
        {place.rating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-1 mb-6"
          >
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i}
                className={`w-5 h-5 ${i < Math.floor(place.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="ml-2 font-semibold">{place.rating.toFixed(1)}</span>
          </motion.div>
        )}

        {/* Awards Section */}
        {hasAwards && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Awards & Recognition
            </h2>
            <div className="space-y-2">
              {place.awards!.map((award, idx) => {
                const org = AWARD_ORGANIZATIONS.find(o => o.id === award.organization);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                    <div className={`w-10 h-10 rounded-lg ${org?.color || 'bg-muted'} flex items-center justify-center text-lg`}>
                      {org?.icon || '🏆'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{award.award}</p>
                      <p className="text-xs text-muted-foreground">{org?.name || award.organization}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Info Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-6"
        >
          {place.address && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{place.address}</p>
              </div>
            </div>
          )}

          {place.openingHours && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Hours</p>
                <p className="text-sm text-muted-foreground">{place.openingHours}</p>
              </div>
            </div>
          )}

          {place.phone && (
            <button 
              onClick={handleCall}
              className="w-full flex items-start gap-3 p-4 rounded-xl bg-card border hover:bg-accent transition-colors text-left"
            >
              <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{place.phone}</p>
              </div>
            </button>
          )}

          {place.website && (
            <button 
              onClick={handleWebsite}
              className="w-full flex items-start gap-3 p-4 rounded-xl bg-card border hover:bg-accent transition-colors text-left"
            >
              <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Website</p>
                <p className="text-sm text-primary truncate">{place.website}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>
          )}
        </motion.div>

        {/* Location coordinates */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-6"
        >
          <p className="text-xs text-muted-foreground">
            📍 {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
          </p>
        </motion.div>
      </div>

      {/* Fixed Bottom Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t safe-area-pb"
      >
        <div className="max-w-lg mx-auto flex gap-3">
          <Button 
            onClick={handleGetDirections}
            className="flex-1 gap-2"
            size="lg"
          >
            <Navigation className="w-5 h-5" />
            Get Directions
          </Button>
          {place.website && (
            <Button 
              onClick={handleWebsite}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Globe className="w-5 h-5" />
              Visit
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VenueDetail;
