import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Delete, Package, Truck, LogOut, ClipboardList } from "lucide-react";

interface ProcurementStaff {
  id: string;
  full_name: string;
  role: string;
  workspace_id: string;
  permissions: Record<string, boolean>;
}

interface Workspace {
  id: string;
  name: string;
}

export default function ProcurementPinAccess() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pin, setPin] = useState("");
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [loggedInStaff, setLoggedInStaff] = useState<ProcurementStaff | null>(null);
  const [loggedInWorkspace, setLoggedInWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    fetchWorkspaces();
    
    // Check for existing session
    const savedSession = sessionStorage.getItem('procurement_staff_session');
    if (savedSession) {
      const { staff, workspace } = JSON.parse(savedSession);
      setLoggedInStaff(staff);
      setLoggedInWorkspace(workspace);
    }
  }, []);

  const fetchWorkspaces = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("procurement_workspaces")
        .select("id, name")
        .eq("is_active", true);

      if (error) throw error;
      setWorkspaces((data as Workspace[]) || []);
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
        .from("procurement_staff")
        .select("id, full_name, role, workspace_id, permissions")
        .eq("workspace_id", selectedWorkspace.id)
        .eq("pin_code", pin)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({ 
          title: "Invalid PIN", 
          description: "Please check your PIN and try again", 
          variant: "destructive" 
        });
        setPin("");
        return;
      }

      toast({ title: `Welcome, ${data.full_name}!` });
      setLoggedInStaff(data as ProcurementStaff);
      setLoggedInWorkspace(selectedWorkspace);
      
      // Save session
      sessionStorage.setItem('procurement_staff_session', JSON.stringify({ 
        staff: data, 
        workspace: selectedWorkspace 
      }));
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Login failed", variant: "destructive" });
      setPin("");
    } finally {
      setIsPinLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isPinLoading && selectedWorkspace && !loggedInStaff) {
      handleSubmit();
    }
  }, [pin]);

  const handleLogout = () => {
    setLoggedInStaff(null);
    setLoggedInWorkspace(null);
    setSelectedWorkspace(null);
    setPin("");
    sessionStorage.removeItem('procurement_staff_session');
  };

  const handleActionSelect = (action: 'po' | 'receiving') => {
    if (!loggedInStaff || !loggedInWorkspace) return;

    const permissions = loggedInStaff.permissions as Record<string, boolean>;
    
    if (action === 'po' && !permissions?.can_create_po) {
      toast({ 
        title: "Access Denied", 
        description: "You don't have permission to create purchase orders", 
        variant: "destructive" 
      });
      return;
    }

    if (action === 'receiving' && !permissions?.can_receive) {
      toast({ 
        title: "Access Denied", 
        description: "You don't have permission to receive items", 
        variant: "destructive" 
      });
      return;
    }

    const targetPath = action === 'po' ? '/purchase-orders' : '/po-received-items';
    navigate(targetPath, { 
      state: {
        staffMode: true, 
        staffId: loggedInStaff.id, 
        staffName: loggedInStaff.full_name,
        workspaceId: loggedInWorkspace.id,
        workspaceName: loggedInWorkspace.name
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Action Selection Screen (after login)
  if (loggedInStaff && loggedInWorkspace) {
    const permissions = loggedInStaff.permissions as Record<string, boolean>;
    const canPO = permissions?.can_create_po;
    const canReceive = permissions?.can_receive;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-4"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SV Procurement</CardTitle>
            <p className="text-muted-foreground mt-2">
              Welcome, {loggedInStaff.full_name}
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
              className={`w-full h-20 text-lg justify-start gap-4 ${!canPO ? 'opacity-50' : ''}`}
              onClick={() => handleActionSelect('po')}
              disabled={!canPO}
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Purchase Orders</div>
                <div className="text-sm text-muted-foreground">Create and manage POs</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className={`w-full h-20 text-lg justify-start gap-4 ${!canReceive ? 'opacity-50' : ''}`}
              onClick={() => handleActionSelect('receiving')}
              disabled={!canReceive}
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Receiving</div>
                <div className="text-sm text-muted-foreground">Receive deliveries</div>
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SV Procurement</CardTitle>
            <p className="text-muted-foreground mt-2">Purchase Orders & Receiving</p>
            <p className="text-sm text-muted-foreground mt-1">Select your workspace to continue</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspaces.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No workspaces available. Contact your admin.
              </p>
            ) : (
              workspaces.map(workspace => (
                <Button
                  key={workspace.id}
                  variant="outline"
                  className="w-full h-14 text-lg justify-start"
                  onClick={() => setSelectedWorkspace(workspace)}
                >
                  {workspace.name}
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIN Entry Screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm relative">
        <CardHeader className="text-center pb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => { setSelectedWorkspace(null); setPin(""); }}
          >
            ← Back
          </Button>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{selectedWorkspace.name}</CardTitle>
          <p className="text-muted-foreground text-sm">Enter your 4-digit PIN</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  pin.length > i 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-muted-foreground/30"
                }`}
              >
                {pin.length > i ? "•" : ""}
              </div>
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map(key => (
              <Button
                key={key}
                variant={key === "C" || key === "⌫" ? "outline" : "secondary"}
                className="h-14 text-xl font-semibold"
                disabled={isPinLoading}
                onClick={() => {
                  if (key === "C") handleClear();
                  else if (key === "⌫") handleDelete();
                  else handlePinInput(key);
                }}
              >
                {isPinLoading && key === "0" ? (
                  <Loader2 className="animate-spin" />
                ) : key === "⌫" ? (
                  <Delete className="w-5 h-5" />
                ) : (
                  key
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
