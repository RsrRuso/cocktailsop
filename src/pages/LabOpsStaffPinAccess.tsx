import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Delete, ArrowLeft, FlaskConical } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  outlet_id: string;
  permissions: Record<string, boolean>;
}

interface Outlet {
  id: string;
  name: string;
}

export default function LabOpsStaffPinAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const outletId = searchParams.get("outlet");
  
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (outletId) {
      fetchOutlet();
    } else {
      setIsLoading(false);
    }
  }, [outletId]);

  const fetchOutlet = async () => {
    try {
      const { data, error } = await supabase
        .from("lab_ops_outlets")
        .select("id, name")
        .eq("id", outletId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Outlet not found",
          description: "This outlet may no longer be active",
          variant: "destructive",
        });
        navigate("/profile");
        return;
      }

      setOutlet(data);
    } catch (error) {
      console.error("Error fetching outlet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when 4 digits
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const verifyPin = async (pinCode: string) => {
    if (!outlet) return;

    setIsVerifying(true);
    try {
      // Use secure RPC function for PIN verification
      const { data, error } = await supabase.rpc('verify_staff_pin', {
        p_outlet_id: outlet.id,
        p_pin_code: pinCode
      });

      if (error) {
        console.error("PIN verification error:", error);
        toast({
          title: "Verification Failed",
          description: "Please check your PIN and try again",
          variant: "destructive",
        });
        setPin("");
        return;
      }

      if (!data || data.length === 0) {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again",
          variant: "destructive",
        });
        setPin("");
        return;
      }

      const staffData = data[0];
      
      // Store session in sessionStorage for StaffPOS to pick up
      sessionStorage.setItem("lab_ops_staff_session", JSON.stringify({
        staffId: staffData.staff_id,
        staffName: staffData.staff_name,
        staffRole: staffData.staff_role,
        permissions: staffData.staff_permissions || {},
        outletId: outlet.id,
        outletName: outlet.name,
        pin: pinCode,
        timestamp: Date.now()
      }));

      toast({ title: `Welcome, ${staffData.staff_name}!` });
      
      // Navigate to Staff POS with the outlet pre-selected
      navigate(`/staff-pos?outlet=${outlet.id}`);
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Login failed", variant: "destructive" });
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">No outlet specified</p>
            <Button onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <CardHeader className="text-center pb-2 pt-10">
          <div className="mx-auto w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mb-3">
            <FlaskConical className="w-7 h-7 text-cyan-500" />
          </div>
          <CardTitle className="text-xl">Staff POS</CardTitle>
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
                    ? "bg-cyan-500 border-cyan-500 text-white"
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
                disabled={isVerifying}
                onClick={() => {
                  if (key === "C") handleClear();
                  else if (key === "⌫") handleDelete();
                  else handlePinInput(key);
                }}
              >
                {isVerifying && key === "0" ? (
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