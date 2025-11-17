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
  head_bartender: 'Operate Stations & Segregation Support',
  senior_bartender: 'Operate Stations & Training',
  bartender: 'Operate Stations',
  bar_back: 'Assist Only: Refill fridges, batches, premixes, pickups, glassware (NOT assigned to stations)',
  support: 'Floating Help: General assistance (NOT assigned to stations)',
};

export default function StaffScheduling() {
  const { user } = useAuth();
  const [venueName, setVenueName] = useState('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ScheduleCell>>({});
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  
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

  const autoGenerateSchedule = () => {
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

    if (headBartenders.length === 0 && seniorBartenders.length === 0 && bartenders.length === 0) {
      toast.error('Please add at least some bartenders');
      return;
    }

    // Recommend sufficient staff for weekday outdoor coverage
    const totalBartenders = headBartenders.length + seniorBartenders.length + bartenders.length;
    if (totalBartenders < 5) {
      toast.warning('⚠️ Recommendation: Add more bartenders for optimal coverage (Need 5+ bartenders who can operate stations)', {
        duration: 5000
      });
    }
    if (support.length < 1) {
      toast.warning('⚠️ Recommendation: Add at least 1 support staff for outdoor assistance (Support assists but does not operate stations)', {
        duration: 5000
      });
    }

    // BUSY DAYS - No offs allowed: Tuesday (Ladies Night), Friday (Weekend), Saturday (Brunch/Weekend)
    const busyDays = [1, 4, 5]; // Tuesday=1, Friday=4, Saturday=5

    // Within the same week, alternate who gets 1 day off vs 2 days off
    // Offs distributed on less busy days: Monday, Wednesday, Thursday, Sunday
    const divideIntoGroups = (staffList: StaffMember[]) => {
      // Rotate through different day-off combinations for better distribution
      const dayOffPatterns = [
        [2],      // Wednesday - 1 day off
        [0, 3],   // Monday + Thursday - 2 days off  
        [6],      // Sunday - 1 day off
        [2, 6],   // Wednesday + Sunday - 2 days off
      ];
      
      return staffList.map((staff, index) => ({
        staff,
        daysOff: dayOffPatterns[index % dayOffPatterns.length],
        groupType: dayOffPatterns[index % dayOffPatterns.length].length === 1 ? '1-day' : '2-day'
      }));
    };

    const headSchedules = divideIntoGroups(headBartenders);
    const seniorBartenderSchedules = divideIntoGroups(seniorBartenders);
    const bartenderSchedules = divideIntoGroups(bartenders);
    const barBackSchedules = divideIntoGroups(barBacks);
    const supportSchedules = divideIntoGroups(support);

    // Generate schedule for entire week
    DAYS_OF_WEEK.forEach((day, dayIndex) => {
      const isWeekday = dayIndex < 5; // Mon-Fri (0=Mon, 4=Fri)
      const isPickupDay = day === 'Monday' || day === 'Wednesday' || day === 'Friday';
      const isTuesday = dayIndex === 1; // Ladies Night
      const isFriday = dayIndex === 4; // Weekend
      const isSaturday = dayIndex === 5; // Brunch + Weekend
      const isBusyDay = busyDays.includes(dayIndex);

      // === INDOOR BAR: Head Bartender - Ticket Segregator ===
      let indoorHeadAssigned = false;
      headSchedules.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        // No offs on busy days
        const shouldBeOff = schedule.daysOff.includes(dayIndex) && !isBusyDay;
        
        if (shouldBeOff) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else if (!indoorHeadAssigned) {
          // First available head bartender covers indoor
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 3:00 AM',
            type: 'regular',
            station: 'Indoor - Ticket Segregator'
          };
          indoorHeadAssigned = true;
        } else if (isWeekday) {
          // Second head covers outdoor station 1 on weekdays
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 1:00 AM',
            type: 'regular',
            station: 'Outdoor - Station 1'
          };
        } else {
          // Weekend outdoor station 1 or backup
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 2:00 AM',
            type: 'regular',
            station: 'Outdoor - Station 1'
          };
        }
      });

      // === SENIOR BARTENDERS - Stations 1, 2, 3 (Priority) ===
      const stations = ['Indoor - Station 1', 'Indoor - Station 2', 'Indoor - Garnishing Station 3'];
      let stationIndex = 0;
      let outdoorBartenderAssigned = false;

      // Schedule senior bartenders first with priority
      seniorBartenderSchedules.forEach((schedule) => {
        const key = `${schedule.staff.id}-${day}`;
        const shouldBeOff = schedule.daysOff.includes(dayIndex) && !isBusyDay;

        if (shouldBeOff) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else if (stationIndex < 3) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 3:00 AM',
            type: 'regular',
            station: stations[stationIndex]
          };
          stationIndex++;
        } else if (!outdoorBartenderAssigned) {
          // Outdoor station 2 - PRIORITY on weekdays to ensure coverage
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: isWeekday ? '4:00 PM - 1:00 AM' : '5:00 PM - 2:00 AM',
            type: 'regular',
            station: 'Outdoor - Station 2'
          };
          outdoorBartenderAssigned = true;
        } else {
          // Extra support on busy days, OFF on quiet days
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: isBusyDay ? '5:00 PM - 3:00 AM' : 'OFF',
            type: isBusyDay ? 'regular' : 'off',
            station: isBusyDay ? 'Extra Support' : undefined
          };
        }
      });

      // === BARTENDERS - Remaining Stations and Outdoor ===
      bartenderSchedules.forEach((schedule) => {
        const key = `${schedule.staff.id}-${day}`;
        const shouldBeOff = schedule.daysOff.includes(dayIndex) && !isBusyDay;

        if (shouldBeOff) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else if (stationIndex < 3) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 3:00 AM',
            type: 'regular',
            station: stations[stationIndex]
          };
          stationIndex++;
        } else if (!outdoorBartenderAssigned) {
          // Outdoor station 2 - PRIORITY on weekdays to ensure coverage
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: isWeekday ? '4:00 PM - 1:00 AM' : '5:00 PM - 2:00 AM',
            type: 'regular',
            station: 'Outdoor - Station 2'
          };
          outdoorBartenderAssigned = true;
        } else {
          // Extra support on busy days, OFF on quiet days
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: isBusyDay ? '5:00 PM - 3:00 AM' : 'OFF',
            type: isBusyDay ? 'regular' : 'off',
            station: isBusyDay ? 'Extra Support' : undefined
          };
        }
      });

      // === BAR BACKS - Refill, Batches, Premixes (NOT assigned to Indoor/Outdoor stations) ===
      barBackSchedules.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;

        // No offs on busy days
        const shouldBeOff = schedule.daysOff.includes(dayIndex) && !isBusyDay;

        if (shouldBeOff) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else if (idx === 0) {
          // Primary bar back - Refill/Batches (NO station assignment)
          const timeRange = isPickupDay ? 'PICKUP 12:00 PM - 3:00 AM' : isSaturday ? 'BRUNCH 11:00 AM - 3:00 AM' : '2:00 PM - 3:00 AM';
          const type = isPickupDay ? 'pickup' : isSaturday ? 'brunch' : 'opening';
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type,
            station: 'Bar Back: Refill Fridges, Batches, Premixes, Glassware'
          };
        } else {
          // Additional bar back - General support (NO station assignment)
          const timeRange = isSaturday ? 'BRUNCH 11:00 AM - 2:00 AM' : '4:00 PM - 2:00 AM';
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type: isSaturday ? 'brunch' : 'regular',
            station: 'Bar Back: General Refill & Setup Support'
          };
        }
      });

      // === SUPPORT - Floating Help (NOT assigned to Indoor/Outdoor stations) ===
      supportSchedules.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;

        // No offs on busy days
        const shouldBeOff = schedule.daysOff.includes(dayIndex) && !isBusyDay;

        if (shouldBeOff) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else {
          // Support staff - Floating help (NO station assignment)
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '3:00 PM - 1:00 AM',
            type: 'regular',
            station: 'Support: Floating Help (No Station Assignment)'
          };
        }
      });
    });

    // CRITICAL VALIDATION: Monday, Wednesday, Thursday, Sunday MUST have at least one bartender/senior/head
    const criticalDays = [
      { name: 'Monday', index: 0 },
      { name: 'Wednesday', index: 2 },
      { name: 'Thursday', index: 3 },
      { name: 'Sunday', index: 6 }
    ];

    const missingCoverageDays: string[] = [];

    criticalDays.forEach(({ name, index }) => {
      const allOperators = [...headBartenders, ...seniorBartenders, ...bartenders];
      
      // Check if at least one operator (bartender/senior/head) is NOT off on this day
      const hasOperatorWorking = allOperators.some(staff => {
        const key = `${staff.id}-${name}`;
        const cell = newSchedule[key];
        return cell && cell.timeRange !== 'OFF';
      });

      if (!hasOperatorWorking) {
        missingCoverageDays.push(name);
      }
    });

    if (missingCoverageDays.length > 0) {
      toast.error(`❌ Cannot generate schedule: ${missingCoverageDays.join(', ')} must have at least one bartender (or senior/head) scheduled. Add more bartenders or adjust days off.`, {
        duration: 7000
      });
      return;
    }

    setSchedule(newSchedule);
    toast.success('✅ Schedule generated! Mon/Wed/Thu/Sun have minimum bartender coverage. Only bartenders at stations.');
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
      
      // Categorize by area
      const indoor = working.filter(s => s.station?.includes('Indoor') || s.station?.includes('Ticket') || s.station?.includes('Segregator'));
      const outdoor = working.filter(s => s.station?.includes('Outdoor'));
      const floating = working.filter(s => !s.station?.includes('Indoor') && !s.station?.includes('Outdoor') && !s.station?.includes('Ticket') && !s.station?.includes('Segregator'));
      
      const isBusyDay = dayIndex === 1 || dayIndex === 4 || dayIndex === 5;
      const busyLabel = isBusyDay ? (dayIndex === 1 ? ' (Ladies Night)' : dayIndex === 4 ? ' (Weekend)' : ' (Brunch/Weekend)') : '';
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${day}${busyLabel}`, 14, finalY);
      finalY += 3;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Working: ${working.length} | Total Off: ${off.length} | Indoor: ${indoor.length} | Outdoor: ${outdoor.length}`, 16, finalY);
      finalY += 4;
      
      // Indoor Staff
      if (indoor.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('INDOOR:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        indoor.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            doc.text(`  • ${staff.name} (${title}) - ${s.station}`, 20, finalY);
            finalY += 3;
          }
        });
      }
      
      // Outdoor Staff
      if (outdoor.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('OUTDOOR:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        outdoor.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            doc.text(`  • ${staff.name} (${title}) - ${s.station}`, 20, finalY);
            finalY += 3;
          }
        });
      }
      
      // Floating/Support Staff
      if (floating.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('SUPPORT/FLOATING:', 18, finalY);
        finalY += 3;
        doc.setFont('helvetica', 'normal');
        floating.forEach(s => {
          const staff = staffMembers.find(sm => sm.id === s.staffId);
          if (staff) {
            const title = staff.title.replace('_', ' ');
            const stationText = s.station ? ` - ${s.station}` : '';
            doc.text(`  • ${staff.name} (${title})${stationText}`, 20, finalY);
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
    doc.text('STATION OVERVIEW & RULES', 14, finalY);
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('INDOOR STATIONS (Operated by Bartenders ONLY): Ticket Segregator, Station 1, Station 2, Garnishing Station 3', 14, finalY);
    finalY += 3;
    doc.text('OUTDOOR STATIONS (Operated by Bartenders ONLY): Station 1, Station 2', 14, finalY);
    finalY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('CRITICAL RULE: Bar Backs & Support are NOT assigned to Indoor/Outdoor stations', 14, finalY);
    finalY += 3;
    doc.setFont('helvetica', 'normal');
    doc.text('• Bar Backs: Refill fridges, batches, premixes, glassware only (No station operation)', 14, finalY);
    finalY += 3;
    doc.text('• Support: Floating help and assistance only (No station assignment)', 14, finalY);
    
    // Legend & Notes
    finalY += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 14, finalY);
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('• Stations require: Head Bartender OR Senior Bartender OR Bartender', 14, finalY);
    finalY += 3;
    doc.text('• No offs allowed on busy days: Tuesday (Ladies Night), Friday (Weekend), Saturday (Brunch)', 14, finalY);
    finalY += 3;
    doc.text('• Break Time: 5:00 PM - 6:00 PM | Ending Back & Front: 6:45 PM (Mandatory)', 14, finalY);
    finalY += 3;
    doc.text('• Store Pick-up: Monday, Wednesday, Friday', 14, finalY);
    finalY += 3;
    doc.text('• Weekdays: Minimum 1 bartender per outdoor station', 14, finalY);

    doc.save(`${venueName || 'schedule'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule exported to PDF');
  };

  const groupedStaff = staffMembers.reduce((acc, staff) => {
    if (!acc[staff.title]) acc[staff.title] = [];
    acc[staff.title].push(staff);
    return acc;
  }, {} as Record<string, StaffMember[]>);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <Label htmlFor="venue-name">Venue Name</Label>
            <Input
              id="venue-name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Enter venue name..."
              className="text-lg font-semibold"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={autoGenerateSchedule} variant="default">
              <Wand2 className="w-4 h-4 mr-2" />
              Auto Generate
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Staff Management */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Staff Members</h3>
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
            {Object.entries(groupedStaff).map(([title, members]) => (
              <div key={title} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase">
                  {title.replace('_', ' ')} ({members.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {members.map(staff => (
                    <div key={staff.id} className="flex items-center justify-between p-2 border rounded-lg bg-card">
                      <span className="font-medium">{staff.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteStaffMember(staff.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {staffMembers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No staff members added yet</p>
            )}
          </div>
        </Card>

        {/* Week Selector */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Week Starting</Label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(weekStartDate), 'MMM dd')} - {format(addDays(new Date(weekStartDate), 6), 'MMM dd, yyyy')}
            </div>
          </div>
        </Card>

        {/* Daily Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              Daily Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySchedule = Object.values(schedule).filter(s => s.day === day);
                const working = daySchedule.filter(s => s.timeRange !== 'OFF');
                const off = daySchedule.filter(s => s.timeRange === 'OFF');
                
                // Categorize by area
                const indoor = working.filter(s => s.station?.includes('Indoor') || s.station?.includes('Ticket') || s.station?.includes('Segregator'));
                const outdoor = working.filter(s => s.station?.includes('Outdoor'));
                const floating = working.filter(s => !s.station?.includes('Indoor') && !s.station?.includes('Outdoor') && !s.station?.includes('Ticket') && !s.station?.includes('Segregator'));
                
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

                const isBusyDay = dayIndex === 1 || dayIndex === 4 || dayIndex === 5; // Tue/Fri/Sat
                const dayLabel = dayIndex === 1 ? 'Ladies Night' : dayIndex === 4 ? 'Weekend' : dayIndex === 5 ? 'Brunch/Weekend' : '';

                return (
                  <div key={day} className={`border rounded-lg p-3 ${isBusyDay ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/10' : 'bg-card'}`}>
                    <div className="font-semibold text-sm mb-1">{day}</div>
                    {dayLabel && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                        {dayLabel}
                      </div>
                    )}
                    
                    {/* Summary Numbers */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{working.length}</div>
                        <div className="text-[10px] text-muted-foreground">Working</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">{off.length}</div>
                        <div className="text-[10px] text-muted-foreground">Off</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{indoor.length}</div>
                        <div className="text-[10px] text-muted-foreground">Indoor</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{outdoor.length}</div>
                        <div className="text-[10px] text-muted-foreground">Outdoor</div>
                      </div>
                    </div>
                    
                    {/* Indoor Staff */}
                    {indoorStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Indoor Stations:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-xs">
                          {indoorStaff.map((s, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outdoor Staff */}
                    {outdoorStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Outdoor Stations:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-xs">
                          {outdoorStaff.map((s, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Floating/Support Staff */}
                    {floatingStaff.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-semibold">Bar Back/Support:</div>
                        <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                          {floatingStaff.map((s, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              • {s.name} - {s.station}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Off Staff */}
                    {offStaff.length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs font-medium">Off:</div>
                        <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                          {offStaff.map((name, idx) => (
                            <div key={idx} className="text-muted-foreground">
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
          <Card className="p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-muted font-semibold text-left min-w-[140px] sticky left-0 z-10">
                      Staff / Role
                    </th>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const isBusyDay = dayIndex === 1 || dayIndex === 4 || dayIndex === 5;
                      const dayLabel = dayIndex === 1 ? 'Ladies Night' : dayIndex === 4 ? 'Weekend' : dayIndex === 5 ? 'Brunch' : '';
                      return (
                        <th key={day} className={`border border-border p-2 font-semibold text-center min-w-[180px] ${isBusyDay ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-muted'}`}>
                          <div>{day}</div>
                          {dayLabel && <div className="text-xs font-normal text-muted-foreground">{dayLabel}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(staff => (
                    <tr key={staff.id}>
                      <td className="border border-border p-2 font-medium bg-card sticky left-0 z-10">
                        <div className="text-sm">{staff.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border border-border p-2 ${cell ? CELL_COLORS[cell.type] : 'bg-card'}`}
                          >
                            <Input
                              value={cell?.timeRange || ''}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                let type: ScheduleCell['type'] = 'regular';
                                if (value === 'OFF') type = 'off';
                                else if (value.includes('OPENING')) type = 'opening';
                                else if (value.includes('CLOSING')) type = 'closing';
                                else if (value.includes('PICKUP')) type = 'pickup';
                                else if (value.includes('BRUNCH')) type = 'brunch';
                                updateScheduleCell(staff.id, day, value, type, cell?.station);
                              }}
                              placeholder="OFF or Time"
                              className="text-xs h-8 text-center border-0 bg-transparent"
                            />
                            {cell?.station && (
                              <div className="text-[10px] text-muted-foreground text-center mt-1">
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
        <Card className="p-6 bg-gradient-to-br from-secondary/5 to-primary/5">
          <h3 className="text-xl font-bold mb-4">📖 Schedule Legend & Important Notes</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="border-2 rounded-lg p-3 bg-green-500/20 border-green-500/50">
              <div className="font-bold text-sm">🟢 Opening</div>
              <div className="text-xs text-muted-foreground mt-1">Morning shift</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-red-500/20 border-red-500/50">
              <div className="font-bold text-sm">🔴 Closing</div>
              <div className="text-xs text-muted-foreground mt-1">Night shift</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-yellow-500/20 border-yellow-500/50">
              <div className="font-bold text-sm">🟡 Store Pick-up</div>
              <div className="text-xs text-muted-foreground mt-1">Mon/Wed/Fri</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-orange-500/20 border-orange-500/50">
              <div className="font-bold text-sm">🟠 Brunch</div>
              <div className="text-xs text-muted-foreground mt-1">11 AM Saturday</div>
            </div>
            <div className="border-2 rounded-lg p-3 bg-muted border-border">
              <div className="font-bold text-sm">⚪ OFF</div>
              <div className="text-xs text-muted-foreground mt-1">Day off</div>
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
              <div className="p-3 border-2 rounded-lg bg-orange-500/10 border-orange-500/30">
                <strong className="text-sm">🔥 BUSY DAYS (No Offs):</strong>
                <div className="text-sm mt-1">
                  • Tuesday - Ladies Night<br/>
                  • Friday - Weekend Start<br/>
                  • Saturday - Brunch + Weekend
                </div>
              </div>
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
