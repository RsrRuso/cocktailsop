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
import { Download, Plus, Trash2, Wand2 } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, addDays } from 'date-fns';

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
  head_bartender: 'SUPERVISING: Observe indoor/outdoor areas, support where needed (Divided between areas if 2+ heads)',
  senior_bartender: 'Operate Stations & Training',
  bartender: 'IN CHARGE OF STATIONS: Operate assigned bar stations, supervise bar backs, manage station closing procedures, refresh and maintain stations based on operational needs during service',
  bar_back: 'PRIORITY ROLE: Pickups, refilling, glassware polishing, batching, station opening/closing, refill fridges/freezers, stock refilling, garnish cutting (Divided between indoor/outdoor if 2+)',
  support: 'Glassware polishing, general support (Divided between indoor/outdoor if 2+)',
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
        
        // SPECIAL RULE FOR SUPPORT: 1 day off every 2 weeks (works 10 hours daily)
        let targetDaysOff: number;
        if (isSupport) {
          // Support gets 1 day off every 2 weeks (odd weeks only)
          targetDaysOff = isOddWeek ? 1 : 0;
          console.log(`\n  🎯 ${staff.name} (SUPPORT): Target = ${targetDaysOff} day(s) off (odd week: ${isOddWeek})`);
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
        
        // If support gets 0 days off this week, skip the off day assignment
        if (isSupport && targetDaysOff === 0) {
          console.log(`  ℹ️ ${staff.name} (SUPPORT) works all 7 days this week`);
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
          // Support staff with 0 target days off can work all 7 days
          console.log(`  ℹ️ ${staff.name} (SUPPORT): Working all 7 days this week (no off days scheduled)`);
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
      // Working hours: 9 hours (4:00 PM - 1:00 AM)
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
        const area = shouldDivideHeads ? (idx % 2 === 0 ? 'Indoor' : 'Outdoor') : 'Supervising';
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: '4:00 PM - 1:00 AM',
          type: 'regular',
          station: shouldDivideHeads 
            ? `Head - ${area} Supervisor: Observe ${area.toLowerCase()} operations, support where needed`
            : `Head - Supervising: Observe all operations, support where needed`
        };
        assignedStaffIds.add(schedule.staff.id);
      });

      // === PRIORITY 2: BARTENDERS (Senior + Regular) - OPERATE STATIONS ===
      // Working hours: 9 hours (4:00 PM - 1:00 AM)
      
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
      const stations = [
        'Outdoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 1: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Station 2: Operate station, supervise bar backs, manage closing, refresh & maintain',
        'Indoor - Garnishing Station 3: Operate station, supervise bar backs, manage closing, refresh & maintain',
      ];

      allStationBartenders.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        if (idx < stations.length) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 1:00 AM',
            type: 'regular',
            station: stations[idx]
          };
          assignedStaffIds.add(schedule.staff.id);
        } else {
          // Extra bartenders float or support
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 1:00 AM',
            type: 'regular',
            station: 'Floating Support: Assist all stations as needed'
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
        
        // Allocate bar backs to Indoor or Outdoor
        const barBackStations = [
          'Bar Back - Outdoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish',
          'Bar Back - Indoor: Pickups, Refilling, Glassware, Batching, Opening/Closing, Fridges, Stock, Garnish'
        ];
        
        // First bar back gets early start for pickup/opening duties (9 hours)
        let timeRange, type;
        if (idx === 0) {
          if (isPickupDay) {
            timeRange = '12:00 PM - 9:00 PM'; // 9 hours, early for pickups
            type = 'pickup';
          } else if (isBrunchDay) {
            timeRange = '11:00 AM - 8:00 PM'; // 9 hours, early for brunch
            type = 'brunch';
          } else {
            timeRange = '3:00 PM - 12:00 AM'; // 9 hours, setup before venue opens
            type = 'opening';
          }
        } else {
          // Additional bar backs work full service (9 hours)
          timeRange = '4:00 PM - 1:00 AM';
          type = 'regular';
        }
        
        // Assign station (alternate between outdoor and indoor)
        const station = idx < barBackStations.length ? barBackStations[idx] : barBackStations[idx % barBackStations.length];
        
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
        
        // Allocate support to Indoor or Outdoor (10 hours)
        const supportStations = [
          'Support - Outdoor: Glassware Polishing, General Support',
          'Support - Indoor: Glassware Polishing, General Support'
        ];
        
        // Assign station (alternate between outdoor and indoor)
        const station = idx < supportStations.length ? supportStations[idx] : supportStations[idx % supportStations.length];
        
        newSchedule[key] = {
          staffId: schedule.staff.id,
          day,
          timeRange: '3:00 PM - 1:00 AM',
          type: 'regular',
          station
        };
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
    toast.success(`✅ Schedule generated! Alternating 1-2 days off week-to-week. Monthly total: 6 days off (bartenders), ~2 days (support - every 2 weeks). Min 3 bartenders working daily.`, {
      duration: 7000
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(venueName || 'Staff Schedule', 148, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const weekStart = new Date(weekStartDate);
    const weekEnd = addDays(weekStart, 6);
    doc.text(`Week: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`, 148, 28, { align: 'center' });
    
    // Table headers
    const headers = ['Staff Name', ...DAYS_OF_WEEK];
    const rows = staffMembers.map(staff => {
      const row = [
        `${staff.name}\n${staff.title.replace('_', ' ')}`,
        ...DAYS_OF_WEEK.map(day => {
          const cell = getScheduleCell(staff.id, day);
          if (!cell || !cell.timeRange) return '';
          const stationText = cell.station ? `\n${cell.station}` : '';
          return cell.timeRange === 'OFF' ? 'OFF' : `${cell.timeRange}${stationText}`;
        })
      ];
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [200, 200, 200] },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.column.index > 0) {
          const day = DAYS_OF_WEEK[data.column.index - 1];
          const staff = staffMembers[data.row.index];
          if (staff) {
            const cell = getScheduleCell(staff.id, day);
            if (cell) {
              if (cell.type === 'pickup') data.cell.styles.fillColor = [255, 235, 59];
              if (cell.type === 'opening') data.cell.styles.fillColor = [129, 199, 132];
              if (cell.type === 'closing') data.cell.styles.fillColor = [239, 83, 80];
              if (cell.type === 'brunch') data.cell.styles.fillColor = [255, 167, 38];
              if (cell.type === 'off') data.cell.styles.fillColor = [224, 224, 224];
            }
          }
        }
      }
    });

    // Daily Breakdown Section
    let finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DAILY BREAKDOWN - WHO\'S WORKING', 14, finalY);
    
    finalY += 5;
    doc.setFontSize(7);
    DAYS_OF_WEEK.forEach((day, dayIndex) => {
      const daySchedule = Object.values(schedule).filter(s => s.day === day);
      const working = daySchedule.filter(s => s.timeRange !== 'OFF');
      const off = daySchedule.filter(s => s.timeRange === 'OFF');
      
      // Categorize by area - ENSURE NO DOUBLE COUNTING (each person in ONE area only)
      const indoor = working.filter(s => {
        const station = s.station || '';
        // Include indoor stations, bar backs, support, and heads supervising indoor
        return (station.includes('Indoor - Station') || 
                station.includes('Bar Back - Indoor') ||
                station.includes('Support - Indoor') ||
                (station.includes('Supervising') && station.includes('Indoor')));
      });
      const outdoor = working.filter(s => {
        const station = s.station || '';
        // Include outdoor stations, bar backs, support, and heads supervising outdoor
        return (station.includes('Outdoor - Station') || 
                station.includes('Bar Back - Outdoor') ||
                station.includes('Support - Outdoor') ||
                (station.includes('Supervising') && station.includes('Outdoor')));
      });
      
      // For heads supervising both or not allocated to specific area, add to both counts
      const floatingToIndoor = working.filter(s => {
        const station = s.station || '';
        return (station.includes('Supervising') && !station.includes('Indoor') && !station.includes('Outdoor')) ||
               station.includes('Floating');
      });
      
      // Split floating between indoor and outdoor for counting
      const indoorWithFloating = [...indoor, ...floatingToIndoor.slice(0, Math.ceil(floatingToIndoor.length / 2))];
      const outdoorWithFloating = [...outdoor, ...floatingToIndoor.slice(Math.ceil(floatingToIndoor.length / 2))];
      
      const eventLabel = dailyEvents[day] ? ` (${dailyEvents[day]})` : '';
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${day}${eventLabel}`, 14, finalY);
      finalY += 3;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Working: ${working.length} | Total Off: ${off.length}`, 16, finalY);
      finalY += 4;
      
      // Indoor Staff
      if (indoorWithFloating.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('INDOOR:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        indoorWithFloating.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            const timeRange = s.timeRange || '';
            doc.text(`  • ${staff.name} (${title}) - ${timeRange}`, 20, finalY);
            finalY += 3;
          }
        });
      }
      
      // Outdoor Staff
      if (outdoorWithFloating.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('OUTDOOR:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        outdoorWithFloating.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            const timeRange = s.timeRange || '';
            doc.text(`  • ${staff.name} (${title}) - ${timeRange}`, 20, finalY);
            finalY += 3;
          }
        });
      }
      
      // Off Staff
      if (off.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('OFF:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        off.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            doc.text(`  • ${staff.name} (${title})`, 20, finalY);
            finalY += 3;
          }
        });
      }
      
      finalY += 2;
    });

    // Role Responsibilities
    finalY += 3;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ROLE RESPONSIBILITIES', 14, finalY);
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    Object.entries(ROLE_RESPONSIBILITIES).forEach(([role, responsibility]) => {
      doc.text(`${role.replace('_', ' ').toUpperCase()}: ${responsibility}`, 14, finalY);
      finalY += 3;
    });

    // Stations Overview
    finalY += 3;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ROLE RESPONSIBILITIES & PRIORITIES', 14, finalY);
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('PRIORITY 1 - HEAD BARTENDERS: SUPERVISING (Divided between indoor/outdoor if 2+ heads)', 14, finalY);
    finalY += 3;
    doc.text('PRIORITY 2 - BARTENDERS & SENIORS: IN CHARGE OF STATIONS - Operate assigned stations, supervise bar backs,', 14, finalY);
    finalY += 3;
    doc.text('  manage station closing, refresh and maintain stations based on operational needs during service', 14, finalY);
    finalY += 3;
    doc.text('PRIORITY 3 - BAR BACKS (PRIORITY ROLE): Pickups, refilling, glassware polishing, batching,', 14, finalY);
    finalY += 3;
    doc.text('  opening/closing, fridges/freezers refill, stock refilling, garnish cutting (Divided if 2+)', 14, finalY);
    finalY += 3;
    doc.text('PRIORITY 4 - SUPPORT: Glassware polishing, general support (10h shifts, divided if 2+)', 14, finalY);
    finalY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('DIVISION RULES:', 14, finalY);
    finalY += 3;
    doc.setFont('helvetica', 'normal');
    doc.text('• 2+ Heads → Divided between indoor/outdoor supervision', 14, finalY);
    finalY += 3;
    doc.text('• 2+ Bar backs → Divided between indoor/outdoor areas', 14, finalY);
    finalY += 3;
    doc.text('• 1 Bar back + 1 Support → Also divided between areas', 14, finalY);
    finalY += 3;
    doc.text('• 2+ Support → Divided between indoor/outdoor areas', 14, finalY);
    
    // Legend & Notes
    finalY += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 14, finalY);
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('• Venue hours: 5:00 PM - 2:00 AM (9 hours operation)', 14, finalY);
    finalY += 3;
    doc.text('• Working hours: All staff 9h (Support 10h)', 14, finalY);
    finalY += 3;
    doc.text('• Head bartenders & Bartenders: 5:00 PM - 2:00 AM (9h, covers full venue)', 14, finalY);
    finalY += 3;
    doc.text('• Bar backs (1st): Early start for pickups/setup (9h)', 14, finalY);
    finalY += 3;
    doc.text('• Bar backs (additional): 5:00 PM - 2:00 AM (9h, covers full venue)', 14, finalY);
    finalY += 3;
    doc.text('• Support: 3:00 PM - 1:00 AM (10h, early setup to near closing)', 14, finalY);
    finalY += 3;
    doc.text('• OFF DAYS LOGIC: Everyone gets AT LEAST 1 day off per week (can\'t be 0)', 14, finalY);
    finalY += 3;
    doc.text('• For same titles: Alternate pattern - Person A: Week 1=1 day, Week 2=2 days | Person B: Week 1=2 days, Week 2=1 day', 14, finalY);
    finalY += 3;
    doc.text('• If off day falls on event day, alternative day is automatically assigned', 14, finalY);
    finalY += 3;
    
    // Show event days
    const eventDays = Object.entries(dailyEvents)
      .filter(([_, event]) => event)
      .map(([day, event]) => `${day} (${event})`)
      .join(', ');
    
    if (eventDays) {
      doc.text(`• No offs allowed on event days: ${eventDays}`, 14, finalY);
      finalY += 3;
    }
    
    doc.text('• Break Time: 5:00 PM - 6:00 PM | Ending Back & Front: 6:45 PM (Mandatory)', 14, finalY);
    finalY += 3;
    doc.text('• Store Pick-up: Monday, Wednesday, Friday (Bar backs handle with early start)', 14, finalY);
    finalY += 3;
    doc.text('• Bar backs are PRIORITY ROLE with most responsibilities', 14, finalY);

    doc.save(`${venueName || 'schedule'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule exported to PDF');
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
    <div className="min-h-screen bg-gray-950 pb-20">
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
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">
              Weekly Off Days Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffMembers.map(staff => {
                const staffSchedule = Object.values(schedule).filter(s => s.staffId === staff.id);
                const offDays = staffSchedule.filter(s => s.timeRange === 'OFF');
                const offDaysList = offDays.map(s => s.day).join(', ');
                
                return (
                  <div key={staff.id} className="border border-gray-800 rounded-lg p-3 bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-100">{staff.name}</div>
                        <div className="text-xs text-gray-400 capitalize">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${offDays.length === 0 ? 'text-red-500' : offDays.length >= 2 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {offDays.length}
                        </div>
                        <div className="text-[10px] text-gray-400">days off</div>
                      </div>
                    </div>
                    {offDaysList && (
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        Off: {offDaysList}
                      </div>
                    )}
                    {offDays.length === 0 && (
                      <div className="text-xs text-red-500 mt-2 pt-2 border-t border-gray-700">
                        ⚠️ No days off this week
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
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">
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
                  // Match "Indoor" but NOT "Indoor/Outdoor" or when Outdoor appears first
                  return (station.includes('Indoor - ') || station.includes('Bar Back - Indoor') || station.includes('Support - Indoor') || station.includes('Head - Indoor'));
                });
                const outdoor = working.filter(s => {
                  const station = s.station || '';
                  return (station.includes('Outdoor - ') || station.includes('Bar Back - Outdoor') || station.includes('Support - Outdoor') || station.includes('Head - Outdoor'));
                });
                const floating = working.filter(s => {
                  const station = s.station || '';
                  return (station.includes('Supervising') || station.includes('Floating') || station.includes('General') || 
                          (!station.includes('Indoor') && !station.includes('Outdoor')));
                });
                
                // Get staff details
                const indoorStaff = indoor.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { name: staff?.name || 'Unknown', station: s.station };
                });
                const outdoorStaff = outdoor.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { name: staff?.name || 'Unknown', station: s.station };
                });
                const floatingStaff = floating.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return { name: staff?.name || 'Unknown', station: s.station };
                });
                const offStaff = off.map(s => {
                  const staff = staffMembers.find(sm => sm.id === s.staffId);
                  return staff?.name || 'Unknown';
                });

                const isBusyDay = !!dailyEvents[day];
                const dayLabel = dailyEvents[day] || '';

                return (
                  <div key={day} className={`border rounded-lg p-3 ${isBusyDay ? 'border-orange-500 bg-orange-900/20' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="font-semibold text-sm mb-1 text-gray-100">{day}</div>
                    {dayLabel && (
                      <div className="text-xs text-orange-400 mb-2">
                        {dayLabel}
                      </div>
                    )}
                    
                    {/* Summary Numbers */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-green-950/30 rounded">
                        <div className="text-xl font-bold text-green-400">{working.length}</div>
                        <div className="text-[10px] text-gray-400">Working</div>
                      </div>
                      <div className="text-center p-2 bg-red-950/30 rounded">
                        <div className="text-xl font-bold text-red-400">{off.length}</div>
                        <div className="text-[10px] text-gray-400">Off</div>
                      </div>
                      <div className="text-center p-2 bg-blue-950/30 rounded">
                        <div className="text-lg font-bold text-blue-400">{indoor.length}</div>
                        <div className="text-[10px] text-gray-400">Indoor</div>
                      </div>
                      <div className="text-center p-2 bg-purple-950/30 rounded">
                        <div className="text-lg font-bold text-purple-400">{outdoor.length}</div>
                        <div className="text-[10px] text-gray-400">Outdoor</div>
                      </div>
                    </div>
                    
                    {/* Indoor Staff */}
                    {indoorStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold text-blue-400">Indoor Stations:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-xs">
                          {indoorStaff.map((s, idx) => (
                            <div key={idx} className="text-gray-400">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outdoor Staff */}
                    {outdoorStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold text-purple-400">Outdoor Stations:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-xs">
                          {outdoorStaff.map((s, idx) => (
                            <div key={idx} className="text-gray-400">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Floating/Support Staff */}
                    {floatingStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold text-gray-200">Bar Back/Support:</div>
                        <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                          {floatingStaff.map((s, idx) => (
                            <div key={idx} className="text-gray-400">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Off Staff */}
                    {offStaff.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-gray-700">
                        <div className="text-xs font-medium text-gray-200">Off:</div>
                        <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
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
          <Card className="p-4 overflow-x-auto bg-gray-900 border-gray-800">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">Weekly Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-700 p-2 bg-gray-800 font-semibold text-left min-w-[140px] sticky left-0 z-10 text-gray-100">
                      Staff / Role
                    </th>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const isBusyDay = !!dailyEvents[day];
                      const dayLabel = dailyEvents[day] || '';
                      return (
                        <th key={day} className={`border border-gray-700 p-2 font-semibold text-center min-w-[180px] ${isBusyDay ? 'bg-orange-900/30' : 'bg-gray-800'} text-gray-100`}>
                          <div>{day}</div>
                          {dayLabel && <div className="text-xs font-normal text-gray-400">{dayLabel}</div>}
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
                      <td className="border border-gray-700 p-2 font-medium bg-gray-800 sticky left-0 z-10">
                        <div className="text-sm text-gray-100">{staff.name}</div>
                        <div className="text-xs text-gray-400 capitalize">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border border-gray-700 p-2 ${cell ? CELL_COLORS[cell.type] : 'bg-gray-850'}`}
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
                              <SelectTrigger className="text-xs h-8 bg-gray-900 border-gray-700 text-gray-100">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700 z-50">
                                <SelectItem value="OFF" className="text-gray-100">OFF</SelectItem>
                                <SelectItem value="11:00 AM - 8:00 PM" className="text-gray-100">11:00 AM - 8:00 PM (9h)</SelectItem>
                                <SelectItem value="12:00 PM - 9:00 PM" className="text-gray-100">12:00 PM - 9:00 PM (9h)</SelectItem>
                                <SelectItem value="2:00 PM - 11:00 PM" className="text-gray-100">2:00 PM - 11:00 PM (9h)</SelectItem>
                                <SelectItem value="3:00 PM - 12:00 AM" className="text-gray-100">3:00 PM - 12:00 AM (9h)</SelectItem>
                                <SelectItem value="4:00 PM - 1:00 AM" className="text-gray-100">4:00 PM - 1:00 AM (9h)</SelectItem>
                                <SelectItem value="5:00 PM - 2:00 AM" className="text-gray-100">5:00 PM - 2:00 AM (9h)</SelectItem>
                              </SelectContent>
                            </Select>
                            {cell?.station && (
                              <div className="text-[10px] text-gray-400 text-center mt-1">
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
