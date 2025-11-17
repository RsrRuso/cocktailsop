import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Download, Plus, Trash2, Wand2, Calendar, Users } from 'lucide-react';
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
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CELL_COLORS = {
  opening: 'bg-green-500/20',
  closing: 'bg-red-500/20',
  pickup: 'bg-amber-500/25',
  brunch: 'bg-orange-500/20',
  early_shift: 'bg-violet-500/35',  // 4 PM shifts - vibrant violet/purple
  late_shift: 'bg-teal-500/35',     // 5 PM shifts - vibrant teal
  off: 'bg-muted',
  regular: 'bg-background',
};

const ROLE_RESPONSIBILITIES = {
  head_bartender: 'Supervise operations, support teams, monitor safety',
  senior_bartender: 'Operate stations, train staff, ensure compliance',
  bartender: 'Run bar stations, supervise backs, maintain hygiene',
  bar_back: 'Pickups, refills, polish glassware, stock & garnish',
  support: '10h shifts (3PM-1AM), glassware & general support',
};

export default function StaffScheduling() {
  const { user } = useAuth();
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
  const [isEditingEvents, setIsEditingEvents] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    title: 'bartender' as StaffMember['title'],
  });

  useEffect(() => {
    if (user) {
      restoreAllStaff();
      fetchStaffMembers();
    }
  }, [user]);

  const restoreAllStaff = async () => {
    // Restore all previously deleted staff members
    await supabase
      .from('staff_members')
      .update({ is_active: true })
      .eq('user_id', user?.id)
      .eq('is_active', false);
  };

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('user_id', user?.id)
      .order('title', { ascending: true });

    if (!error && data) {
      // Load break timings from database or use defaults
      const staffWithBreaks = data.map(staff => {
        const breakTimings = staff.break_timings as any;
        return {
          id: staff.id,
          name: staff.name,
          title: staff.title as StaffMember['title'],
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

    const { error } = await supabase
      .from('staff_members')
      .insert({
        user_id: user?.id,
        name: newStaff.name,
        title: newStaff.title,
      });

    if (error) {
      toast.error('Failed to add staff member');
      return;
    }

    toast.success('Staff member added');
    setNewStaff({ name: '', title: 'bartender' });
    setIsAddStaffOpen(false);
    fetchStaffMembers();
  };

  const deleteStaffMember = async (id: string) => {
    const { error } = await supabase
      .from('staff_members')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast.error('Failed to remove staff member');
      return;
    }

    toast.success('Staff member removed');
    fetchStaffMembers();
  };


  const updateScheduleCell = (staffId: string, day: string, timeRange: string, type: ScheduleCell['type'], station?: string) => {
    const key = `${staffId}-${day}`;
    setSchedule(prev => ({
      ...prev,
      [key]: { staffId, day, timeRange, type, station }
    }));
  };

  const getScheduleCell = (staffId: string, day: string): ScheduleCell | undefined => {
    const key = `${staffId}-${day}`;
    return schedule[key];
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

    const newSchedule: Record<string, ScheduleCell> = {};
    
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
          station: shouldDivideHeads 
            ? `Head - ${area} Supervisor: Observe ${area.toLowerCase()} operations, support where needed`
            : `Head - Supervising: Observe all operations, support where needed`
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
      
      const allStationBartenders = [...shuffledWorkingSeniorBartenders, ...shuffledWorkingBartenders];
      // OUTDOOR ALLOCATION: Always 1 bartender outdoor (minimum 2 total outdoor with barback)
      // This ensures min 2 outdoor (1 bartender + 1 barback), max 3 outdoor (+ 1 head)
      const numBartenders = allStationBartenders.length;
      const stations = numBartenders >= 4 ? [
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Garnishing Station 2: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 3: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ] : numBartenders === 3 ? [
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Garnishing Station 2: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ] : [
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ];

      // SHUFFLE stations to randomize assignments each time
      const shuffledStations = shuffleArray(stations);

      allStationBartenders.forEach((schedule, idx) => {
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
        
        if (idx < shuffledStations.length) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type,
            station: shuffledStations[idx]
          };
          assignedStaffIds.add(schedule.staff.id);
        } else {
          // Extra bartenders prioritize indoor floating support
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type,
            station: 'Indoor - Floating Support: Assist all indoor stations as needed'
          };
          assignedStaffIds.add(schedule.staff.id);
        }
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
        
        // OUTDOOR ALLOCATION: Always 1 barback outdoor (ensures min 2 total outdoor with bartender)
        // First barback always outdoor to meet minimum 2 outdoor requirement
        const barBackStations = shuffledWorkingBarBacks.length >= 3 ? [
          'Bar Back - Outdoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Indoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Indoor Support: Pickups, Refilling, Glassware, Batching, help where needed, stock'
        ] : shuffledWorkingBarBacks.length === 2 ? [
          'Bar Back - Outdoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Indoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish'
        ] : [
          'Bar Back - Outdoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish'
        ];
        
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
        
        // Assign station - prioritize indoor after first outdoor
        const station = idx < barBackStations.length ? barBackStations[idx] : barBackStations[barBackStations.length - 1];
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type,
          station
        };
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
        
        // Allocate support to Indoor or Outdoor (10 hours: 3:00 PM - 1:00 AM)
        const supportStations = [
          'Support - Outdoor: Glassware Polishing, General Support',
          'Support - Indoor: Glassware Polishing, General Support'
        ];
        
        // Assign station (alternate between outdoor and indoor)
        const station = idx < supportStations.length ? supportStations[idx] : supportStations[idx % supportStations.length];
        
        // Support works 10 hours: 3:00 PM - 1:00 AM
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: '3:00 PM - 1:00 AM',
          type: 'regular',
          station
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
    
    setSchedule(newSchedule);
    toast.success(`✅ Schedule generated! Bartenders: Alternating 1-2 days off week-to-week. Support: 2 days off per month (10h shifts). Min 3 bartenders working daily.`, {
      duration: 7000
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Design System Colors (HSL converted to RGB) - Darker version
    const colors = {
      primary: [25, 70, 180] as [number, number, number], // Darker Blue
      secondary: [20, 100, 150] as [number, number, number], // Darker Cyan
      accent: [180, 30, 150] as [number, number, number], // Darker Magenta
      foreground: [15, 15, 15] as [number, number, number], // Very dark gray
      muted: [200, 200, 200] as [number, number, number], // Darker muted gray
      mutedText: [80, 80, 80] as [number, number, number] // Darker text
    };
    
    // Modern gradient header background
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 297, 40, 'F');
    
    // Title with professional styling
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text((venueName || 'STAFF SCHEDULE').toUpperCase(), 148, 18, { align: 'center' });
    
    // Subtitle with accent
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const weekStart = new Date(weekStartDate);
    const weekEnd = addDays(weekStart, 6);
    doc.text(`WEEK: ${format(weekStart, 'MMM dd').toUpperCase()} - ${format(weekEnd, 'MMM dd, yyyy').toUpperCase()}`, 148, 28, { align: 'center' });
    
    // Reset text color for table
    doc.setTextColor(0, 0, 0);
    
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
      startY: 45,
      styles: { 
        fontSize: 6, 
        cellPadding: 1.2, 
        lineWidth: 0.2, 
        lineColor: colors.muted,
        textColor: colors.foreground,
        valign: 'middle',
        halign: 'center'
      },
      headStyles: { 
        fillColor: colors.primary,
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: [255, 255, 255],
        halign: 'center',
        cellPadding: 2
      },
      columnStyles: {
        0: { 
          cellWidth: 28, 
          fontStyle: 'bold', 
          fillColor: colors.muted,
          halign: 'left'
        }
      },
      alternateRowStyles: {
        fillColor: [230, 230, 230]
      },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.column.index > 0) {
          const day = DAYS_OF_WEEK[data.column.index - 1];
          const staff = staffMembers[data.row.index];
          if (staff) {
            const cell = getScheduleCell(staff.id, day);
            if (cell) {
              if (cell.type === 'early_shift') {
                data.cell.styles.fillColor = [167, 139, 250]; // Darker Violet
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [60, 20, 100];
              }
              if (cell.type === 'late_shift') {
                data.cell.styles.fillColor = [94, 234, 212]; // Darker Teal
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [13, 60, 55];
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
    let finalY = (doc as any).lastAutoTable.finalY + 8;
    const hasEvents = Object.values(dailyEvents).some(event => event && event.trim() !== '');
    
    if (hasEvents) {
      doc.setFillColor(...colors.accent);
      doc.roundedRect(14, finalY - 2, 270, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SPECIAL EVENTS THIS WEEK', 18, finalY + 4);
      
      finalY += 13;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.foreground);
      
      DAYS_OF_WEEK.forEach(day => {
        const event = dailyEvents[day];
        if (event && event.trim() !== '') {
          // Find opening bartender for this day
          const openingStaff = staffMembers.find(staff => {
            const cell = getScheduleCell(staff.id, day);
            return cell && (cell.type === 'opening' || cell.type === 'brunch' || cell.type === 'pickup');
          });
          
          const staffInfo = openingStaff ? ` | Opening: ${openingStaff.name}` : '';
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.accent);
          doc.text(`${day}:`, 18, finalY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.foreground);
          doc.text(`${event}${staffInfo}`, 40, finalY);
          finalY += 4;
        }
      });
      
      finalY += 5;
    }
    
    // Staff Responsibilities Section - New detailed section
    doc.setFillColor(...colors.primary);
    doc.roundedRect(14, finalY - 2, 270, 10, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('STAFF RESPONSIBILITIES & STATIONS', 18, finalY + 4);
    
    finalY += 13;
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.foreground);
    
    // Group staff by role for responsibilities
    const roleGroups = {
      'Head Bartender': staffMembers.filter(s => s.title.toLowerCase().includes('head')),
      'Senior Bartender': staffMembers.filter(s => s.title.toLowerCase().includes('senior')),
      'Bartender': staffMembers.filter(s => s.title.toLowerCase().includes('bartender') && !s.title.toLowerCase().includes('head') && !s.title.toLowerCase().includes('senior')),
      'Bar Back': staffMembers.filter(s => s.title.toLowerCase().includes('bar back')),
      'Support': staffMembers.filter(s => s.title.toLowerCase().includes('support'))
    };
    
    Object.entries(roleGroups).forEach(([role, members]) => {
      if (members.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`${role.toUpperCase()}:`, 18, finalY);
        finalY += 3.5;
        
        members.forEach(member => {
          // Get this week's stations for the member
          const memberStations = new Set<string>();
          DAYS_OF_WEEK.forEach(day => {
            const cell = getScheduleCell(member.id, day);
            if (cell && cell.station) {
              memberStations.add(cell.station);
            }
          });
          
          const stationsList = Array.from(memberStations).join(', ') || 'Various stations';
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.text(`- ${member.name}:`, 22, finalY);
          
          // Wrap long text to prevent overflow
          const maxWidth = 215; // Maximum width for text
          const lines = doc.splitTextToSize(stationsList, maxWidth);
          doc.text(lines, 55, finalY);
          finalY += (lines.length * 3);
        });
        
        finalY += 2;
      }
    });
    
    // Role Responsibilities Section - More compact
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(14, finalY - 2, 270, 9, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ROLE PRIORITIES', 18, finalY + 3.5);
    
    finalY += 11;
    doc.setTextColor(...colors.foreground);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    
    // Compact priority list
    doc.text('P1-HEADS:', 18, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Supervise indoor/outdoor | ', 50, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text('P2-BARTENDERS:', 100, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Stations & bar backs | ', 145, finalY);
    finalY += 3.5;
    doc.setFont('helvetica', 'bold');
    doc.text('P3-BAR BACKS:', 18, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Pickups, refills, batching | ', 55, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text('P4-SUPPORT:', 120, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('10h shifts, glassware, 2 days off/month', 155, finalY);
    finalY += 5;
    
    // Division Rules - More compact
    doc.setFillColor(...colors.muted);
    doc.roundedRect(14, finalY - 2, 270, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.foreground);
    doc.setFontSize(6.5);
    doc.text('DIVISION:', 18, finalY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('2+ Heads/Bar Backs → Indoor/Outdoor | 1 Bar Back + 1 Support → Areas | Default: Indoor', 48, finalY + 2.5);
    finalY += 7;

    // Operational Notes - Very compact
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(14, finalY - 2, 270, 8, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('OPERATIONS', 18, finalY + 2.5);
    
    finalY += 9;
    doc.setTextColor(...colors.foreground);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hours: Venue 5PM-2AM | Bartenders/Backs: 9h | Support: 10h (3PM-1AM) | Break: Individual per staff | Ending: 6:45PM`, 18, finalY);
    finalY += 3.5;
    
    // Off Days - inline
    doc.setFont('helvetica', 'bold');
    doc.text('Off Days:', 18, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Bartenders alt. 1-2/week | Support: 2/month | No offs on event days', 45, finalY);
    finalY += 4;
    
    // Hygiene & Outdoor - Very compact side by side
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(14, finalY - 2, 128, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.text('HYGIENE:', 18, finalY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Hair tied, clean attire, gloves required', 45, finalY + 2.5);
    
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(146, finalY - 2, 138, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('OUTDOOR:', 150, finalY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('MIN 2 / MAX 3 - Rotate every 2h', 180, finalY + 2.5);
    
    // Add spacing at the bottom for readability
    finalY += 15;

    doc.save(`${(venueName || 'schedule').replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule exported to PDF');
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
      const filename = `${(venueName || 'schedule').replace(/\s+/g, '-')}-${day}-${format(new Date(), 'yyyy-MM-dd')}.png`;
      
      console.log(`Using html-to-image to capture ${day}...`);
      
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        cacheBust: true,
      });
      
      console.log(`Image captured successfully for ${day}, downloading...`);
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      console.log(`Download triggered for ${day}`);
      toast.success(`${day} downloaded!`);
      
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 border border-primary/20 p-6 mb-6">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 max-w-md">
              <Label htmlFor="venue-name" className="text-xs uppercase tracking-wider text-gray-400 mb-2 block font-semibold">Venue Name</Label>
              <Input
                id="venue-name"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Enter venue name..."
                className="text-xl font-bold bg-gray-900/50 border-gray-700/50 text-gray-100 h-12 backdrop-blur-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={autoGenerateSchedule} variant="default" className="h-11 px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Schedule
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="h-11 px-6 border-gray-600 hover:bg-gray-800/80 hover:border-primary/50 transition-all">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Daily Events Management */}
        <Card className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative">
            <Accordion type="single" collapsible defaultValue="daily-events">
              <AccordionItem value="daily-events" className="border-none">
                <AccordionTrigger className="hover:no-underline pb-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-100">Daily Events</h3>
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
                    <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" className="h-9 px-4 font-medium shadow-lg shadow-primary/10">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {headBartenders.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-2 border border-gray-800 rounded-lg bg-gray-800">
                              <span className="font-medium text-gray-100">{staff.name}</span>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {members.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-2 border border-gray-800 rounded-lg bg-gray-800">
                              <span className="font-medium text-gray-100">{staff.name}</span>
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
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/20 rounded-lg">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-100">Daily Breakdown</h3>
                          <p className="text-xs text-gray-500">Staff schedule by day</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <span className="text-xs text-orange-400 font-semibold">☕ Individual break times per staff</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
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
                    station: s.station || 'General Support', 
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
                    className={`border rounded-xl p-4 shadow-lg hover:shadow-xl transition-all ${isBusyDay ? 'border-orange-400 bg-gradient-to-br from-orange-900/30 to-orange-950/20' : 'bg-gradient-to-br from-gray-800 to-gray-850 border-gray-700 hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm text-gray-100 flex items-center gap-1">
                        {isBusyDay && <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>}
                        {day}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportDayToPNG(day)}
                        className="h-7 px-2 text-xs hover:bg-gray-700 transition-colors"
                        title="Download Screenshot"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                    {dayLabel && (
                      <div className="text-xs text-orange-300 mb-3 bg-orange-950/30 rounded px-2 py-1 font-medium">
                        📅 {dayLabel}
                      </div>
                    )}
                    
                    {/* Summary Numbers */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-gradient-to-br from-green-950/40 to-green-900/20 rounded-lg border border-green-800/30">
                        <div className="text-2xl font-extrabold text-green-400">{working.length}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Working</div>
                      </div>
                      <div className="text-center p-2 bg-gradient-to-br from-red-950/40 to-red-900/20 rounded-lg border border-red-800/30">
                        <div className="text-2xl font-extrabold text-red-400">{off.length}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Off</div>
                      </div>
                      <div className="text-center p-2 bg-gradient-to-br from-blue-950/40 to-blue-900/20 rounded-lg border border-blue-800/30">
                        <div className="text-xl font-bold text-blue-400">{indoorStaff.length}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Indoor</div>
                      </div>
                      <div className="text-center p-2 bg-gradient-to-br from-purple-950/40 to-purple-900/20 rounded-lg border border-purple-800/30">
                        <div className="text-xl font-bold text-purple-400">{outdoorStaff.length}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Outdoor</div>
                      </div>
                    </div>
                    
                    {/* Indoor Staff */}
                    {indoorStaff.length > 0 && (
                      <div className="space-y-1.5 mb-2 bg-blue-950/20 rounded-lg p-2 border border-blue-900/30">
                        <div className="text-xs font-bold text-blue-300 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          Indoor Stations
                        </div>
                        <div className="space-y-1 text-xs pl-3">
                          {indoorStaff.map((s, idx) => (
                            <div key={idx} className="text-gray-300">
                              • <span className={s.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                              {s.title === 'head_bartender' && <span className="text-[10px] text-yellow-500 ml-1">(HEAD)</span>}
                              {s.title === 'senior_bartender' && <span className="text-[10px] text-blue-400 ml-1">(SENIOR)</span>}
                              <span className="text-gray-500"> ({s.timeRange})</span>
                              <div className="text-[10px] text-blue-400/80 pl-3">{s.station}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outdoor Staff */}
                    {outdoorStaff.length > 0 && (
                      <div className="space-y-1.5 mb-2 bg-purple-950/20 rounded-lg p-2 border border-purple-900/30">
                        <div className="text-xs font-bold text-purple-300 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          Outdoor Stations
                        </div>
                        <div className="space-y-1 text-xs pl-3">
                          {outdoorStaff.map((s, idx) => (
                            <div key={idx} className="text-gray-300">
                              • <span className={s.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                              {s.title === 'head_bartender' && <span className="text-[10px] text-yellow-500 ml-1">(HEAD)</span>}
                              {s.title === 'senior_bartender' && <span className="text-[10px] text-blue-400 ml-1">(SENIOR)</span>}
                              <span className="text-gray-500"> ({s.timeRange})</span>
                              <div className="text-[10px] text-purple-400/80 pl-3">{s.station}</div>
                            </div>
                          ))}
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

                      // First Wave: 12 PM, 3 PM, 4 PM shifts
                      const firstWaveStaff = sortByRole(working.filter(s => {
                        const time = s.timeRange;
                        return time.startsWith('12:00 PM') || time.startsWith('3:00 PM') || time.startsWith('4:00 PM');
                      }).map(s => {
                        const staff = staffMembers.find(sm => sm.id === s.staffId);
                        return { name: staff?.name || 'Unknown', timeRange: s.timeRange, staff };
                      }));
                      
                      // Second Wave: 5 PM shifts
                      const secondWaveStaff = sortByRole(working.filter(s => {
                        const time = s.timeRange;
                        return time.startsWith('5:00 PM');
                      }).map(s => {
                        const staff = staffMembers.find(sm => sm.id === s.staffId);
                        return { name: staff?.name || 'Unknown', timeRange: s.timeRange, staff };
                      }));
                      
                      return (firstWaveStaff.length > 0 || secondWaveStaff.length > 0) && (
                        <div className="space-y-1.5 mb-2 bg-gradient-to-r from-orange-950/30 to-amber-950/20 rounded-lg p-2 border border-orange-800/40">
                          <div className="text-xs font-bold text-orange-300 flex items-center gap-1">
                            ☕ Break Schedule
                          </div>
                          <div className="space-y-1.5 text-[10px] pl-2">
                            {firstWaveStaff.length > 0 && (
                              <div className="bg-orange-950/20 rounded p-1.5 border border-orange-900/30">
                                <span className="font-semibold text-orange-400">First Wave Break</span>
                                <div className="text-gray-300 mt-1 space-y-0.5">
                                  {firstWaveStaff.map((s, idx) => {
                                    const staff = staffMembers.find(sm => sm.name === s.name);
                                    const breaks = staff?.breakTimings || { firstWaveStart: '5:30 PM', firstWaveEnd: '6:30 PM' };
                                    return (
                                      <div key={idx} className="pl-2">
                                        • <span className={s.staff?.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                        {s.staff?.title === 'head_bartender' && <span className="text-[8px] text-yellow-500 ml-1">(HEAD)</span>}
                                        {s.staff?.title === 'senior_bartender' && <span className="text-[8px] text-blue-400 ml-1">(SENIOR)</span>}
                                        <span className="text-gray-500 text-[9px]"> ({breaks.firstWaveStart}-{breaks.firstWaveEnd})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-amber-400/80 mt-1.5 text-[9px] bg-amber-950/20 rounded p-1">
                                  ⚠️ Coverage: 2 Indoor + 1 Support remain
                                </div>
                              </div>
                            )}
                            {secondWaveStaff.length > 0 && (
                              <div className="bg-teal-950/20 rounded p-1.5 border border-teal-900/30">
                                <span className="font-semibold text-teal-400">Second Wave Break</span>
                                <div className="text-gray-300 mt-1 space-y-0.5">
                                  {secondWaveStaff.map((s, idx) => {
                                    const staff = staffMembers.find(sm => sm.name === s.name);
                                    const breaks = staff?.breakTimings || { secondWaveStart: '6:30 PM' };
                                    return (
                                      <div key={idx} className="pl-2">
                                        • <span className={s.staff?.title === 'head_bartender' ? 'font-bold text-yellow-400' : ''}>{s.name}</span>
                                        {s.staff?.title === 'head_bartender' && <span className="text-[8px] text-yellow-500 ml-1">(HEAD)</span>}
                                        {s.staff?.title === 'senior_bartender' && <span className="text-[8px] text-blue-400 ml-1">(SENIOR)</span>}
                                        <span className="text-gray-500 text-[9px]"> (After {breaks.secondWaveStart})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-teal-400/80 mt-1 text-[9px]">
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
                      <div className="space-y-1.5 pt-2 border-t border-gray-700/50 bg-gray-900/30 rounded-lg p-2 mt-2">
                        <div className="text-xs font-bold text-gray-300">Off Duty:</div>
                        <div className="space-y-1 text-xs pl-3">
                          {offStaff.map((name, idx) => (
                            <div key={idx} className="text-gray-400">
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
          <Card className="p-5 overflow-x-auto bg-gradient-to-br from-gray-900 to-gray-900/80 border-gray-800 shadow-xl">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-100">Weekly Schedule</h3>
                <p className="text-xs text-gray-500">Staff assignments with individual break times</p>
              </div>
            </div>
            <div className="min-w-max">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className="border border-gray-700 p-1 bg-gray-800 font-semibold text-left min-w-[100px] sticky left-0 z-10 text-gray-100">
                      STAFF
                    </th>
                    <th className="border border-gray-700 p-1 bg-orange-900/20 font-semibold text-center min-w-[140px] text-orange-300 text-[9px]">
                      ☕ BREAK TIMES
                    </th>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const isBusyDay = !!dailyEvents[day];
                      const dayLabel = dailyEvents[day] || '';
                      return (
                        <th key={day} className={`border border-gray-700 p-1 font-semibold text-center min-w-[65px] ${isBusyDay ? 'bg-orange-900/30' : 'bg-gray-800'} text-gray-100`}>
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
                    <tr key={staff.id}>
                      <td className="border border-gray-700 p-1 font-medium bg-gray-800 sticky left-0 z-10 min-w-[100px]">
                        <div className="text-[10px] text-gray-100 leading-tight">{staff.name}</div>
                        <div className="text-[8px] text-gray-400 capitalize leading-tight">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="border border-gray-700 p-0.5 bg-orange-950/10">
                        <div className="flex gap-0.5 items-center justify-center">
                          <Input
                            type="time"
                            value={(() => {
                              const breaks = staff.breakTimings || { firstWaveStart: '5:30 PM' };
                              const [time, period] = breaks.firstWaveStart.split(' ');
                              const [hours, minutes] = time.split(':');
                              let hour = parseInt(hours);
                              if (period === 'PM' && hour !== 12) hour += 12;
                              if (period === 'AM' && hour === 12) hour = 0;
                              return `${hour.toString().padStart(2, '0')}:${minutes}`;
                            })()}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const hour = parseInt(hours);
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                              const newBreakTimings = { 
                                ...(staff.breakTimings || {}), 
                                firstWaveStart: `${displayHour}:${minutes} ${ampm}`, 
                                firstWaveEnd: staff.breakTimings?.firstWaveEnd || '6:30 PM', 
                                secondWaveStart: staff.breakTimings?.secondWaveStart || '6:30 PM' 
                              };
                              const updated = staffMembers.map(s => 
                                s.id === staff.id 
                                  ? { ...s, breakTimings: newBreakTimings }
                                  : s
                              );
                              setStaffMembers(updated);
                              saveBreakTimings(staff.id, newBreakTimings);
                            }}
                            className="h-5 w-14 text-[8px] bg-gray-900 border-gray-700 text-gray-100 font-mono p-0.5"
                            title="First Wave Start"
                          />
                          <span className="text-[8px] text-gray-500">-</span>
                          <Input
                            type="time"
                            value={(() => {
                              const breaks = staff.breakTimings || { firstWaveEnd: '6:30 PM' };
                              const [time, period] = breaks.firstWaveEnd.split(' ');
                              const [hours, minutes] = time.split(':');
                              let hour = parseInt(hours);
                              if (period === 'PM' && hour !== 12) hour += 12;
                              if (period === 'AM' && hour === 12) hour = 0;
                              return `${hour.toString().padStart(2, '0')}:${minutes}`;
                            })()}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const hour = parseInt(hours);
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                              const newBreakTimings = { 
                                firstWaveStart: staff.breakTimings?.firstWaveStart || '5:30 PM', 
                                firstWaveEnd: `${displayHour}:${minutes} ${ampm}`, 
                                secondWaveStart: `${displayHour}:${minutes} ${ampm}` 
                              };
                              const updated = staffMembers.map(s => 
                                s.id === staff.id 
                                  ? { ...s, breakTimings: newBreakTimings }
                                  : s
                              );
                              setStaffMembers(updated);
                              saveBreakTimings(staff.id, newBreakTimings);
                            }}
                            className="h-5 w-14 text-[8px] bg-gray-900 border-gray-700 text-gray-100 font-mono p-0.5"
                            title="First Wave End / Second Wave Start"
                          />
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border border-gray-700 p-0.5 ${cell ? CELL_COLORS[cell.type] : 'bg-gray-850'}`}
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
                                updateScheduleCell(staff.id, day, value, type, cell?.station);
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
                                      newStation = `${area === 'outdoor' ? 'Outdoor' : 'Indoor'} - Station ${stationNum}: Operate station, supervise bar backs, manage closing, refresh & maintain`;
                                    } else {
                                      newStation = `${area === 'outdoor' ? 'Outdoor' : 'Indoor'} - Floating Support: Assist all ${area} stations as needed`;
                                    }
                                  } else if (staff.title === 'bar_back') {
                                    newStation = `Bar Back - ${area === 'outdoor' ? 'Outdoor' : 'Indoor'}: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish`;
                                  } else if (staff.title === 'support') {
                                    newStation = `Support - ${area === 'outdoor' ? 'Outdoor' : 'Indoor'}: Glassware Polishing, General Support`;
                                  }
                                  
                                  updateScheduleCell(staff.id, day, cell.timeRange, cell.type, newStation);
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
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <div className="text-sm mt-1">Add events in the Daily Events section above</div>
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

      <BottomNav />
    </div>
  );
}
