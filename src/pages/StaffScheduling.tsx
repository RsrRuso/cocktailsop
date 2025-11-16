import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Download, Users, Plus, Trash2, RefreshCw } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, addWeeks, getWeek } from 'date-fns';

interface StaffMember {
  id: string;
  name: string;
  title: 'head_bartender' | 'senior_bartender' | 'bartender' | 'bar_back' | 'support';
  is_active: boolean;
}

interface Schedule {
  id: string;
  staff_member_id: string;
  schedule_date: string;
  shift_type: 'opening' | 'closing' | 'misa_place' | 'pickup' | 'brunch';
  station_type: string;
  notes?: string;
  week_number: number;
}

interface Allocation {
  id: string;
  staff_member_id: string;
  allocation_date: string;
  station_assignment: string;
  shift_type: string;
  responsibilities: string[];
  notes?: string;
}

interface ScheduleEvent {
  id: string;
  event_date: string;
  event_name: string;
  description?: string;
}

const SHIFT_COLORS = {
  opening: 'bg-blue-500/20 border-blue-500',
  closing: 'bg-purple-500/20 border-purple-500',
  misa_place: 'bg-green-500/20 border-green-500',
  pickup: 'bg-orange-500/20 border-orange-500',
  brunch: 'bg-pink-500/20 border-pink-500',
};

const TITLE_LABELS = {
  head_bartender: 'Head Bartender',
  senior_bartender: 'Senior Bartender',
  bartender: 'Bartender',
  bar_back: 'Bar Back',
  support: 'Support',
};

const STATIONS = {
  indoor: ['indoor_station_1', 'indoor_station_2', 'indoor_station_3', 'tickets_segregator'],
  outdoor: ['outdoor_station_1', 'outdoor_station_2'],
};

export default function StaffScheduling() {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    title: 'bartender' as const,
  });

  const [newEvent, setNewEvent] = useState({
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_name: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchStaffMembers();
      fetchSchedules();
      fetchAllocations();
      fetchEvents();
    }
  }, [user, selectedWeek]);

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) {
      toast.error('Failed to fetch staff members');
      return;
    }
    setStaffMembers((data || []) as StaffMember[]);
  };

  const fetchSchedules = async () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('user_id', user?.id)
      .gte('schedule_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('schedule_date', format(weekEnd, 'yyyy-MM-dd'));

    if (error) {
      toast.error('Failed to fetch schedules');
      return;
    }
    setSchedules((data || []) as Schedule[]);
  };

  const fetchAllocations = async () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

    const { data, error } = await supabase
      .from('staff_allocations')
      .select('*')
      .eq('user_id', user?.id)
      .gte('allocation_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('allocation_date', format(weekEnd, 'yyyy-MM-dd'));

    if (error) {
      toast.error('Failed to fetch allocations');
      return;
    }
    setAllocations((data || []) as Allocation[]);
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to fetch events');
      return;
    }
    setEvents((data || []) as ScheduleEvent[]);
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

  const addEvent = async () => {
    if (!newEvent.event_name) {
      toast.error('Please enter event name');
      return;
    }

    const { error } = await supabase
      .from('schedule_events')
      .insert({
        user_id: user?.id,
        ...newEvent,
      });

    if (error) {
      toast.error('Failed to add event');
      return;
    }

    toast.success('Event added');
    setNewEvent({ event_date: format(new Date(), 'yyyy-MM-dd'), event_name: '', description: '' });
    setIsAddEventOpen(false);
    fetchEvents();
  };

  const generateSchedule = async () => {
    if (staffMembers.length === 0) {
      toast.error('Please add staff members first');
      return;
    }

    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const weekNumber = getWeek(weekStart);
    const daysOffPattern = weekNumber % 2 === 0 ? 2 : 1; // Alternating 1 and 2 days off

    // Separate staff by title
    const heads = staffMembers.filter(s => s.title === 'head_bartender');
    const seniors = staffMembers.filter(s => s.title === 'senior_bartender');
    const bartenders = staffMembers.filter(s => s.title === 'bartender');
    const barBacks = staffMembers.filter(s => s.title === 'bar_back');
    const support = staffMembers.filter(s => s.title === 'support');

    const allStaff = [...heads, ...seniors, ...bartenders, ...barBacks, ...support];
    const scheduleData: any[] = [];

    // Rotate outdoor positions based on week number
    const outdoorRotationOffset = weekNumber % allStaff.length;

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Assign stations with rotation logic
      let stationIndex = 0;
      const usedStaff = new Set();

      // Always separate heads
      heads.forEach((head, idx) => {
        if (!usedStaff.has(head.id)) {
          const isOutdoor = (idx + outdoorRotationOffset) % 2 === 0;
          const stationType = isOutdoor 
            ? STATIONS.outdoor[idx % STATIONS.outdoor.length]
            : STATIONS.indoor[stationIndex++ % STATIONS.indoor.length];

          scheduleData.push({
            user_id: user?.id,
            staff_member_id: head.id,
            schedule_date: dateStr,
            shift_type: 'opening',
            station_type: stationType,
            week_number: weekNumber,
          });
          usedStaff.add(head.id);
        }
      });

      // Assign other staff with rotation
      [...seniors, ...bartenders, ...barBacks, ...support].forEach((staff, idx) => {
        if (!usedStaff.has(staff.id) && stationIndex < 6) {
          const adjustedIdx = (idx + outdoorRotationOffset) % allStaff.length;
          const isOutdoor = adjustedIdx < 2;
          const stationType = isOutdoor
            ? STATIONS.outdoor[adjustedIdx % STATIONS.outdoor.length]
            : STATIONS.indoor[stationIndex++ % STATIONS.indoor.length];

          // Assign days off based on pattern
          const shouldHaveDayOff = idx % (7 / daysOffPattern) < 1;
          if (!shouldHaveDayOff) {
            scheduleData.push({
              user_id: user?.id,
              staff_member_id: staff.id,
              schedule_date: dateStr,
              shift_type: idx % 5 === 0 ? 'brunch' : idx % 5 === 1 ? 'opening' : idx % 5 === 2 ? 'misa_place' : idx % 5 === 3 ? 'pickup' : 'closing',
              station_type: stationType,
              week_number: weekNumber,
            });
            usedStaff.add(staff.id);
          }
        }
      });
    }

    // Delete existing schedules for the week
    await supabase
      .from('staff_schedules')
      .delete()
      .eq('user_id', user?.id)
      .eq('week_number', weekNumber);

    // Insert new schedules
    const { error } = await supabase
      .from('staff_schedules')
      .insert(scheduleData);

    if (error) {
      toast.error('Failed to generate schedule');
      return;
    }

    toast.success('Schedule generated successfully');
    fetchSchedules();
    generateAllocations();
  };

  const generateAllocations = async () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const allocationData: any[] = [];

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      const daySchedules = schedules.filter(s => s.schedule_date === dateStr);

      daySchedules.forEach(schedule => {
        const staff = staffMembers.find(s => s.id === schedule.staff_member_id);
        if (staff) {
          allocationData.push({
            user_id: user?.id,
            staff_member_id: schedule.staff_member_id,
            allocation_date: dateStr,
            station_assignment: schedule.station_type.replace(/_/g, ' ').toUpperCase(),
            shift_type: schedule.shift_type.replace(/_/g, ' ').toUpperCase(),
            responsibilities: getResponsibilities(staff.title, schedule.station_type),
          });
        }
      });
    }

    // Delete existing allocations
    await supabase
      .from('staff_allocations')
      .delete()
      .eq('user_id', user?.id)
      .gte('allocation_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('allocation_date', format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));

    // Insert new allocations
    const { error } = await supabase
      .from('staff_allocations')
      .insert(allocationData);

    if (error) {
      toast.error('Failed to generate allocations');
      return;
    }

    fetchAllocations();
  };

  const getResponsibilities = (title: string, station: string): string[] => {
    const base = ['Maintain cleanliness', 'Follow safety protocols'];
    
    if (title === 'head_bartender') {
      return [...base, 'Lead team', 'Manage operations', 'Quality control'];
    }
    if (title === 'senior_bartender') {
      return [...base, 'Train junior staff', 'Handle complex orders', 'Supervise station'];
    }
    if (station.includes('outdoor')) {
      return [...base, 'Manage outdoor service', 'Handle weather conditions'];
    }
    if (station === 'tickets_segregator') {
      return [...base, 'Organize tickets', 'Coordinate orders'];
    }
    return [...base, 'Prepare drinks', 'Serve customers'];
  };

  const exportSchedulePDF = () => {
    const doc = new jsPDF();
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    
    doc.setFontSize(18);
    doc.text('Staff Schedule', 14, 20);
    doc.setFontSize(12);
    doc.text(`Week: ${format(weekStart, 'MMM dd, yyyy')} - ${format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`, 14, 30);

    const tableData = schedules.map(schedule => {
      const staff = staffMembers.find(s => s.id === schedule.staff_member_id);
      return [
        format(new Date(schedule.schedule_date), 'EEE, MMM dd'),
        staff?.name || 'Unknown',
        TITLE_LABELS[staff?.title as keyof typeof TITLE_LABELS] || '',
        schedule.shift_type.replace(/_/g, ' ').toUpperCase(),
        schedule.station_type.replace(/_/g, ' ').toUpperCase(),
        schedule.notes || '',
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Name', 'Title', 'Shift', 'Station', 'Notes']],
      body: tableData,
    });

    doc.save(`schedule-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
    toast.success('Schedule PDF downloaded');
  };

  const exportAllocationPDF = () => {
    const doc = new jsPDF();
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    
    doc.setFontSize(18);
    doc.text('Staff Allocations', 14, 20);
    doc.setFontSize(12);
    doc.text(`Week: ${format(weekStart, 'MMM dd, yyyy')} - ${format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`, 14, 30);

    const tableData = allocations.map(allocation => {
      const staff = staffMembers.find(s => s.id === allocation.staff_member_id);
      return [
        format(new Date(allocation.allocation_date), 'EEE, MMM dd'),
        staff?.name || 'Unknown',
        allocation.station_assignment,
        allocation.shift_type,
        allocation.responsibilities.join(', '),
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Name', 'Station', 'Shift', 'Responsibilities']],
      body: tableData,
    });

    doc.save(`allocations-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
    toast.success('Allocations PDF downloaded');
  };

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    return eventDate >= weekStart && eventDate <= weekEnd;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Staff Scheduling</h1>
          <div className="flex gap-2">
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
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
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Select
                      value={newStaff.title}
                      onValueChange={(value: any) => setNewStaff({ ...newStaff, title: value })}
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
                  </div>
                  <Button onClick={addStaffMember} className="w-full">Add Staff Member</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Event/Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Event Name</Label>
                    <Input
                      value={newEvent.event_name}
                      onChange={(e) => setNewEvent({ ...newEvent, event_name: e.target.value })}
                      placeholder="e.g., Live Music Night"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Event details..."
                    />
                  </div>
                  <Button onClick={addEvent} className="w-full">Add Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(addWeeks(selectedWeek, -1))}
                  >
                    Previous Week
                  </Button>
                  <div className="text-lg font-semibold">
                    {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
                  >
                    Next Week
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateSchedule}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </Button>
                  <Button onClick={exportSchedulePDF} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>

              {weekEvents.length > 0 && (
                <div className="mb-4 p-3 bg-accent rounded-lg">
                  <h3 className="font-semibold mb-2">Events This Week:</h3>
                  {weekEvents.map(event => (
                    <div key={event.id} className="text-sm mb-1">
                      <span className="font-medium">{format(new Date(event.event_date), 'EEE, MMM dd')}:</span> {event.event_name}
                      {event.description && <span className="text-muted-foreground"> - {event.description}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {Object.entries(SHIFT_COLORS).map(([shift, color]) => (
                    <div key={shift} className={`px-3 py-1 rounded-md border ${color} text-sm`}>
                      {shift.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  ))}
                </div>

                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No schedule generated. Click "Generate Schedule" to create one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const currentDate = new Date(weekStart);
                      currentDate.setDate(weekStart.getDate() + dayIndex);
                      const dateStr = format(currentDate, 'yyyy-MM-dd');
                      const daySchedules = schedules.filter(s => s.schedule_date === dateStr);

                      return (
                        <div key={dayIndex} className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-3">{format(currentDate, 'EEEE, MMMM dd')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {daySchedules.map(schedule => {
                              const staff = staffMembers.find(s => s.id === schedule.staff_member_id);
                              return (
                                <div
                                  key={schedule.id}
                                  className={`p-3 rounded-md border ${SHIFT_COLORS[schedule.shift_type]}`}
                                >
                                  <div className="font-medium">{staff?.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {TITLE_LABELS[staff?.title as keyof typeof TITLE_LABELS]}
                                  </div>
                                  <div className="text-xs mt-1">
                                    {schedule.station_type.replace(/_/g, ' ').toUpperCase()}
                                  </div>
                                  {schedule.notes && (
                                    <div className="text-xs mt-1 italic">{schedule.notes}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Daily Allocations</h2>
                <Button onClick={exportAllocationPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No allocations generated. Generate a schedule first.
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const currentDate = new Date(weekStart);
                    currentDate.setDate(weekStart.getDate() + dayIndex);
                    const dateStr = format(currentDate, 'yyyy-MM-dd');
                    const dayAllocations = allocations.filter(a => a.allocation_date === dateStr);

                    return (
                      <div key={dayIndex} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">{format(currentDate, 'EEEE, MMMM dd')}</h3>
                        <div className="space-y-2">
                          {dayAllocations.map(allocation => {
                            const staff = staffMembers.find(s => s.id === allocation.staff_member_id);
                            return (
                              <div key={allocation.id} className="border rounded-md p-3 bg-card">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{staff?.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {TITLE_LABELS[staff?.title as keyof typeof TITLE_LABELS]}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">{allocation.shift_type}</div>
                                    <div className="text-xs text-muted-foreground">{allocation.station_assignment}</div>
                                  </div>
                                </div>
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Responsibilities:</span>
                                  <ul className="list-disc list-inside text-muted-foreground">
                                    {allocation.responsibilities.map((resp, idx) => (
                                      <li key={idx}>{resp}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <Card className="p-4">
              <h2 className="text-xl font-semibold mb-4">Staff Members</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffMembers.map(staff => (
                  <div key={staff.id} className="border rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {TITLE_LABELS[staff.title]}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStaffMember(staff.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {staffMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No staff members added. Click "Add Staff" to get started.
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
