import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Delete, Package, Truck } from "lucide-react";

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

interface ProcurementPinLoginProps {
  workspaces: Workspace[];
  onLogin: (staff: ProcurementStaff, workspace: Workspace) => void;
  type: 'po' | 'receiving';
}

export default function ProcurementPinLogin({ workspaces, onLogin, type }: ProcurementPinLoginProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
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

      // Check permissions based on type
      const permissions = data.permissions as Record<string, boolean>;
      if (type === 'po' && !permissions?.can_create_po) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to create purchase orders", 
          variant: "destructive" 
        });
        setPin("");
        return;
      }

      if (type === 'receiving' && !permissions?.can_receive) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to receive items", 
          variant: "destructive" 
        });
        setPin("");
        return;
      }

      toast({ title: `Welcome, ${data.full_name}!` });
      onLogin(data as ProcurementStaff, selectedWorkspace);
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Login failed", variant: "destructive" });
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  if (pin.length === 4 && !isLoading && selectedWorkspace) {
    handleSubmit();
  }

  const Icon = type === 'po' ? Package : Truck;
  const title = type === 'po' ? 'Purchase Orders' : 'Receiving';
  const subtitle = type === 'po' ? 'Create and manage purchase orders' : 'Receive and track deliveries';

  if (!selectedWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SV {title}</CardTitle>
            <p className="text-muted-foreground mt-2">{subtitle}</p>
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
            <Icon className="w-6 h-6 text-primary" />
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
                disabled={isLoading}
                onClick={() => {
                  if (key === "C") handleClear();
                  else if (key === "⌫") handleDelete();
                  else handlePinInput(key);
                }}
              >
                {isLoading && key === "0" ? (
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
