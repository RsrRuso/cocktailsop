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

    // Calculate week number from selected date
    const weekStart = new Date(weekStartDate);
    const weekNumber = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));

    // Within the same week, alternate who gets 1 day off vs 2 days off
    // Group 1: 1 day off, Group 2: 2 days off (swaps each week)
    const divideIntoGroups = (staffList: StaffMember[]) => {
      const group1DaysOff = [2]; // Wednesday - 1 day off
      const group2DaysOff = [4, 5]; // Friday-Saturday - 2 days off
      
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

      // === INDOOR BAR: Head Bartender - Ticket Segregator ===
      let indoorHeadAssigned = false;
      headSchedules.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;
        
        if (schedule.daysOff.includes(dayIndex)) {
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

        if (schedule.daysOff.includes(dayIndex)) {
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
          // Extra staff - OFF
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        }
      });

      // === BAR BACKS - Refill, Batches, Premixes ===
      barBackSchedules.forEach((schedule, idx) => {
        const key = `${schedule.staff.id}-${day}`;

        if (schedule.daysOff.includes(dayIndex)) {
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: 'OFF',
            type: 'off'
          };
        } else if (idx === 0) {
          // Primary bar back
          const timeRange = isPickupDay ? 'PICKUP 12:00 PM - 3:00 AM' : '2:00 PM - 3:00 AM';
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange,
            type: isPickupDay ? 'pickup' : 'opening',
            station: 'Refill Fridges, Batches, Premixes, Glassware'
          };
        } else {
          // Backup bar back
          newSchedule[key] = {
            staffId: schedule.staff.id,
            day,
            timeRange: '4:00 PM - 2:00 AM',
            type: 'regular',
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
    toast.success('Schedule generated with balanced day-off rotation per role!');
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

        {/* Daily Summary */}
        {staffMembers.length > 0 && Object.keys(schedule).length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Daily Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DAYS_OF_WEEK.map(day => {
                const daySchedule = Object.values(schedule).filter(s => s.day === day && s.timeRange !== 'OFF');
                const totalEmployees = daySchedule.length;
                const positions = daySchedule.map(s => s.station).filter(Boolean);
                const uniquePositions = [...new Set(positions)];

                return (
                  <div key={day} className="border rounded-lg p-3 bg-card">
                    <div className="font-semibold text-sm mb-2">{day}</div>
                    <div className="text-2xl font-bold text-primary mb-2">{totalEmployees} Staff</div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Positions:</div>
                      {uniquePositions.length > 0 ? (
                        <ul className="text-xs space-y-0.5">
                          {uniquePositions.map((pos, idx) => (
                            <li key={idx} className="truncate">• {pos}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-muted-foreground">No assignments</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Schedule Table */}
        {staffMembers.length > 0 && (
          <Card className="p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-muted font-semibold text-left min-w-[150px]">
                      NAME / ROLE
                    </th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day} className="border border-border p-2 bg-muted font-semibold text-center min-w-[150px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(staff => (
                    <tr key={staff.id}>
                      <td className="border border-border p-2 font-medium">
                        <div>{staff.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {staff.title.replace('_', ' ')}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const cell = getScheduleCell(staff.id, day);
                        return (
                          <td
                            key={day}
                            className={`border border-border p-1 ${cell ? CELL_COLORS[cell.type] : ''}`}
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
                              className="text-xs h-8 text-center"
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

        {/* Legend */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Schedule Legend & Notes</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded p-2 bg-green-500/20">
              <div className="font-medium text-sm">Opening</div>
              <div className="text-xs text-muted-foreground">Morning shift</div>
            </div>
            <div className="border rounded p-2 bg-red-500/20">
              <div className="font-medium text-sm">Closing</div>
              <div className="text-xs text-muted-foreground">Night shift</div>
            </div>
            <div className="border rounded p-2 bg-yellow-500/20">
              <div className="font-medium text-sm">Store Pick-up</div>
              <div className="text-xs text-muted-foreground">3 days a week</div>
            </div>
            <div className="border rounded p-2 bg-orange-500/20">
              <div className="font-medium text-sm">Brunch</div>
              <div className="text-xs text-muted-foreground">11 AM shift</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="p-2 border rounded bg-blue-500/10">
              <strong>Break Time Frame:</strong> 5:00 PM - 6:00 PM
            </div>
            <div className="p-2 border rounded bg-purple-500/10">
              <strong>Bar Outside Open:</strong> Special events
            </div>
            <div className="p-2 border rounded bg-cyan-500/10">
              <strong>Ending Back & Front:</strong> 6:45 PM - Mandatory
            </div>
            <div className="p-2 border rounded bg-green-500/10">
              <strong>Casual for Support:</strong> When on duty
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 border rounded bg-orange-500/10">
              <strong>LN - 8 PM</strong> Responsible
            </div>
            <div className="p-2 border rounded bg-orange-500/10">
              <strong>Brunch - 11 AM</strong> Responsible
            </div>
            <div className="p-2 border rounded bg-muted">
              <strong>OFF / Half</strong>
            </div>
            <div className="p-2 border rounded bg-muted">
              <strong>Stand By Day OFF</strong>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <h4 className="font-semibold">Role Responsibilities:</h4>
            <div className="p-2 border rounded bg-card">
              <strong>Head Bartender:</strong> {ROLE_RESPONSIBILITIES.head_bartender}
            </div>
            <div className="p-2 border rounded bg-card">
              <strong>Bartender:</strong> {ROLE_RESPONSIBILITIES.bartender}
            </div>
            <div className="p-2 border rounded bg-card">
              <strong>Bar Back:</strong> {ROLE_RESPONSIBILITIES.bar_back}
            </div>
            <div className="p-2 border rounded bg-card">
              <strong>Support:</strong> {ROLE_RESPONSIBILITIES.support}
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
