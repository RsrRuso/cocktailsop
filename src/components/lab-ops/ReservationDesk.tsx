import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, Users, Clock, Calendar, Phone, Mail, 
  UserCheck, LogOut, CheckCircle, XCircle, Search,
  ChevronRight, Armchair, RefreshCw
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";

interface Reservation {
  id: string;
  outlet_id: string;
  table_id: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  notes: string | null;
  special_requests: string | null;
  seated_at: string | null;
  completed_at: string | null;
  created_at: string;
  lab_ops_tables?: { name: string; table_number: number | null } | null;
}

interface Table {
  id: string;
  name: string;
  table_number: number | null;
  capacity: number;
  status: string;
}

interface ReservationDeskProps {
  outletId: string;
}

export default function ReservationDesk({ outletId }: ReservationDeskProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newReservation, setNewReservation] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    party_size: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: "19:00",
    table_id: "",
    notes: "",
    special_requests: ""
  });

  useEffect(() => {
    fetchReservations();
    fetchTables();
  }, [outletId, selectedDate]);

  const fetchReservations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("lab_ops_reservations")
      .select(`
        *,
        lab_ops_tables(name, table_number)
      `)
      .eq("outlet_id", outletId)
      .eq("reservation_date", selectedDate)
      .order("reservation_time", { ascending: true });

    if (error) {
      console.error("Error fetching reservations:", error);
    } else {
      setReservations(data || []);
    }
    setIsLoading(false);
  };

  const fetchTables = async () => {
    const { data } = await supabase
      .from("lab_ops_tables")
      .select("id, name, table_number, capacity, status")
      .eq("outlet_id", outletId)
      .order("table_number", { ascending: true });
    setTables(data || []);
  };

  const createReservation = async () => {
    if (!newReservation.guest_name) {
      toast({ title: "Guest name required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("lab_ops_reservations").insert({
      outlet_id: outletId,
      guest_name: newReservation.guest_name,
      guest_phone: newReservation.guest_phone || null,
      guest_email: newReservation.guest_email || null,
      party_size: newReservation.party_size,
      reservation_date: newReservation.reservation_date,
      reservation_time: newReservation.reservation_time,
      table_id: newReservation.table_id || null,
      notes: newReservation.notes || null,
      special_requests: newReservation.special_requests || null,
      status: "upcoming"
    });

    if (error) {
      toast({ title: "Failed to create reservation", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reservation created!" });
      setShowNewDialog(false);
      setNewReservation({
        guest_name: "",
        guest_phone: "",
        guest_email: "",
        party_size: 2,
        reservation_date: new Date().toISOString().split('T')[0],
        reservation_time: "19:00",
        table_id: "",
        notes: "",
        special_requests: ""
      });
      fetchReservations();
    }
  };

  const updateReservationStatus = async (id: string, status: string, tableId?: string) => {
    const updates: any = { status };
    
    if (status === "seated") {
      updates.seated_at = new Date().toISOString();
      if (tableId) {
        updates.table_id = tableId;
        // Update table status to seated
        await supabase
          .from("lab_ops_tables")
          .update({ status: "seated" })
          .eq("id", tableId);
      }
    } else if (status === "completed" || status === "left") {
      updates.completed_at = new Date().toISOString();
      // Free the table
      const reservation = reservations.find(r => r.id === id);
      if (reservation?.table_id) {
        await supabase
          .from("lab_ops_tables")
          .update({ status: "free" })
          .eq("id", reservation.table_id);
      }
    }

    const { error } = await supabase
      .from("lab_ops_reservations")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${status}` });
      fetchReservations();
      fetchTables();
    }
  };

  const getFilteredReservations = () => {
    let filtered = reservations;
    
    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(r => r.status === activeTab);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.guest_name.toLowerCase().includes(query) ||
        r.guest_phone?.includes(query) ||
        r.guest_email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "seated": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "left": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "no_show": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming": return <Clock className="w-4 h-4" />;
      case "seated": return <Armchair className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "left": return <LogOut className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTabCount = (status: string) => {
    if (status === "all") return reservations.length;
    return reservations.filter(r => r.status === status).length;
  };

  const availableTables = tables.filter(t => t.status === "free");

  return (
    <div className="flex flex-col h-full">
      {/* Header - Mobile Optimized */}
      <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Reservations</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage bookings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchReservations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 h-9">
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Reservation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Guest Name *</Label>
                    <Input
                      value={newReservation.guest_name}
                      onChange={(e) => setNewReservation({ ...newReservation, guest_name: e.target.value })}
                      placeholder="Guest name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newReservation.guest_phone}
                        onChange={(e) => setNewReservation({ ...newReservation, guest_phone: e.target.value })}
                        placeholder="+1 234..."
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newReservation.guest_email}
                        onChange={(e) => setNewReservation({ ...newReservation, guest_email: e.target.value })}
                        placeholder="email@..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <Label className="text-xs sm:text-sm">Party</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newReservation.party_size}
                        onChange={(e) => setNewReservation({ ...newReservation, party_size: parseInt(e.target.value) || 2 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Date</Label>
                      <Input
                        type="date"
                        value={newReservation.reservation_date}
                        onChange={(e) => setNewReservation({ ...newReservation, reservation_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Time</Label>
                      <Input
                        type="time"
                        value={newReservation.reservation_time}
                        onChange={(e) => setNewReservation({ ...newReservation, reservation_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Assign Table (optional)</Label>
                    <Select
                      value={newReservation.table_id}
                      onValueChange={(v) => setNewReservation({ ...newReservation, table_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No table assigned</SelectItem>
                        {tables.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.table_number ? `T${t.table_number}` : t.name} (Cap: {t.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Special Requests</Label>
                    <Textarea
                      value={newReservation.special_requests}
                      onChange={(e) => setNewReservation({ ...newReservation, special_requests: e.target.value })}
                      placeholder="Dietary requirements, occasions..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={newReservation.notes}
                      onChange={(e) => setNewReservation({ ...newReservation, notes: e.target.value })}
                      placeholder="Staff notes..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setShowNewDialog(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={createReservation} className="w-full sm:w-auto">Create Reservation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Date & Search - Mobile Stack */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={selectedDate === new Date().toISOString().split('T')[0] ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
            <Button
              variant={selectedDate === addDays(new Date(), 1).toISOString().split('T')[0] ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedDate(addDays(new Date(), 1).toISOString().split('T')[0])}
            >
              Tomorrow
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-8 text-xs"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest..."
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Status Tabs - Horizontal Scroll on Mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="overflow-x-auto scrollbar-hide border-b">
          <TabsList className="w-max min-w-full justify-start rounded-none bg-transparent p-0">
            {[
              { value: "upcoming", label: "Upcoming", icon: Clock },
              { value: "seated", label: "Seated", icon: Armchair },
              { value: "completed", label: "Done", icon: CheckCircle },
              { value: "left", label: "Left", icon: LogOut },
              { value: "all", label: "All", icon: Calendar },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent whitespace-nowrap"
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{tab.label}</span>
                <Badge variant="secondary" className="ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                  {getTabCount(tab.value)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : getFilteredReservations().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No {activeTab === "all" ? "" : activeTab} reservations for this date
              </div>
            ) : (
              getFilteredReservations().map(reservation => (
                <Card key={reservation.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    {/* Mobile-first layout */}
                    <div className="space-y-3">
                      {/* Top row: Time, Status, Table */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold">
                          {reservation.reservation_time.slice(0, 5)}
                        </span>
                        <Badge className={`${getStatusColor(reservation.status)} text-xs`}>
                          {getStatusIcon(reservation.status)}
                          <span className="ml-1 capitalize">{reservation.status}</span>
                        </Badge>
                        {reservation.lab_ops_tables && (
                          <Badge variant="outline" className="text-xs">
                            {reservation.lab_ops_tables.table_number 
                              ? `T${reservation.lab_ops_tables.table_number}` 
                              : reservation.lab_ops_tables.name}
                          </Badge>
                        )}
                      </div>

                      {/* Guest info */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-base sm:text-lg">{reservation.guest_name}</span>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Users className="w-3.5 h-3.5" />
                          {reservation.party_size}
                        </span>
                      </div>

                      {/* Contact info - stacked on mobile */}
                      <div className="flex flex-col xs:flex-row xs:flex-wrap gap-1 xs:gap-3 text-xs sm:text-sm text-muted-foreground">
                        {reservation.guest_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {reservation.guest_phone}
                          </span>
                        )}
                        {reservation.guest_email && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{reservation.guest_email}</span>
                          </span>
                        )}
                      </div>

                      {reservation.special_requests && (
                        <p className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1.5 rounded">
                          ⚠️ {reservation.special_requests}
                        </p>
                      )}

                      {/* Actions - Full width on mobile */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {reservation.status === "upcoming" && (
                          <>
                            {availableTables.length > 0 ? (
                              <Select
                                onValueChange={(tableId) => updateReservationStatus(reservation.id, "seated", tableId)}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 min-w-[100px]">
                                  <SelectValue placeholder="Seat Guest" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTables.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.table_number ? `T${t.table_number}` : t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Button size="sm" disabled variant="outline" className="h-8 text-xs flex-1">
                                No tables free
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              onClick={() => updateReservationStatus(reservation.id, "no_show")}
                            >
                              No Show
                            </Button>
                          </>
                        )}
                        {reservation.status === "seated" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 h-8 text-xs flex-1"
                              onClick={() => updateReservationStatus(reservation.id, "completed")}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => updateReservationStatus(reservation.id, "left")}
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" />
                              Left
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}