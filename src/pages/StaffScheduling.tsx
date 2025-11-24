import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Download, Plus, Trash2, Wand2, Calendar, Users, Save, Edit } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, addDays } from 'date-fns';
import { toPng } from 'html-to-image';

interface StaffMember {
  id: string;
  name: string;
  title: 'head_bartender' | 'senior_bartender' | 'bartender' | 'bar_back' | 'support';
  email?: string | null;
  breakTimings?: {
    firstWaveStart: string;
    firstWaveEnd: string;
    secondWaveStart: string;
  };
}

interface ScheduleCell {
  staffId: string;
  day: string;
  timeRange: string;
  type: 'opening' | 'closing' | 'pickup' | 'brunch' | 'off' | 'regular' | 'early_shift' | 'late_shift';
  station?: string;
  breakStart?: string;
  breakEnd?: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CELL_COLORS = {
  opening: 'bg-green-500/20',
  closing: 'bg-red-500/20',
  pickup: 'bg-amber-500/25',
  brunch: 'bg-orange-500/20',
  early_shift: 'bg-orange-400/40',  // 4 PM shifts - vibrant coral/orange
  late_shift: 'bg-sky-400/40',      // 5 PM shifts - vibrant sky blue
  off: 'bg-muted',
  regular: 'bg-background',
};

const ROLE_RESPONSIBILITIES = {
  head_bartender: 'Supervise all bar operations, coordinate teams, monitor safety and quality standards, oversee workflow',
  senior_bartender: 'Work behind assigned bar station, train junior staff members, ensure health and safety compliance',
  bartender: 'Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards',
  bar_back: 'Handle pickups and refills, polish glassware, stock supplies and prepare garnishes',
  support: 'Work 10 hour shifts from 3PM to 1AM, provide glassware support and general assistance',
};

export default function StaffScheduling() {
  const { user } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [venueName, setVenueName] = useState('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ScheduleCell>>({});
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [dailyEvents, setDailyEvents] = useState<Record<string, string>>({
    // Default events
    'Tuesday': 'Ladies Night',
    'Friday': 'Weekend',
    'Saturday': 'Brunch'
  });
  const [specialEvents, setSpecialEvents] = useState<Record<string, string>>({});
  const [isEditingEvents, setIsEditingEvents] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    title: 'bartender' as StaffMember['title'],
    email: '',
  });
  
  const [editingStaff, setEditingStaff] = useState<{
    id: string;
    name: string;
    title: StaffMember['title'];
    email: string;
  } | null>(null);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      console.log('User authenticated:', user.id);
      fetchStaffMembers();
      fetchSavedSchedules();
    } else {
      console.log('No user authenticated');
    }
  }, [user]);

  // Re-fetch inventory when workspace changes
  useEffect(() => {
    if (user?.id) {
      fetchExpiringItems();
    }
  }, [user, currentWorkspace]);

  // Ensure loaded schedules always have station assignments once staff and schedule are available
  useEffect(() => {
    if (!user?.id) return;
    if (staffMembers.length === 0) return;
    if (Object.keys(schedule).length === 0) return;

    const needsNormalization = Object.values(schedule).some((cell) => {
      if (cell.timeRange === 'OFF') return false;
      const staff = staffMembers.find((s) => s.id === cell.staffId);
      if (!staff) return false;
      const isBartenderRole = staff.title === 'bartender' || staff.title === 'senior_bartender';
      if (!isBartenderRole) return false;
      return !cell.station || !cell.station.includes('Station');
    });

    if (needsNormalization) {
      const normalized = normalizeStationAssignments(schedule);
      setSchedule(normalized);
    }
  }, [staffMembers, user]);

  const fetchExpiringItems = async () => {
    if (!user?.id) return;

    try {
      console.log('Fetching expiring items for user:', user.id);
      
      // Calculate date 14 days from now
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
      const expiryThreshold = fourteenDaysFromNow.toISOString().split('T')[0];

      // Fetch from FIFO inventory
      const { data: fifoData, error: fifoError } = await supabase
        .from('fifo_inventory')
        .select(`
          *,
          fifo_items!inner (
            name,
            category,
            brand
          ),
          fifo_stores!inner (
            name
          )
        `)
        .eq('user_id', user.id)
        .lte('expiration_date', expiryThreshold)
        .gt('quantity', 0)
        .order('expiration_date', { ascending: true });

      if (fifoError) {
        console.error('Error fetching FIFO expiring items:', fifoError);
      }

      // Fetch from regular inventory (if workspace exists)
      let regularData: any[] = [];
      if (currentWorkspace) {
        const { data, error } = await supabase
          .from('inventory')
          .select(`
            *,
            items!inner (
              name,
              category,
              brand
            ),
            stores!inner (
              name
            )
          `)
          .eq('workspace_id', currentWorkspace.id)
          .lte('expiration_date', expiryThreshold)
          .gt('quantity', 0)
          .order('expiration_date', { ascending: true });

        if (error) {
          console.error('Error fetching regular inventory expiring items:', error);
        } else {
          regularData = data || [];
        }
      }

      // Combine both sources and normalize the data structure
      const allItems = [
        ...(fifoData || []).map(item => ({
          ...item,
          items: item.fifo_items,
          stores: item.fifo_stores,
          source: 'fifo'
        })),
        ...(regularData || []).map(item => ({
          ...item,
          source: 'regular'
        }))
      ].sort((a, b) => 
        new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
      );

      console.log('Found expiring items:', allItems.length, 'items (FIFO:', fifoData?.length || 0, ', Regular:', regularData.length, ')');
      setExpiringItems(allItems);
    } catch (error) {
      console.error('Error fetching expiring items:', error);
    }
  };

  const fetchStaffMembers = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    console.log('Fetching staff for user:', user.id);
    
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('title', { ascending: true });

    console.log('Staff members query result:', { data, error, count: data?.length });

    if (!error && data) {
      // Load break timings from database or use defaults
      const staffWithBreaks = data.map(staff => {
        const breakTimings = staff.break_timings as any;
        return {
          id: staff.id,
          name: staff.name,
          title: staff.title as StaffMember['title'],
          email: staff.email,
          breakTimings: breakTimings || {
            firstWaveStart: '5:30 PM',
            firstWaveEnd: '6:30 PM',
            secondWaveStart: '6:30 PM'
          }
        };
      });
      setStaffMembers(staffWithBreaks);
    }
  };

  const fetchSavedSchedules = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setSavedSchedules(data || []);
    } catch (error) {
      console.error('Error fetching saved schedules:', error);
    }
  };

  const normalizeStationAssignments = (scheduleData: Record<string, ScheduleCell>) => {
    const normalized: Record<string, ScheduleCell> = {};
    
    // Group by day to process each day's assignments
    const schedulesByDay: Record<string, ScheduleCell[]> = {};
    
    Object.entries(scheduleData).forEach(([key, cell]) => {
      if (!schedulesByDay[cell.day]) {
        schedulesByDay[cell.day] = [];
      }
      schedulesByDay[cell.day].push({ ...cell, key } as any);
    });
    
    // Process each day
    DAYS_OF_WEEK.forEach(day => {
      const dayCells = schedulesByDay[day] || [];
      
      // Separate by role for proper assignment
      let indoorBartenderCount = 0;
      let outdoorBartenderCount = 0;
      
      dayCells.forEach((cell: any) => {
        const staff = staffMembers.find(s => s.id === cell.staffId);
        if (!staff || cell.timeRange === 'OFF') {
          normalized[cell.key] = cell;
          return;
        }
        
        const title = staff.title;
        let station = '';
        
        // Assign station based on role
        if (title === 'head_bartender') {
          station = 'Supervise all bar operations, coordinate teams, monitor safety and quality standards, oversee workflow';
        } else if (title === 'bar_back') {
          station = 'Handle pickups and refills, polish glassware, stock supplies and prepare garnishes';
        } else if (title === 'support') {
          station = 'Work 10 hour shifts from 3PM to 1AM, provide glassware support and general assistance';
        } else if (title === 'senior_bartender') {
          // Determine if indoor or outdoor based on existing station or alternate
          const isOutdoor = cell.station?.includes('Outdoor');
          
          if (isOutdoor) {
            // Outdoor has 2 operational stations
            const stationNum = (outdoorBartenderCount % 2) + 1;
            station = `Outdoor - Station ${stationNum}: Work behind assigned bar station, train junior staff members, ensure health and safety compliance`;
            outdoorBartenderCount++;
          } else {
            // Indoor has 3 stations: 1, 2 operational, 3 garnishing
            const stationNum = (indoorBartenderCount % 3) + 1;
            if (stationNum === 3) {
              station = 'Indoor - Garnishing Station 3: Work behind assigned bar station, train junior staff members, ensure health and safety compliance';
            } else {
              station = `Indoor - Station ${stationNum}: Work behind assigned bar station, train junior staff members, ensure health and safety compliance`;
            }
            indoorBartenderCount++;
          }
        } else if (title === 'bartender') {
          // Determine if indoor or outdoor based on existing station or alternate
          const isOutdoor = cell.station?.includes('Outdoor');
          
          if (isOutdoor) {
            // Outdoor has 2 operational stations
            const stationNum = (outdoorBartenderCount % 2) + 1;
            station = `Outdoor - Station ${stationNum}: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards`;
            outdoorBartenderCount++;
          } else {
            // Indoor has 3 stations: 1, 2 operational, 3 garnishing
            const stationNum = (indoorBartenderCount % 3) + 1;
            if (stationNum === 3) {
              station = 'Indoor - Garnishing Station 3: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards';
            } else {
              station = `Indoor - Station ${stationNum}: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards`;
            }
            indoorBartenderCount++;
          }
        }
        
        normalized[cell.key] = {
          ...cell,
          station: station || cell.station
        };
      });
    });
    
    return normalized;
  };

  const loadSchedule = (savedSchedule: any) => {
    setVenueName(savedSchedule.venue_name || '');
    const loadedSchedule = savedSchedule.schedule_data || {};
    const normalizedSchedule = normalizeStationAssignments(loadedSchedule);
    setSchedule(normalizedSchedule);
    setDailyEvents(savedSchedule.daily_events || {});
    setSpecialEvents(savedSchedule.special_events || {});
    setWeekStartDate(savedSchedule.week_start_date);
    setShowLoadDialog(false);
    toast.success('Schedule loaded successfully!');
  };

  const saveBreakTimings = async (staffId: string, breakTimings: any) => {
    const { error } = await supabase
      .from('staff_members')
      .update({ break_timings: breakTimings })
      .eq('id', staffId);

    if (error) {
      console.error('Error saving break timings:', error);
      toast.error('Failed to save break timings');
    }
  };


  const addStaffMember = async () => {
    if (!newStaff.name) {
      toast.error('Please enter staff name');
      return;
    }

    if (!newStaff.email) {
      toast.error('Please enter staff email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaff.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const { error } = await supabase
      .from('staff_members')
      .insert({
        user_id: user?.id,
        name: newStaff.name,
        title: newStaff.title,
        email: newStaff.email,
        invitation_status: 'pending',
      });

    if (error) {
      toast.error('Failed to add staff member');
      return;
    }

    toast.success('Staff member added successfully');
    setNewStaff({ name: '', title: 'bartender', email: '' });
    setIsAddStaffOpen(false);
    fetchStaffMembers();
  };

  const updateStaffMember = async () => {
    if (!editingStaff) return;

    if (!editingStaff.name) {
      toast.error('Please enter staff name');
      return;
    }

    if (!editingStaff.email) {
      toast.error('Please enter staff email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingStaff.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const { error } = await supabase
      .from('staff_members')
      .update({
        name: editingStaff.name,
        title: editingStaff.title,
        email: editingStaff.email,
      })
      .eq('id', editingStaff.id);

    if (error) {
      toast.error('Failed to update staff member');
      return;
    }

    toast.success('Staff member updated successfully');
    setEditingStaff(null);
    setIsEditStaffOpen(false);
    fetchStaffMembers();
  };

  const confirmDeleteStaffMember = async () => {
    if (!staffToDelete) return;
    
    const { error } = await supabase
      .from('staff_members')
      .update({ is_active: false })
      .eq('id', staffToDelete);

    if (error) {
      toast.error('Failed to remove staff member');
      return;
    }

    toast.success('Staff member removed');
    setStaffToDelete(null);
    fetchStaffMembers();
  };



  const updateScheduleCell = (staffId: string, day: string, timeRange: string, type: ScheduleCell['type'], station?: string, breakStart?: string, breakEnd?: string) => {
    const key = `${staffId}-${day}`;
    setSchedule(prev => ({
      ...prev,
      [key]: { staffId, day, timeRange, type, station, breakStart, breakEnd }
    }));
  };

  const getScheduleCell = (staffId: string, day: string): ScheduleCell | undefined => {
    const key = `${staffId}-${day}`;
    return schedule[key];
  };

  // Helper function to calculate break end time (1 hour after start)
  const calculateBreakEnd = (startTime: string): string => {
    if (!startTime) return '';
    
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    // Add 1 hour
    let endHour = hour24 + 1;
    
    // Convert back to 12-hour format
    let endPeriod = endHour >= 12 ? 'PM' : 'AM';
    let endHour12 = endHour % 12;
    if (endHour12 === 0) endHour12 = 12;
    
    return `${endHour12}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;
  };

  // Helper function to shuffle array (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const autoGenerateSchedule = async () => {
    console.log('🔄 Starting schedule generation...');
    
    if (staffMembers.length === 0) {
      toast.error('Please add staff members first');
      return;
    }

    // PRESERVE EXISTING SCHEDULE - Start with current data instead of wiping it
    const newSchedule: Record<string, ScheduleCell> = { ...schedule };
    
    // Get staff by role and SHUFFLE them for randomized allocation
    const headBartenders = shuffleArray(staffMembers.filter(s => s.title === 'head_bartender'));
    const seniorBartenders = shuffleArray(staffMembers.filter(s => s.title === 'senior_bartender'));
    const bartenders = shuffleArray(staffMembers.filter(s => s.title === 'bartender'));
    const barBacks = shuffleArray(staffMembers.filter(s => s.title === 'bar_back'));
    const support = shuffleArray(staffMembers.filter(s => s.title === 'support'));

    console.log('🔀 SHUFFLED Staff order:');
    console.log('  Heads:', headBartenders.map(s => s.name).join(', '));
    console.log('  Seniors:', seniorBartenders.map(s => s.name).join(', '));
    console.log('  Bartenders:', bartenders.map(s => s.name).join(', '));
    console.log('  Bar Backs:', barBacks.map(s => s.name).join(', '));
    console.log('  Support:', support.map(s => s.name).join(', '));

    console.log('📊 Staff counts:', {
      headBartenders: headBartenders.length,
      seniorBartenders: seniorBartenders.length,
      bartenders: bartenders.length,
      barBacks: barBacks.length,
      support: support.length
    });

    if (headBartenders.length === 0 && seniorBartenders.length === 0 && bartenders.length === 0) {
      toast.error('Please add at least some bartenders');
      return;
    }

    const totalBartenders = headBartenders.length + seniorBartenders.length + bartenders.length;

    // BUSY DAYS - Determine from dailyEvents (days with events get no offs)
    const busyDays = DAYS_OF_WEEK.map((day, idx) => dailyEvents[day] ? idx : -1).filter(idx => idx !== -1);
    console.log('📅 Busy days:', busyDays, 'Events:', dailyEvents);
    console.log('🔍 Monday (index 0) is busy?', busyDays.includes(0), 'Monday event:', dailyEvents['Monday']);
    
    // Calculate week number to determine alternating pattern
    const weekDate = new Date(weekStartDate);
    const weekNumber = Math.floor((weekDate.getTime() - new Date(weekDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const isOddWeek = weekNumber % 2 === 1;
    
    // Fetch previous week's schedule to implement alternating logic
    const previousWeekStart = new Date(weekDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekStartStr = format(previousWeekStart, 'yyyy-MM-dd');
    
    console.log('📅 Fetching previous week schedule:', previousWeekStartStr);
    
    const { data: previousAllocations } = await supabase
      .from('staff_allocations')
      .select('*')
      .eq('user_id', user?.id)
      .gte('allocation_date', previousWeekStartStr)
      .lt('allocation_date', weekStartDate);
    
    // Track previous week's days off per staff member
    const previousWeekDaysOff: Record<string, number> = {};
    if (previousAllocations) {
      staffMembers.forEach(staff => {
        const staffPreviousAllocs = previousAllocations.filter(a => a.staff_member_id === staff.id);
        const offCount = staffPreviousAllocs.filter(a => 
          a.shift_type === 'off' || a.station_assignment === 'OFF'
        ).length;
        previousWeekDaysOff[staff.id] = offCount;
        console.log(`📊 ${staff.name} had ${offCount} days off last week`);
      });
    }
    
    console.log('📆 Week info:', { weekNumber, isOddWeek });
    
    // NEW RULE: Everyone gets AT LEAST 1 day off per week (minimum 1, maximum 2)
    // - Person with even index: Week 1 = 1 day, Week 2 = 2 days
    // - Person with odd index: Week 1 = 2 days, Week 2 = 1 day
    // This ensures everyone ALWAYS has at least 1 day off, never 0
    
    // Available off days - ONLY these days: Monday(0), Wednesday(2), Thursday(3), Sunday(6)
    const allowedOffDays = [0, 2, 3, 6];
    console.log('✅ Allowed off days:', allowedOffDays.map(d => DAYS_OF_WEEK[d]));
    console.log('📅 Busy event days:', busyDays.map(d => DAYS_OF_WEEK[d]));
    
    // Track how many offs per day
    const offsPerDay: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    // CRITICAL: Track bartender assignments per day to enforce rules:
    // 1. Minimum 3 bartenders working each day
    // 2. Maximum 2 bartenders off on the same day
    const bartendersPerDay: Record<number, number> = {};
    const bartendersOffPerDay: Record<number, number> = {};
    DAYS_OF_WEEK.forEach((_, idx) => {
      bartendersPerDay[idx] = headBartenders.length + seniorBartenders.length + bartenders.length;
      bartendersOffPerDay[idx] = 0;
    });
    
    const divideIntoGroups = (staffList: StaffMember[], roleOffset: number, isBartenderRole: boolean = false, isSupport: boolean = false) => {
      console.log(`\n🎯 Dividing ${staffList.length} staff members (Alternating 1-2 days off)...`);
      console.log(`📅 Available off days: ${allowedOffDays.map(d => DAYS_OF_WEEK[d]).join(', ')}`);
      console.log(`⚠️ Bartender role: ${isBartenderRole}, Support role: ${isSupport}`);
      
      // Track distribution to ensure ALL 4 days are used
      const dayOffDistribution: Record<number, string[]> = {};
      allowedOffDays.forEach(day => {
        dayOffDistribution[day] = [];
      });
      
      // NEW: Track off days per role to prevent 2-person roles from having same day off
      const roleOffsPerDay: Record<number, number> = {};
      allowedOffDays.forEach(day => {
        roleOffsPerDay[day] = 0;
      });
      
      const results = staffList.map((staff, index) => {
        const globalIndex = roleOffset + index;
        
        // SPECIAL RULE FOR SUPPORT: 2 days off per MONTH (1 day off every 2 weeks, 10-hour shifts)
        let targetDaysOff: number;
        if (isSupport) {
          // Support gets 1 day off every 2 weeks = 2 days per month (works 10 hours daily)
          targetDaysOff = isOddWeek ? 1 : 0;
          console.log(`\n  🎯 ${staff.name} (SUPPORT): Target = ${targetDaysOff} day(s) off (odd week: ${isOddWeek}, 10h shifts)`);
        } else {
          // Check previous week's days off for this staff member
          const previousDaysOff = previousWeekDaysOff[staff.id] ?? 0;
          
          // ALTERNATING LOGIC:
          // - If they had 2 days off last week → give 1 day off this week
          // - If they had 1 day off last week → give 2 days off this week
          // - If they had 0 days off last week (new staff) → give 2 days to start
          if (previousDaysOff === 2) {
            targetDaysOff = 1;
          } else if (previousDaysOff === 1) {
            targetDaysOff = 2;
          } else {
            // New staff or first schedule: alternate based on index
            targetDaysOff = globalIndex % 2 === 0 ? 2 : 1;
          }
          
          console.log(`\n  🎯 ${staff.name}: Last week = ${previousDaysOff} days off → This week = ${targetDaysOff} day(s) off`);
        }
        
        // If support gets 0 days off this week (works 10h, gets 2 days/month total), skip off day assignment
        if (isSupport && targetDaysOff === 0) {
          console.log(`  ℹ️ ${staff.name} (SUPPORT) works all 7 days this week (10h shifts, off days next week)`);
          return {
            staff,
            daysOff: [],
            groupType: 'working-all-week',
            actualDaysOff: 0
          };
        }
        
        // Get available days (not busy) and SHUFFLE for randomized allocation
        let availableDays = shuffleArray(allowedOffDays.filter(day => !busyDays.includes(day)));
        
        // CRITICAL VALIDATIONS for bartender roles:
        if (isBartenderRole) {
          availableDays = availableDays.filter(dayNum => {
            const wouldHaveAfterOff = bartendersPerDay[dayNum] - 1;
            const offsOnThisDay = bartendersOffPerDay[dayNum];
            
            // Rule 1: Must maintain minimum 3 working
            const meetsMinimum = wouldHaveAfterOff >= 3;
            
            // Rule 2: Maximum 2 bartenders off on same day
            const meetsMaxOff = offsOnThisDay < 2;
            
            const canGiveOff = meetsMinimum && meetsMaxOff;
            
            if (!canGiveOff) {
              if (!meetsMinimum) {
                console.log(`  ⚠️ Cannot give ${DAYS_OF_WEEK[dayNum]} off - would drop to ${wouldHaveAfterOff} bartenders (min 3)`);
              }
              if (!meetsMaxOff) {
                console.log(`  ⚠️ Cannot give ${DAYS_OF_WEEK[dayNum]} off - already ${offsOnThisDay} bartenders off (max 2)`);
              }
            }
            
            return canGiveOff;
          });
        }
        
        // NEW: For 2-person roles, prevent both from having same day off
        if (staffList.length === 2) {
          availableDays = availableDays.filter(dayNum => {
            const roleOffsThisDay = roleOffsPerDay[dayNum];
            const canGiveOff = roleOffsThisDay < 1; // Only 1 person from 2-person role can be off
            
            if (!canGiveOff) {
              console.log(`  ⚠️ Cannot give ${DAYS_OF_WEEK[dayNum]} off - other member of 2-person role already off this day`);
            }
            
            return canGiveOff;
          });
        }
        
        // CRITICAL: If no available days after constraints, must give at least 1 day off anyway
        // EXCEPTION: Support staff can work 7 days when they have 0 target days off
        if (availableDays.length === 0 && !isSupport) {
          console.warn(`  ⚠️ ${staff.name}: No valid days pass all constraints - forcing at least 1 day off`);
          // Fall back to all allowed off days (ignore bartender minimum constraint for this person)
          availableDays = allowedOffDays.filter(day => !busyDays.includes(day));
          
          if (availableDays.length === 0) {
            // Even busy days - give them the least busy day
            availableDays = allowedOffDays;
          }
          
          // Force them to get only 1 day off (minimum required)
          targetDaysOff = 1;
          console.warn(`  ⚠️ Forcing ${staff.name} to get ${targetDaysOff} day off despite constraints`);
        } else if (availableDays.length === 0 && isSupport && targetDaysOff === 0) {
          // Support staff with 0 target days off can work all 7 days (10-hour shifts, 2 days off per month)
          console.log(`  ℹ️ ${staff.name} (SUPPORT): Working all 7 days this week (10h shifts, no off days scheduled)`);
          return { staffId: staff.id, offDays: [] };
        }
        
        // Distribute days evenly using round-robin
        let finalDaysOff: number[] = [];
        
        if (targetDaysOff === 1) {
          // 1 day off: randomized selection
          const selectedDay = availableDays[0]; // Already shuffled, so take first
          console.log(`  🎲 ${staff.name}: Selected ${DAYS_OF_WEEK[selectedDay]} from shuffled options: ${availableDays.map(d => DAYS_OF_WEEK[d]).join(', ')}`);
          finalDaysOff.push(selectedDay);
          dayOffDistribution[selectedDay].push(staff.name);
          offsPerDay[selectedDay]++;
          roleOffsPerDay[selectedDay]++; // Track for 2-person role constraint
          
          // Update bartender counts if this is a bartender role
          if (isBartenderRole) {
            bartendersPerDay[selectedDay]--;
            bartendersOffPerDay[selectedDay]++;
            console.log(`  📊 ${DAYS_OF_WEEK[selectedDay]}: Now ${bartendersPerDay[selectedDay]} working, ${bartendersOffPerDay[selectedDay]} off`);
          }
          
          console.log(`  ✅ 1 day: ${DAYS_OF_WEEK[selectedDay]}`);
        } else {
          // 2 days off: pick first 2 from shuffled available days
          console.log(`  🎲 ${staff.name}: Selecting 2 days from shuffled options: ${availableDays.map(d => DAYS_OF_WEEK[d]).join(', ')}`);
          let attempts = 0;
          const maxAttempts = availableDays.length;
          
          while (finalDaysOff.length < 2 && attempts < maxAttempts) {
            const candidateDay = availableDays[attempts]; // Take from shuffled array
            
            // Check if we already picked this day
            if (!finalDaysOff.includes(candidateDay)) {
              finalDaysOff.push(candidateDay);
              dayOffDistribution[candidateDay].push(staff.name);
              offsPerDay[candidateDay]++;
              roleOffsPerDay[candidateDay]++; // Track for 2-person role constraint
              
              // Update bartender counts if this is a bartender role
              if (isBartenderRole) {
                bartendersPerDay[candidateDay]--;
                bartendersOffPerDay[candidateDay]++;
                console.log(`  📊 ${DAYS_OF_WEEK[candidateDay]}: Now ${bartendersPerDay[candidateDay]} working, ${bartendersOffPerDay[candidateDay]} off`);
              }
            }
            
            attempts++;
          }
          
          // If we couldn't get 2 days (due to constraints), that's ok - at least 1 day off
          if (finalDaysOff.length < 2 && finalDaysOff.length > 0) {
            console.warn(`  ⚠️ Could only assign ${finalDaysOff.length} day(s) off due to staffing constraints (max 2 bartenders off per day)`);
          }
          
          console.log(`  ✅ ${finalDaysOff.length} days: ${finalDaysOff.map(d => DAYS_OF_WEEK[d]).join(', ')}`);
        }
        
        return {
          staff,
          daysOff: finalDaysOff,
          groupType: targetDaysOff === 1 ? 'one-day' : 'two-day',
          actualDaysOff: finalDaysOff.length
        };
      });
      
      // SHOW DISTRIBUTION SUMMARY
      console.log(`\n📊 ${staffList[0]?.title || 'STAFF'} DAY OFF DISTRIBUTION:`);
      allowedOffDays.forEach(dayNum => {
        const dayName = DAYS_OF_WEEK[dayNum];
        const count = dayOffDistribution[dayNum].length;
        const names = dayOffDistribution[dayNum].join(', ') || 'none';
        console.log(`  ${dayName}: ${count} person(s) - ${names}`);
      });
      
      return results;
    };

    const headSchedules = divideIntoGroups(headBartenders, 0, true, false);
    const seniorBartenderSchedules = divideIntoGroups(seniorBartenders, headBartenders.length, true, false);
    const bartenderSchedules = divideIntoGroups(bartenders, headBartenders.length + seniorBartenders.length, true, false);
    const barBackSchedules = divideIntoGroups(barBacks, headBartenders.length + seniorBartenders.length + bartenders.length, false, false);
    const supportSchedules = divideIntoGroups(support, headBartenders.length + seniorBartenders.length + bartenders.length + barBacks.length, false, true);
    
    // Log final distribution
    console.log('📊 Final off day distribution:', {
      Monday: offsPerDay[0],
      Wednesday: offsPerDay[2],
      Thursday: offsPerDay[3],
      Sunday: offsPerDay[6]
    });

    // Generate schedule for entire week - ENSURE ALL STAFF GET ALL DAYS
    DAYS_OF_WEEK.forEach((day, dayIndex) => {
      const isWeekday = dayIndex < 5; // Mon-Fri (0=Mon, 4=Fri)
      const isPickupDay = day === 'Monday' || day === 'Wednesday' || day === 'Friday';
      const isBrunchDay = day === 'Saturday';
      const isBusyDay = busyDays.includes(dayIndex);

      // Track which staff have been scheduled to avoid duplicates
      const assignedStaffIds = new Set<string>();

      // First, separate ALL staff into off vs working arrays
      const offHeads: typeof headSchedules = [];
      const workingHeads: typeof headSchedules = [];
      const offSeniorBartenders: typeof seniorBartenderSchedules = [];
      const workingSeniorBartenders: typeof seniorBartenderSchedules = [];
      const offBartenders: typeof bartenderSchedules = [];
      const workingBartenders: typeof bartenderSchedules = [];
      const offBarBacks: typeof barBackSchedules = [];
      const workingBarBacks: typeof barBackSchedules = [];
      const offSupport: typeof supportSchedules = [];
      const workingSupport: typeof supportSchedules = [];
      
      headSchedules.forEach(schedule => {
        const shouldBeOff = schedule.daysOff.includes(dayIndex);
        if (shouldBeOff) {
          offHeads.push(schedule);
        } else {
          workingHeads.push(schedule);
        }
      });
      
      seniorBartenderSchedules.forEach(schedule => {
        const shouldBeOff = schedule.daysOff.includes(dayIndex);
        if (shouldBeOff) {
          offSeniorBartenders.push(schedule);
        } else {
          workingSeniorBartenders.push(schedule);
        }
      });
      
      bartenderSchedules.forEach(schedule => {
        const shouldBeOff = schedule.daysOff.includes(dayIndex);
        if (shouldBeOff) {
          offBartenders.push(schedule);
        } else {
          workingBartenders.push(schedule);
        }
      });
      
      barBackSchedules.forEach(schedule => {
        const shouldBeOff = schedule.daysOff.includes(dayIndex);
        if (shouldBeOff) {
          offBarBacks.push(schedule);
        } else {
          workingBarBacks.push(schedule);
        }
      });
      
      supportSchedules.forEach(schedule => {
        const shouldBeOff = schedule.daysOff.includes(dayIndex);
        if (shouldBeOff) {
          offSupport.push(schedule);
        } else {
          workingSupport.push(schedule);
        }
      });
      
      // SHUFFLE working arrays for randomized station assignments
      const shuffledWorkingHeads = shuffleArray(workingHeads);
      const shuffledWorkingSeniorBartenders = shuffleArray(workingSeniorBartenders);
      const shuffledWorkingBartenders = shuffleArray(workingBartenders);
      const shuffledWorkingBarBacks = shuffleArray(workingBarBacks);
      const shuffledWorkingSupport = shuffleArray(workingSupport);
      
      console.log(`\n🎲 ${day} - Shuffled Working Staff:`);
      console.log('  Heads:', shuffledWorkingHeads.map(s => s.staff.name).join(', '));
      console.log('  Bartenders:', [...shuffledWorkingSeniorBartenders, ...shuffledWorkingBartenders].map(s => s.staff.name).join(', '));
      console.log('  Bar Backs:', shuffledWorkingBarBacks.map(s => s.staff.name).join(', '));
      console.log('  Support:', shuffledWorkingSupport.map(s => s.staff.name).join(', '));

      // === PRIORITY 1: HEAD BARTENDERS - SUPERVISING (Observe indoor/outdoor, support where needed) ===
      // Working hours: 9 hours (4:00 PM - 1:00 AM) for special events or 10 hours (5:00 PM - 3:00 AM) for regular days
      // Division logic: 2+ heads → divide into indoor/outdoor supervisors
      
      const shouldDivideHeads = shuffledWorkingHeads.length >= 2;
      
      // Mark off days
      offHeads.forEach(schedule => {
        const key = `${schedule.staff.id}-${day}`;
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: 'OFF',
          type: 'off'
        };
      });
      
      // Schedule working heads - MAX 1 OUTDOOR (part of max 3 outdoor total), rest indoor
      shuffledWorkingHeads.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Only first head goes outdoor (if dividing and we need max 3 outdoor), rest are indoor
        const area = shouldDivideHeads && idx === 0 ? 'Outdoor' : 'Indoor';
        
        // Determine time range based on day type
        let timeRange;
        let type: ScheduleCell['type'] = 'regular';
        if (isBrunchDay || isPickupDay) {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for special events
          type = 'early_shift';
        } else {
          timeRange = '5:00 PM - 3:00 AM'; // 10 hours for regular days
          type = 'late_shift';
        }
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type,
          station: 'Supervise all bar operations, coordinate teams, monitor safety and quality standards, oversee workflow'
        };
        assignedStaffIds.add(schedule.staff.id);
      });

      // === PRIORITY 2: BARTENDERS (Senior + Regular) - OPERATE STATIONS ===
      // Working hours: 10 hours (5:00 PM - 3:00 AM) or varied for special days
      
      // Mark off days
      [...offSeniorBartenders, ...offBartenders].forEach(schedule => {
        const key = `${schedule.staff.id}-${day}`;
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: 'OFF',
          type: 'off'
        };
      });
      
      // Track station assignments for indoor/outdoor
      let indoorBartenderCount = 0;
      let outdoorBartenderCount = 0;
      
      // SENIOR BARTENDERS get station assignments (indoor stations)
      shuffledWorkingSeniorBartenders.forEach((schedule) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Determine time range based on day type
        let timeRange;
        let type: ScheduleCell['type'] = 'regular';
        if (isBrunchDay) {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for brunch days
          type = 'early_shift';
        } else if (isPickupDay) {
          timeRange = '4:00 PM - 1:00 AM'; // First bartender on pickup days
          type = 'early_shift';
        } else if (day === 'Wednesday') {
          timeRange = '4:00 PM - 1:00 AM';
          type = 'early_shift';
        } else if (day === 'Saturday') {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for Saturday
          type = 'early_shift';
        } else {
          timeRange = '5:00 PM - 3:00 AM'; // 10 hours standard
          type = 'late_shift';
        }
        
        // Assign indoor station (cycle through 1, 2, 3)
        const stationNum = (indoorBartenderCount % 3) + 1;
        let station = '';
        if (stationNum === 3) {
          station = 'Indoor - Garnishing Station 3: Work behind assigned bar station, train junior staff members, ensure health and safety compliance';
        } else {
          station = `Indoor - Station ${stationNum}: Work behind assigned bar station, train junior staff members, ensure health and safety compliance`;
        }
        indoorBartenderCount++;
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type,
          station
        };
        assignedStaffIds.add(schedule.staff.id);
      });
      
      // REGULAR BARTENDERS get station assignments (alternate between indoor and outdoor)
      shuffledWorkingBartenders.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Determine time range based on day type and position
        let timeRange;
        let type: ScheduleCell['type'] = 'regular';
        if (isBrunchDay) {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for brunch days
          type = 'early_shift';
        } else if (isPickupDay && idx === 0) {
          timeRange = '4:00 PM - 1:00 AM'; // First bartender on pickup days
          type = 'early_shift';
        } else if (day === 'Wednesday') {
          timeRange = idx === 0 ? '4:00 PM - 1:00 AM' : '5:00 PM - 3:00 AM'; // Mixed on Wednesday
          type = idx === 0 ? 'early_shift' : 'late_shift';
        } else if (day === 'Saturday') {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for Saturday
          type = 'early_shift';
        } else {
          timeRange = '5:00 PM - 3:00 AM'; // 10 hours standard
          type = 'late_shift';
        }
        
        // Alternate between indoor and outdoor stations
        // Even index = indoor, odd index = outdoor
        const isIndoor = idx % 2 === 0;
        let station = '';
        
        if (isIndoor) {
          const stationNum = (indoorBartenderCount % 3) + 1;
          if (stationNum === 3) {
            station = 'Indoor - Garnishing Station 3: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards';
          } else {
            station = `Indoor - Station ${stationNum}: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards`;
          }
          indoorBartenderCount++;
        } else {
          const stationNum = (outdoorBartenderCount % 2) + 1;
          station = `Outdoor - Station ${stationNum}: Work behind assigned bar station, supervise bar backs, maintain hygiene and service standards`;
          outdoorBartenderCount++;
        }
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type,
          station
        };
        assignedStaffIds.add(schedule.staff.id);
      });

      // === PRIORITY 3: BAR BACKS - PRIORITY ROLE ===
      // Working hours: 9 hours
      
      // Mark off days
      offBarBacks.forEach(schedule => {
        const key = `${schedule.staff.id}-${day}`;
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: 'OFF',
          type: 'off'
        };
      });
      
      shuffledWorkingBarBacks.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // First bar back gets early start for pickup/opening duties (9 hours)
        let timeRange, type;
        if (idx === 0) {
          if (isPickupDay) {
            timeRange = '12:00 PM - 9:00 PM'; // 9 hours, early for pickups
            type = 'pickup';
          } else if (isBrunchDay) {
            timeRange = 'Opening - BRUNCH - 11 AM'; // Special brunch opening
            type = 'brunch';
          } else if (day === 'Monday') {
            timeRange = '2:00 PM - 11:00 PM'; // 9 hours for Monday
            type = 'opening';
          } else {
            timeRange = '3:00 PM - 12:00 AM'; // 9 hours, setup before venue opens
            type = 'opening';
          }
        } else {
          // Additional bar backs work full service
          if (day === 'Wednesday') {
            timeRange = '3:00 PM - 3:00 AM'; // Closing shift for Wednesday
            type = 'late_shift' as ScheduleCell['type'];
          } else {
            timeRange = '5:00 PM - 3:00 AM'; // Match bartender hours
            type = 'late_shift' as ScheduleCell['type'];
          }
        }
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type,
          station: 'Handle pickups and refills, polish glassware, stock supplies and prepare garnishes'
        };
        assignedStaffIds.add(schedule.staff.id);
      });

      // === PRIORITY 4: SUPPORT - General Support & Glassware Polishing ===
      // Working hours: 10 hours (3:00 PM - 1:00 AM)
      
      // Mark off days
      offSupport.forEach(schedule => {
        const key = `${schedule.staff.id}-${day}`;
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: 'OFF',
          type: 'off'
        };
      });
      
      shuffledWorkingSupport.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Support works 10 hours: 3:00 PM - 1:00 AM
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: '3:00 PM - 1:00 AM',
          type: 'regular',
          station: 'Work 10 hour shifts from 3PM to 1AM, provide glassware support and general assistance'
        };
        assignedStaffIds.add(schedule.staff.id);
      });
    });

    // VALIDATION: Ensure minimum bartender staffing on ALL days
    const validationWarnings: string[] = [];

    DAYS_OF_WEEK.forEach((name, dayIndex) => {
      // Count BARTENDERS ONLY (head + senior + regular bartenders)
      const workingBartendersCount = [...headBartenders, ...seniorBartenders, ...bartenders].filter(staff => {
        const key = `${staff.id}-${name}`;
        const cell = newSchedule[key];
        return cell && cell.timeRange !== 'OFF';
      }).length;
      
      // Count bar backs
      const workingBarBacksCount = barBacks.filter(staff => {
        const key = `${staff.id}-${name}`;
        const cell = newSchedule[key];
        return cell && cell.timeRange !== 'OFF';
      }).length;
      
      // Count support
      const workingSupportCount = support.filter(staff => {
        const key = `${staff.id}-${name}`;
        const cell = newSchedule[key];
        return cell && cell.timeRange !== 'OFF';
      }).length;

      // CRITICAL: Must have at least 3 BARTENDERS (head/senior/regular)
      if (workingBartendersCount < 3) {
        validationWarnings.push(`❌ CRITICAL ${name}: Only ${workingBartendersCount} BARTENDERS working - MINIMUM 3 REQUIRED`);
      }
      
      // Additional staffing info
      console.log(`📊 ${name}: ${workingBartendersCount} bartenders, ${workingBarBacksCount} bar backs, ${workingSupportCount} support`);
      
      if (workingBarBacksCount < 1) {
        validationWarnings.push(`⚠️ ${name}: No bar back - 1+ recommended`);
      }
      if (workingSupportCount < 1) {
        validationWarnings.push(`⚠️ ${name}: No support - 1+ recommended`);
      }
    });

    // Show warnings but allow generation
    if (validationWarnings.length > 0) {
      toast.warning(`⚠️ Schedule generated with warnings:\n${validationWarnings.slice(0, 3).join('\n')}${validationWarnings.length > 3 ? '\n...' : ''}`, {
        duration: 6000
      });
    }

    console.log('✅ Schedule generated successfully!', { totalEntries: Object.keys(newSchedule).length });
    
    // Final summary of all day offs across all roles
    console.log('\n\n🎉 FINAL SCHEDULE SUMMARY - ALL STAFF:');
    console.log(`Total staff: ${staffMembers.length}`);
    console.log('\nDay off distribution across ALL 4 DAYS:');
    const finalDistribution = [0, 2, 3, 6].map(dayNum => {
      const dayName = DAYS_OF_WEEK[dayNum];
      const count = offsPerDay[dayNum];
      return `${dayName}: ${count}`;
    }).join(' | ');
    console.log(finalDistribution);
    
    // Apply normalization to ensure consistent station numbering
    const normalizedSchedule = normalizeStationAssignments(newSchedule);
    setSchedule(normalizedSchedule);
    toast.success(`✅ Schedule generated! Bartenders: Alternating 1-2 days off week-to-week. Support: 2 days off per month (10h shifts). Min 3 bartenders working daily.`, {
      duration: 7000
    });
  };

  const saveSchedule = async () => {
    if (!user?.id) {
      toast.error('Please log in to save schedule');
      return;
    }

    if (Object.keys(schedule).length === 0) {
      toast.error('No schedule to save');
      return;
    }

    try {
      // Save schedule as JSON to weekly_schedules table
      const { error } = await supabase
        .from('weekly_schedules')
        .upsert([{
          user_id: user.id,
          week_start_date: weekStartDate,
          schedule_data: schedule as any,
          venue_name: venueName || null,
          daily_events: dailyEvents as any,
          special_events: specialEvents as any,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id,week_start_date'
        });

      if (error) throw error;

      toast.success('Schedule saved successfully');
      
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };


  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Dark theme color palette
    const colors = {
      background: [26, 26, 26] as [number, number, number], // Dark background
      primary: [60, 60, 70] as [number, number, number], // Slightly lighter dark grey
      accent: [100, 149, 237] as [number, number, number], // Blue accent
      white: [255, 255, 255] as [number, number, number], // White text
      lightGrey: [200, 200, 200] as [number, number, number], // Light grey text
      mediumGrey: [150, 150, 150] as [number, number, number], // Medium grey
      darkGrey: [40, 40, 45] as [number, number, number] // Dark grey for cells
    };
    
    // Dark background for entire page
    doc.setFillColor(...colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header background - darker grey (SMALLER)
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 18, 'F');
    
    // Title with light text (SMALLER)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text((venueName || 'STAFF SCHEDULE').toUpperCase(), 148, 10, { align: 'center' });
    
    // Subtitle with light text (SMALLER)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.lightGrey);
    const weekStart = new Date(weekStartDate);
    const weekEnd = addDays(weekStart, 6);
    doc.text(`WEEK: ${format(weekStart, 'MMM dd').toUpperCase()} - ${format(weekEnd, 'MMM dd, yyyy').toUpperCase()}`, 148, 15, { align: 'center' });
    
    // Reset text color for table
    doc.setTextColor(...colors.white);
    
    // Table headers - uppercase
    const headers = [['STAFF NAME', ...DAYS_OF_WEEK.map(d => d.toUpperCase())]];
    const rows = staffMembers.map(staff => {
      const row = [
        `${staff.name.toUpperCase()}\n${staff.title.replace('_', ' ').toUpperCase()}`,
        ...DAYS_OF_WEEK.map(day => {
          const cell = getScheduleCell(staff.id, day);
          if (!cell || !cell.timeRange) return '';
          return cell.timeRange === 'OFF' ? 'OFF' : cell.timeRange;
        })
      ];
      return row;
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 22,
      styles: { 
        fontSize: 6, 
        cellPadding: 1.2, 
        lineWidth: 0.2, 
        lineColor: colors.primary,
        textColor: colors.white,
        fillColor: colors.darkGrey,
        valign: 'middle',
        halign: 'center'
      },
      headStyles: { 
        fillColor: colors.primary,
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: colors.white,
        halign: 'center',
        cellPadding: 2
      },
      columnStyles: {
        0: { 
          cellWidth: 28, 
          fontStyle: 'bold', 
          fillColor: colors.darkGrey,
          textColor: colors.white,
          halign: 'left'
        }
      },
      alternateRowStyles: {
        fillColor: [35, 35, 40]
      },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.column.index > 0) {
          const day = DAYS_OF_WEEK[data.column.index - 1];
          const staff = staffMembers[data.row.index];
          if (staff) {
            const cell = getScheduleCell(staff.id, day);
            if (cell) {
              if (cell.type === 'early_shift') {
                data.cell.styles.fillColor = [255, 159, 64]; // Vibrant Coral Orange
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [120, 53, 15];
              }
              if (cell.type === 'late_shift') {
                data.cell.styles.fillColor = [135, 206, 250]; // Vibrant Sky Blue
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [25, 55, 95];
              }
              if (cell.type === 'opening') {
                data.cell.styles.fillColor = [187, 247, 208]; // Darker Green
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [20, 83, 45];
              }
              if (cell.type === 'closing') {
                data.cell.styles.fillColor = [252, 165, 165]; // Darker Red
                data.cell.styles.fontStyle = 'bold';
              }
              if (cell.type === 'brunch') {
                data.cell.styles.fillColor = [253, 224, 71]; // Darker Yellow
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [113, 63, 18];
              }
              if (cell.type === 'off') {
                data.cell.styles.fillColor = [203, 213, 225]; // Darker Gray
                data.cell.styles.textColor = [71, 85, 105];
              }
            }
          }
        }
      }
    });

    // Event Info Section - Enhanced with full details
    let finalY = (doc as any).lastAutoTable.finalY + 5;
    // Use pageHeight from the current PDF page as limit for later sections
    
    const hasDailyEvents = Object.values(dailyEvents).some(event => event && event.trim() !== '');
    const hasSpecialEvents = Object.values(specialEvents).some(event => event && event.trim() !== '');
    
    // SPECIAL EVENTS FIRST (green section - dailyEvents data)
    if (hasDailyEvents) {
      doc.setFillColor(34, 197, 94); // Green color
      doc.roundedRect(14, finalY - 2, 270, 6, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text('SPECIAL EVENTS', 18, finalY + 2.5);
      
      finalY += 8;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.lightGrey);
      
      DAYS_OF_WEEK.forEach(day => {
        const event = dailyEvents[day];
        if (event && event.trim() !== '') {
          const openingStaff = staffMembers.find(staff => {
            const cell = getScheduleCell(staff.id, day);
            return cell && (cell.type === 'opening' || cell.type === 'brunch' || cell.type === 'pickup');
          });
          
          const staffInfo = openingStaff ? ` | Opening: ${openingStaff.name}` : '';
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94); // Green color
          doc.text(`${day}:`, 18, finalY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.lightGrey);
          doc.text(`${event}${staffInfo}`, 40, finalY);
          finalY += 3;
        }
      });
      
      finalY += 2;
    }

    // DAILY TASKS SECOND (gold section - specialEvents data)
    if (hasSpecialEvents) {
      doc.setFillColor(255, 215, 0); // Gold color
      doc.roundedRect(14, finalY - 2, 270, 6, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black text on gold
      doc.text('DAILY TASKS', 18, finalY + 2.5);
      
      finalY += 8;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.lightGrey);
      
      DAYS_OF_WEEK.forEach(day => {
        const event = specialEvents[day];
        if (event && event.trim() !== '') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 215, 0); // Gold color
          doc.text(`${day}:`, 18, finalY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.lightGrey);
          doc.text(event, 40, finalY);
          finalY += 3;
        }
      });
      
      finalY += 2;
    }
    
    // Expiring Soon Warnings Section
    if (expiringItems.length > 0) {
      doc.setFillColor(239, 68, 68); // Red color for warnings
      doc.roundedRect(14, finalY - 2, 270, 6, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text('EXPIRING SOON', 18, finalY + 2.5);
      
      finalY += 8;
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.lightGrey);
      
      expiringItems.slice(0, 5).forEach((item: any) => {
        const itemName = item.fifo_items?.name || 'Unknown Item';
        const expiryDate = format(new Date(item.expiration_date), 'MMM dd');
        const daysLeft = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const storeName = item.fifo_stores?.name || 'Store';
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68); // Red
        doc.text(`${daysLeft}d:`, 18, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.lightGrey);
        doc.text(`${itemName} - Expires ${expiryDate} (${storeName})`, 45, finalY);
        finalY += 3;
      });
      
      finalY += 2;
    }
    
    // Role Responsibilities Section - Two-column layout to fit on one page
    doc.setFillColor(30, 58, 138); // Dark blue color
    doc.roundedRect(14, finalY - 2, 270, 6, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text('ROLE RESPONSIBILITIES', 18, finalY + 2.5);
    
    finalY += 8;
    doc.setFontSize(6);
    doc.setTextColor(...colors.lightGrey);
    
    // Get unique titles sorted by hierarchy
    const uniqueTitles = Array.from(new Set(staffMembers.map(s => s.title)))
      .sort((a, b) => {
        const order = ['head_bartender', 'senior_bartender', 'bartender', 'bar_back', 'support'];
        return order.indexOf(a) - order.indexOf(b);
      });

    // Split into two columns
    const midPoint = Math.ceil(uniqueTitles.length / 2);
    const leftColumnTitles = uniqueTitles.slice(0, midPoint);
    const rightColumnTitles = uniqueTitles.slice(midPoint);
    
    const leftColumnX = 18;
    const rightColumnX = 152; // Middle of page
    const columnWidth = 128; // Width for each column
    const roleLineHeight = 3;
    
    // Render left column
    let leftY = finalY;
    leftColumnTitles.forEach(title => {
      const roleTitle = title === 'head_bartender' ? 'Head Bartender' :
                        title === 'senior_bartender' ? 'Senior Bartender' :
                        title === 'bartender' ? 'Bartender' :
                        title === 'bar_back' ? 'Bar Back' : 'Support';
      
      const description = ROLE_RESPONSIBILITIES[title];
      
      // Role title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.white);
      doc.text(`${roleTitle.toUpperCase()}:`, leftColumnX, leftY);
      
      // Wrapped description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...colors.lightGrey);
      const wrapped = doc.splitTextToSize(description, columnWidth);
      doc.text(wrapped, leftColumnX, leftY + 3);
      
      leftY += 3 + (wrapped.length * roleLineHeight) + 1.5;
    });
    
    // Render right column
    let rightY = finalY;
    rightColumnTitles.forEach(title => {
      const roleTitle = title === 'head_bartender' ? 'Head Bartender' :
                        title === 'senior_bartender' ? 'Senior Bartender' :
                        title === 'bartender' ? 'Bartender' :
                        title === 'bar_back' ? 'Bar Back' : 'Support';
      
      const description = ROLE_RESPONSIBILITIES[title];
      
      // Role title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.white);
      doc.text(`${roleTitle.toUpperCase()}:`, rightColumnX, rightY);
      
      // Wrapped description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...colors.lightGrey);
      const wrapped = doc.splitTextToSize(description, columnWidth);
      doc.text(wrapped, rightColumnX, rightY + 3);
      
      rightY += 3 + (wrapped.length * roleLineHeight) + 1.5;
    });
    
    // Update finalY to the maximum of both columns
    finalY = Math.max(leftY, rightY);
    
    
    // This old section has been removed - special events now integrated earlier in the PDF
    
    // Add spacing at the bottom for readability
    finalY += 20;

    doc.save(`${(venueName || 'schedule').replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule exported to PDF');
  };

  const exportAllDailyBreakdownsToPDF = async () => {
    toast.info('Generating complete daily breakdown PDF...');
    
    try {
      // First, temporarily expand the accordion to ensure all days are rendered
      const accordionTrigger = document.querySelector('[data-state="closed"]') as HTMLElement;
      let wasExpanded = false;
      
      if (accordionTrigger) {
        accordionTrigger.click();
        wasExpanded = true;
        // Wait for accordion to expand and render
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let isFirstPage = true;

      for (const day of DAYS_OF_WEEK) {
        const element = document.getElementById(`day-${day}`);
        
        if (!element) {
          console.warn(`Element not found for ${day}, skipping...`);
          continue;
        }

        const dataUrl = await toPng(element, {
          pixelRatio: 2,
          cacheBust: true,
          quality: 0.85,
          backgroundColor: '#1a1a1a',
        });

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Add dark background
        pdf.setFillColor(26, 26, 26);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Calculate dimensions to fit on page with padding
        const padding = 10;
        const maxWidth = pageWidth - (padding * 2);
        const maxHeight = pageHeight - (padding * 2);
        
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const imgRatio = img.width / img.height;
        const pageRatio = maxWidth / maxHeight;
        
        let finalWidth, finalHeight;
        if (imgRatio > pageRatio) {
          finalWidth = maxWidth;
          finalHeight = maxWidth / imgRatio;
        } else {
          finalHeight = maxHeight;
          finalWidth = maxHeight * imgRatio;
        }
        
        const xPos = (pageWidth - finalWidth) / 2;
        const yPos = (pageHeight - finalHeight) / 2;
        
        pdf.addImage(dataUrl, 'PNG', xPos, yPos, finalWidth, finalHeight);
      }

      const filename = `${(venueName || 'schedule').replace(/\s+/g, '-')}-daily-breakdown-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);
      toast.success('All daily breakdowns exported to PDF!');
      
      // Collapse accordion again if it was originally closed
      if (wasExpanded) {
        const accordionTrigger = document.querySelector('[data-state="open"]') as HTMLElement;
        if (accordionTrigger) {
          accordionTrigger.click();
        }
      }
      
    } catch (error) {
      console.error('Error exporting all daily breakdowns:', error);
      toast.error('Failed to export daily breakdowns. Please try again.');
    }
  };

  const exportDayToPNG = async (day: string) => {
    const element = document.getElementById(`day-${day}`);
    
    if (!element) {
      console.error(`Element not found: day-${day}`);
      toast.error(`Cannot find ${day} section`);
      return;
    }

    console.log(`Starting download for ${day}...`);
    toast.info(`Capturing ${day}...`);
    
    try {
      const filename = `${(venueName || 'schedule').replace(/\s+/g, '-')}-${day}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      console.log(`Using html-to-image to capture ${day}...`);
      
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        cacheBust: true,
        quality: 0.85,
        backgroundColor: '#1a1a1a',
      });
      
      console.log(`Image captured successfully for ${day}, creating PDF...`);
      
      // Create PDF and add image
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add dark background
      pdf.setFillColor(26, 26, 26);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Calculate dimensions to fit on one page with padding
      const padding = 10;
      const maxWidth = pageWidth - (padding * 2);
      const maxHeight = pageHeight - (padding * 2);
      
      // Get image dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const imgRatio = img.width / img.height;
      const pageRatio = maxWidth / maxHeight;
      
      let finalWidth, finalHeight;
      if (imgRatio > pageRatio) {
        // Image is wider - fit to width
        finalWidth = maxWidth;
        finalHeight = maxWidth / imgRatio;
      } else {
        // Image is taller - fit to height
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgRatio;
      }
      
      // Center the image
      const xPos = (pageWidth - finalWidth) / 2;
      const yPos = (pageHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xPos, yPos, finalWidth, finalHeight);
      pdf.save(filename);
      
      console.log(`PDF downloaded for ${day}`);
      toast.success(`${day} downloaded as PDF!`);
      
    } catch (error) {
      console.error('Download error for', day, ':', error);
      toast.error(`Download failed for ${day}. Please try again.`);
    }
  };

  const exportWeeklySummaryToPNG = async () => {
    const element = document.getElementById('Weekly Off Days Summary');
    if (!element) {
      toast.error('Summary section not found');
      return;
    }

    toast.info('Capturing weekly summary...');

    try {
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `${(venueName || 'schedule').replace(/\s+/g, '-')}-weekly-summary-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Weekly summary downloaded!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Download failed');
    }
  };

  // Separate head bartender from other staff
  const headBartenders = staffMembers.filter(s => s.title === 'head_bartender');
  const otherStaff = staffMembers.filter(s => s.title !== 'head_bartender');
  
  const groupedStaff = otherStaff.reduce((acc, staff) => {
    if (!acc[staff.title]) acc[staff.title] = [];
    acc[staff.title].push(staff);
    return acc;
  }, {} as Record<string, StaffMember[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pb-20 pt-16">
      <TopNav />
      
      <div className="container mx-auto p-4 space-y-4">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 mb-6">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="relative space-y-4">
            <div className="w-full">
              <Label htmlFor="venue-name" className="text-xs uppercase tracking-wider text-gray-400 mb-2 block font-semibold">Venue Name</Label>
              <Input
                id="venue-name"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Enter venue name..."
                className="text-xl font-bold bg-gray-900/50 border-gray-700/50 text-gray-100 h-12 backdrop-blur-sm w-full"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 w-full">
              <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 px-6 border-gray-600 hover:bg-gray-800/80 hover:border-primary/50 transition-all flex-1 sm:flex-initial min-w-[140px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    Load Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Load Saved Schedule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {savedSchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No saved schedules found</p>
                    ) : (
                      savedSchedules.map((schedule) => (
                        <Card key={schedule.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => loadSchedule(schedule)}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{schedule.venue_name || 'Untitled Schedule'}</h3>
                              <p className="text-sm text-muted-foreground">Week of {format(new Date(schedule.week_start_date), 'MMM dd, yyyy')}</p>
                              <p className="text-xs text-muted-foreground mt-1">Last updated: {format(new Date(schedule.updated_at), 'MMM dd, yyyy HH:mm')}</p>
                            </div>
                            <Button size="sm" variant="ghost">Load</Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={autoGenerateSchedule} variant="default" className="h-11 px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex-1 sm:flex-initial min-w-[160px]">
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Schedule
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="h-11 px-6 border-gray-600 hover:bg-gray-800/80 hover:border-primary/50 transition-all flex-1 sm:flex-initial min-w-[140px]">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Special Events Management */}
        <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative">
            <Accordion type="single" collapsible defaultValue="special-events">
              <AccordionItem value="special-events" className="border-none">
                <AccordionTrigger className="hover:no-underline pb-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-100">Special Events</h3>
                        <p className="text-xs text-gray-500">No offs scheduled on event days</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingEvents(!isEditingEvents);
                      }}
                      className="border-gray-700 hover:bg-gray-800 h-9 px-4 font-medium"
                    >
                      {isEditingEvents ? '✓ Done' : '✏️ Edit'}
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-300 uppercase tracking-wide">{day.slice(0, 3)}</Label>
                        {isEditingEvents ? (
                          <Input
                            value={dailyEvents[day] || ''}
                            onChange={(e) => setDailyEvents(prev => ({
                              ...prev,
                              [day]: e.target.value
                            }))}
                            placeholder="Event"
                            className="text-xs bg-gray-800 border-gray-700 text-gray-100 h-9"
                          />
                        ) : (
                          <div className={`p-2 rounded-lg border text-xs min-h-[36px] flex items-center justify-center transition-all ${
                            dailyEvents[day] 
                              ? 'bg-gradient-to-br from-primary/20 to-accent/10 border-primary/40 text-primary font-semibold shadow-sm' 
                              : 'bg-gray-800/50 text-gray-500 border-gray-700/50'
                          }`}>
                            {dailyEvents[day] || '—'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>

        {/* Expiring Soon Warnings */}
        {expiringItems.length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-red-900/30 to-red-950/20 border-red-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <Accordion type="single" collapsible defaultValue="expiry-warnings">
                <AccordionItem value="expiry-warnings" className="border-none">
                  <AccordionTrigger className="hover:no-underline pb-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
                          <Calendar className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-red-100">⚠️ Expiring Soon</h3>
                          <p className="text-xs text-red-300">{expiringItems.length} items expiring within 14 days</p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {expiringItems.map((item: any) => {
                        const daysLeft = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={item.id} className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-bold text-red-100 text-sm">
                                  {item.items?.name || 'Unknown Item'}
                                </div>
                                <div className="text-xs text-red-300 mt-1">
                                  {item.items?.brand && `${item.items.brand} • `}
                                  {item.items?.category || 'Uncategorized'}
                                </div>
                                <div className="text-xs text-red-400 mt-1">
                                  Store: {item.stores?.name || 'Unknown'} • Qty: {item.quantity}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${
                                  daysLeft <= 3 ? 'text-red-400' : 
                                  daysLeft <= 7 ? 'text-orange-400' : 
                                  'text-yellow-400'
                                }`}>
                                  {daysLeft}d
                                </div>
                                <div className="text-[9px] text-red-300 uppercase">Days Left</div>
                                <div className="text-xs text-red-300 mt-1">
                                  Expires: {format(new Date(item.expiration_date), 'MMM dd, yyyy')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>
        )}
        
        {/* Daily Tasks Section */}
        <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <Accordion type="single" collapsible>
              <AccordionItem value="daily-tasks" className="border-none">
                <AccordionTrigger className="hover:no-underline pb-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <Calendar className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-bold text-gray-100">Daily Tasks</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Hygiene clearance, training, or special tasks</p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="space-y-2">
                        <Label className="text-xs font-bold text-gray-300 uppercase tracking-wide">{day}</Label>
                        <Input
                          value={specialEvents[day] || ''}
                          onChange={(e) => setSpecialEvents(prev => ({
                            ...prev,
                            [day]: e.target.value
                          }))}
                          placeholder="e.g., Hygiene Clearance, Training"
                          className="text-sm bg-gray-800 border-gray-700 text-gray-100"
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>


        {/* Staff Management */}
        <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative">
            <Accordion type="single" collapsible defaultValue="staff-members">
              <AccordionItem value="staff-members" className="border-none">
                <AccordionTrigger className="hover:no-underline pb-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-100">Staff Members</h3>
                        <p className="text-xs text-gray-500">{staffMembers.length} active staff</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        onClick={saveSchedule}
                        size="sm" 
                        variant="outline"
                        className="h-10 px-5 font-medium shadow-lg whitespace-nowrap"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Schedule
                      </Button>
                      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="h-10 px-5 font-medium shadow-lg shadow-primary/10 whitespace-nowrap">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Staff
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Staff Member</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Name</Label>
                              <Input
                                value={newStaff.name}
                                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                placeholder="Staff name"
                              />
                            </div>
                            <div>
                              <Label>Email Address</Label>
                              <Input
                                type="email"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                placeholder="staff@example.com"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Staff will receive schedule notifications at this email
                              </p>
                            </div>
                            <div>
                              <Label>Title/Role</Label>
                              <Select
                                value={newStaff.title}
                                onValueChange={(value) => setNewStaff({ ...newStaff, title: value as StaffMember['title'] })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="head_bartender">Head Bartender</SelectItem>
                                  <SelectItem value="senior_bartender">Senior Bartender</SelectItem>
                                  <SelectItem value="bartender">Bartender</SelectItem>
                                  <SelectItem value="bar_back">Bar Back</SelectItem>
                                  <SelectItem value="support">Support</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ROLE_RESPONSIBILITIES[newStaff.title]}
                              </p>
                            </div>
                            <Button onClick={addStaffMember} className="w-full">Add Staff Member</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Edit Staff Dialog */}
                      <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Staff Member</DialogTitle>
                          </DialogHeader>
                          {editingStaff && (
                            <div className="space-y-4">
                              <div>
                                <Label>Name</Label>
                                <Input
                                  value={editingStaff.name}
                                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                                  placeholder="Staff name"
                                />
                              </div>
                              <div>
                                <Label>Email Address</Label>
                                <Input
                                  type="email"
                                  value={editingStaff.email}
                                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                                  placeholder="staff@example.com"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Staff will receive schedule notifications at this email
                                </p>
                              </div>
                              <div>
                                <Label>Title/Role</Label>
                                <Select
                                  value={editingStaff.title}
                                  onValueChange={(value) => setEditingStaff({ ...editingStaff, title: value as StaffMember['title'] })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="head_bartender">Head Bartender</SelectItem>
                                    <SelectItem value="senior_bartender">Senior Bartender</SelectItem>
                                    <SelectItem value="bartender">Bartender</SelectItem>
                                    <SelectItem value="bar_back">Bar Back</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {ROLE_RESPONSIBILITIES[editingStaff.title]}
                                </p>
                              </div>
                              <Button onClick={updateStaffMember} className="w-full">Update Staff Member</Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {/* Head Bartender section at the top */}
                    {headBartenders.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400 uppercase">
                          Head Bartender ({headBartenders.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {headBartenders.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="font-medium text-gray-100 truncate">{staff.name}</div>
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                  {staff.email || 'No email set'}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStaff({
                                      id: staff.id,
                                      name: staff.name,
                                      title: staff.title,
                                      email: staff.email || '',
                                    });
                                    setIsEditStaffOpen(true);
                                  }}
                                  className="hover:bg-gray-700 h-9 w-9 p-0"
                                >
                                  <Edit className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setStaffToDelete(staff.id)}
                                  className="hover:bg-gray-700 h-9 w-9 p-0"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Other staff grouped by title */}
                    {Object.entries(groupedStaff).map(([title, members]) => (
                      <div key={title} className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400 uppercase">
                          {title.replace('_', ' ')} ({members.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {members.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="font-medium text-gray-100 truncate">{staff.name}</div>
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                  {staff.email || 'No email set'}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStaff({
                                      id: staff.id,
                                      name: staff.name,
                                      title: staff.title,
                                      email: staff.email || '',
                                    });
                                    setIsEditStaffOpen(true);
                                  }}
                                  className="hover:bg-gray-700 h-9 w-9 p-0"
                                >
                                  <Edit className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setStaffToDelete(staff.id)}
                                  className="hover:bg-gray-700 h-9 w-9 p-0"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {staffMembers.length === 0 && (
                      <p className="text-center text-gray-400 py-8">No staff members added yet</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>

        {/* Role Responsibilities */}
        {staffMembers.length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl">
            <Accordion type="single" collapsible defaultValue="role-responsibilities">
              <AccordionItem value="role-responsibilities" className="border-none">
                <AccordionTrigger className="hover:no-underline pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-100">Role Responsibilities</h3>
                      <p className="text-xs text-gray-500">Staff role descriptions</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from(new Set(staffMembers.map(s => s.title)))
                      .sort((a, b) => {
                        const order = ['head_bartender', 'senior_bartender', 'bartender', 'bar_back', 'support'];
                        return order.indexOf(a) - order.indexOf(b);
                      })
                      .map(title => (
                        <div key={title} className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg flex flex-col">
                          <h4 className="text-sm font-bold text-gray-100 mb-2 flex-shrink-0">
                            {title === 'head_bartender' && 'Head Bartender'}
                            {title === 'senior_bartender' && 'Senior Bartender'}
                            {title === 'bartender' && 'Bartender'}
                            {title === 'bar_back' && 'Bar Back'}
                            {title === 'support' && 'Support'}
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed break-words">
                            {ROLE_RESPONSIBILITIES[title]}
                          </p>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        {/* Week Selector */}
        <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl">
          <Accordion type="single" collapsible defaultValue="week-starting">
            <AccordionItem value="week-starting" className="border-none">
              <AccordionTrigger className="hover:no-underline pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">Week Starting</h3>
                    <p className="text-xs text-gray-500">Select schedule week</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Week Starting</Label>
                      <Input
                        type="date"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                        className="bg-gray-800/50 border-gray-700/50 text-gray-100 h-10 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-gray-800/50 rounded-lg px-4 py-2.5 border border-gray-700/50">
                    <span className="text-gray-400">Period:</span>
                    <span className="font-semibold text-gray-100">
                      {format(new Date(weekStartDate), 'MMM dd')} - {format(addDays(new Date(weekStartDate), 6), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Weekly Off Days Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
            <div className="relative">
              <Accordion type="single" collapsible defaultValue="weekly-off">
                <AccordionItem value="weekly-off" className="border-none">
                  <AccordionTrigger className="hover:no-underline pb-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-100">Weekly Off Days</h3>
                          <p className="text-xs text-gray-500">Staff rest day overview</p>
                        </div>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          exportWeeklySummaryToPNG();
                        }} 
                        variant="outline" 
                        size="sm"
                        className="border-gray-600 hover:bg-gray-800 hover:border-primary/50 transition-all h-9 px-4"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div id="Weekly Off Days Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {staffMembers.map(staff => {
                        const staffSchedule = Object.values(schedule).filter(s => s.staffId === staff.id);
                        const offDays = staffSchedule.filter(s => s.timeRange === 'OFF');
                        const offDaysList = offDays.map(s => s.day).join(', ');
                        
                        return (
                          <div key={staff.id} className="border border-gray-700/50 rounded-lg p-3.5 bg-gradient-to-br from-gray-800/80 to-gray-850/80 shadow-md hover:shadow-lg transition-all hover:border-primary/40 hover:scale-[1.02] backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2.5">
                              <div>
                                <div className="font-bold text-gray-100 text-sm">{staff.name}</div>
                                <div className="text-xs text-gray-400 capitalize mt-1 flex items-center gap-1.5">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                                  {staff.title.replace('_', ' ')}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-extrabold ${offDays.length === 0 ? 'text-red-400' : offDays.length >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {offDays.length}
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">days off</div>
                              </div>
                            </div>
                            {offDaysList && (
                              <div className="text-xs text-gray-300 mt-2.5 pt-2.5 border-t border-gray-700/30 bg-gray-900/40 rounded px-2.5 py-2">
                                <span className="text-gray-500 font-semibold">📅</span> {offDaysList}
                              </div>
                            )}
                            {offDays.length === 0 && (
                              <div className="text-xs text-red-400 mt-2.5 pt-2.5 border-t border-red-900/30 bg-red-950/20 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                                <span className="text-red-500">⚠️</span> No days off
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>
        )}

        {/* Daily Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/3 rounded-full blur-3xl" />
            <div className="relative">
              <Accordion type="single" collapsible defaultValue="daily-breakdown">
                <AccordionItem value="daily-breakdown" className="border-none">
                  <AccordionTrigger className="hover:no-underline pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-2 sm:pr-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/20 rounded-lg flex-shrink-0">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-100">Daily Breakdown</h3>
                          <p className="text-xs text-gray-500">Staff schedule by day</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20 flex-shrink-0">
                          <span className="text-[10px] sm:text-xs text-orange-400 font-semibold whitespace-nowrap">☕ Individual break times</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportAllDailyBreakdownsToPDF();
                          }}
                          className="h-8 px-2.5 sm:px-3 text-[10px] sm:text-xs border-gray-600 hover:bg-gray-800/80 hover:border-primary/50 transition-all whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
                        >
                          <Download className="h-3 w-3 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">Export All Days</span>
                          <span className="sm:hidden">Export All</span>
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySchedule = Object.values(schedule).filter(s => s.day === day);
                const working = daySchedule.filter(s => s.timeRange !== 'OFF');
                const off = daySchedule.filter(s => s.timeRange === 'OFF');
                
                // Categorize by area - ENSURE NO DOUBLE COUNTING (each person in ONE area only)
                const indoor = working.filter(s => {
                  const station = s.station || '';
                  // Match "Indoor" in station name
                  return station.toLowerCase().includes('indoor');
                });
                const outdoor = working.filter(s => {
                  const station = s.station || '';
                  // Match "Outdoor" in station name
                  return station.toLowerCase().includes('outdoor');
                });
                
                // Get IDs that are already categorized
                const categorizedIds = new Set([...indoor, ...outdoor].map(s => s.staffId));
                
                // Catch any working staff not categorized - assign to indoor by default
                const uncategorized = working.filter(s => !categorizedIds.has(s.staffId));
                
                // Get staff details - SORT BY ROLE (Head first)
                const sortStaffByRole = (staffList: any[]) => {
                  const roleOrder = {
                    head_bartender: 1,
                    senior_bartender: 2,
                    bartender: 3,
                    bar_back: 4,
                    support: 5
                  };
                  return staffList.sort((a, b) => {
                    const staffA = staffMembers.find(sm => sm.id === a.staffId);
                    const staffB = staffMembers.find(sm => sm.id === b.staffId);
                    if (!staffA || !staffB) return 0;
                    return (roleOrder[staffA.title] || 99) - (roleOrder[staffB.title] || 99);
                  });
                };

                const sortedIndoor = sortStaffByRole([...indoor, ...uncategorized]);
                const sortedOutdoor = sortStaffByRole([...outdoor]);

                const indoorStaff = sortedIndoor.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { 
                    name: staff?.name || 'Unknown', 
                    station: s.station, 
                    timeRange: s.timeRange,
                    title: staff?.title 
                  };
                });
                const outdoorStaff = sortedOutdoor.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { 
                    name: staff?.name || 'Unknown', 
                    station: s.station, 
                    timeRange: s.timeRange,
                    title: staff?.title 
                  };
                });
                const offStaff = off.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return staff?.name || 'Unknown';
                });

                const isBusyDay = !!dailyEvents[day];
                const dayLabel = dailyEvents[day] || '';

                return (
                  <div 
                    key={day} 
                    id={`day-${day}`}
                    className={`border rounded-xl p-5 shadow-lg hover:shadow-xl transition-all ${isBusyDay ? 'border-orange-400 bg-gradient-to-br from-orange-900/30 to-orange-950/20' : 'bg-gradient-to-br from-gray-800 to-gray-850 border-gray-700 hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-base text-gray-100 flex items-center gap-2">
                        {isBusyDay && <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>}
                        {day}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportDayToPNG(day)}
                        className="h-8 px-3 text-xs hover:bg-gray-700 transition-colors flex-shrink-0"
                        title="Download Screenshot"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Button>
                    </div>
                    {dayLabel && (
                      <div className="text-xs text-orange-300 mb-4 bg-orange-950/30 rounded-lg px-3 py-2 font-medium flex items-center gap-2">
                        <span>📅</span>
                        <span>{dayLabel}</span>
                      </div>
                    )}
                    
                    {/* Expiring Soon Warnings */}
                    {expiringItems.length > 0 && (
                      <div className="mb-4 p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
                        <div className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Expiring Soon ({expiringItems.length} items)</span>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {expiringItems.slice(0, 3).map((item: any, idx: number) => {
                            const itemName = item.items?.name || 'Unknown';
                            const expiryDate = format(new Date(item.expiration_date), 'MMM dd');
                            const daysLeft = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <div key={idx} className="text-[10px] text-red-300/90 flex justify-between items-center py-1.5 px-2 border-b border-red-800/20 last:border-0 bg-red-950/20 rounded">
                                <span className="flex-1 break-words mr-2">
                                  <span className="font-semibold">{itemName}</span> • {expiryDate}
                                </span>
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-medium ${
                                  daysLeft <= 3 ? 'bg-red-500/20 text-red-300' : 
                                  daysLeft <= 7 ? 'bg-orange-500/20 text-orange-300' : 
                                  'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                  {daysLeft}d
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {expiringItems.length > 3 && (
                          <div className="text-[8px] text-red-400/70 mt-1 text-center">
                            +{expiringItems.length - 3} more items
                          </div>
                        )}
                      </div>
                    )}

                    {/* Daily Tasks */}
                    {specialEvents[day] && specialEvents[day].trim() !== '' && (
                      <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg">
                        <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-2">
                          <span>📋</span>
                          <span>Daily Task</span>
                        </div>
                        <div className="text-xs text-amber-200/90 leading-relaxed break-words">
                          {specialEvents[day]}
                        </div>
                      </div>
                    )}
                    
                    {/* Summary Numbers */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 bg-gradient-to-br from-green-950/40 to-green-900/20 rounded-lg border border-green-800/30">
                        <div className="text-3xl font-extrabold text-green-400">{working.length}</div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1">Working</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-red-950/40 to-red-900/20 rounded-lg border border-red-800/30">
                        <div className="text-3xl font-extrabold text-red-400">{off.length}</div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1">Off</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-blue-950/40 to-blue-900/20 rounded-lg border border-blue-800/30">
                        <div className="text-2xl font-bold text-blue-400">{indoorStaff.length}</div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1">Indoor</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-purple-950/40 to-purple-900/20 rounded-lg border border-purple-800/30">
                        <div className="text-2xl font-bold text-purple-400">{outdoorStaff.length}</div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1">Outdoor</div>
                      </div>
                    </div>
                    
                    {/* Indoor Staff */}
                    {indoorStaff.length > 0 && (
                      <div className="space-y-2 mb-3 bg-blue-950/20 rounded-lg p-3 border border-blue-900/30">
                        <div className="text-sm font-bold text-blue-300 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                          <span>Indoor Stations</span>
                        </div>
                        <div className="space-y-2 text-xs pl-4">
                          {indoorStaff.map((s, idx) => {
                            return (
                              <div key={idx} className="text-gray-300 leading-relaxed">
                                • <span className={s.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                {s.title === 'head_bartender' && <span className="text-[10px] text-yellow-500 ml-1.5">(HEAD)</span>}
                                {s.title === 'senior_bartender' && <span className="text-[10px] text-blue-400 ml-1.5">(SENIOR)</span>}
                                <span className="text-gray-500"> ({s.timeRange})</span>
                                {s.station && (
                                  <div className="text-[11px] text-blue-400/80 pl-4 mt-0.5 break-words">{s.station}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Outdoor Staff */}
                    {outdoorStaff.length > 0 && (
                      <div className="space-y-2 mb-3 bg-purple-950/20 rounded-lg p-3 border border-purple-900/30">
                        <div className="text-sm font-bold text-purple-300 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-purple-400"></span>
                          <span>Outdoor Stations</span>
                        </div>
                        <div className="space-y-2 text-xs pl-4">
                          {outdoorStaff.map((s, idx) => {
                            return (
                              <div key={idx} className="text-gray-300 leading-relaxed">
                                • <span className={s.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                {s.title === 'head_bartender' && <span className="text-[10px] text-yellow-500 ml-1.5">(HEAD)</span>}
                                {s.title === 'senior_bartender' && <span className="text-[10px] text-blue-400 ml-1.5">(SENIOR)</span>}
                                <span className="text-gray-500"> ({s.timeRange})</span>
                                {s.station && (
                                  <div className="text-[11px] text-purple-400/80 pl-4 mt-0.5 break-words">{s.station}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Break Schedule */}
                    {working.length > 0 && (() => {
                      const sortByRole = (list: any[]) => {
                        const roleOrder = {
                          head_bartender: 1,
                          senior_bartender: 2,
                          bartender: 3,
                          bar_back: 4,
                          support: 5
                        };
                        return list.sort((a, b) => {
                          const roleA = a.staff?.title || 'support';
                          const roleB = b.staff?.title || 'support';
                          return (roleOrder[roleA] || 99) - (roleOrder[roleB] || 99);
                        });
                      };

                      // Parse time string to minutes since midnight for comparison
                      const parseTimeToMinutes = (timeStr: string) => {
                        if (!timeStr) return 0;
                        const [time, period] = timeStr.split(' ');
                        const [hours, minutes] = time.split(':').map(Number);
                        let hour24 = hours;
                        if (period === 'PM' && hours !== 12) hour24 = hours + 12;
                        if (period === 'AM' && hours === 12) hour24 = 0;
                        return hour24 * 60 + minutes;
                      };

                      // Get all working staff with their break times
                      const staffWithBreaks = working.map(s => {
                        const staff = staffMembers.find(sm => sm.id === s.staffId);
                        const scheduleCell = schedule[`${s.staffId}-${day}`];
                        
                        // Use manually set break times if available, otherwise use defaults
                        const breakStart = scheduleCell?.breakStart || staff?.breakTimings?.firstWaveStart || '5:30 PM';
                        const breakEnd = scheduleCell?.breakEnd || staff?.breakTimings?.firstWaveEnd || '6:30 PM';
                        
                        return {
                          ...s,
                          staff,
                          breakStart,
                          breakEnd,
                          breakStartMinutes: parseTimeToMinutes(breakStart)
                        };
                      });

                      // Sort by break start time
                      const sortedByBreakTime = staffWithBreaks.sort((a, b) => a.breakStartMinutes - b.breakStartMinutes);

                      // Split into waves based on break start time
                      // If break starts before 6:00 PM (18:00 = 1080 minutes), it's first wave
                      const firstWaveStaff = sortByRole(
                        sortedByBreakTime
                          .filter(s => s.breakStartMinutes < 1080)
                          .map(s => ({
                            name: s.staff?.name || 'Unknown',
                            timeRange: s.timeRange,
                            staff: s.staff,
                            breakStart: s.breakStart,
                            breakEnd: s.breakEnd
                          }))
                      );
                      
                      const secondWaveStaff = sortByRole(
                        sortedByBreakTime
                          .filter(s => s.breakStartMinutes >= 1080)
                          .map(s => ({
                            name: s.staff?.name || 'Unknown',
                            timeRange: s.timeRange,
                            staff: s.staff,
                            breakStart: s.breakStart,
                            breakEnd: s.breakEnd
                          }))
                      );
                      
                      return (firstWaveStaff.length > 0 || secondWaveStaff.length > 0) && (
                        <div className="space-y-2 mb-3 bg-gradient-to-r from-orange-950/30 to-amber-950/20 rounded-lg p-3 border border-orange-800/40">
                          <div className="text-sm font-bold text-orange-300 flex items-center gap-2">
                            <span>☕</span>
                            <span>Break Schedule</span>
                          </div>
                          <div className="space-y-2 text-[11px] pl-3">
                            {firstWaveStaff.length > 0 && (
                              <div className="bg-orange-950/20 rounded-lg p-2.5 border border-orange-900/30">
                                <span className="font-semibold text-orange-400 text-xs">First Wave Break</span>
                                <div className="text-gray-300 mt-2 space-y-1">
                                   {firstWaveStaff.map((s, idx) => {
                                     return (
                                       <div key={idx} className="pl-3 leading-relaxed">
                                         • <span className={s.staff?.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                         {s.staff?.title === 'head_bartender' && <span className="text-[9px] text-yellow-500 ml-1.5">(HEAD)</span>}
                                         {s.staff?.title === 'senior_bartender' && <span className="text-[9px] text-blue-400 ml-1.5">(SENIOR)</span>}
                                         <span className="text-gray-500 text-[10px]"> ({s.breakStart}-{s.breakEnd})</span>
                                       </div>
                                     );
                                   })}
                                </div>
                                <div className="text-amber-400/80 mt-2 text-[10px] bg-amber-950/20 rounded-lg p-2">
                                  ⚠️ Coverage: 2 Indoor + 1 Support remain
                                </div>
                              </div>
                            )}
                            {secondWaveStaff.length > 0 && (
                              <div className="bg-teal-950/20 rounded-lg p-2.5 border border-teal-900/30">
                                <span className="font-semibold text-teal-400 text-xs">Second Wave Break</span>
                                <div className="text-gray-300 mt-2 space-y-1">
                                   {secondWaveStaff.map((s, idx) => {
                                     return (
                                       <div key={idx} className="pl-3 leading-relaxed">
                                         • <span className={s.staff?.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                         {s.staff?.title === 'head_bartender' && <span className="text-[9px] text-yellow-500 ml-1.5">(HEAD)</span>}
                                         {s.staff?.title === 'senior_bartender' && <span className="text-[9px] text-blue-400 ml-1.5">(SENIOR)</span>}
                                         <span className="text-gray-500 text-[10px]"> ({s.breakStart}-{s.breakEnd})</span>
                                       </div>
                                     );
                                   })}
                                </div>
                                <div className="text-teal-400/80 mt-2 text-[10px] bg-teal-950/20 rounded-lg p-2">
                                  First wave returns to provide relief
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Off Staff */}
                    {offStaff.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-gray-700/50 bg-gray-900/30 rounded-lg p-3 mt-3">
                        <div className="text-sm font-bold text-gray-300 flex items-center gap-2">
                          <span>🏠</span>
                          <span>Off Duty</span>
                        </div>
                        <div className="space-y-1.5 text-xs pl-4">
                          {offStaff.map((name, idx) => (
                            <div key={idx} className="text-gray-400 leading-relaxed">
                              • {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>
        )}

        {/* Schedule Table */}
        {staffMembers.length > 0 && (
          <Card className="p-3 sm:p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-100">Weekly Schedule</h3>
                <p className="text-xs text-gray-500">Staff assignments with individual break times</p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-3 sm:-mx-5">
              <div className="min-w-max px-3 sm:px-5">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className="border-2 border-gray-600 p-1 bg-gray-900 font-semibold text-center min-w-[80px] z-10 text-gray-100">
                      DAILY
                    </th>
                    <th className="border-2 border-gray-600 p-1 bg-gray-900 font-semibold text-center min-w-[80px] z-10 text-gray-100">
                      SPECIAL
                    </th>
                    <th className="border-2 border-gray-600 p-1 bg-gray-900 font-semibold text-left min-w-[100px] sticky left-0 z-10 text-gray-100">
                      STAFF
                    </th>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const isBusyDay = !!dailyEvents[day];
                      const dayLabel = dailyEvents[day] || '';
                      return (
                        <th key={day} className={`border-2 border-gray-600 p-1 font-semibold text-center min-w-[65px] ${isBusyDay ? 'bg-orange-900/40 border-orange-700' : 'bg-gray-900'} text-gray-100`}>
                          <div className="text-[11px]">{day}</div>
                          {dayLabel && <div className="text-[9px] font-normal text-gray-400">{dayLabel}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers
                    .sort((a, b) => {
                      // Sort order: head_bartender -> senior_bartender -> bartender -> bar_back -> support
                      const order = {
                        head_bartender: 1,
                        senior_bartender: 2,
                        bartender: 3,
                        bar_back: 4,
                        support: 5
                      };
                      return order[a.title] - order[b.title];
                    })
                    .map(staff => (
                    <tr key={staff.id} className="hover:bg-gray-800/50">
                      <td className="border-2 border-gray-600 p-1 font-medium bg-gray-900 min-w-[80px]">
                        <div className="text-[9px] text-gray-100 leading-tight text-center">—</div>
                      </td>
                      <td className="border-2 border-gray-600 p-1 font-medium bg-gray-900 min-w-[80px]">
                        <div className="text-[9px] text-gray-100 leading-tight text-center">—</div>
                      </td>
                      <td className="border-2 border-gray-600 p-1 font-medium bg-gray-900 sticky left-0 z-10 min-w-[100px]">
                        <div className="text-[10px] text-gray-100 leading-tight">{staff.name}</div>
                        <div className="text-[8px] text-gray-400 capitalize leading-tight">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border-2 ${cell && CELL_COLORS[cell.type]} ${cell?.type === 'off' ? 'border-gray-500' : 'border-gray-600'} p-0.5`}
                          >
                            <Select
                              value={cell?.timeRange || ''}
                              onValueChange={(value) => {
                                let type: ScheduleCell['type'] = 'regular';
                                if (value === 'OFF') type = 'off';
                                else if (value.includes('11:00 AM')) type = 'brunch';
                                else if (value.includes('12:00 PM')) type = 'pickup';
                                else if (value.includes('2:00 PM') || value === '3:00 PM - 12:00 AM') type = 'opening';
                                else if (value === '3:00 PM - 1:00 AM') type = 'regular'; // Support 10h shift
                                else if (value.includes('4:00 PM')) type = 'early_shift';
                                else if (value.includes('5:00 PM')) type = 'late_shift';
                                updateScheduleCell(staff.id, day, value, type, cell?.station, cell?.breakStart, cell?.breakEnd);
                              }}
                            >
                              <SelectTrigger className="text-[9px] h-6 bg-gray-900 border-gray-700 text-gray-100 px-1">
                                <SelectValue placeholder="Time" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700 z-50">
                                <SelectItem value="OFF" className="text-gray-100 text-[10px]">OFF</SelectItem>
                                <SelectItem value="11:00 AM - 8:00 PM" className="text-gray-100 text-[10px]">11:00 AM - 8:00 PM</SelectItem>
                                <SelectItem value="12:00 PM - 9:00 PM" className="text-gray-100 text-[10px]">12:00 PM - 9:00 PM</SelectItem>
                                <SelectItem value="2:00 PM - 11:00 PM" className="text-gray-100 text-[10px]">2:00 PM - 11:00 PM</SelectItem>
                                <SelectItem value="3:00 PM - 12:00 AM" className="text-gray-100 text-[10px]">3:00 PM - 12:00 AM (9h)</SelectItem>
                                <SelectItem value="3:00 PM - 1:00 AM" className="text-gray-100 text-[10px]">3:00 PM - 1:00 AM (10h Support)</SelectItem>
                                <SelectItem value="4:00 PM - 1:00 AM" className="text-gray-100 text-[10px]">4:00 PM - 1:00 AM (9h)</SelectItem>
                                <SelectItem value="5:00 PM - 2:00 AM" className="text-gray-100 text-[10px]">5:00 PM - 2:00 AM (9h)</SelectItem>
                                <SelectItem value="5:00 PM - 3:00 AM" className="text-gray-100 text-[10px]">5:00 PM - 3:00 AM (10h)</SelectItem>
                              </SelectContent>
                            </Select>
                            {cell?.timeRange && cell.timeRange !== 'OFF' && (
                              <Select
                                value={cell?.station?.toLowerCase().includes('outdoor') ? 'outdoor' : cell?.station?.toLowerCase().includes('indoor') ? 'indoor' : 'indoor'}
                                onValueChange={(area) => {
                                  const currentStation = cell?.station || '';
                                  let newStation = '';
                                  
                                  // Generate appropriate station based on staff role and selected area
                                  if (staff.title === 'head_bartender') {
                                    newStation = `Head - ${area === 'outdoor' ? 'Outdoor' : 'Indoor'} Supervisor: Observe ${area} operations, support where needed`;
                                  } else if (staff.title === 'senior_bartender' || staff.title === 'bartender') {
                                    if (currentStation.includes('Station 1') || currentStation.includes('Station 2') || currentStation.includes('Station 3')) {
                                      const stationNum = currentStation.match(/Station (\d)/)?.[1] || '1';
                                      // ALWAYS preserve garnishing designation for Station 3
                                      if (stationNum === '3') {
                                        newStation = `${area === 'outdoor' ? 'Outdoor' : 'Indoor'} - Garnishing Station 3: Operate station, supervise bar backs, manage closing, refresh & maintain`;
                                      } else {
                                        newStation = `${area === 'outdoor' ? 'Outdoor' : 'Indoor'} - Station ${stationNum}: Operate station, supervise bar backs, manage closing, refresh & maintain`;
                                      }
                                    } else {
                                      newStation = `${area === 'outdoor' ? 'Outdoor' : 'Indoor'} - Floating Support: Assist all ${area} stations as needed`;
                                    }
                                  } else if (staff.title === 'bar_back') {
                                    newStation = `Bar Back - ${area === 'outdoor' ? 'Outdoor' : 'Indoor'}: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish`;
                                  } else if (staff.title === 'support') {
                                    newStation = `Support - ${area === 'outdoor' ? 'Outdoor' : 'Indoor'}: Glassware Polishing, General Support`;
                                  }
                                  
                                  updateScheduleCell(staff.id, day, cell.timeRange, cell.type, newStation, cell?.breakStart, cell?.breakEnd);
                                }}
                              >
                                <SelectTrigger className="text-[8px] h-5 bg-gray-800 border-gray-600 text-gray-100 px-1 mt-0.5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700 z-50">
                                  <SelectItem value="indoor" className="text-gray-100 text-[9px]">🏠 Indoor</SelectItem>
                                  <SelectItem value="outdoor" className="text-gray-100 text-[9px]">🌳 Outdoor</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {cell?.station && (
                              <div className="text-[8px] text-gray-400 text-center mt-0.5 leading-none truncate px-0.5">
                                {cell.station}
                              </div>
                            )}
                            {cell?.timeRange && cell.timeRange !== 'OFF' && (
                              <div className="flex gap-0.5 mt-0.5">
                                <Select
                                  value={cell?.breakStart || ''}
                                  onValueChange={(value) => {
                                    // Auto-calculate break end time (1 hour after start)
                                    const autoBreakEnd = calculateBreakEnd(value);
                                    updateScheduleCell(staff.id, day, cell.timeRange, cell.type, cell.station, value, autoBreakEnd);
                                  }}
                                >
                                  <SelectTrigger className="text-[7px] h-4 bg-orange-500/10 border-orange-500/30 px-0.5">
                                    <SelectValue placeholder="Break Start" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-700 z-[100]">
                                    <SelectItem value="5:00 PM" className="text-gray-100 text-[9px]">5:00 PM</SelectItem>
                                    <SelectItem value="5:30 PM" className="text-gray-100 text-[9px]">5:30 PM</SelectItem>
                                    <SelectItem value="6:00 PM" className="text-gray-100 text-[9px]">6:00 PM</SelectItem>
                                    <SelectItem value="6:30 PM" className="text-gray-100 text-[9px]">6:30 PM</SelectItem>
                                    <SelectItem value="7:00 PM" className="text-gray-100 text-[9px]">7:00 PM</SelectItem>
                                    <SelectItem value="7:30 PM" className="text-gray-100 text-[9px]">7:30 PM</SelectItem>
                                    <SelectItem value="8:00 PM" className="text-gray-100 text-[9px]">8:00 PM</SelectItem>
                                    <SelectItem value="8:30 PM" className="text-gray-100 text-[9px]">8:30 PM</SelectItem>
                                    <SelectItem value="9:00 PM" className="text-gray-100 text-[9px]">9:00 PM</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={cell?.breakEnd || ''}
                                  onValueChange={(value) => updateScheduleCell(staff.id, day, cell.timeRange, cell.type, cell.station, cell?.breakStart, value)}
                                >
                                  <SelectTrigger className="text-[7px] h-4 bg-orange-500/10 border-orange-500/30 px-0.5">
                                    <SelectValue placeholder="Break End" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-700 z-[100]">
                                    <SelectItem value="5:30 PM" className="text-gray-100 text-[9px]">5:30 PM</SelectItem>
                                    <SelectItem value="6:00 PM" className="text-gray-100 text-[9px]">6:00 PM</SelectItem>
                                    <SelectItem value="6:30 PM" className="text-gray-100 text-[9px]">6:30 PM</SelectItem>
                                    <SelectItem value="7:00 PM" className="text-gray-100 text-[9px]">7:00 PM</SelectItem>
                                    <SelectItem value="7:30 PM" className="text-gray-100 text-[9px]">7:30 PM</SelectItem>
                                    <SelectItem value="8:00 PM" className="text-gray-100 text-[9px]">8:00 PM</SelectItem>
                                    <SelectItem value="8:30 PM" className="text-gray-100 text-[9px]">8:30 PM</SelectItem>
                                    <SelectItem value="9:00 PM" className="text-gray-100 text-[9px]">9:00 PM</SelectItem>
                                    <SelectItem value="9:30 PM" className="text-gray-100 text-[9px]">9:30 PM</SelectItem>
                                    <SelectItem value="10:00 PM" className="text-gray-100 text-[9px]">10:00 PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </Card>
        )}

        {/* Legend - Enhanced */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h3 className="text-xl font-bold mb-4 text-gray-100">📖 Schedule Legend & Important Notes</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="border-2 rounded-lg p-3 bg-green-500/20 border-green-500/50">
              <div className="font-bold text-sm text-gray-100">🟢 Opening</div>
              <div className="text-xs text-gray-400 mt-1">Morning shift</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-red-500/20 border-red-500/50">
              <div className="font-bold text-sm text-gray-100">🔴 Closing</div>
              <div className="text-xs text-gray-400 mt-1">Night shift</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-yellow-500/20 border-yellow-500/50">
              <div className="font-bold text-sm text-gray-100">🟡 Store Pick-up</div>
              <div className="text-xs text-gray-400 mt-1">Mon/Wed/Fri</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-orange-500/20 border-orange-500/50">
              <div className="font-bold text-sm text-gray-100">🟠 Brunch</div>
              <div className="text-xs text-gray-400 mt-1">11 AM Saturday</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-gray-800 border-gray-700">
              <div className="font-bold text-sm text-gray-100">⚪ OFF</div>
              <div className="text-xs text-gray-400 mt-1">Day off</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="p-3 border-2 rounded-lg bg-blue-500/10 border-blue-500/30">
                <strong className="text-sm">⏰ Break Time Frame:</strong>
                <div className="text-sm mt-1">5:00 PM - 6:00 PM</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-purple-500/10 border-purple-500/30">
                <strong className="text-sm">🎭 Bar Outside Open:</strong>
                <div className="text-sm mt-1">Special events</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-cyan-500/10 border-cyan-500/30">
                <strong className="text-sm">🎯 Ending Back & Front:</strong>
                <div className="text-sm mt-1">6:45 PM - Mandatory</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {Object.entries(dailyEvents).filter(([_, event]) => event).length > 0 ? (
                <div className="p-3 border-2 rounded-lg bg-orange-500/10 border-orange-500/30">
                  <strong className="text-sm">🔥 EVENT DAYS (No Offs):</strong>
                  <div className="text-sm mt-1">
                    {Object.entries(dailyEvents)
                      .filter(([_, event]) => event)
                      .map(([day, event]) => (
                        <div key={day}>• {day} - {event}</div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="p-3 border-2 rounded-lg bg-muted/50 border-border">
                  <strong className="text-sm">ℹ️ No event days configured</strong>
                  <div className="text-sm mt-1">Add events in the Special Events section above</div>
                </div>
              )}
              <div className="p-3 border-2 rounded-lg bg-green-500/10 border-green-500/30">
                <strong className="text-sm">📦 Store Pick-up Days:</strong>
                <div className="text-sm mt-1">Monday, Wednesday, Friday</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm mb-3">👥 Role Responsibilities:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-3 border-2 rounded-lg bg-card border-border">
                <strong className="text-sm">Head Bartender:</strong>
                <div className="text-xs mt-1">{ROLE_RESPONSIBILITIES.head_bartender}</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-card border-border">
                <strong className="text-sm">Senior Bartender:</strong>
                <div className="text-xs mt-1">{ROLE_RESPONSIBILITIES.senior_bartender}</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-card border-border">
                <strong className="text-sm">Bartender:</strong>
                <div className="text-xs mt-1">{ROLE_RESPONSIBILITIES.bartender}</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-card border-border">
                <strong className="text-sm">Bar Back:</strong>
                <div className="text-xs mt-1">{ROLE_RESPONSIBILITIES.bar_back}</div>
              </div>
              <div className="p-3 border-2 rounded-lg bg-card border-border">
                <strong className="text-sm">Support:</strong>
                <div className="text-xs mt-1">{ROLE_RESPONSIBILITIES.support}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={staffToDelete !== null} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this staff member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStaffMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
