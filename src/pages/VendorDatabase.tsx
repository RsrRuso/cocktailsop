import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Plus, Package, Phone, Mail, Globe, MapPin, Star, 
  Clock, DollarSign, FileText, Trash2, Edit2, Building2
} from "lucide-react";

const categories = [
  'Spirits & Liquor', 'Wine', 'Beer', 'Soft Drinks', 'Fresh Produce',
  'Dry Goods', 'Dairy', 'Meat & Seafood', 'Equipment', 'Smallwares',
  'Cleaning', 'Packaging', 'Uniforms', 'Marketing', 'Technology', 'Other'
];

const VendorDatabase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [newVendor, setNewVendor] = useState({
    name: '', category: '', contact_name: '', email: '', phone: '',
    address: '', website: '', payment_terms: '', lead_time_days: '',
    minimum_order: '', notes: '', rating: 0
  });

  const [newContract, setNewContract] = useState({
    contract_name: '', start_date: '', end_date: '', value: '', terms: ''
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch contracts for selected vendor
  const { data: contracts = [] } = useQuery({
    queryKey: ['vendor-contracts', selectedVendor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_contracts')
        .select('*')
        .eq('vendor_id', selectedVendor?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendor
  });

  // Create vendor
  const createVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendors').insert({
        ...newVendor,
        user_id: user?.id,
        lead_time_days: newVendor.lead_time_days ? parseInt(newVendor.lead_time_days) : null,
        minimum_order: newVendor.minimum_order ? parseFloat(newVendor.minimum_order) : null,
        rating: newVendor.rating || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowNew(false);
      setNewVendor({ name: '', category: '', contact_name: '', email: '', phone: '', address: '', website: '', payment_terms: '', lead_time_days: '', minimum_order: '', notes: '', rating: 0 });
      toast.success('Vendor added!');
    },
    onError: (e) => toast.error(e.message)
  });

  // Create contract
  const createContract = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendor_contracts').insert({
        ...newContract,
        vendor_id: selectedVendor?.id,
        value: newContract.value ? parseFloat(newContract.value) : null,
        start_date: newContract.start_date || null,
        end_date: newContract.end_date || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-contracts'] });
      setShowContract(false);
      setNewContract({ contract_name: '', start_date: '', end_date: '', value: '', terms: '' });
      toast.success('Contract added!');
    },
    onError: (e) => toast.error(e.message)
  });

  // Delete vendor
  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setSelectedVendor(null);
      toast.success('Vendor deleted');
    }
  });

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || v.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vendor Database</h1>
              <p className="text-sm text-muted-foreground">{vendors.length} suppliers</p>
            </div>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Add Vendor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Company Name *</Label><Input value={newVendor.name} onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={newVendor.category} onValueChange={v => setNewVendor(vn => ({ ...vn, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contact Name</Label><Input value={newVendor.contact_name} onChange={e => setNewVendor(v => ({ ...v, contact_name: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={newVendor.email} onChange={e => setNewVendor(v => ({ ...v, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={newVendor.phone} onChange={e => setNewVendor(v => ({ ...v, phone: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Address</Label><Input value={newVendor.address} onChange={e => setNewVendor(v => ({ ...v, address: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={newVendor.website} onChange={e => setNewVendor(v => ({ ...v, website: e.target.value }))} /></div>
                <div><Label>Payment Terms</Label><Input value={newVendor.payment_terms} onChange={e => setNewVendor(v => ({ ...v, payment_terms: e.target.value }))} placeholder="Net 30" /></div>
                <div><Label>Lead Time (days)</Label><Input type="number" value={newVendor.lead_time_days} onChange={e => setNewVendor(v => ({ ...v, lead_time_days: e.target.value }))} /></div>
                <div><Label>Minimum Order ($)</Label><Input type="number" value={newVendor.minimum_order} onChange={e => setNewVendor(v => ({ ...v, minimum_order: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={newVendor.notes} onChange={e => setNewVendor(v => ({ ...v, notes: e.target.value }))} /></div>
                <div className="col-span-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setNewVendor(v => ({ ...v, rating: star }))}>
                        <Star className={`w-6 h-6 ${newVendor.rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <Button onClick={() => createVendor.mutate()} disabled={!newVendor.name} className="w-full">Add Vendor</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Vendors Grid or Detail */}
        {!selectedVendor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map(vendor => (
              <Card 
                key={vendor.id} 
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedVendor(vendor)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    {vendor.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">{vendor.rating}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {vendor.category && <Badge variant="outline">{vendor.category}</Badge>}
                    {vendor.contact_name && <p className="text-muted-foreground">{vendor.contact_name}</p>}
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {vendor.lead_time_days && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{vendor.lead_time_days}d</span>
                      )}
                      {vendor.minimum_order && (
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${vendor.minimum_order}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredVendors.length === 0 && (
              <Card className="col-span-full p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Vendors Found</h3>
                <p className="text-muted-foreground mb-4">Add your first vendor to get started</p>
                <Button onClick={() => setShowNew(true)}>Add Vendor</Button>
              </Card>
            )}
          </div>
        ) : (
          /* Vendor Detail View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setSelectedVendor(null)}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => deleteVendor.mutate(selectedVendor.id)}>
                  <Trash2 className="w-4 h-4" />Delete
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedVendor.name}</h2>
                    {selectedVendor.category && <Badge className="mt-2">{selectedVendor.category}</Badge>}
                  </div>
                  {selectedVendor.rating && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-5 h-5 ${selectedVendor.rating >= s ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {selectedVendor.contact_name && (
                    <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{selectedVendor.contact_name}</p></div>
                  )}
                  {selectedVendor.email && (
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><a href={`mailto:${selectedVendor.email}`} className="text-primary">{selectedVendor.email}</a></div>
                  )}
                  {selectedVendor.phone && (
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{selectedVendor.phone}</div>
                  )}
                  {selectedVendor.website && (
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /><a href={selectedVendor.website} target="_blank" className="text-primary truncate">{selectedVendor.website}</a></div>
                  )}
                  {selectedVendor.address && (
                    <div className="col-span-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{selectedVendor.address}</div>
                  )}
                  {selectedVendor.payment_terms && (
                    <div><p className="text-muted-foreground">Payment</p><p className="font-medium">{selectedVendor.payment_terms}</p></div>
                  )}
                  {selectedVendor.lead_time_days && (
                    <div><p className="text-muted-foreground">Lead Time</p><p className="font-medium">{selectedVendor.lead_time_days} days</p></div>
                  )}
                  {selectedVendor.minimum_order && (
                    <div><p className="text-muted-foreground">Min. Order</p><p className="font-medium">${selectedVendor.minimum_order}</p></div>
                  )}
                </div>
                {selectedVendor.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedVendor.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contracts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contracts</CardTitle>
                <Dialog open={showContract} onOpenChange={setShowContract}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Contract</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Contract Name</Label><Input value={newContract.contract_name} onChange={e => setNewContract(c => ({ ...c, contract_name: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Start Date</Label><Input type="date" value={newContract.start_date} onChange={e => setNewContract(c => ({ ...c, start_date: e.target.value }))} /></div>
                        <div><Label>End Date</Label><Input type="date" value={newContract.end_date} onChange={e => setNewContract(c => ({ ...c, end_date: e.target.value }))} /></div>
                      </div>
                      <div><Label>Value ($)</Label><Input type="number" value={newContract.value} onChange={e => setNewContract(c => ({ ...c, value: e.target.value }))} /></div>
                      <div><Label>Terms</Label><Textarea value={newContract.terms} onChange={e => setNewContract(c => ({ ...c, terms: e.target.value }))} /></div>
                      <Button onClick={() => createContract.mutate()} disabled={!newContract.contract_name} className="w-full">Add Contract</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {contracts.length > 0 ? (
                  <div className="space-y-3">
                    {contracts.map(contract => (
                      <div key={contract.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{contract.contract_name}</span>
                          </div>
                          <Badge>{contract.status}</Badge>
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {contract.value && <span>${contract.value.toLocaleString()}</span>}
                          {contract.start_date && contract.end_date && (
                            <span>{new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No contracts yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default VendorDatabase;
