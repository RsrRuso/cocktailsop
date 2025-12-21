import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Shield, UserCog, Trash2, Loader2, Crown, User } from "lucide-react";

const ADMIN_ROLES = [
  { value: "owner_admin", label: "Owner Admin", icon: Crown, description: "Full control over venue" },
  { value: "hr_admin", label: "HR Admin", icon: Shield, description: "Can approve all claims" },
  { value: "outlet_manager", label: "Outlet Manager", icon: UserCog, description: "Manage specific outlet" },
  { value: "bar_manager", label: "Bar Manager", icon: User, description: "Approve bar staff only" },
];

const DEPARTMENTS = ["Bar", "Floor", "Kitchen", "Management", "Other"];

interface VenueAdmin {
  id: string;
  user_id: string;
  role: string;
  department: string;
  is_primary: boolean;
  accepted_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface VenueAdminManagerProps {
  venueId: string;
  isAdmin: boolean;
  onUpdate: () => void;
}

export const VenueAdminManager = ({ venueId, isAdmin, onUpdate }: VenueAdminManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<VenueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    role: "outlet_manager",
    department: "",
  });

  useEffect(() => {
    fetchAdmins();
  }, [venueId]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("venue_admins")
        .select("*")
        .eq("venue_id", venueId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (data || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      
      const adminsWithProfiles = (data || []).map(admin => ({
        ...admin,
        profiles: profiles?.find(p => p.id === admin.user_id)
      }));
      
      setAdmins(adminsWithProfiles as VenueAdmin[]);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .ilike("username", formData.email)
        .limit(1);

      if (profileError) throw profileError;

      // For now, we'll search by username since we don't have email in profiles
      // In production, you'd want to send an invite email

      if (!profiles || profiles.length === 0) {
        toast({
          title: "User Not Found",
          description: "No user found with that username. They need to create an account first.",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      const targetUserId = profiles[0].id;

      // Check if already an admin
      const { data: existing } = await supabase
        .from("venue_admins")
        .select("id")
        .eq("venue_id", venueId)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already Admin",
          description: "This user is already an admin for this venue",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      // Add as admin
      const { error } = await supabase
        .from("venue_admins")
        .insert({
          venue_id: venueId,
          user_id: targetUserId,
          role: formData.role,
          department: formData.department || null,
          invited_by: user?.id,
        });

      if (error) throw error;

      toast({ title: "Admin added successfully" });
      setIsDialogOpen(false);
      setFormData({ email: "", role: "outlet_manager", department: "" });
      fetchAdmins();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (adminId: string, isPrimary: boolean) => {
    if (isPrimary) {
      toast({
        title: "Cannot Remove",
        description: "Cannot remove the primary owner admin",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      const { error } = await supabase
        .from("venue_admins")
        .delete()
        .eq("id", adminId);

      if (error) throw error;

      toast({ title: "Admin removed" });
      fetchAdmins();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleInfo = (role: string) => {
    return ADMIN_ROLES.find((r) => r.value === role) || ADMIN_ROLES[2];
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Admin Team
          </CardTitle>
          <CardDescription>
            Manage who can approve employment claims
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Admin</DialogTitle>
                <DialogDescription>
                  Invite someone to help manage this venue
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Username *</Label>
                  <Input
                    id="adminEmail"
                    placeholder="Enter their SpecVerse username"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must have a SpecVerse account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="w-4 h-4" />
                            <div>
                              <div>{role.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {role.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.role === "outlet_manager" || formData.role === "bar_manager") && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(v) => setFormData({ ...formData, department: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept.toLowerCase()}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" disabled={inviting} className="w-full">
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add Admin"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No admins yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => {
              const roleInfo = getRoleInfo(admin.role);
              const RoleIcon = roleInfo.icon;
              
              return (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={admin.profiles?.avatar_url} />
                      <AvatarFallback>
                        {admin.profiles?.full_name?.[0] || admin.profiles?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {admin.profiles?.full_name || admin.profiles?.username || "Unknown"}
                        </span>
                        {admin.is_primary && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Crown className="w-3 h-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                        {admin.department && (
                          <Badge variant="outline" className="text-xs">
                            {admin.department}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && !admin.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(admin.id, admin.is_primary)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
