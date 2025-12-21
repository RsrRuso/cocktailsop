import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import HRGMInvitations from "@/components/hr/HRGMInvitations";
import { HROwnershipReviewDashboard } from "@/components/hr/HROwnershipReviewDashboard";
import { 
  ArrowLeft, Shield, Crown, Users, FileCheck, Loader2,
  Building2, UserCheck, Briefcase
} from "lucide-react";

const HRDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHR, setIsHR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("gm-invitations");

  useEffect(() => {
    checkHRAccess();
  }, [user]);

  const checkHRAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("hr_department_members")
        .select("id, role, permissions")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsHR(!!data);
    } catch (err) {
      console.error("Error checking HR access:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to access the HR Dashboard</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isHR) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="pt-20 px-4 max-w-2xl mx-auto">
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center space-y-4">
              <Shield className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the HR Dashboard. 
                Please contact your administrator if you believe this is an error.
              </p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 py-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white gap-1">
                <Shield className="w-3 h-3" />
                HR Department
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">HR Management Dashboard</h1>
            <p className="text-muted-foreground">Manage staff, invitations, and approvals</p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="gm-invitations" className="gap-2">
              <Crown className="w-4 h-4" />
              GM Invitations
            </TabsTrigger>
            <TabsTrigger value="ownership-reviews" className="gap-2">
              <Building2 className="w-4 h-4" />
              Ownership Reviews
            </TabsTrigger>
            <TabsTrigger value="employment-claims" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Employment Claims
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gm-invitations">
            <HRGMInvitations />
          </TabsContent>

          <TabsContent value="ownership-reviews">
            <HROwnershipReviewDashboard />
          </TabsContent>

          <TabsContent value="employment-claims">
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Employment Claims</h3>
                <p className="text-muted-foreground">
                  Review and manage employee verification claims
                </p>
                <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default HRDashboard;
