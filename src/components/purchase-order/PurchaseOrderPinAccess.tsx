import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Package, History, ArrowLeft, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Workspace {
  id: string;
  name: string;
}

interface LoggedInUser {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

export function PurchaseOrderPinAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
    checkExistingSession();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoadingWorkspaces(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const checkExistingSession = () => {
    const savedSession = sessionStorage.getItem("po_user_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setLoggedInUser(session);
      } catch (e) {
        sessionStorage.removeItem("po_user_session");
      }
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  useEffect(() => {
    if (pin.length === 4 && !isLoading && !loggedInUser) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (!selectedWorkspace) return;
    
    setIsLoading(true);
    try {
      // Verify PIN against workspace members
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, profiles(full_name, email)")
        .eq("workspace_id", selectedWorkspace)
        .eq("pin_code", pin)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again",
          variant: "destructive",
        });
        setPin("");
        return;
      }

      const workspace = workspaces.find((w) => w.id === selectedWorkspace);
      const profile = data.profiles as { full_name?: string; email?: string } | null;
      
      const session: LoggedInUser = {
        id: data.user_id || data.id,
        name: profile?.full_name || profile?.email || "Team Member",
        workspaceId: selectedWorkspace,
        workspaceName: workspace?.name || "Workspace",
      };

      sessionStorage.setItem("po_user_session", JSON.stringify(session));
      setLoggedInUser(session);

      toast({
        title: `Welcome, ${session.name}!`,
        description: `Logged into ${session.workspaceName}`,
      });
    } catch (error) {
      console.error("PIN verification error:", error);
      toast({
        title: "Error",
        description: "Failed to verify PIN",
        variant: "destructive",
      });
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("po_user_session");
    setLoggedInUser(null);
    setPin("");
    setSelectedWorkspace(null);
  };

  const handleActionSelect = (action: "orders" | "history" | "receiving") => {
    navigate("/purchase-orders", {
      state: {
        userId: loggedInUser?.id,
        userName: loggedInUser?.name,
        workspaceId: loggedInUser?.workspaceId,
        workspaceName: loggedInUser?.workspaceName,
        initialTab: action,
      },
    });
  };

  // Loading state
  if (isLoadingWorkspaces) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading workspaces...</div>
      </div>
    );
  }

  // Logged in - show action selection
  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-md mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-6 shadow-lg"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Purchase Orders</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Welcome, {loggedInUser.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {loggedInUser.workspaceName}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full h-14 text-lg justify-start gap-3"
                onClick={() => handleActionSelect("orders")}
              >
                <Package className="w-5 h-5" />
                View Orders
              </Button>
              
              <Button
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-3"
                onClick={() => handleActionSelect("receiving")}
              >
                <Lock className="w-5 h-5" />
                Receive Delivery
              </Button>
              
              <Button
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-3"
                onClick={() => handleActionSelect("history")}
              >
                <History className="w-5 h-5" />
                Order History
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-6 text-muted-foreground"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Workspace selection
  if (!selectedWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-md mx-auto pt-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-6 shadow-lg"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Purchase Orders</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Select your workspace to continue
              </p>
            </div>

            <Select onValueChange={setSelectedWorkspace}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Choose workspace..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {workspaces.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                No workspaces available
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // PIN entry
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-md mx-auto pt-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedWorkspace(null)}
          className="mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-2xl p-6 shadow-lg"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Enter PIN</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {workspaces.find((w) => w.id === selectedWorkspace)?.name}
            </p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  pin.length > i
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/50"
                }`}
              >
                {pin.length > i ? "•" : ""}
              </div>
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-2xl font-semibold"
                onClick={() => handlePinInput(num.toString())}
                disabled={isLoading}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-16 text-sm"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-16 text-2xl font-semibold"
              onClick={() => handlePinInput("0")}
              disabled={isLoading}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-16"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Delete className="w-6 h-6" />
            </Button>
          </div>

          {isLoading && (
            <div className="mt-4 text-center text-muted-foreground text-sm">
              Verifying...
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
