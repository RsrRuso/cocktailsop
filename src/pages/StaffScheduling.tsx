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
  title: 'head_bartender' | 'bartender' | 'bar_back' | 'support';
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
  head_bartender: 'Segregation & Support',
  bartender: 'Station Service',
  bar_back: 'Refill fridges, batches, premixes, pickups, glassware, stations, opening/closing',
  support: 'Help if on duty',
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
    const bartenders = staffMembers.filter(s => s.title === 'bartender');
    const barBacks = staffMembers.filter(s => s.title === 'bar_back');
    const support = staffMembers.filter(s => s.title === 'support');

    if (headBartenders.length === 0 && bartenders.length === 0) {
      toast.error('Please add at least some bartenders or head bartenders');
      return;
    }

    // BUSY DAYS - No offs allowed: Tuesday (Ladies Night), Friday (Weekend), Saturday (Brunch/Weekend)
    const busyDays = [1, 4, 5]; // Tuesday=1, Friday=4, Saturday=5

    // Within the same week, alternate who gets 1 day off vs 2 days off
    // Offs can only be on: Monday, Wednesday, Thursday, Sunday
    const divideIntoGroups = (staffList: StaffMember[]) => {
      const group1DaysOff = [3]; // Thursday - 1 day off
      const group2DaysOff = [0, 6]; // Monday + Sunday - 2 days off
      
      return staffList.map((staff, index) => ({
        staff,
        daysOff: index % 2 === 0 ? group1DaysOff : group2DaysOff,
        groupType: index % 2 === 0 ? '1-day' : '2-day'
      }));
    };

    const headSchedules = divideIntoGroups(headBartenders);
    const bartenderSchedules = divideIntoGroups(bartenders);
    const barBackSchedules = divideIntoGroups(barBacks);

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
          // Second head covers outdoor on weekdays
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 1:00 AM',
            type: 'regular',
            station: 'Outdoor Bar - Head'
          };
        } else {
          // Weekend outdoor or backup
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 2:00 AM',
            type: 'regular',
            station: 'Outdoor Bar - Head'
          };
        }
      });

      // === BARTENDERS - Stations 1, 2, 3 and Outdoor ===
      const stations = ['Indoor - Station 1', 'Indoor - Station 2', 'Indoor - Garnishing Station 3'];
      let stationIndex = 0;
      let outdoorBartenderAssigned = false;

      bartenderSchedules.forEach((schedule) => {
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
        } else if (stationIndex < 3) {
          // Indoor stations (first 3 available bartenders)
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '5:00 PM - 3:00 AM',
            type: 'regular',
            station: stations[stationIndex]
          };
          stationIndex++;
        } else if (isWeekday && !outdoorBartenderAssigned) {
          // Outdoor bartender on weekdays
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 1:00 AM',
            type: 'regular',
            station: 'Outdoor Bar - Bartender'
          };
          outdoorBartenderAssigned = true;
        } else {
          // Extra staff for busy days, OFF otherwise
          if (isBusyDay) {
            newSchedule[key] = {
              staffId: schedule.staff.id,
              day,
              timeRange: '5:00 PM - 2:00 AM',
              type: 'regular',
              station: 'Floating Support'
            };
          } else {
            newSchedule[key] = {
              staffId: schedule.staff.id,
              day,
              timeRange: 'OFF',
              type: 'off'
            };
          }
        }
      });

      // === BAR BACKS - Refill, Batches, Premixes ===
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
          // Primary bar back
          const timeRange = isPickupDay ? 'PICKUP 12:00 PM - 3:00 AM' : isSaturday ? 'BRUNCH 11:00 AM - 3:00 AM' : '2:00 PM - 3:00 AM';
          const type = isPickupDay ? 'pickup' : isSaturday ? 'brunch' : 'opening';
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type,
            station: 'Refill Fridges, Batches, Premixes, Glassware'
          };
        } else {
          // Backup bar back
          const timeRange = isSaturday ? 'BRUNCH 11:00 AM - 2:00 AM' : '4:00 PM - 2:00 AM';
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type: isSaturday ? 'brunch' : 'regular',
            station: 'Support Bar Back - Refill & Setup'
          };
        }
      });

      // === SUPPORT - Manual (give OFF by default, can be edited) ===
      support.forEach((staff) => {
        const key = `${staff.id}-${day}`;
        newSchedule[key] = {
          staffId: staff.id,
          day,
          timeRange: 'OFF',
          type: 'off'
        };
      });
    });

    setSchedule(newSchedule);
    toast.success('Schedule generated! No offs on busy days (Tue/Fri/Sat)');
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

    // Legend
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LEGEND & NOTES:', 14, finalY);
    
    let currentY = finalY + 6;
    const legendItems = [
      { text: 'Opening', color: [129, 199, 132] },
      { text: 'Closing', color: [239, 83, 80] },
      { text: 'Store Pick-up', color: [255, 235, 59] },
      { text: 'Brunch - 11 AM', color: [255, 167, 38] }
    ];

    legendItems.forEach((item, i) => {
      const x = 14 + (i * 60);
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(x, currentY - 3, 8, 5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(item.text, x + 10, currentY);
    });

    currentY += 8;
    doc.setFontSize(8);
    doc.text('Break Time Frame: 5:00 PM - 6:00 PM', 14, currentY);
    doc.text('Ending Back & Front: 6:45 PM - Mandatory', 100, currentY);
    currentY += 5;
    doc.text('Store Pick-up: Monday, Wednesday, Friday', 14, currentY);
    doc.text('Casual for Support: When on duty', 100, currentY);

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

        {/* Daily Summary - Enhanced */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              📊 Daily Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySchedule = Object.values(schedule).filter(s => s.day === day);
                const working = daySchedule.filter(s => s.timeRange !== 'OFF');
                const off = daySchedule.filter(s => s.timeRange === 'OFF');
                const totalWorking = working.length;
                
                // Get staff names
                const workingStaff = working.map(s => {
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
                  <div key={day} className={`border-2 rounded-xl p-4 transition-all hover:shadow-lg ${isBusyDay ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-border bg-card'}`}>
                    <div className="font-bold text-base mb-1">{day}</div>
                    {dayLabel && (
                      <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">
                        🔥 {dayLabel}
                      </div>
                    )}
                    <div className="text-3xl font-bold text-primary mb-3">{totalWorking}</div>
                    <div className="text-xs text-muted-foreground mb-2">Working Today</div>
                    
                    {/* Working Staff */}
                    <div className="space-y-2 mb-3">
                      <div className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Working:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {workingStaff.map((s, idx) => (
                          <div key={idx} className="text-xs bg-green-100 dark:bg-green-900/30 rounded px-2 py-1">
                            <div className="font-medium">{s.name}</div>
                            {s.station && <div className="text-[10px] text-muted-foreground truncate">{s.station}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Off Staff */}
                    {offStaff.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400">✗ Off:</div>
                        <div className="max-h-20 overflow-y-auto space-y-1">
                          {offStaff.map((name, idx) => (
                            <div key={idx} className="text-xs bg-red-100 dark:bg-red-900/30 rounded px-2 py-1 font-medium">
                              {name}
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

        {/* Schedule Table - Enhanced */}
        {staffMembers.length > 0 && (
          <Card className="p-4 overflow-x-auto shadow-lg">
            <h3 className="text-xl font-bold mb-4">📅 Weekly Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-2 border-border p-3 bg-gradient-to-br from-muted to-muted/50 font-bold text-left min-w-[160px] sticky left-0 z-10">
                      <div className="text-sm">STAFF NAME</div>
                      <div className="text-xs font-normal text-muted-foreground">Role</div>
                    </th>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const isBusyDay = dayIndex === 1 || dayIndex === 4 || dayIndex === 5;
                      const dayLabel = dayIndex === 1 ? '🔥 Ladies Night' : dayIndex === 4 ? '🎉 Weekend' : dayIndex === 5 ? '🍳 Brunch' : '';
                      return (
                        <th key={day} className={`border-2 border-border p-3 font-bold text-center min-w-[200px] ${isBusyDay ? 'bg-gradient-to-br from-orange-200 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40' : 'bg-gradient-to-br from-primary/10 to-primary/5'}`}>
                          <div className="text-sm">{day}</div>
                          {dayLabel && <div className="text-xs font-normal mt-1">{dayLabel}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(staff => (
                    <tr key={staff.id}>
                      <td className="border-2 border-border p-3 font-bold bg-card sticky left-0 z-10">
                        <div className="text-sm">{staff.name}</div>
                        <div className="text-xs text-muted-foreground font-normal capitalize">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border-2 border-border p-2 transition-colors ${cell ? CELL_COLORS[cell.type] : 'bg-card'}`}
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
                              placeholder="OFF or 5:00 PM - 3:00 AM"
                              className="text-xs h-9 text-center font-semibold border-0 bg-transparent focus:bg-background/50"
                            />
                            {cell?.station && (
                              <div className="text-[10px] text-muted-foreground text-center mt-1 font-medium px-1 py-0.5 bg-background/50 rounded">
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
