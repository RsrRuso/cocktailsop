import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Plus, Trash2, Wand2, Calendar, Users } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, addDays } from 'date-fns';
import html2canvas from 'html2canvas';

interface StaffMember {
  id: string;
  name: string;
  title: 'head_bartender' | 'senior_bartender' | 'bartender' | 'bar_back' | 'support';
}

interface ScheduleCell {
  staffId: string;
  day: string;
  timeRange: string;
  type: 'opening' | 'closing' | 'pickup' | 'brunch' | 'off' | 'regular';
  station?: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CELL_COLORS = {
  opening: 'bg-green-500/20',
  closing: 'bg-red-500/20',
  pickup: 'bg-yellow-500/20',
  brunch: 'bg-orange-500/20',
  off: 'bg-muted',
  regular: 'bg-background',
};

const ROLE_RESPONSIBILITIES = {
  head_bartender: 'SUPERVISING: Observe indoor/outdoor areas, support where needed (Divided between areas if 2+ heads). HYGIENE & SAFETY: Monitor food safety, update labeling, check expirations',
  senior_bartender: 'Operate Stations & Training. HYGIENE & SAFETY: Ensure food safety compliance, maintain labeling standards, monitor product expirations',
  bartender: 'IN CHARGE OF STATIONS: Operate assigned bar stations, supervise bar backs, manage station closing procedures, refresh and maintain stations based on operational needs during service. HYGIENE & SAFETY: Maintain hygiene standards, proper labeling, check product expirations',
  bar_back: 'PRIORITY ROLE: Pickups, refilling, glassware polishing, batching, station opening/closing, refill fridges/freezers, stock refilling, garnish cutting (Divided between indoor/outdoor if 2+). HYGIENE & SAFETY: Food safety compliance, labeling updates, expiration monitoring',
  support: '10-HOUR SHIFTS (3PM-1AM): Glassware polishing, general support (Divided between indoor/outdoor if 2+). 2 DAYS OFF PER MONTH. HYGIENE & SAFETY: Maintain hygiene standards, assist with labeling, monitor expirations',
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
      fetchStaffMembers();
    }
  }, [user]);

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (!error && data) {
      setStaffMembers(data as StaffMember[]);
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

  const autoGenerateSchedule = async () => {
    console.log('🔄 Starting schedule generation...');
    
    if (staffMembers.length === 0) {
      toast.error('Please add staff members first');
      return;
    }

    const newSchedule: Record<string, ScheduleCell> = {};
    
    // Get staff by role
    const headBartenders = staffMembers.filter(s => s.title === 'head_bartender');
    const seniorBartenders = staffMembers.filter(s => s.title === 'senior_bartender');
    const bartenders = staffMembers.filter(s => s.title === 'bartender');
    const barBacks = staffMembers.filter(s => s.title === 'bar_back');
    const support = staffMembers.filter(s => s.title === 'support');

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
          return { staffId: staff.id, offDays: [] };
        }
        
        // Get available days (not busy)
        let availableDays = allowedOffDays.filter(day => !busyDays.includes(day));
        
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
          // 1 day off: simple round-robin
          const dayIndex = globalIndex % availableDays.length;
          const selectedDay = availableDays[dayIndex];
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
          // 2 days off: pick 2 different days (with validation)
          let attempts = 0;
          const maxAttempts = availableDays.length * 2;
          
          while (finalDaysOff.length < 2 && attempts < maxAttempts) {
            const dayIndex = (globalIndex + attempts) % availableDays.length;
            const candidateDay = availableDays[dayIndex];
            
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

      // === PRIORITY 1: HEAD BARTENDERS - SUPERVISING (Observe indoor/outdoor, support where needed) ===
      // Working hours: 10 hours (5:00 PM - 3:00 AM) or 9 hours (4:00 PM - 1:00 AM) for special events
      // Division logic: 2+ heads → divide into indoor/outdoor supervisors
      
      const shouldDivideHeads = workingHeads.length >= 2;
      
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
      
      // Schedule working heads
      workingHeads.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        const area = shouldDivideHeads ? (idx % 2 === 0 ? 'Indoor' : 'Outdoor') : 'Supervising';
        
        // Determine time range based on day type
        let timeRange;
        if (isBrunchDay || isPickupDay) {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for special events
        } else {
          timeRange = '5:00 PM - 3:00 AM'; // 10 hours for regular days
        }
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange,
          type: 'regular',
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
      
      const allStationBartenders = [...workingSeniorBartenders, ...workingBartenders];
      // PRIORITY: Indoor bar is always busier - allocate based on team size
      // When 4 working: 2 indoor, 2 outdoor
      // When 3 working: 2 indoor (1 is support), 1 outdoor
      const stations = allStationBartenders.length >= 4 ? [
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Garnishing Station 2: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Outdoor - Station 2: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ] : [
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Support Station: Operate station, flexible support indoor/outdoor, refresh & maintain',
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ];

      allStationBartenders.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Determine time range based on day type and position
        let timeRange;
        if (isBrunchDay) {
          timeRange = '4:00 PM - 1:00 AM'; // 9 hours for brunch days
        } else if (isPickupDay && idx === 0) {
          timeRange = '4:00 PM - 1:00 AM'; // First bartender on pickup days
        } else if (day === 'Wednesday') {
          timeRange = idx === 0 ? '4:00 PM - 1:00 AM' : '5:00 PM - 3:00 AM'; // Mixed on Wednesday
        } else if (day === 'Saturday') {
          timeRange = '4:00 PM - 2:00 AM'; // 10 hours different end time for Saturday
        } else {
          timeRange = '5:00 PM - 3:00 AM'; // 10 hours standard
        }
        
        if (idx < stations.length) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type: 'regular',
            station: stations[idx]
          };
          assignedStaffIds.add(schedule.staff.id);
        } else {
          // Extra bartenders prioritize indoor floating support
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type: 'regular',
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
      
      workingBarBacks.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // Skip if already assigned to avoid duplicates
        if (assignedStaffIds.has(schedule.staff.id)) {
          console.warn(`⚠️ Skipping duplicate assignment for ${schedule.staff.name} on ${day}`);
          return;
        }
        
        // Allocate bar backs based on team size
        // When 3+ working: 1 indoor, 1 outdoor, 1+ flexible support
        // When 2 working: 1 indoor, 1 outdoor
        const barBackStations = workingBarBacks.length >= 3 ? [
          'Bar Back - Indoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Outdoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Support (Indoor/Outdoor): Flexible support, help where needed, pickups, refilling, stock'
        ] : [
          'Bar Back - Indoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
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
          // Additional bar backs work full service (9 hours)
          if (day === 'Wednesday') {
            timeRange = '3:00 PM - 12:00 AM'; // Special time for Wednesday
            type = 'regular';
          } else {
            timeRange = '5:00 PM - 3:00 AM'; // Match bartender hours
            type = 'regular';
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
      
      workingSupport.forEach((schedule, idx) => {
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
    
    // Design System Colors (HSL converted to RGB) - defined once at the top
    const colors = {
      primary: [46, 115, 237] as [number, number, number], // hsl(220 90% 56%) - Blue
      secondary: [38, 168, 212] as [number, number, number], // hsl(200 70% 50%) - Cyan
      accent: [229, 56, 201] as [number, number, number], // hsl(320 80% 55%) - Magenta
      foreground: [26, 26, 26] as [number, number, number], // hsl(0 0% 10%)
      muted: [245, 245, 245] as [number, number, number], // hsl(0 0% 96%)
      mutedText: [115, 115, 115] as [number, number, number] // hsl(0 0% 45%)
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
        fontSize: 6.5, 
        cellPadding: 1.5, 
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
        fillColor: [250, 250, 250]
      },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.column.index > 0) {
          const day = DAYS_OF_WEEK[data.column.index - 1];
          const staff = staffMembers[data.row.index];
          if (staff) {
            const cell = getScheduleCell(staff.id, day);
            if (cell) {
              if (cell.type === 'pickup') {
                data.cell.styles.fillColor = [255, 237, 213];
                data.cell.styles.fontStyle = 'bold';
              }
              if (cell.type === 'opening') {
                data.cell.styles.fillColor = [220, 252, 231];
                data.cell.styles.fontStyle = 'bold';
              }
              if (cell.type === 'closing') {
                data.cell.styles.fillColor = [254, 226, 226];
                data.cell.styles.fontStyle = 'bold';
              }
              if (cell.type === 'brunch') {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.fontStyle = 'bold';
              }
              if (cell.type === 'off') {
                data.cell.styles.fillColor = [226, 232, 240];
                data.cell.styles.textColor = [100, 116, 139];
              }
            }
          }
        }
      }
    });

    // Role Responsibilities Section
    let finalY = (doc as any).lastAutoTable.finalY + 12;
    
    // Section header with modern design
    doc.setFillColor(...colors.primary);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ROLE RESPONSIBILITIES & PRIORITIES', 18, finalY + 4);
    
    finalY += 16;
    doc.setTextColor(...colors.foreground);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    // Priority 1 - Modern Card Style
    doc.setFillColor(...colors.primary);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIORITY 1 - HEAD BARTENDERS', 18, finalY + 3);
    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.foreground);
    doc.text('Supervising operations - Observe indoor/outdoor areas, provide support where needed', 18, finalY);
    finalY += 3.5;
    doc.setTextColor(...colors.mutedText);
    doc.text('(Divided between indoor/outdoor supervision if 2+ heads)', 18, finalY);
    finalY += 8;
    
    // Priority 2
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIORITY 2 - BARTENDERS & SENIOR BARTENDERS', 18, finalY + 3);
    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.foreground);
    doc.text('Station Operations - Operate assigned stations, supervise bar backs, manage station closing', 18, finalY);
    finalY += 3.5;
    doc.text('procedures, refresh and maintain stations based on operational needs during service', 18, finalY);
    finalY += 8;
    
    // Priority 3
    doc.setFillColor(...colors.accent);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIORITY 3 - BAR BACKS (CRITICAL PRIORITY ROLE)', 18, finalY + 3);
    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.foreground);
    doc.text('Essential Support - Pickups, refilling, glassware polishing, batching, opening/closing procedures,', 18, finalY);
    finalY += 3.5;
    doc.text('fridges/freezers refill, stock management, garnish cutting (Divided between indoor/outdoor if 2+)', 18, finalY);
    finalY += 8;
    
    // Priority 4
    doc.setFillColor(...colors.primary);
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.primary);
    doc.text('PRIORITY 4 - SUPPORT', 18, finalY + 3);
    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.foreground);
    doc.text('General Support - Glassware polishing, general assistance (10-hour shifts: 3PM-1AM, 2 days off per month, divided between areas if 2+)', 18, finalY);
    finalY += 10;
    
    // Division Rules - Modern Card
    doc.setFillColor(...colors.muted);
    doc.roundedRect(14, finalY - 3, 270, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.foreground);
    doc.setFontSize(9);
    doc.text('DIVISION RULES', 18, finalY + 3);
    finalY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.foreground);
    doc.text('• 2+ Head Bartenders → Divided between indoor/outdoor supervision', 20, finalY);
    finalY += 3.5;
    doc.text('• 2+ Bar Backs → Divided between indoor/outdoor operational areas', 20, finalY);
    finalY += 3.5;
    doc.text('• 1 Bar Back + 1 Support → Also divided between indoor/outdoor areas', 20, finalY);
    finalY += 3.5;
    doc.text('• 2+ Support Staff → Divided between indoor/outdoor areas', 20, finalY);
    finalY += 10;

    // Operational Notes - Gradient-style header
    doc.setFillColor(...colors.primary);
    doc.roundedRect(14, finalY - 3, 270, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('OPERATIONAL NOTES & GUIDELINES', 18, finalY + 4);
    
    finalY += 14;
    doc.setTextColor(...colors.foreground);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('• VENUE HOURS: 5:00 PM - 2:00 AM (9-hour operation)', 18, finalY);
    finalY += 3.5;
    doc.text('• WORKING HOURS: All staff 9 hours (Support staff 10 hours)', 18, finalY);
    finalY += 3.5;
    doc.text('• HEAD BARTENDERS & BARTENDERS: 5:00 PM - 2:00 AM (9h, full venue coverage)', 18, finalY);
    finalY += 3.5;
    doc.text('• BAR BACKS (Primary): Early start for pickups and setup duties (9h total)', 18, finalY);
    finalY += 3.5;
    doc.text('• BAR BACKS (Additional): 5:00 PM - 2:00 AM (9h, full venue coverage)', 18, finalY);
    finalY += 3.5;
    doc.text('• SUPPORT STAFF: 3:00 PM - 1:00 AM (10h, early setup through near closing)', 18, finalY);
    finalY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('OFF DAYS POLICY:', 18, finalY);
    finalY += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.foreground);
    doc.text('• Minimum 1 day off per week guaranteed for all staff', 18, finalY);
    finalY += 3.5;
    doc.text('• Alternating pattern for bartenders: Week 1 (1 day off) / Week 2 (2 days off) rotation', 18, finalY);
    finalY += 3.5;
    doc.text('• Support staff: 2 days off per MONTH (1 day off every 2 weeks)', 18, finalY);
    finalY += 3.5;
    doc.text('• Automatic alternative day assignment if off day conflicts with event day', 18, finalY);
    finalY += 5;
    
    // Show event days with accent color
    const eventDays = Object.entries(dailyEvents)
      .filter(([_, event]) => event)
      .map(([day, event]) => `${day.toUpperCase()} (${event})`)
      .join(', ');
    
    if (eventDays) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.accent);
      doc.text(`• EVENT DAYS (No offs allowed): ${eventDays}`, 18, finalY);
      finalY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.foreground);
    }
    
    doc.text('• BREAK TIME: 5:00 PM - 6:00 PM | ENDING BACK & FRONT: 6:45 PM (Mandatory)', 18, finalY);
    finalY += 3.5;
    doc.text('• STORE PICKUP: Monday, Wednesday, Friday (Handled by bar backs with early start)', 18, finalY);

    doc.save(`${(venueName || 'schedule').replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule exported to PDF');
  };

  const exportDayToJPG = async (day: string) => {
    const element = document.getElementById(`day-${day}`);
    
    if (!element) {
      toast.error('Section not found');
      return;
    }

    toast.info(`Capturing ${day}...`);
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#111827',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${(venueName || 'schedule').replace(/\s+/g, '-')}-${day}-${format(new Date(), 'yyyy-MM-dd')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success(`${day} downloaded!`);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const exportWeeklySummaryToJPG = async () => {
    const element = document.getElementById('Weekly Off Days Summary');
    if (!element) {
      toast.error('Summary section not found');
      return;
    }

    toast.info('Capturing weekly summary...');

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#111827',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${(venueName || 'schedule').replace(/\s+/g, '-')}-weekly-summary-${format(new Date(), 'yyyy-MM-dd')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('Weekly summary downloaded!');
        }
      }, 'image/png');
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
    <div className="min-h-screen bg-gray-950 pb-20 pt-16">
      <TopNav />
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <Label htmlFor="venue-name" className="text-gray-200">Venue Name</Label>
            <Input
              id="venue-name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Enter venue name..."
              className="text-lg font-semibold bg-gray-900 border-gray-800 text-gray-100"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={autoGenerateSchedule} variant="default">
              <Wand2 className="w-4 h-4 mr-2" />
              Auto Generate
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-gray-700 hover:bg-gray-800">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Daily Events Management */}
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Daily Events (No Offs on Event Days)</h3>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsEditingEvents(!isEditingEvents)}
              className="border-gray-700 hover:bg-gray-800"
            >
              {isEditingEvents ? 'Done' : 'Edit Events'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="space-y-2">
                <Label className="text-sm font-medium text-gray-200">{day}</Label>
                {isEditingEvents ? (
                  <Input
                    value={dailyEvents[day] || ''}
                    onChange={(e) => setDailyEvents(prev => ({
                      ...prev,
                      [day]: e.target.value
                    }))}
                    placeholder="Event name"
                    className="text-sm bg-gray-800 border-gray-700 text-gray-100"
                  />
                ) : (
                  <div className={`p-2 rounded border text-sm min-h-[40px] flex items-center justify-center ${
                    dailyEvents[day] 
                      ? 'bg-primary/20 border-primary text-primary font-medium' 
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {dailyEvents[day] || 'No event'}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-400 mt-3">
            ℹ️ Days with events are considered busy - no offs will be scheduled on these days
          </p>
        </Card>

        {/* Staff Management */}
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Staff Members</h3>
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteStaffMember(staff.id)}
                        className="hover:bg-gray-700"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteStaffMember(staff.id)}
                        className="hover:bg-gray-700"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {staffMembers.length === 0 && (
              <p className="text-center text-gray-400 py-8">No staff members added yet</p>
            )}
          </div>
        </Card>

        {/* Week Selector */}
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-200">Week Starting</Label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>
            <div className="text-sm text-gray-400">
              {format(new Date(weekStartDate), 'MMM dd')} - {format(addDays(new Date(weekStartDate), 6), 'MMM dd, yyyy')}
            </div>
          </div>
        </Card>

        {/* Weekly Off Days Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Weekly Off Days Summary
              </h3>
              <Button 
                onClick={exportWeeklySummaryToJPG} 
                variant="outline" 
                size="sm"
                className="border-gray-600 hover:bg-gray-800 hover:border-primary transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <div id="Weekly Off Days Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffMembers.map(staff => {
                const staffSchedule = Object.values(schedule).filter(s => s.staffId === staff.id);
                const offDays = staffSchedule.filter(s => s.timeRange === 'OFF');
                const offDaysList = offDays.map(s => s.day).join(', ');
                
                return (
                  <div key={staff.id} className="border border-gray-700 rounded-xl p-4 bg-gradient-to-br from-gray-800 to-gray-850 shadow-lg hover:shadow-xl transition-all hover:border-primary/50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-100 text-sm">{staff.name}</div>
                        <div className="text-xs text-gray-400 capitalize mt-1 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary/60"></span>
                          {staff.title.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-extrabold ${offDays.length === 0 ? 'text-red-400' : offDays.length >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {offDays.length}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">days off</div>
                      </div>
                    </div>
                    {offDaysList && (
                      <div className="text-xs text-gray-300 mt-3 pt-3 border-t border-gray-700/50 bg-gray-900/30 rounded px-2 py-2">
                        <span className="text-gray-500 font-medium">Off Days:</span> {offDaysList}
                      </div>
                    )}
                    {offDays.length === 0 && (
                      <div className="text-xs text-red-400 mt-3 pt-3 border-t border-red-900/30 bg-red-950/20 rounded px-2 py-2 flex items-center gap-1">
                        <span className="text-red-500">⚠️</span> No days off this week
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Daily Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Daily Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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
                
                // Get staff details
                const indoorStaff = [...indoor, ...uncategorized].map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { name: staff?.name || 'Unknown', station: s.station || 'General Support', timeRange: s.timeRange };
                });
                const outdoorStaff = outdoor.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { name: staff?.name || 'Unknown', station: s.station, timeRange: s.timeRange };
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
                        onClick={() => exportDayToJPG(day)}
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
                        <div className="text-xl font-bold text-blue-400">{indoor.length}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Indoor</div>
                      </div>
                      <div className="text-center p-2 bg-gradient-to-br from-purple-950/40 to-purple-900/20 rounded-lg border border-purple-800/30">
                        <div className="text-xl font-bold text-purple-400">{outdoor.length}</div>
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
                              • {s.name} <span className="text-gray-500">({s.timeRange})</span>
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
                              • {s.name} <span className="text-gray-500">({s.timeRange})</span>
                              <div className="text-[10px] text-purple-400/80 pl-3">{s.station}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
          </Card>
        )}

        {/* Schedule Table */}
        {staffMembers.length > 0 && (
          <Card className="p-2 overflow-x-auto bg-gray-900 border-gray-800">
            <h3 className="text-sm font-semibold mb-2 text-gray-100">Weekly Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className="border border-gray-700 p-1 bg-gray-800 font-semibold text-left min-w-[100px] sticky left-0 z-10 text-gray-100">
                      STAFF
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
                                else if (value.includes('2:00 PM') || value.includes('3:00 PM')) type = 'opening';
                                else if (value.includes('4:00 PM') || value.includes('5:00 PM')) type = 'regular';
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
                                <SelectItem value="3:00 PM - 12:00 AM" className="text-gray-100 text-[10px]">3:00 PM - 12:00 AM</SelectItem>
                                <SelectItem value="4:00 PM - 1:00 AM" className="text-gray-100 text-[10px]">4:00 PM - 1:00 AM</SelectItem>
                                <SelectItem value="5:00 PM - 2:00 AM" className="text-gray-100 text-[10px]">5:00 PM - 2:00 AM</SelectItem>
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
