import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Search, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  type: string;
  region: string;
  city: string;
  address: string;
}

interface Verification {
  id: string;
  venue_id: string;
  position: string;
  start_date: string;
  end_date: string | null;
  status: string;
  venues: Venue;
}

export const VenueVerification = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVenues();
    fetchVerifications();
  }, [userId]);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load venues",
        variant: "destructive",
      });
      return;
    }

    setVenues(data || []);
  };

  const fetchVerifications = async () => {
    const { data, error } = await supabase
      .from("employment_verifications")
      .select(`
        *,
        venues (*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching verifications:", error);
      return;
    }

    setVerifications(data || []);
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === "All" || venue.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("employment_verifications")
      .insert({
        user_id: userId,
        venue_id: selectedVenue,
        position,
        start_date: startDate,
        end_date: endDate || null,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Verification request sent to venue",
      });
      setOpen(false);
      setSelectedVenue("");
      setPosition("");
      setStartDate("");
      setEndDate("");
      fetchVerifications();
    }

    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const regions = ["All", ...Array.from(new Set(venues.map(v => v.region)))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Employment Verification</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Building2 className="w-4 h-4 mr-2" />
              Add Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Verify Employment</DialogTitle>
              <DialogDescription>
                Select a venue where you worked and add your employment details
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Search Venue</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Venue *</Label>
                <Select value={selectedVenue} onValueChange={setSelectedVenue} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVenues.map(venue => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="font-medium">{venue.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {venue.address}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {venue.type}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Bartender, Chef, Manager"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Submit for Verification"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {verifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No employment verifications yet</p>
            <p className="text-sm">Add venues to verify your work experience</p>
          </div>
        ) : (
          verifications.map((verification) => (
            <div
              key={verification.id}
              className="flex items-start gap-3 p-4 border rounded-lg bg-card"
            >
              {getStatusIcon(verification.status)}
              <div className="flex-1">
                <div className="font-medium">{verification.venues.name}</div>
                <div className="text-sm text-muted-foreground">
                  {verification.position}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(verification.start_date).toLocaleDateString()} -{" "}
                  {verification.end_date
                    ? new Date(verification.end_date).toLocaleDateString()
                    : "Present"}
                </div>
              </div>
              <Badge
                variant={
                  verification.status === "approved"
                    ? "default"
                    : verification.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {verification.status}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
