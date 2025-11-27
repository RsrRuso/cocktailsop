import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const FifoRequestAccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!workspaceId) {
      toast.error("No workspace specified");
      navigate('/inventory-manager');
      return;
    }

    fetchWorkspaceInfo();
  }, [workspaceId]);

  const fetchWorkspaceInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('workspace_type', 'fifo')
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Workspace not found");
        navigate('/inventory-manager');
        return;
      }

      setWorkspace(data);
    } catch (error: any) {
      console.error('Error fetching workspace:', error);
      toast.error("Failed to load workspace");
      navigate('/inventory-manager');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workspaceId) return;

    setSubmitting(true);
    try {
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('access_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast.error("You already have a pending request for this workspace");
        setSubmitting(false);
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (existingMember) {
        toast.success("You're already a member of this workspace!");
        navigate('/inventory-manager');
        return;
      }

      // Create access request
      const { error } = await supabase
        .from('access_requests')
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          qr_code_id: workspaceId, // Using workspace_id as qr_code_id for FIFO
          user_email: user.email,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Access request submitted! Waiting for approval...");
      navigate('/inventory-manager');
    } catch (error: any) {
      console.error('Error requesting access:', error);
      toast.error(error.message || "Failed to submit access request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container max-w-md mx-auto px-4 py-8 pt-20">
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Request Workspace Access</CardTitle>
            <CardDescription>
              Request to join "{workspace?.name}" FIFO workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Please sign in to request access to this FIFO workspace
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full"
                  size="lg"
                >
                  Sign In to Request Access
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/inventory-manager')}
                  className="w-full"
                >
                  Go to FIFO Inventory
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <Label className="text-sm">Workspace Name</Label>
                  <Input 
                    value={workspace?.name || ''} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Your Email</Label>
                  <Input 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label className="text-sm">Message to Owner (Optional)</Label>
                  <Input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Why do you want to join?"
                    className="h-9"
                  />
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Your request will be sent to the workspace owner for approval.
                    You'll be notified once your request is reviewed.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/inventory-manager')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      "Send Request"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default FifoRequestAccess;
