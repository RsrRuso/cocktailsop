// LiveMap - Real-time location and venue discovery
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin, Settings2, Navigation, Users, ArrowLeft, UtensilsCrossed, Wine, Store, List, Globe, Award, Star, X, ExternalLink, MapPinned, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NEARBY_RADIUS_KM = 5;
const CITY_RADIUS_KM = 25;

const createUserIcon = (label: string, avatarUrl?: string, isCurrentUser = false) => {
  const sizeClass = isCurrentUser ? 'w-10 h-10 border-4' : 'w-8 h-8 border-2';
  const bgClass = isCurrentUser ? 'bg-primary' : 'bg-blue-500';

  return L.divIcon({
    html: `
      <div class="${sizeClass} ${bgClass} rounded-full border-white shadow-lg flex items-center justify-center text-white text-xs font-bold overflow-hidden"
        style="${avatarUrl ? `background-image:url(${avatarUrl});background-size:cover;background-position:center;` : ''}"
      >
        ${avatarUrl ? '' : label}
      </div>
    `,
    className: '',
    iconSize: isCurrentUser ? [40, 40] : [32, 32],
    iconAnchor: isCurrentUser ? [20, 20] : [16, 16],
  });
};

const createPlaceIcon = (type: 'bar' | 'restaurant' | 'cafe', hasAward = false) => {
  const colors = {
    bar: 'bg-purple-500',
    restaurant: 'bg-orange-500',
    cafe: 'bg-amber-500'
  };
  const icons = {
    bar: '🍺',
    restaurant: '🍽️',
    cafe: '☕'
  };

  return L.divIcon({
    html: `
      <div class="relative">
        <div class="w-8 h-8 ${colors[type]} rounded-lg shadow-lg flex items-center justify-center text-white text-sm border-2 border-white cursor-pointer hover:scale-110 transition-transform">
          ${icons[type]}
        </div>
        ${hasAward ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">🏆</div>' : ''}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Award-granting organizations with details
const AWARD_ORGANIZATIONS = [
  { id: 'michelin', name: 'Michelin Guide', icon: '⭐', color: 'bg-red-500', description: 'World\'s most prestigious restaurant rating', awards: ['Michelin Star', 'Michelin 2 Stars', 'Michelin 3 Stars', 'Bib Gourmand'] },
  { id: 'worlds50best', name: 'World\'s 50 Best', icon: '🌍', color: 'bg-blue-500', description: 'Annual ranking of the world\'s best restaurants & bars', awards: ['World\'s 50 Best Restaurants', 'World\'s 50 Best Bars', 'Asia\'s 50 Best'] },
  { id: 'jamesbeard', name: 'James Beard Foundation', icon: '🏆', color: 'bg-amber-600', description: 'Premier culinary awards in America', awards: ['James Beard Award', 'Outstanding Restaurant', 'Rising Star Chef'] },
  { id: 'aaa', name: 'AAA Diamond', icon: '💎', color: 'bg-purple-500', description: 'North American hospitality rating', awards: ['AAA Five Diamond', 'AAA Four Diamond'] },
  { id: 'spirited', name: 'Tales of the Cocktail', icon: '🍸', color: 'bg-teal-500', description: 'Cocktail industry\'s top awards', awards: ['Spirited Award', 'Best American Cocktail Bar', 'Best International Bar'] },
  { id: 'winespectator', name: 'Wine Spectator', icon: '🍷', color: 'bg-rose-600', description: 'Premier wine awards', awards: ['Wine Spectator Award', 'Grand Award', 'Best of Award'] },
  { id: 'zagat', name: 'Zagat', icon: '📖', color: 'bg-orange-500', description: 'Consumer-driven reviews and ratings', awards: ['Zagat Rated', 'Zagat Top Pick'] },
  { id: 'forbes', name: 'Forbes Travel Guide', icon: '🌟', color: 'bg-slate-700', description: 'Luxury hospitality ratings', awards: ['Forbes Five-Star', 'Forbes Four-Star'] },
  { id: 'tripadvisor', name: 'TripAdvisor', icon: '🦉', color: 'bg-green-500', description: 'Traveler\'s choice awards', awards: ['Travelers\' Choice', 'Best of the Best'] },
  { id: 'timeout', name: 'Time Out', icon: '⏱️', color: 'bg-pink-500', description: 'City lifestyle awards', awards: ['Time Out Love Local', 'Best Bar Award'] },
];

const ALL_AWARDS = AWARD_ORGANIZATIONS.flatMap(org => org.awards);

// Curated list of prestigious bars and restaurants worldwide
const FEATURED_VENUES: Place[] = [
  // London
  { id: 100001, name: 'Attiko', type: 'bar', lat: 51.5074, lon: -0.1278, rating: 4.8, cuisine: 'Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'London, UK', openingHours: '17:00-02:00' },
  { id: 100002, name: 'Galaxy Bar', type: 'bar', lat: 51.5085, lon: -0.0757, rating: 4.9, cuisine: 'Rooftop Cocktails', awards: [{ award: 'Best International Bar', organization: 'spirited' }], address: 'London, UK', openingHours: '18:00-02:00' },
  { id: 100003, name: 'Tattoo Bar', type: 'bar', lat: 51.5118, lon: -0.0960, rating: 4.7, cuisine: 'Craft Cocktails', awards: [{ award: 'Spirited Award', organization: 'spirited' }], address: 'London, UK', openingHours: '17:00-01:00' },
  { id: 100004, name: 'SUSHISAMBA', type: 'restaurant', lat: 51.5152, lon: -0.0815, rating: 4.8, cuisine: 'Japanese-Brazilian-Peruvian', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }, { award: 'Time Out Love Local', organization: 'timeout' }], address: 'Heron Tower, London', openingHours: '11:30-02:00' },
  { id: 100005, name: 'The Connaught Bar', type: 'bar', lat: 51.5105, lon: -0.1490, rating: 4.9, cuisine: 'Luxury Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Best American Cocktail Bar', organization: 'spirited' }], address: 'Mayfair, London', openingHours: '11:00-01:00' },
  { id: 100006, name: 'Sketch', type: 'restaurant', lat: 51.5128, lon: -0.1425, rating: 4.8, cuisine: 'Modern European', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }], address: 'Mayfair, London', openingHours: '12:00-02:00' },
  { id: 100007, name: 'The Ritz Restaurant', type: 'restaurant', lat: 51.5073, lon: -0.1419, rating: 4.9, cuisine: 'French', awards: [{ award: 'Michelin Star', organization: 'michelin' }, { award: 'Forbes Five-Star', organization: 'forbes' }], address: 'Piccadilly, London', openingHours: '12:30-22:00' },
  { id: 100008, name: 'Duck & Waffle', type: 'restaurant', lat: 51.5152, lon: -0.0815, rating: 4.7, cuisine: 'British', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'Heron Tower, London', openingHours: '24 hours' },
  { id: 100009, name: 'Lyaness', type: 'bar', lat: 51.5080, lon: -0.1030, rating: 4.8, cuisine: 'Innovative Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Sea Containers, London', openingHours: '16:00-01:00' },
  { id: 100010, name: 'Nightjar', type: 'bar', lat: 51.5265, lon: -0.0878, rating: 4.9, cuisine: 'Speakeasy Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Spirited Award', organization: 'spirited' }], address: 'Shoreditch, London', openingHours: '18:00-03:00' },
  
  // New York
  { id: 100011, name: 'Death & Co', type: 'bar', lat: 40.7267, lon: -73.9850, rating: 4.9, cuisine: 'Craft Cocktails', awards: [{ award: 'James Beard Award', organization: 'jamesbeard' }, { award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'East Village, NYC', openingHours: '18:00-02:00' },
  { id: 100012, name: 'Eleven Madison Park', type: 'restaurant', lat: 40.7416, lon: -73.9872, rating: 4.9, cuisine: 'New American', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Madison Ave, NYC', openingHours: '17:30-22:00' },
  { id: 100013, name: 'Le Bernardin', type: 'restaurant', lat: 40.7614, lon: -73.9818, rating: 4.9, cuisine: 'French Seafood', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'James Beard Award', organization: 'jamesbeard' }], address: 'Midtown, NYC', openingHours: '12:00-22:30' },
  { id: 100014, name: 'Attaboy', type: 'bar', lat: 40.7218, lon: -73.9927, rating: 4.8, cuisine: 'Speakeasy', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Lower East Side, NYC', openingHours: '18:00-04:00' },
  { id: 100015, name: 'The NoMad Bar', type: 'bar', lat: 40.7453, lon: -73.9883, rating: 4.8, cuisine: 'Classic Cocktails', awards: [{ award: 'Spirited Award', organization: 'spirited' }, { award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'NoMad, NYC', openingHours: '17:00-02:00' },
  { id: 100016, name: 'Momofuku Ko', type: 'restaurant', lat: 40.7232, lon: -73.9890, rating: 4.8, cuisine: 'Korean-American', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }], address: 'East Village, NYC', openingHours: '17:00-22:00' },
  
  // Dubai - Comprehensive List
  { id: 100017, name: 'Zuma Dubai', type: 'restaurant', lat: 25.2175, lon: 55.2797, rating: 4.9, cuisine: 'Japanese', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }, { award: 'Time Out Love Local', organization: 'timeout' }], address: 'DIFC, Gate Village 06, Dubai', openingHours: '12:00-15:00, 19:00-00:00', phone: '+971 4 425 5660', website: 'https://zumarestaurant.com/dubai' },
  { id: 100018, name: 'At.mosphere', type: 'restaurant', lat: 25.1972, lon: 55.2744, rating: 4.9, cuisine: 'European Fine Dining', awards: [{ award: 'Forbes Five-Star', organization: 'forbes' }], address: 'Burj Khalifa Level 122, Downtown Dubai', openingHours: '12:30-15:00, 19:00-23:00', phone: '+971 4 888 3828', website: 'https://atmosphereburjkhalifa.com' },
  { id: 100019, name: 'Gold On 27', type: 'bar', lat: 25.1413, lon: 55.1853, rating: 4.8, cuisine: 'Luxury Cocktails', awards: [{ award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Burj Al Arab, Jumeirah', openingHours: '18:00-02:00', phone: '+971 4 301 7600', website: 'https://jumeirah.com' },
  { id: 100020, name: 'Nobu Dubai', type: 'restaurant', lat: 25.1305, lon: 55.1171, rating: 4.8, cuisine: 'Japanese-Peruvian', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Atlantis The Palm, Palm Jumeirah', openingHours: '18:00-23:00', phone: '+971 4 426 2626', website: 'https://noburestaurants.com/dubai' },
  { id: 100051, name: 'Attiko Dubai', type: 'bar', lat: 25.0921, lon: 55.1444, rating: 4.8, cuisine: 'Rooftop Cocktails', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'W Dubai - Mina Seyahi, Al Sufouh', openingHours: '18:00-02:00', phone: '+971 4 350 9998', website: 'https://marriott.com' },
  { id: 100052, name: 'Penthouse', type: 'bar', lat: 25.0769, lon: 55.1343, rating: 4.7, cuisine: 'Rooftop Lounge', awards: [{ award: 'Best Bar Award', organization: 'timeout' }], address: 'Five Palm Jumeirah, Palm Jumeirah', openingHours: '17:00-03:00', phone: '+971 4 455 9999', website: 'https://fivehotelsandresorts.com' },
  { id: 100053, name: 'Galaxy Bar', type: 'bar', lat: 25.2208, lon: 55.2818, rating: 4.8, cuisine: 'Sky Bar', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Four Seasons DIFC, Gate Village', openingHours: '18:00-02:00', phone: '+971 4 506 0000', website: 'https://fourseasons.com/dubai' },
  { id: 100054, name: 'Ossiano', type: 'restaurant', lat: 25.1305, lon: 55.1171, rating: 4.9, cuisine: 'Seafood Fine Dining', awards: [{ award: 'Michelin Star', organization: 'michelin' }], address: 'Atlantis The Palm, Palm Jumeirah', openingHours: '18:00-23:00', phone: '+971 4 426 2626', website: 'https://atlantis.com/dubai/restaurants/ossiano' },
  { id: 100055, name: 'Tresind Studio', type: 'restaurant', lat: 25.2175, lon: 55.2800, rating: 4.9, cuisine: 'Modern Indian', awards: [{ award: 'Michelin Star', organization: 'michelin' }, { award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'DIFC, Dubai', openingHours: '19:00-23:00', phone: '+971 4 327 8088', website: 'https://tresindstudio.com' },
  { id: 100056, name: 'STAY by Yannick Alléno', type: 'restaurant', lat: 25.1981, lon: 55.2746, rating: 4.9, cuisine: 'French Fine Dining', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }], address: 'One&Only The Palm, Palm Jumeirah', openingHours: '19:00-23:00', phone: '+971 4 440 1010', website: 'https://oneandonlyresorts.com' },
  { id: 100057, name: 'Il Ristorante Niko Romito', type: 'restaurant', lat: 25.1413, lon: 55.1853, rating: 4.9, cuisine: 'Italian', awards: [{ award: 'Michelin Star', organization: 'michelin' }], address: 'Burj Al Arab, Jumeirah', openingHours: '18:30-23:00', phone: '+971 4 301 7600', website: 'https://jumeirah.com' },
  { id: 100058, name: 'Hakkasan Dubai', type: 'restaurant', lat: 25.2205, lon: 55.2705, rating: 4.8, cuisine: 'Modern Cantonese', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Jumeirah Emirates Towers, Sheikh Zayed Road', openingHours: '18:00-00:00', phone: '+971 4 384 8484', website: 'https://hakkasan.com/dubai' },
  { id: 100059, name: 'La Petite Maison', type: 'restaurant', lat: 25.2175, lon: 55.2797, rating: 4.8, cuisine: 'French Mediterranean', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'DIFC, Gate Village 08, Dubai', openingHours: '12:00-15:00, 19:00-23:30', phone: '+971 4 439 0505', website: 'https://lpmrestaurants.com' },
  { id: 100060, name: 'Nammos Dubai', type: 'restaurant', lat: 25.0769, lon: 55.1343, rating: 4.7, cuisine: 'Greek Mediterranean', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'Four Seasons Resort, Jumeirah Beach', openingHours: '12:00-02:00', phone: '+971 4 349 0007', website: 'https://nammosdubai.com' },
  { id: 100061, name: 'CÉ LA VI Dubai', type: 'bar', lat: 25.2086, lon: 55.2681, rating: 4.7, cuisine: 'Modern Asian', awards: [{ award: 'Best Bar Award', organization: 'timeout' }], address: 'Address Sky View, Downtown Dubai', openingHours: '17:00-03:00', phone: '+971 4 582 6111', website: 'https://celavi.com/dubai' },
  { id: 100062, name: 'Mercury Lounge', type: 'bar', lat: 25.0769, lon: 55.1343, rating: 4.6, cuisine: 'Rooftop Bar', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'Four Seasons Resort, Jumeirah Beach', openingHours: '18:00-02:00', phone: '+971 4 270 7777', website: 'https://fourseasons.com/dubaijb' },
  { id: 100063, name: 'VOID Dubai', type: 'bar', lat: 25.1988, lon: 55.2773, rating: 4.6, cuisine: 'Modern Cocktails', awards: [], address: 'Index Tower, DIFC', openingHours: '20:00-03:00', phone: '+971 4 330 3033', website: 'https://voiddubai.com' },
  { id: 100064, name: 'Sass Café', type: 'restaurant', lat: 25.1988, lon: 55.2773, rating: 4.7, cuisine: 'French-Mediterranean', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'ICD Brookfield Place, DIFC', openingHours: '12:00-02:00', phone: '+971 4 436 7272', website: 'https://sasscafe.com' },
  { id: 100065, name: 'Twiggy by La Cantine', type: 'bar', lat: 25.0905, lon: 55.1378, rating: 4.6, cuisine: 'Beach Club', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'Park Hyatt Dubai, Dubai Creek', openingHours: '10:00-02:00', phone: '+971 4 602 1234', website: 'https://twiggybylacantinenew.com' },
  { id: 100066, name: 'Coya Dubai', type: 'restaurant', lat: 25.0769, lon: 55.1343, rating: 4.8, cuisine: 'Peruvian', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Four Seasons Resort, Jumeirah Beach', openingHours: '12:00-02:00', phone: '+971 4 316 9600', website: 'https://coyadubai.com' },
  { id: 100067, name: 'Soho Garden', type: 'bar', lat: 25.1139, lon: 55.1969, rating: 4.5, cuisine: 'Entertainment Complex', awards: [], address: 'Meydan Racecourse, Nad Al Sheba', openingHours: '20:00-04:00', phone: '+971 4 388 8849', website: 'https://sohogardendxb.com' },
  { id: 100068, name: 'WHITE Beach', type: 'bar', lat: 25.2086, lon: 55.2681, rating: 4.6, cuisine: 'Beach Club', awards: [{ award: 'Time Out Love Local', organization: 'timeout' }], address: 'Atlantis The Palm, Palm Jumeirah', openingHours: '10:00-22:00', phone: '+971 4 426 2000', website: 'https://atlantis.com/dubai/white-beach' },
  { id: 100069, name: 'Cipriani Dubai', type: 'restaurant', lat: 25.2175, lon: 55.2797, rating: 4.8, cuisine: 'Italian', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'DIFC, Burj Daman, Dubai', openingHours: '12:00-00:00', phone: '+971 4 325 5550', website: 'https://cipriani.com' },
  { id: 100070, name: 'Amazonico Dubai', type: 'restaurant', lat: 25.2175, lon: 55.2797, rating: 4.7, cuisine: 'Latin American', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'DIFC, Gate Village, Dubai', openingHours: '12:00-02:00', phone: '+971 4 571 3999', website: 'https://amazonicorestaurant.com' },
  { id: 100071, name: 'Nusr-Et Steakhouse', type: 'restaurant', lat: 25.0769, lon: 55.1343, rating: 4.7, cuisine: 'Steakhouse', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Four Seasons Resort, Jumeirah Beach', openingHours: '12:00-00:00', phone: '+971 4 323 5099', website: 'https://nusr-et.com' },
  { id: 100072, name: 'Dinner by Heston Blumenthal', type: 'restaurant', lat: 25.1305, lon: 55.1171, rating: 4.8, cuisine: 'British Gastronomy', awards: [{ award: 'Michelin Star', organization: 'michelin' }], address: 'Atlantis The Royal, Palm Jumeirah', openingHours: '18:00-23:00', phone: '+971 4 426 3636', website: 'https://atlantis.com' },
  { id: 100073, name: 'LPM Restaurant & Bar', type: 'restaurant', lat: 25.2175, lon: 55.2797, rating: 4.8, cuisine: 'French Riviera', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'DIFC, Dubai', openingHours: '12:00-00:00', phone: '+971 4 439 0909', website: 'https://lpmrestaurants.com' },
  { id: 100074, name: 'Orfali Bros Bistro', type: 'restaurant', lat: 25.2490, lon: 55.3010, rating: 4.9, cuisine: 'Modern Middle Eastern', awards: [{ award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Jumeirah Lakes Towers, Dubai', openingHours: '12:00-23:00', phone: '+971 4 277 1525', website: 'https://orfalibros.com' },
  { id: 100075, name: 'Pierchic', type: 'restaurant', lat: 25.0921, lon: 55.1444, rating: 4.8, cuisine: 'Seafood', awards: [{ award: 'Travelers\' Choice', organization: 'tripadvisor' }], address: 'Al Qasr, Madinat Jumeirah', openingHours: '12:30-23:30', phone: '+971 4 366 6730', website: 'https://jumeirah.com' },
  
  // Singapore
  { id: 100021, name: 'Atlas Bar', type: 'bar', lat: 1.2990, lon: 103.8591, rating: 4.9, cuisine: 'Art Deco Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Parkview Square, Singapore', openingHours: '10:00-01:00' },
  { id: 100022, name: 'Odette', type: 'restaurant', lat: 1.2896, lon: 103.8515, rating: 4.9, cuisine: 'French', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'National Gallery, Singapore', openingHours: '12:00-14:00, 19:00-21:00' },
  { id: 100023, name: 'Jigger & Pony', type: 'bar', lat: 1.2805, lon: 103.8510, rating: 4.8, cuisine: 'Southeast Asian Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Amara Hotel, Singapore', openingHours: '18:00-01:00' },
  { id: 100024, name: 'Burnt Ends', type: 'restaurant', lat: 1.3047, lon: 103.8073, rating: 4.8, cuisine: 'Modern Australian BBQ', awards: [{ award: 'Michelin Star', organization: 'michelin' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Dempsey, Singapore', openingHours: '17:45-23:00' },
  
  // Paris
  { id: 100025, name: 'Little Red Door', type: 'bar', lat: 48.8629, lon: 2.3621, rating: 4.8, cuisine: 'Concept Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Marais, Paris', openingHours: '18:00-02:00' },
  { id: 100026, name: 'Le Cinq', type: 'restaurant', lat: 48.8688, lon: 2.3018, rating: 4.9, cuisine: 'French', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Four Seasons, Paris', openingHours: '12:30-14:00, 19:00-22:00' },
  { id: 100027, name: 'L\'Ambroisie', type: 'restaurant', lat: 48.8537, lon: 2.3602, rating: 4.9, cuisine: 'French', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Place des Vosges, Paris', openingHours: '12:00-14:00, 20:00-22:00' },
  { id: 100028, name: 'Experimental Cocktail Club', type: 'bar', lat: 48.8634, lon: 2.3481, rating: 4.7, cuisine: 'Speakeasy', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Rue Saint-Sauveur, Paris', openingHours: '19:00-04:00' },
  
  // Tokyo
  { id: 100029, name: 'Bar High Five', type: 'bar', lat: 35.6762, lon: 139.7683, rating: 4.9, cuisine: 'Japanese Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Ginza, Tokyo', openingHours: '18:00-02:00' },
  { id: 100030, name: 'Sukiyabashi Jiro', type: 'restaurant', lat: 35.6735, lon: 139.7639, rating: 4.9, cuisine: 'Sushi', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Ginza, Tokyo', openingHours: '11:30-14:00, 17:30-20:30' },
  { id: 100031, name: 'Den', type: 'restaurant', lat: 35.6628, lon: 139.7180, rating: 4.9, cuisine: 'Japanese', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Jingumae, Tokyo', openingHours: '18:00-23:00' },
  { id: 100032, name: 'Star Bar Ginza', type: 'bar', lat: 35.6729, lon: 139.7658, rating: 4.8, cuisine: 'Whisky Bar', awards: [{ award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Ginza, Tokyo', openingHours: '17:00-00:00' },
  
  // Hong Kong  
  { id: 100033, name: 'Coa', type: 'bar', lat: 22.2819, lon: 114.1554, rating: 4.9, cuisine: 'Agave Spirits', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Central, Hong Kong', openingHours: '18:00-01:00' },
  { id: 100034, name: 'Lung King Heen', type: 'restaurant', lat: 22.2862, lon: 114.1623, rating: 4.9, cuisine: 'Cantonese', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Four Seasons, Hong Kong', openingHours: '12:00-14:30, 18:00-22:30' },
  { id: 100035, name: 'The Old Man', type: 'bar', lat: 22.2821, lon: 114.1527, rating: 4.8, cuisine: 'Literary Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Asia\'s 50 Best', organization: 'worlds50best' }], address: 'Central, Hong Kong', openingHours: '17:00-01:00' },
  
  // Barcelona
  { id: 100036, name: 'Paradiso', type: 'bar', lat: 41.3853, lon: 2.1849, rating: 4.9, cuisine: 'Hidden Speakeasy', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'El Born, Barcelona', openingHours: '19:00-02:30' },
  { id: 100037, name: 'Disfrutar', type: 'restaurant', lat: 41.3890, lon: 2.1577, rating: 4.9, cuisine: 'Avant-Garde', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Villarroel, Barcelona', openingHours: '13:00-15:00, 20:00-22:00' },
  { id: 100038, name: 'Tickets', type: 'restaurant', lat: 41.3757, lon: 2.1647, rating: 4.8, cuisine: 'Tapas', awards: [{ award: 'Michelin Star', organization: 'michelin' }], address: 'Parallel, Barcelona', openingHours: '19:00-23:30' },
  
  // Mexico City
  { id: 100039, name: 'Licorería Limantour', type: 'bar', lat: 19.4210, lon: -99.1680, rating: 4.8, cuisine: 'Mexican Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Roma Norte, CDMX', openingHours: '13:00-02:00' },
  { id: 100040, name: 'Pujol', type: 'restaurant', lat: 19.4338, lon: -99.1965, rating: 4.9, cuisine: 'Mexican', awards: [{ award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Polanco, CDMX', openingHours: '13:30-16:00, 18:30-23:00' },
  
  // Sydney
  { id: 100041, name: 'Maybe Sammy', type: 'bar', lat: -33.8570, lon: 151.2088, rating: 4.8, cuisine: 'Retro Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'The Rocks, Sydney', openingHours: '16:00-00:00' },
  { id: 100042, name: 'Quay', type: 'restaurant', lat: -33.8563, lon: 151.2105, rating: 4.9, cuisine: 'Australian', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Overseas Passenger Terminal, Sydney', openingHours: '18:00-22:00' },
  
  // Los Angeles
  { id: 100043, name: 'Providence', type: 'restaurant', lat: 34.0835, lon: -118.3450, rating: 4.9, cuisine: 'Seafood', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }], address: 'Melrose Ave, LA', openingHours: '18:00-22:00' },
  { id: 100044, name: 'n/naka', type: 'restaurant', lat: 34.0310, lon: -118.4020, rating: 4.9, cuisine: 'Kaiseki', awards: [{ award: 'Michelin 2 Stars', organization: 'michelin' }], address: 'Palms, LA', openingHours: '17:00-22:00' },
  
  // Copenhagen
  { id: 100045, name: 'Noma', type: 'restaurant', lat: 55.6832, lon: 12.6107, rating: 4.9, cuisine: 'New Nordic', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Refshalevej, Copenhagen', openingHours: '17:00-00:30' },
  { id: 100046, name: 'Geranium', type: 'restaurant', lat: 55.7028, lon: 12.5724, rating: 4.9, cuisine: 'Danish', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }, { award: 'World\'s 50 Best Restaurants', organization: 'worlds50best' }], address: 'Parken, Copenhagen', openingHours: '18:00-00:00' },
  
  // Miami
  { id: 100047, name: 'Sweet Liberty', type: 'bar', lat: 25.7877, lon: -80.1294, rating: 4.7, cuisine: 'Beach Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }, { award: 'Spirited Award', organization: 'spirited' }], address: 'South Beach, Miami', openingHours: '16:00-03:00' },
  { id: 100048, name: 'Ariete', type: 'restaurant', lat: 25.7511, lon: -80.2369, rating: 4.8, cuisine: 'New American', awards: [{ award: 'James Beard Award', organization: 'jamesbeard' }], address: 'Coconut Grove, Miami', openingHours: '18:00-22:00' },
  
  // Amsterdam
  { id: 100049, name: 'Flying Dutchmen Cocktails', type: 'bar', lat: 52.3676, lon: 4.9041, rating: 4.7, cuisine: 'Dutch Cocktails', awards: [{ award: 'World\'s 50 Best Bars', organization: 'worlds50best' }], address: 'Singel, Amsterdam', openingHours: '17:00-01:00' },
  { id: 100050, name: 'De Librije', type: 'restaurant', lat: 52.5125, lon: 6.0944, rating: 4.9, cuisine: 'Dutch', awards: [{ award: 'Michelin 3 Stars', organization: 'michelin' }], address: 'Zwolle, Netherlands', openingHours: '12:00-14:00, 18:30-21:30' },
];

const generateMockAwards = (placeId: number): { award: string; organization: string }[] => {
  const seed = placeId % 100;
  if (seed > 60) {
    const numAwards = Math.floor(seed % 3) + 1;
    const awards: { award: string; organization: string }[] = [];
    for (let i = 0; i < numAwards; i++) {
      const orgIndex = (placeId + i) % AWARD_ORGANIZATIONS.length;
      const org = AWARD_ORGANIZATIONS[orgIndex];
      const awardIndex = (placeId + i) % org.awards.length;
      awards.push({ award: org.awards[awardIndex], organization: org.id });
    }
    return awards;
  }
  return [];
};

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

const LiveMap = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const placeMarkersRef = useRef<L.Marker[]>([]);

  const [ghostMode, setGhostMode] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>(FEATURED_VENUES);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlacesList, setShowPlacesList] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [viewMode, setViewMode] = useState<'nearby' | 'city'>('nearby');
  const [placesFilter, setPlacesFilter] = useState<'all' | 'bar' | 'restaurant' | 'cafe' | 'awarded'>('all');
  const [showAwardsOrgs, setShowAwardsOrgs] = useState(false);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [placesFetched, setPlacesFetched] = useState(false);
  
  // Popular Dubai venues for quick search suggestions - Comprehensive list
  const DUBAI_QUICK_SEARCH = [
    // Top Fine Dining
    { name: 'Zuma Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'At.mosphere', icon: '🍽️', type: 'restaurant', area: 'Burj Khalifa' },
    { name: 'Nobu Dubai', icon: '🍽️', type: 'restaurant', area: 'Atlantis' },
    { name: 'Ossiano', icon: '🍽️', type: 'restaurant', area: 'Atlantis' },
    { name: 'Tresind Studio', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'STAY by Yannick Alléno', icon: '🍽️', type: 'restaurant', area: 'Palm' },
    { name: 'Il Ristorante Niko Romito', icon: '🍽️', type: 'restaurant', area: 'Burj Al Arab' },
    { name: 'Dinner by Heston Blumenthal', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Orfali Bros Bistro', icon: '🍽️', type: 'restaurant', area: 'JLT' },
    { name: 'La Petite Maison', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'Hakkasan Dubai', icon: '🍽️', type: 'restaurant', area: 'Emirates Towers' },
    { name: 'Cipriani Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'LPM Restaurant & Bar', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    
    // Celebrity & Premium Steakhouses
    { name: 'Nusr-Et Steakhouse', icon: '🥩', type: 'restaurant', area: 'Four Seasons' },
    { name: 'CUT by Wolfgang Puck', icon: '🥩', type: 'restaurant', area: 'Four Seasons' },
    { name: 'Beefbar Dubai', icon: '🥩', type: 'restaurant', area: 'DIFC' },
    { name: 'GAIA Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'Scalini', icon: '🍽️', type: 'restaurant', area: 'Four Seasons' },
    
    // Rooftop Bars & Lounges
    { name: 'Attiko Dubai', icon: '🍸', type: 'bar', area: 'W Dubai' },
    { name: 'Gold On 27', icon: '🍸', type: 'bar', area: 'Burj Al Arab' },
    { name: 'Penthouse', icon: '🍸', type: 'bar', area: 'Five Palm' },
    { name: 'Galaxy Bar', icon: '🍸', type: 'bar', area: 'DIFC' },
    { name: 'CÉ LA VI Dubai', icon: '🍸', type: 'bar', area: 'Address Sky View' },
    { name: 'Mercury Lounge', icon: '🍸', type: 'bar', area: 'Four Seasons JBR' },
    { name: 'Level 43 Sky Lounge', icon: '🍸', type: 'bar', area: 'Media City' },
    { name: 'SkyBar Dubai', icon: '🍸', type: 'bar', area: 'Media City' },
    { name: 'Treehouse Dubai', icon: '🍸', type: 'bar', area: 'Taj Hotel' },
    { name: 'SoBe Dubai', icon: '🍸', type: 'bar', area: 'W Palm' },
    
    // Beach Clubs & Day-to-Night
    { name: 'Nammos Dubai', icon: '🏖️', type: 'restaurant', area: 'Four Seasons JBR' },
    { name: 'WHITE Beach', icon: '🏖️', type: 'bar', area: 'Atlantis' },
    { name: 'Twiggy by La Cantine', icon: '🏖️', type: 'bar', area: 'Park Hyatt' },
    { name: 'Azure Beach', icon: '🏖️', type: 'bar', area: 'Rixos JBR' },
    { name: 'Zero Gravity', icon: '🏖️', type: 'bar', area: 'Marina' },
    { name: 'Barasti Beach', icon: '🏖️', type: 'bar', area: 'Le Meridien' },
    { name: 'Nikki Beach Dubai', icon: '🏖️', type: 'bar', area: 'Pearl Jumeira' },
    { name: 'DRIFT Beach Dubai', icon: '🏖️', type: 'bar', area: 'One&Only Royal' },
    
    // Nightclubs & Entertainment
    { name: 'Soho Garden', icon: '🎉', type: 'bar', area: 'Meydan' },
    { name: 'WHITE Dubai', icon: '🎉', type: 'bar', area: 'Meydan' },
    { name: 'BASE Dubai', icon: '🎉', type: 'bar', area: 'D3' },
    { name: 'BOA Dubai', icon: '🎉', type: 'bar', area: 'V Hotel' },
    { name: 'VOID Dubai', icon: '🎉', type: 'bar', area: 'DIFC' },
    { name: 'Billionaire Mansion', icon: '🎉', type: 'bar', area: 'Taj Hotel' },
    { name: 'Cavalli Club Dubai', icon: '🎉', type: 'bar', area: 'Fairmont' },
    
    // Latin & Mediterranean
    { name: 'Coya Dubai', icon: '🍽️', type: 'restaurant', area: 'Four Seasons' },
    { name: 'Amazonico Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'Torno Subito', icon: '🍽️', type: 'restaurant', area: 'W Palm' },
    { name: 'Netsu Dubai', icon: '🍽️', type: 'restaurant', area: 'Mandarin Oriental' },
    { name: 'Sass Café', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'BOCA Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    
    // Waterfront & Iconic
    { name: 'Pierchic', icon: '🍽️', type: 'restaurant', area: 'Madinat Jumeirah' },
    { name: 'Pai Thai', icon: '🍽️', type: 'restaurant', area: 'Madinat Jumeirah' },
    { name: 'Rockfish', icon: '🍽️', type: 'restaurant', area: 'Jumeirah Al Naseem' },
    { name: 'Al Mahara', icon: '🍽️', type: 'restaurant', area: 'Burj Al Arab' },
    { name: 'Nathan Outlaw', icon: '🍽️', type: 'restaurant', area: 'Burj Al Arab' },
    { name: 'Shimmers', icon: '🏖️', type: 'restaurant', area: 'Madinat Jumeirah' },
    
    // Dubai Marina & JBR
    { name: 'Siddharta Lounge', icon: '🍸', type: 'bar', area: 'Marina' },
    { name: 'Tresind', icon: '🍽️', type: 'restaurant', area: 'Marina' },
    { name: 'Indego by Vineet', icon: '🍽️', type: 'restaurant', area: 'Marina' },
    { name: 'BiCE Ristorante', icon: '🍽️', type: 'restaurant', area: 'JBR' },
    { name: 'Rhodes W1', icon: '🍽️', type: 'restaurant', area: 'Marina' },
    { name: 'Boa Steakhouse JBR', icon: '🥩', type: 'restaurant', area: 'JBR' },
    
    // Downtown & Business Bay
    { name: 'Karma Kafe', icon: '🍽️', type: 'restaurant', area: 'Downtown' },
    { name: 'Thiptara', icon: '🍽️', type: 'restaurant', area: 'Palace Downtown' },
    { name: 'Ewaan', icon: '🍽️', type: 'restaurant', area: 'Palace Downtown' },
    { name: 'The Maine Oyster Bar', icon: '🦪', type: 'restaurant', area: 'Downtown' },
    { name: 'La Serre Bistro', icon: '🍽️', type: 'restaurant', area: 'Downtown' },
    { name: 'Bull & Bear', icon: '🍽️', type: 'restaurant', area: 'Waldorf Astoria' },
    
    // Old Dubai & Culture
    { name: 'Arabian Tea House', icon: '☕', type: 'cafe', area: 'Al Fahidi' },
    { name: 'XVA Café', icon: '☕', type: 'cafe', area: 'Al Fahidi' },
    { name: 'Al Ustad Special Kabab', icon: '🍽️', type: 'restaurant', area: 'Al Fahidi' },
    { name: 'Bu Qtair', icon: '🐟', type: 'restaurant', area: 'Jumeirah' },
    { name: 'Ravi Restaurant', icon: '🍽️', type: 'restaurant', area: 'Satwa' },
    
    // Asian Cuisine
    { name: 'Hutong Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
    { name: 'Akira Back Dubai', icon: '🍽️', type: 'restaurant', area: 'W Palm' },
    { name: 'MIMI Kakushi', icon: '🍽️', type: 'restaurant', area: 'Four Seasons' },
    { name: 'Zhen Wei', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Morimoto Dubai', icon: '🍽️', type: 'restaurant', area: 'Renaissance' },
    { name: 'ROKA Dubai', icon: '🍽️', type: 'restaurant', area: 'The Opus' },
    { name: 'MOTT 32', icon: '🍽️', type: 'restaurant', area: 'Address Downtown' },
    { name: 'Zengo Dubai', icon: '🍽️', type: 'restaurant', area: 'Le Royal Meridien' },
    
    // New Hotspots 2024
    { name: 'Kayto Dubai', icon: '🍽️', type: 'restaurant', area: 'Five Palm' },
    { name: 'MNKY HSE', icon: '🍸', type: 'bar', area: 'Waldorf Astoria' },
    { name: 'Secret Room', icon: '🍸', type: 'bar', area: 'Five JVC' },
    { name: 'La Mar Dubai', icon: '🍽️', type: 'restaurant', area: 'Four Seasons' },
    { name: 'Ling Ling Dubai', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Nobu by the Beach', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Milos Dubai', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Jaleo Dubai', icon: '🍽️', type: 'restaurant', area: 'Atlantis Royal' },
    { name: 'Ariana\'s Persian Kitchen', icon: '🍽️', type: 'restaurant', area: 'JLT' },
    { name: 'Trèsind Dubai', icon: '🍽️', type: 'restaurant', area: 'DIFC' },
  ];

  const handleQuickSearch = (venueName: string) => {
    setSearchQuery(venueName);
    setShowSearchSuggestions(false);
    setShowSearch(false);
    // Find the venue and fly to it on map
    const venue = places.find(p => p.name.toLowerCase() === venueName.toLowerCase());
    if (venue && mapRef.current) {
      mapRef.current.flyTo([venue.lat, venue.lon], 17, { duration: 1.5 });
      // Show a brief toast with venue info
      toast({
        title: venue.name,
        description: `${venue.type} • ${venue.cuisine || 'View on map'}`,
      });
    }
  };
  
  const handleVenueSelect = (place: Place) => {
    setShowSearchSuggestions(false);
    setShowSearch(false);
    setSearchQuery('');
    if (mapRef.current) {
      mapRef.current.flyTo([place.lat, place.lon], 17, { duration: 1.5 });
      toast({
        title: place.name,
        description: `${place.type} • ${place.cuisine || place.address || 'View on map'}`,
      });
    }
  };
  const fetchingRef = useRef(false);
  const lastFetchPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const { position, isTracking, toggleGhostMode } = useGPSTracking(!ghostMode);
  const { toast } = useToast();

  // Calculate distance between two coordinates in km
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Fetch nearby bars and restaurants from OpenStreetMap Overpass API - with deduplication
  const fetchNearbyPlaces = useCallback(async (lat: number, lon: number, radiusKm: number = NEARBY_RADIUS_KM, force = false) => {
    if (!showPlaces) {
      setLoadingPlaces(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    // Only fetch if position changed significantly (500m) or forced
    if (!force && lastFetchPositionRef.current) {
      const dist = Math.sqrt(
        Math.pow(lat - lastFetchPositionRef.current.lat, 2) +
        Math.pow(lon - lastFetchPositionRef.current.lon, 2)
      ) * 111000; // rough meters
      if (dist < 500 && placesFetched) {
        setLoadingPlaces(false);
        return;
      }
    }

    fetchingRef.current = true;
    setLoadingPlaces(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      fetchingRef.current = false;
      setLoadingPlaces(false);
    }, 8000);
    
    try {
      const radiusMeters = radiusKm * 1000;
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="bar"](around:${radiusMeters},${lat},${lon});
          node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
          node["amenity"="pub"](around:${radiusMeters},${lat},${lon});
          node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
        );
        out body 150;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setPlaces(FEATURED_VENUES);
        setPlacesFetched(true);
        setLoadingPlaces(false);
        fetchingRef.current = false;
        return;
      }

      const data = await response.json();
      
      const fetchedPlaces: Place[] = data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          let type: 'bar' | 'restaurant' | 'cafe' = 'restaurant';
          if (el.tags.amenity === 'bar' || el.tags.amenity === 'pub') type = 'bar';
          else if (el.tags.amenity === 'cafe') type = 'cafe';
          
          const awards = generateMockAwards(el.id);
          
          return {
            id: el.id,
            name: el.tags.name,
            type,
            lat: el.lat,
            lon: el.lon,
            cuisine: el.tags.cuisine,
            rating: el.tags['rating'] ? parseFloat(el.tags['rating']) : (3 + Math.random() * 2),
            awards,
            address: el.tags['addr:street'] ? `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street']}` : undefined,
            phone: el.tags.phone,
            website: el.tags.website,
            openingHours: el.tags.opening_hours
          };
        });

      // Merge API results with featured venues, avoiding duplicates by name
      const existingNames = new Set(fetchedPlaces.map(p => p.name.toLowerCase()));
      const uniqueFeatured = FEATURED_VENUES.filter(f => !existingNames.has(f.name.toLowerCase()));
      setPlaces([...uniqueFeatured, ...fetchedPlaces]);
      setPlacesFetched(true);
      lastFetchPositionRef.current = { lat, lon };
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching places:', error);
      }
      // Use featured venues as fallback on error
      if (places.length === 0) {
        setPlaces(FEATURED_VENUES);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingPlaces(false);
      fetchingRef.current = false;
    }
  }, [showPlaces, placesFetched]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const initialCenter: [number, number] = position
        ? [position.latitude, position.longitude]
        : [40, -74.5];

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        zoomControl: false,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
      }).setView(initialCenter, 14);

      // Neon glowing night map - CARTO Dark Matter (free, no API key needed)
      const darkLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      );

      // Satellite layer for toggle
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 20,
        }
      );

      (satelliteMode ? satelliteLayer : darkLayer).addTo(map);
      
      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      
      mapRef.current = map;
      
      // Mark map as loaded
      setLoadingPlaces(false);
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      setMapError('Failed to initialize map');
      setLoadingPlaces(false);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteMode]);

  // Fetch places once when map is ready and position is available
  useEffect(() => {
    if (!mapRef.current || !position || placesFetched) return;
    const radius = viewMode === 'city' ? CITY_RADIUS_KM : NEARBY_RADIUS_KM;
    fetchNearbyPlaces(position.latitude, position.longitude, radius, true);
  }, [position, viewMode, placesFetched, fetchNearbyPlaces]);

  // Center map and update current user marker when GPS position changes
  useEffect(() => {
    if (!mapRef.current || !position) return;

    const map = mapRef.current;
    const userKey = 'current-user';

    if (autoCenter) {
      map.flyTo([position.latitude, position.longitude], viewMode === 'city' ? 11 : 14);
    }

    if (ghostMode) {
      if (markersRef.current[userKey]) {
        markersRef.current[userKey].remove();
        delete markersRef.current[userKey];
      }
      return;
    }

    if (markersRef.current[userKey]) {
      markersRef.current[userKey].setLatLng([position.latitude, position.longitude]);
    } else {
      const marker = L.marker([position.latitude, position.longitude], {
        icon: createUserIcon('You', undefined, true),
      }).bindPopup('<div class="font-bold text-primary">📍 You are here</div>');

      marker.addTo(map);
      markersRef.current[userKey] = marker;
    }
  }, [position, ghostMode, autoCenter, fetchNearbyPlaces, viewMode]);

  // Filter places based on current filter and search query
  const filteredPlaces = places.filter(place => {
    // First apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = place.name.toLowerCase().includes(query);
      const typeMatch = place.type.toLowerCase().includes(query);
      const cuisineMatch = place.cuisine?.toLowerCase().includes(query);
      const awardMatch = place.awards?.some(a => 
        a.award.toLowerCase().includes(query) || 
        AWARD_ORGANIZATIONS.find(o => o.id === a.organization)?.name.toLowerCase().includes(query)
      );
      if (!nameMatch && !typeMatch && !cuisineMatch && !awardMatch) return false;
    }
    // Then apply org filter if set
    if (selectedOrgFilter) {
      if (!place.awards?.some(a => a.organization === selectedOrgFilter)) return false;
    }
    if (placesFilter === 'all') return true;
    if (placesFilter === 'awarded') return place.awards && place.awards.length > 0;
    return place.type === placesFilter;
  });

  // Get venues by organization
  const getVenuesByOrg = (orgId: string) => {
    return places.filter(p => p.awards?.some(a => a.organization === orgId));
  };

  // Add place markers to map
  useEffect(() => {
    if (!mapRef.current || !showPlaces) return;

    // Clear old place markers
    placeMarkersRef.current.forEach(marker => marker.remove());
    placeMarkersRef.current = [];

    filteredPlaces.forEach(place => {
      const hasAward = place.awards && place.awards.length > 0;
      const marker = L.marker([place.lat, place.lon], {
        icon: createPlaceIcon(place.type, hasAward),
      });

      marker.on('click', () => {
        navigate(`/venue/${place.id}`, { state: { place } });
      });

      marker.addTo(mapRef.current!);
      placeMarkersRef.current.push(marker);
    });
  }, [filteredPlaces, showPlaces]);

  const fetchLocations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    if (!follows || follows.length === 0) {
      setLocations([]);
      setNearbyFriends([]);
      return;
    }

    const friendIds = new Set<string>();
    follows.forEach(follow => {
      if (follow.follower_id === user.id) friendIds.add(follow.following_id);
      if (follow.following_id === user.id) friendIds.add(follow.follower_id);
    });

    const { data: locationRows, error } = await supabase
      .from('user_locations')
      .select('user_id, latitude, longitude, ghost_mode, last_updated')
      .in('user_id', Array.from(friendIds))
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.error('Error fetching locations:', error);
      setMapError('Failed to load locations');
      return;
    }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', Array.from(friendIds));

    const profileById: Record<string, { username: string; avatar_url: string | null }> = {};
    profileRows?.forEach((p: any) => {
      if (p?.id) profileById[p.id] = p;
    });

    if (locationRows) {
      setLocations(locationRows as any);

      if (mapRef.current && position) {
        const map = mapRef.current;

        // Clear old markers except current user and places
        Object.keys(markersRef.current).forEach((key) => {
          if (key !== 'current-user') {
            markersRef.current[key].remove();
            delete markersRef.current[key];
          }
        });

        // Filter friends within radius
        const nearby: any[] = [];
        
        locationRows.forEach((location: any) => {
          if (!location.user_id || location.latitude == null || location.longitude == null) return;

          const distance = calculateDistance(
            position.latitude,
            position.longitude,
            location.latitude,
            location.longitude
          );

          // Only show friends within radius
          if (distance <= NEARBY_RADIUS_KM) {
            const profile = profileById[location.user_id];
            const username = profile?.username || 'Friend';
            const avatarUrl = profile?.avatar_url || undefined;
            
            nearby.push({
              ...location,
              username,
              avatarUrl,
              distance: distance.toFixed(1)
            });

            const marker = L.marker([location.latitude, location.longitude], {
              icon: createUserIcon(username[0]?.toUpperCase() || 'F', avatarUrl),
            }).bindPopup(`
              <div class="p-2">
                <div class="font-bold text-sm">${username}</div>
                <div class="text-xs text-gray-500">${distance.toFixed(1)} km away</div>
                ${location.ghost_mode ? '<div class="text-xs text-purple-500">👻 Ghost Mode</div>' : ''}
              </div>
            `);

            marker.addTo(map);
            markersRef.current[location.user_id] = marker;
          }
        });

        setNearbyFriends(nearby);
      }
    }
  };

  // Subscribe to realtime location updates
  useEffect(() => {
    const channel = supabase
      .channel('user-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        () => fetchLocations()
      )
      .subscribe();

    fetchLocations();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const handleToggleGhostMode = async () => {
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    await toggleGhostMode(newGhostMode);

    toast({
      title: newGhostMode ? '👻 Ghost Mode Enabled' : '📍 Ghost Mode Disabled',
      description: newGhostMode
        ? 'You\'re hidden from the map. Others can\'t see your location.'
        : 'You\'re visible on the map. Friends can see your location.',
    });
  };

  const handleCenterOnUser = () => {
    if (mapRef.current && position) {
      mapRef.current.flyTo([position.latitude, position.longitude], viewMode === 'city' ? 11 : 15);
      toast({
        title: 'Centered on your location',
        description: 'Map view updated',
      });
    }
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === 'nearby' ? 'city' : 'nearby';
    setViewMode(newMode);
    setPlacesFetched(false); // Reset to force re-fetch
    
    if (mapRef.current && position) {
      const zoom = newMode === 'city' ? 11 : 14;
      mapRef.current.flyTo([position.latitude, position.longitude], zoom);
      // Force re-fetch with new radius
      setTimeout(() => {
        fetchNearbyPlaces(position.latitude, position.longitude, newMode === 'city' ? CITY_RADIUS_KM : NEARBY_RADIUS_KM, true);
      }, 300);
    }
    
    toast({
      title: newMode === 'city' ? '🌆 City View' : '📍 Nearby View',
      description: newMode === 'city' ? `Showing venues within ${CITY_RADIUS_KM}km` : `Showing venues within ${NEARBY_RADIUS_KM}km`,
    });
  };

  const handlePlaceClick = (place: Place) => {
    // Navigate to venue detail page
    navigate(`/venue/${place.id}`, { state: { place } });
  };

  const awardedPlaces = places.filter(p => p.awards && p.awards.length > 0);

  if (mapError) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Map Loading Failed</h3>
            <p className="text-sm text-muted-foreground">{mapError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 bg-muted" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background/30" />

      {/* Top Bar - Back Button & Compact Stats */}
      <motion.div 
        className="absolute top-3 left-3 right-3 flex items-start justify-between z-[1000]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back Button & Search */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/home')}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Search Bar */}
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 z-10" />
                  <Input
                    placeholder="Search Dubai venues..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    className="pl-9 pr-8 h-10 w-56 sm:w-72 bg-black/50 backdrop-blur-xl border-white/20 text-white placeholder:text-white/40 rounded-full"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setShowSearchSuggestions(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Search Suggestions Dropdown - Frameless & Transparent */}
                  <AnimatePresence>
                    {showSearchSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-12 left-0 w-72 sm:w-80 bg-black/60 backdrop-blur-2xl rounded-2xl max-h-96 overflow-y-auto z-[9999] scrollbar-thin scrollbar-thumb-white/20"
                      >
                        <div className="p-1.5">
                          <div className="px-3 py-2 text-[10px] uppercase text-white/50 tracking-wider font-medium">
                            🇦🇪 Popular Dubai Venues ({DUBAI_QUICK_SEARCH.length}+)
                          </div>
                          {DUBAI_QUICK_SEARCH
                            .filter(v => !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || (v.area && v.area.toLowerCase().includes(searchQuery.toLowerCase())))
                            .slice(0, 20)
                            .map((venue, index) => (
                              <button
                                key={index}
                                onClick={() => handleQuickSearch(venue.name)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-xl transition-all text-left group"
                              >
                                <span className="text-lg group-hover:scale-110 transition-transform">{venue.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-white font-medium truncate">{venue.name}</div>
                                  <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                                    <span className="capitalize">{venue.type}</span>
                                    {venue.area && <><span className="text-white/20">•</span><span className="text-white/50">{venue.area}</span></>}
                                  </div>
                                </div>
                                <MapPinned className="w-3.5 h-3.5 text-white/20 group-hover:text-primary transition-colors" />
                              </button>
                            ))}
                          {searchQuery && filteredPlaces.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-[10px] uppercase text-white/50 tracking-wider font-medium mt-1">
                                🔍 Search Results
                              </div>
                              {filteredPlaces.slice(0, 6).map((place) => (
                                <button
                                  key={place.id}
                                  onClick={() => handleVenueSelect(place)}
                                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/10 rounded-xl transition-all text-left group"
                                >
                                  <span className="text-xl group-hover:scale-110 transition-transform">
                                    {place.type === 'bar' ? '🍸' : place.type === 'restaurant' ? '🍽️' : '☕'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white font-semibold truncate">{place.name}</div>
                                    <div className="text-[10px] text-white/40 truncate">{place.address || place.cuisine || place.type}</div>
                                  </div>
                                  {place.awards && place.awards.length > 0 && (
                                    <span className="text-yellow-400 text-sm">🏆</span>
                                  )}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setShowSearchSuggestions(false);
                  }}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>
            ) : (
              <Button
                onClick={() => setShowSearch(true)}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
          </AnimatePresence>
        </div>

        {/* Compact Stats Panel */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl px-3 py-2 border border-white/10 max-w-[180px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/80">
                <span className="font-bold text-white">{nearbyFriends.length}</span> friends nearby
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-white/80">
                {loadingPlaces ? 'Loading...' : <><span className="font-bold text-white">{places.length}</span> venues</>}
              </span>
            </div>
            {awardedPlaces.length > 0 && (
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white/80">
                  <span className="font-bold text-white">{awardedPlaces.length}</span> awarded
                </span>
              </div>
            )}
          </div>
          
          {/* Filter Pills */}
          {places.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'bar' 
                    ? 'bg-purple-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'bar' ? 'all' : 'bar')}
              >
                🍺 {places.filter(p => p.type === 'bar').length}
              </Badge>
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'restaurant' 
                    ? 'bg-orange-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'restaurant' ? 'all' : 'restaurant')}
              >
                🍽️ {places.filter(p => p.type === 'restaurant').length}
              </Badge>
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'cafe' 
                    ? 'bg-amber-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'cafe' ? 'all' : 'cafe')}
              >
                ☕ {places.filter(p => p.type === 'cafe').length}
              </Badge>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Action Buttons - Right Side */}
      <motion.div 
        className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[1000]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {position && (
          <Button
            onClick={handleCenterOnUser}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-blue-400 hover:bg-black/50"
          >
            <Navigation className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={() => setShowSettings(true)}
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
        >
          <Settings2 className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Bottom Action Bar */}
      <motion.div 
        className="absolute bottom-20 sm:bottom-6 left-3 right-3 z-[1000]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-2 border border-white/10">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Status */}
            <div className="flex items-center gap-2 px-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-white/80 font-medium">
                {ghostMode ? '👻' : viewMode === 'city' ? '🌆' : '📍'}
              </span>
            </div>

            {/* Center: Main Actions */}
            <div className="flex items-center gap-1">
              <Button
                onClick={handleToggleGhostMode}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  ghostMode 
                    ? 'bg-purple-500/30 text-purple-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {ghostMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>

              <Button
                onClick={handleToggleViewMode}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  viewMode === 'city' 
                    ? 'bg-green-500/30 text-green-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <Globe className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setShowPlacesList(true)}
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20"
              >
                <List className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setShowAwardsOrgs(true)}
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
              >
                <Award className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setSatelliteMode(!satelliteMode)}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  satelliteMode 
                    ? 'bg-teal-500/30 text-teal-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>

            {/* Right: View label */}
            <span className="text-[10px] text-white/50 px-2 hidden sm:block">
              {viewMode === 'city' ? `${CITY_RADIUS_KM}km` : `${NEARBY_RADIUS_KM}km`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Nearby Friends Floating Card */}
      {nearbyFriends.length > 0 && (
        <motion.div 
          className="absolute bottom-36 sm:bottom-24 left-3 bg-black/40 backdrop-blur-xl rounded-2xl p-3 border border-white/10 z-[1000] max-w-[160px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-[10px] text-white/60 mb-2 uppercase tracking-wide">Friends</div>
          <div className="space-y-1.5 max-h-[100px] overflow-y-auto scrollbar-thin">
            {nearbyFriends.slice(0, 4).map((friend) => (
              <div key={friend.user_id} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full bg-blue-500/50 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden border border-white/20"
                  style={friend.avatarUrl ? { backgroundImage: `url(${friend.avatarUrl})`, backgroundSize: 'cover' } : {}}
                >
                  {!friend.avatarUrl && friend.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white font-medium truncate">{friend.username}</div>
                  <div className="text-[9px] text-white/50">{friend.distance}km</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Places List Sheet */}
      <Sheet open={showPlacesList} onOpenChange={setShowPlacesList}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 bg-black/70 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Store className="w-5 h-5" />
              Venues ({filteredPlaces.length})
            </SheetTitle>
            <SheetDescription className="text-white/60">
              Bars, restaurants & cafes {viewMode === 'city' ? 'in your city' : 'near you'}
            </SheetDescription>
            {/* Search in list */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search by name, type, or award..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 p-1 mx-4 mt-4 bg-white/10" style={{ width: 'calc(100% - 32px)' }}>
              <TabsTrigger value="all" onClick={() => setPlacesFilter('all')} className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white">All</TabsTrigger>
              <TabsTrigger value="awarded" onClick={() => setPlacesFilter('awarded')} className="text-white/70 data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">🏆</TabsTrigger>
              <TabsTrigger value="bar" onClick={() => setPlacesFilter('bar')} className="text-white/70 data-[state=active]:bg-purple-500/30 data-[state=active]:text-purple-300">🍺</TabsTrigger>
              <TabsTrigger value="restaurant" onClick={() => setPlacesFilter('restaurant')} className="text-white/70 data-[state=active]:bg-orange-500/30 data-[state=active]:text-orange-300">🍽️</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-4 space-y-3">
                {filteredPlaces.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No venues found</p>
                  </div>
                ) : (
                  filteredPlaces.map((place) => (
                    <motion.div
                      key={place.id}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                      onClick={() => handlePlaceClick(place)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg
                          ${place.type === 'bar' ? 'bg-purple-500/30' : 
                            place.type === 'restaurant' ? 'bg-orange-500/30' : 
                            'bg-amber-500/30'}`}
                        >
                          {place.type === 'bar' ? '🍺' : place.type === 'restaurant' ? '🍽️' : '☕'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate text-white">{place.name}</h4>
                            {place.awards && place.awards.length > 0 && (
                              <Badge className="bg-yellow-500/30 text-yellow-300 text-[10px] px-1.5">
                                🏆 {place.awards.length}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-white/50 capitalize">
                            {place.type}{place.cuisine ? ` • ${place.cuisine}` : ''}
                          </p>
                          {place.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium text-white/80">{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {place.awards && place.awards.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {place.awards.slice(0, 2).map((award, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                                  {award.award}
                                </Badge>
                              ))}
                              {place.awards.length > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                                  +{place.awards.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Awards Organizations Sheet */}
      <Sheet open={showAwardsOrgs} onOpenChange={setShowAwardsOrgs}>
        <SheetContent side="right" className="w-full sm:w-[450px] p-0 bg-black/70 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-yellow-500" />
              Award Organizations
            </SheetTitle>
            <SheetDescription className="text-white/60">
              Browse venues by award-granting companies
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 space-y-3">
              {/* Active Filter Indicator */}
              {selectedOrgFilter && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-yellow-300">
                      Filtering: {AWARD_ORGANIZATIONS.find(o => o.id === selectedOrgFilter)?.name}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setSelectedOrgFilter(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {AWARD_ORGANIZATIONS.map((org) => {
                const venues = getVenuesByOrg(org.id);
                return (
                  <motion.div
                    key={org.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedOrgFilter === org.id 
                        ? 'bg-yellow-500/20 border-yellow-500/40' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => {
                      setSelectedOrgFilter(selectedOrgFilter === org.id ? null : org.id);
                      if (venues.length > 0) {
                        setShowPlacesList(true);
                      }
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${org.color} flex items-center justify-center text-2xl text-white shadow-lg`}>
                        {org.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base text-white">{org.name}</h4>
                          <Badge className="bg-white/10 text-white/80">
                            {venues.length} venues
                          </Badge>
                        </div>
                        <p className="text-xs text-white/50 mt-1">{org.description}</p>
                        
                        {/* Award types */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {org.awards.slice(0, 3).map((award, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                              {award}
                            </Badge>
                          ))}
                          {org.awards.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                              +{org.awards.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Venue preview */}
                        {venues.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wide">Top Venues</p>
                            <div className="space-y-1.5">
                              {venues.slice(0, 3).map((venue) => (
                                <div 
                                  key={venue.id} 
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAwardsOrgs(false);
                                    handlePlaceClick(venue);
                                  }}
                                >
                                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs
                                    ${venue.type === 'bar' ? 'bg-purple-500/30' : 
                                      venue.type === 'restaurant' ? 'bg-orange-500/30' : 
                                      'bg-amber-500/30'}`}
                                  >
                                    {venue.type === 'bar' ? '🍺' : venue.type === 'restaurant' ? '🍽️' : '☕'}
                                  </div>
                                  <span className="text-xs font-medium truncate flex-1 text-white/80">{venue.name}</span>
                                  <Navigation className="w-3 h-3 text-white/40" />
                                </div>
                              ))}
                            </div>
                            {venues.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs text-white/60 hover:text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrgFilter(org.id);
                                  setShowPlacesList(true);
                                }}
                              >
                                View all {venues.length} venues →
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Venue Detail Sheet */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-[1001] bg-black/50 backdrop-blur-xl rounded-t-[2rem]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 pb-6">
              {/* Handle */}
              <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-3" />
              
              {/* Close Button - More prominent */}
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all"
                onClick={() => setSelectedPlace(null)}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4 mb-4 pr-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                  ${selectedPlace.type === 'bar' ? 'bg-purple-500/40' : 
                    selectedPlace.type === 'restaurant' ? 'bg-orange-500/40' : 
                    'bg-amber-500/40'}`}
                >
                  {selectedPlace.type === 'bar' ? '🍺' : selectedPlace.type === 'restaurant' ? '🍽️' : '☕'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedPlace.name}</h2>
                  <p className="text-sm text-white/60 capitalize">
                    {selectedPlace.type}{selectedPlace.cuisine ? ` • ${selectedPlace.cuisine}` : ''}
                  </p>
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-white">{selectedPlace.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Awards - Enhanced Display */}
              {selectedPlace.awards && selectedPlace.awards.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white/80">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Awards & Recognition ({selectedPlace.awards.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                    {selectedPlace.awards.map((award, i) => {
                      const org = AWARD_ORGANIZATIONS.find(o => o.id === award.organization);
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                        >
                          <div className={`w-10 h-10 rounded-lg ${org?.color || 'bg-yellow-500'} flex items-center justify-center text-lg shadow-md`}>
                            {org?.icon || '🏆'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-yellow-300 truncate">{award.award}</p>
                            <p className="text-xs text-white/50">{org?.name || 'Award'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 mb-4">
                {selectedPlace.address && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <MapPinned className="w-4 h-4 text-white/50" />
                    <span>{selectedPlace.address}</span>
                  </div>
                )}
                {selectedPlace.openingHours && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">Hours:</span>
                    <span className="text-white/70">{selectedPlace.openingHours}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0" 
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Directions
                </Button>
                {selectedPlace.website && (
                  <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => window.open(selectedPlace.website, '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="h-[450px] rounded-t-3xl bg-black/70 backdrop-blur-2xl border-t border-white/10">
          <SheetHeader>
            <SheetTitle className="text-white">Map Settings</SheetTitle>
            <SheetDescription className="text-white/60">
              Customize your map tracking and visibility preferences
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-center" className="text-base font-medium text-white">
                  Auto-Center on Location
                </Label>
                <p className="text-sm text-white/50">
                  Automatically center map as you move
                </p>
              </div>
              <Switch
                id="auto-center"
                checked={autoCenter}
                onCheckedChange={setAutoCenter}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="ghost-mode" className="text-base font-medium text-white">
                  Ghost Mode
                </Label>
                <p className="text-sm text-white/50">
                  Hide your location from others
                </p>
              </div>
              <Switch
                id="ghost-mode"
                checked={ghostMode}
                onCheckedChange={handleToggleGhostMode}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="show-places" className="text-base font-medium text-white">
                  Show Bars & Restaurants
                </Label>
                <p className="text-sm text-white/50">
                  Display nearby venues on the map
                </p>
              </div>
              <Switch
                id="show-places"
                checked={showPlaces}
                onCheckedChange={setShowPlaces}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="satellite-mode" className="text-base font-medium text-white">
                  Satellite View
                </Label>
                <p className="text-sm text-white/50">
                  Switch between street and satellite imagery
                </p>
              </div>
              <Switch
                id="satellite-mode"
                checked={satelliteMode}
                onCheckedChange={setSatelliteMode}
              />
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${isTracking ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {isTracking ? 'GPS Active' : 'GPS Inactive'}
                  </p>
                  <p className="text-xs text-white/50">
                    {viewMode === 'city' ? `City view (${CITY_RADIUS_KM}km)` : `Nearby view (${NEARBY_RADIUS_KM}km)`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LiveMap;
