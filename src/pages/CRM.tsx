import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, TrendingUp, Target, Phone, Mail, Calendar, 
  DollarSign, Activity, ArrowUpRight, Plus
} from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

export default function CRM() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    totalContacts: 0,
    totalDeals: 0,
    dealsValue: 0,
    activitiesCount: 0,
    todayActivities: 0,
    conversionRate: 0
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [leadsRes, contactsRes, dealsRes, activitiesRes] = await Promise.all([
        supabase.from("crm_leads").select("status, created_at").eq("user_id", user!.id),
        supabase.from("crm_contacts").select("id").eq("user_id", user!.id),
        supabase.from("crm_deals").select("value, stage").eq("user_id", user!.id),
        supabase.from("crm_activities").select("*, crm_contacts(first_name, last_name)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10)
      ]);

      const leads = leadsRes.data || [];
      const contacts = contactsRes.data || [];
      const deals = dealsRes.data || [];
      const activities = activitiesRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newLeads = leads.filter(l => l.status === "new").length;
      const dealsValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
      const wonDeals = deals.filter(d => d.stage === "won").length;
      const conversionRate = leads.length > 0 ? Math.round((wonDeals / leads.length) * 100) : 0;

      const todayActivities = activities.filter(a => {
        const activityDate = new Date(a.due_date);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate.getTime() === today.getTime();
      }).length;

      setStats({
        totalLeads: leads.length,
        newLeads,
        totalContacts: contacts.length,
        totalDeals: deals.length,
        dealsValue,
        activitiesCount: activities.length,
        todayActivities,
        conversionRate
      });

      setRecentActivities(activities.slice(0, 5));
      
      const upcoming = activities.filter(a => 
        a.due_date && new Date(a.due_date) > new Date() && a.status !== "completed"
      ).slice(0, 5);
      setUpcomingActivities(upcoming);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access CRM</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 pt-20 pb-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              CRM Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your customers, leads, and deals
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Button 
            className="h-auto py-4 flex flex-col gap-2" 
            onClick={() => navigate("/crm/leads")}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">New Lead</span>
          </Button>
          <Button 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate("/crm/contacts")}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">Add Contact</span>
          </Button>
          <Button 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate("/crm/deals")}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">New Deal</span>
          </Button>
          <Button 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate("/crm/activities")}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm">Schedule</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/crm/leads")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                {stats.newLeads > 0 && (
                  <Badge variant="secondary">{stats.newLeads} new</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/crm/contacts")}>
            <CardHeader className="pb-3">
              <Users className="w-8 h-8 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/crm/deals")}>
            <CardHeader className="pb-3">
              <DollarSign className="w-8 h-8 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.dealsValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.totalDeals} Deals</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/crm/activities")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Activity className="w-8 h-8 text-orange-500" />
                {stats.todayActivities > 0 && (
                  <Badge variant="secondary">{stats.todayActivities} today</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activitiesCount}</div>
              <p className="text-xs text-muted-foreground">Activities</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.conversionRate}%</div>
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">${stats.dealsValue.toLocaleString()}</div>
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalDeals}</div>
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent & Upcoming Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Activities
                <Button variant="ghost" size="sm" onClick={() => navigate("/crm/activities")}>
                  View All <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {activity.type === "call" && <Phone className="w-4 h-4 text-primary" />}
                        {activity.type === "email" && <Mail className="w-4 h-4 text-primary" />}
                        {activity.type === "meeting" && <Calendar className="w-4 h-4 text-primary" />}
                        {activity.type === "task" && <Activity className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.crm_contacts?.first_name} {activity.crm_contacts?.last_name}
                        </p>
                      </div>
                      <Badge variant={activity.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Upcoming Activities
                <Button variant="ghost" size="sm" onClick={() => navigate("/crm/activities")}>
                  Schedule <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : upcomingActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming activities</p>
              ) : (
                <div className="space-y-3">
                  {upcomingActivities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}