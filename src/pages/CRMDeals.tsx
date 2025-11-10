import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, DollarSign, Trash2, Edit, Target, Calendar } from "lucide-react";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const DEAL_STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];

export default function CRMDeals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("all");

  // Form state
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [stage, setStage] = useState("new");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (user) {
      fetchDeals();
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [deals, searchQuery, filterStage]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, first_name, last_name")
        .eq("user_id", user!.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*, crm_contacts(first_name, last_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    if (searchQuery) {
      filtered = filtered.filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStage !== "all") {
      filtered = filtered.filter(deal => deal.stage === filterStage);
    }

    setFilteredDeals(filtered);
  };

  const handleSave = async () => {
    if (!title || !value) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const dealData = {
        user_id: user!.id,
        title,
        contact_id: contactId || null,
        stage,
        value: parseFloat(value),
        probability,
        expected_close_date: expectedCloseDate || null,
        description
      };

      if (editingDeal) {
        const { error } = await supabase
          .from("crm_deals")
          .update(dealData)
          .eq("id", editingDeal.id);
        if (error) throw error;
        toast.success("Deal updated!");
      } else {
        const { error } = await supabase.from("crm_deals").insert(dealData);
        if (error) throw error;
        toast.success("Deal created!");
      }

      setDialogOpen(false);
      resetForm();
      fetchDeals();
    } catch (error: any) {
      toast.error("Failed to save deal");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("crm_deals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deal deleted!");
      fetchDeals();
    } catch (error: any) {
      toast.error("Failed to delete deal");
    }
  };

  const openEditDialog = (deal: any) => {
    setEditingDeal(deal);
    setTitle(deal.title);
    setContactId(deal.contact_id || "");
    setStage(deal.stage);
    setValue(deal.value.toString());
    setProbability(deal.probability);
    setExpectedCloseDate(deal.expected_close_date || "");
    setDescription(deal.description || "");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setContactId("");
    setStage("new");
    setValue("");
    setProbability(50);
    setExpectedCloseDate("");
    setDescription("");
    setEditingDeal(null);
  };

  const getStageColor = (stage: string) => {
    const colors: any = {
      new: "bg-blue-500",
      qualified: "bg-purple-500",
      proposal: "bg-yellow-500",
      negotiation: "bg-orange-500",
      won: "bg-green-500",
      lost: "bg-red-500"
    };
    return colors[stage] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 pt-20 pb-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/crm")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-primary" />
                Deals
              </h1>
              <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {DEAL_STAGES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deals Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No deals found</p>
              <p className="text-sm text-muted-foreground">Create your first deal to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map(deal => (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${getStageColor(deal.stage)}`} />
                        <Badge variant="secondary" className="text-xs">{deal.stage}</Badge>
                        <Badge variant="outline" className="text-xs">{deal.probability}%</Badge>
                      </div>
                      <CardTitle className="text-lg">{deal.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-primary">
                    ${Number(deal.value).toLocaleString()}
                  </div>

                  {deal.crm_contacts && (
                    <p className="text-sm text-muted-foreground">
                      {deal.crm_contacts.first_name} {deal.crm_contacts.last_name}
                    </p>
                  )}

                  {deal.expected_close_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Expected: {format(new Date(deal.expected_close_date), "MMM dd, yyyy")}</span>
                    </div>
                  )}

                  {deal.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
                  )}

                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(deal)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(deal.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
            <DialogDescription>
              {editingDeal ? "Update deal information" : "Add a new deal to your pipeline"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Enterprise Contract"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Deal Value ($) *</Label>
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger id="stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="probability">Probability (%): {probability}</Label>
                <Input
                  id="probability"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={probability}
                  onChange={(e) => setProbability(parseInt(e.target.value))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deal details..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingDeal ? "Update Deal" : "Create Deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}