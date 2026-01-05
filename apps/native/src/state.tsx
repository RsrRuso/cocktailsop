
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Post, Story, UserT } from './types';

const LS_KEY = 'labsop_state_v1';
export const uid = (p='id') => `${p}-${Math.random().toString(36).slice(2,10)}`;
export const nowIso = () => new Date().toISOString();

function seed(): AppState {
  const me: UserT = { id: 'u-me', handle: '@you', name: 'You', role: 'Operator', badges: ['White Coat'] };
  const u1: UserT = { id: 'u-russo', handle: '@russo', name: 'Russo', role: 'Alchemist', badges: ['Laureate'] };
  const u2: UserT = { id: 'u-alya', handle: '@alya', name: 'Alya', role: 'Bartender', badges: ['Architect'] };

  const posts: Post[] = [{
    id: uid('p'), authorId: u1.id, createdAt: nowIso(), caption: 'Clarified Daiquiri — 18% ABV, pH 3.2, 12 Brix. #sour #clarified',
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1582457279548-38186fd2c95e?auto=format&fit=crop&w=1200&q=60', aspect: 1 }],
    likes: 128, comments: [], kind: 'spec',
    recipe: { abv: 18, brix: 12, ph: 3.2, glass: 'Nick & Nora', ice: 'None', garnish: 'Lime oil',
      ingredients: [ { name: 'White Rum 40%', ml: 45, abvPct: 40, costPerLiter: 120 }, { name: 'Lime', ml: 30, costPerLiter: 15 }, { name: 'Syrup', ml: 20, costPerLiter: 8 }, { name: 'Water', ml: 15 } ],
      method: 'Shake 12s, fine strain' }
  },{
    id: uid('p'), authorId: u2.id, createdAt: nowIso(), caption: 'Speed/Precision drill — 30s stir on big cube. #stirred',
    media: [{ type: 'video', url: 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_25fps.mp4', aspect: 1 }],
    likes: 96, comments: [], kind: 'reel'
  }];
  const stories: Story[] = [
    { id: uid('s'), authorId: u1.id, createdAt: nowIso(), media: { type: 'image', url: 'https://images.unsplash.com/photo-1544070078-a212ede68f47?auto=format&fit=crop&w=800&q=60' } },
    { id: uid('s'), authorId: u2.id, createdAt: nowIso(), media: { type: 'image', url: 'https://images.unsplash.com/photo-1560512823-829485b8d4ee?auto=format&fit=crop&w=800&q=60' } },
  ];

  return { users: [me,u1,u2], meId: me.id, posts, stories, following: { [u1.id]: true, [u2.id]: true }, messages: [{ id: uid('m'), withId: u1.id, last: 'Let’s collab' }] };
}

const AppCtx = createContext<{state:AppState; setState: React.Dispatch<React.SetStateAction<AppState>>} | null>(null);

export function AppProvider({ children }:{ children: React.ReactNode }){
  const [state, setState] = useState<AppState>(seed);
  useEffect(()=>{ (async()=>{ try { const raw = await AsyncStorage.getItem(LS_KEY); if (raw) setState(JSON.parse(raw)); } catch { /* ignore */ } })() }, []);
  useEffect(()=>{ AsyncStorage.setItem(LS_KEY, JSON.stringify(state)).catch(()=>{}) }, [state]);
  return <AppCtx.Provider value={{state, setState}}>{children}</AppCtx.Provider>;
}
export function useApp(){ const ctx = useContext(AppCtx); if(!ctx) throw new Error('AppProvider missing'); return ctx; }
