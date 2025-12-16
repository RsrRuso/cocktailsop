import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Delete, Calculator, History, LogOut, Beaker, Download, Share } from "lucide-react";
interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  group_id: string;
}

interface MixologistGroup {
  id: string;
  name: string;
}

export default function BatchCalculatorPinAccess() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<MixologistGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<MixologistGroup | null>(null);
  const [pin, setPin] = useState("");
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [loggedInMember, setLoggedInMember] = useState<GroupMember | null>(null);
  const [loggedInGroup, setLoggedInGroup] = useState<MixologistGroup | null>(null);
  const [memberName, setMemberName] = useState<string>("");
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    fetchGroups();

    // Check for existing session
    const savedSession = sessionStorage.getItem("batch_calculator_staff_session");
    if (savedSession) {
      const { member, group, name } = JSON.parse(savedSession);
      setLoggedInMember(member);
      setLoggedInGroup(group);
      setMemberName(name);
    }

    // iOS detection for install steps
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("mixologist_groups")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
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
    if (!selectedGroup || pin.length !== 4) return;

    setIsPinLoading(true);
    try {
      // First get the member by PIN
      const { data: memberData, error: memberError } = await supabase
        .from("mixologist_group_members")
        .select("id, user_id, role, group_id")
        .eq("group_id", selectedGroup.id)
        .eq("pin_code", pin)
        .eq("is_active", true)
        .single();

      if (memberError || !memberData) {
        toast({ 
          title: "Invalid PIN", 
          description: "Please check your PIN and try again", 
          variant: "destructive" 
        });
        setPin("");
        return;
      }

      // Fetch profile separately
      let name = "Team Member";
      if (memberData.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", memberData.user_id)
          .single();
        
        if (profileData) {
          name = profileData.full_name || profileData.username || "Team Member";
        }
      }

      toast({ title: `Welcome, ${name}!` });
      setLoggedInMember(memberData as GroupMember);
      setLoggedInGroup(selectedGroup);
      setMemberName(name);
      
      // Save session
      sessionStorage.setItem('batch_calculator_staff_session', JSON.stringify({ 
        member: memberData, 
        group: selectedGroup,
        name
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
    if (pin.length === 4 && !isPinLoading && selectedGroup && !loggedInMember) {
      handleSubmit();
    }
  }, [pin]);

  const handleLogout = () => {
    setLoggedInMember(null);
    setLoggedInGroup(null);
    setMemberName("");
    setSelectedGroup(null);
    setPin("");
    sessionStorage.removeItem('batch_calculator_staff_session');
  };

  const batchInstallUrl = `${window.location.origin}/batch-calculator.html`;

  const handleOpenBatchInstallPage = () => {
    window.open("/batch-calculator.html", "_blank", "noopener,noreferrer");
  };

  const handleCopyBatchInstallLink = async () => {
    try {
      await navigator.clipboard.writeText(batchInstallUrl);
      toast({ title: "Link copied", description: "Open it in Safari, then Add to Home Screen." });
    } catch {
      toast({
        title: "Couldn't copy link",
        description: batchInstallUrl,
        variant: "destructive",
      });
    }
  };

  const handleActionSelect = (action: 'calculator' | 'history') => {
    if (!loggedInMember || !loggedInGroup) return;

    navigate('/batch-calculator', { 
      state: {
        staffMode: true, 
        memberId: loggedInMember.id, 
        memberName: memberName,
        groupId: loggedInGroup.id,
        groupName: loggedInGroup.name,
        initialTab: action === 'history' ? 'history' : 'calculator'
      }
    });
  };

  // Show skeleton UI instead of spinner for faster perceived load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-pulse">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full mb-4" />
            <div className="h-8 bg-muted rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-muted rounded w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-14 bg-muted rounded" />
            <div className="h-14 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Action Selection Screen (after login)
  if (loggedInMember && loggedInGroup) {
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
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Beaker className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SV Batch Calculator</CardTitle>
            <p className="text-muted-foreground mt-2">
              Welcome, {memberName}
            </p>
            <p className="text-sm text-muted-foreground">
              {loggedInGroup.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Choose an action
            </p>
            
            <Button
              variant="outline"
              className="w-full h-20 text-lg justify-start gap-4"
              onClick={() => handleActionSelect('calculator')}
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Calculator className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Calculator</div>
                <div className="text-sm text-muted-foreground">Scale recipes & create batches</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-20 text-lg justify-start gap-4"
              onClick={() => handleActionSelect('history')}
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <History className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">History</div>
                <div className="text-sm text-muted-foreground">View production history</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group Selection Screen
  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Beaker className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SV Batch Calculator</CardTitle>
            <p className="text-muted-foreground mt-2">Recipe Scaling & Production</p>
            <p className="text-sm text-muted-foreground mt-1">Select your team to continue</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No teams available. Contact your admin.
              </p>
            ) : (
              <div className="space-y-4">
                <Select
                  onValueChange={(value) => {
                    const group = groups.find(g => g.id === value);
                    if (group) setSelectedGroup(group);
                  }}
                >
                  <SelectTrigger className="w-full h-14 text-lg">
                    <SelectValue placeholder="Select your team" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id} className="text-base py-3">
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Install to Home Screen Section */}
            <div className="pt-4 border-t mt-4 space-y-3">
              <Button
                onClick={handleOpenBatchInstallPage}
                className="w-full gap-2"
                variant="secondary"
              >
                <Download className="w-4 h-4" />
                Add SV Batch Calculator to Home Screen
              </Button>

              {showInstallGuide ? (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-center">
                    Important: install the Batch Calculator icon
                  </p>

                  {isIOS ? (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>1. This will open the Batch Calculator install page in your browser</p>
                      <p>
                        2. Tap the <Share className="w-4 h-4 inline" /> Share button
                      </p>
                      <p>3. Tap "Add to Home Screen" → "Add"</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>1. This will open the Batch Calculator install page in your browser</p>
                      <p>2. Tap the menu (⋮) → "Install app" / "Add to Home Screen"</p>
                      <p>3. Confirm</p>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowInstallGuide(false)}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowInstallGuide(true)}
                >
                  How this works
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIN Entry Screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm relative">
        {isPinLoading && (
          <div className="absolute inset-0 z-20 rounded-lg bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking PIN…</p>
          </div>
        )}

        <CardHeader className="text-center pb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => { setSelectedGroup(null); setPin(""); }}
            disabled={isPinLoading}
          >
            ← Back
          </Button>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Beaker className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{selectedGroup.name}</CardTitle>
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
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
              <Button
                key={key}
                variant={key === 'C' || key === '⌫' ? 'outline' : 'secondary'}
                className="h-14 text-xl font-semibold"
                disabled={isPinLoading}
                onClick={() => {
                  if (key === 'C') handleClear();
                  else if (key === '⌫') handleDelete();
                  else handlePinInput(key);
                }}
              >
                {key === '⌫' ? <Delete className="w-5 h-5" /> : key}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
