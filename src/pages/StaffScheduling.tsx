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
import { Download, Plus, Trash2 } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface StaffMember {
  id: string;
  name: string;
  title: 'head_bartender' | 'bartender' | 'bar_back' | 'support';
}

interface ScheduleCell {
  staffId: string;
  eventId: string;
  timeRange: string;
  type: 'opening' | 'closing' | 'pickup' | 'brunch' | 'off' | 'regular';
}

interface Event {
  id: string;
  name: string;
  date: string;
  details: string;
}

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
  const [events, setEvents] = useState<Event[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ScheduleCell>>({});
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    title: 'bartender' as StaffMember['title'],
  });

  const [newEvent, setNewEvent] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    details: '',
  });

  useEffect(() => {
    if (user) {
      fetchStaffMembers();
      fetchEvents();
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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', user?.id)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data.map(e => ({ id: e.id, name: e.event_name, date: e.event_date, details: e.description || '' })));
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

  const addEvent = async () => {
    if (!newEvent.name) {
      toast.error('Please enter event name');
      return;
    }

    const { error } = await supabase
      .from('schedule_events')
      .insert({
        user_id: user?.id,
        event_name: newEvent.name,
        event_date: newEvent.date,
        description: newEvent.details,
      });

    if (error) {
      toast.error('Failed to add event');
      return;
    }

    toast.success('Event added');
    setNewEvent({ name: '', date: format(new Date(), 'yyyy-MM-dd'), details: '' });
    setIsAddEventOpen(false);
    fetchEvents();
  };

  const updateScheduleCell = (staffId: string, eventId: string, timeRange: string, type: ScheduleCell['type']) => {
    const key = `${staffId}-${eventId}`;
    setSchedule(prev => ({
      ...prev,
      [key]: { staffId, eventId, timeRange, type }
    }));
  };

  const getScheduleCell = (staffId: string, eventId: string): ScheduleCell | undefined => {
    const key = `${staffId}-${eventId}`;
    return schedule[key];
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(20);
    doc.text(venueName || 'Staff Schedule', 14, 20);
    
    const headers = ['Staff Name', ...events.map(e => `${e.name}\n${format(new Date(e.date), 'dd-MMM-yy')}`)];
    const rows = staffMembers.map(staff => {
      const row = [
        `${staff.name}\n(${staff.title.replace('_', ' ')})`,
        ...events.map(event => {
          const cell = getScheduleCell(staff.id, event.id);
          return cell ? (cell.timeRange === 'OFF' ? 'OFF' : cell.timeRange) : '';
        })
      ];
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`schedule-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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

        {/* Events Management */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Events/Shifts</h3>
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Event/Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Event Name</Label>
                    <Input
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      placeholder="e.g., Fridge/Station, Brunch, etc."
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Input
                      value={newEvent.details}
                      onChange={(e) => setNewEvent({ ...newEvent, details: e.target.value })}
                      placeholder="Store pick-up, 200 PAX, etc."
                    />
                  </div>
                  <Button onClick={addEvent} className="w-full">Add Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2 flex-wrap">
            {events.map(event => (
              <div key={event.id} className="p-2 border rounded-lg bg-card">
                <div className="font-medium">{event.name}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(event.date), 'MMM dd, yyyy')}</div>
                {event.details && <div className="text-xs text-muted-foreground">{event.details}</div>}
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-center text-muted-foreground py-4 w-full">No events added yet</p>
            )}
          </div>
        </Card>

        {/* Schedule Table */}
        {staffMembers.length > 0 && events.length > 0 && (
          <Card className="p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Schedule</h3>
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-muted font-semibold text-left min-w-[150px]">
                      NAME / ID
                    </th>
                    {events.map(event => (
                      <th key={event.id} className="border border-border p-2 bg-muted font-semibold text-center min-w-[180px]">
                        <div>{event.name}</div>
                        <div className="text-xs font-normal">{event.details}</div>
                        <div className="text-xs font-normal">{format(new Date(event.date), 'dd-MMM-yy')}</div>
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
                      {events.map(event => {
                        const cell = getScheduleCell(staff.id, event.id);
                        return (
                          <td
                            key={event.id}
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
                                updateScheduleCell(staff.id, event.id, value, type);
                              }}
                              placeholder="OFF or 5:00 PM - 3:00 AM"
                              className="text-xs h-8 text-center"
                            />
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
