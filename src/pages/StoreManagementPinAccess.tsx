import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Delete, Store, History, LogOut, ClipboardList, ArrowLeft } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  workspace_id: string;
}

export default function StoreManagementPinAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pin, setPin] = useState("");
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [loggedInMember, setLoggedInMember] = useState<WorkspaceMember | null>(null);
  const [loggedInWorkspace, setLoggedInWorkspace] = useState<Workspace | null>(null);
  const [memberName, setMemberName] = useState<string>("");

  useEffect(() => {
    fetchWorkspaces();

    // Check for existing session
    const savedSession = sessionStorage.getItem("store_management_staff_session");
    if (savedSession) {
      const { member, workspace, name } = JSON.parse(savedSession);
      setLoggedInMember(member);
      setLoggedInWorkspace(workspace);
      setMemberName(name);
    }
  }, []);

  useEffect(() => {
    const workspaceId = searchParams.get('workspace');
    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) setSelectedWorkspace(workspace);
    }
  }, [workspaces, searchParams]);

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("workspace_type", "store_management")
        .order("name");

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const handleSubmit = async () => {
    if (!selectedWorkspace || pin.length !== 4) return;

    setIsPinLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('verify_workspace_member_pin', {
          p_workspace_id: selectedWorkspace.id,
          p_pin_code: pin
        });

      if (error || !data || data.length === 0) {
        toast({ 
          title: "Invalid PIN", 
          description: "Please check your PIN and try again.",
          variant: "destructive" 
        });
        setPin("");
        return;
      }

      const member = data[0];
      const memberData: WorkspaceMember = {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        workspace_id: member.workspace_id
      };

      // Save session
      sessionStorage.setItem("store_management_staff_session", JSON.stringify({
        member: memberData,
        workspace: selectedWorkspace,
        name: member.member_name
      }));

      setLoggedInMember(memberData);
      setLoggedInWorkspace(selectedWorkspace);
      setMemberName(member.member_name);
      setPin("");

      toast({ title: "Welcome!", description: `Logged in as ${member.member_name}` });
    } catch (error) {
      console.error("PIN verification error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to verify PIN. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("store_management_staff_session");
    setLoggedInMember(null);
    setLoggedInWorkspace(null);
    setMemberName("");
    setSelectedWorkspace(null);
    toast({ title: "Logged out", description: "Session ended." });
  };

  const handleActionSelect = (action: 'inventory' | 'activity') => {
    if (!loggedInWorkspace || !loggedInMember) return;
    
    if (action === 'inventory') {
      navigate(`/store-management?workspace=${loggedInWorkspace.id}&staff=true`);
    } else {
      navigate(`/inventory-activity-log?workspace=${loggedInWorkspace.id}`);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-pulse">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4" />
            <div className="h-6 bg-muted rounded w-48 mx-auto" />
            <div className="h-4 bg-muted rounded w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-14 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Action Selection Screen (after login)
  if (loggedInMember && loggedInWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-4"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">Store Management</CardTitle>
            <p className="text-muted-foreground mt-2">
              Welcome, {memberName}
            </p>
            <p className="text-sm text-muted-foreground">
              {loggedInWorkspace.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Choose an action
            </p>
            
            <Button
              variant="outline"
              className="w-full h-20 text-lg justify-start gap-4"
              onClick={() => handleActionSelect('inventory')}
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Inventory</div>
                <div className="text-sm text-muted-foreground">Manage store inventory</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-20 text-lg justify-start gap-4"
              onClick={() => handleActionSelect('activity')}
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <History className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Activity Log</div>
                <div className="text-sm text-muted-foreground">View inventory activity</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Workspace Selection Screen
  if (!selectedWorkspace) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/profile')}
          className="self-start mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl">Store Management</CardTitle>
              <p className="text-muted-foreground mt-2">Inventory Management System</p>
              <p className="text-sm text-muted-foreground mt-1">Select your workspace to continue</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspaces.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No store management workspaces available. Contact your admin.
                </p>
              ) : (
                <Select
                  onValueChange={(value) => {
                    const workspace = workspaces.find(w => w.id === value);
                    if (workspace) setSelectedWorkspace(workspace);
                  }}
                >
                  <SelectTrigger className="w-full h-14 text-lg">
                    <SelectValue placeholder="Select your workspace" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {workspaces.map(workspace => (
                      <SelectItem key={workspace.id} value={workspace.id} className="text-base py-3">
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // PIN Entry Screen
  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setSelectedWorkspace(null)}
        className="self-start mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-sm relative">
          {isPinLoading && (
            <div className="absolute inset-0 z-20 rounded-lg bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking PIN…</p>
            </div>
          )}

          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
              <Store className="w-6 h-6 text-emerald-500" />
            </div>
            <CardTitle className="text-lg">{selectedWorkspace.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Enter your 4-digit PIN</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* PIN Display */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted'
                  }`}
                >
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-14 text-xl font-semibold"
                  onClick={() => handlePinInput(String(digit))}
                  disabled={isPinLoading}
                >
                  {digit}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14"
                onClick={handleClear}
                disabled={isPinLoading}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => handlePinInput('0')}
                disabled={isPinLoading}
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-14"
                onClick={handleDelete}
                disabled={isPinLoading}
              >
                <Delete className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}