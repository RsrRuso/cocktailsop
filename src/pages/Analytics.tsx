import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, Users, CheckCircle, Clock, DollarSign, Target, Activity } from "lucide-react";

interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalDeals: number;
  dealsValue: number;
  teamMembers: number;
  activeProjects: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalDeals: 0,
    dealsValue: 0,
    teamMembers: 0,
    activeProjects: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    // Fetch tasks
    const { data: tasks } = await supabase.from("tasks").select("status");
    
    // Fetch deals
    const { data: deals } = await supabase.from("crm_deals").select("value");
    
    // Fetch teams
    const { data: teams } = await supabase.from("teams").select("id");
    
    // Fetch team members
    const { data: members } = await supabase.from("team_members").select("id");

    const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
    const pendingTasks = tasks?.filter((t) => t.status === "pending").length || 0;
    const dealsValue = deals?.reduce((sum, d) => sum + Number(d.value || 0), 0) || 0;

    setStats({
      totalTasks: tasks?.length || 0,
      completedTasks,
      pendingTasks,
      totalDeals: deals?.length || 0,
      dealsValue,
      teamMembers: members?.length || 0,
      activeProjects: teams?.length || 0,
    });
  };

  const completionRate = stats.totalTasks > 0
    ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto pt-20 pb-20 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart className="w-8 h-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Track your business performance</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionRate}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                  <Target className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDeals}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active pipeline</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.dealsValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total opportunity</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.teamMembers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.activeProjects} active teams
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completed</span>
                        <span className="text-sm text-muted-foreground">{stats.completedTasks}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Pending</span>
                        <span className="text-sm text-muted-foreground">{stats.pendingTasks}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{
                            width: `${stats.totalTasks > 0 ? (stats.pendingTasks / stats.totalTasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">In Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.totalTasks - stats.completedTasks - stats.pendingTasks}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${stats.totalTasks > 0 ? ((stats.totalTasks - stats.completedTasks - stats.pendingTasks) / stats.totalTasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        <Activity className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Active Tasks</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.totalTasks - stats.completedTasks} in progress
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sales Pipeline</p>
                        <p className="text-xs text-muted-foreground">
                          ${stats.dealsValue.toLocaleString()} potential revenue
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-purple-500/10">
                        <Users className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Team Collaboration</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.teamMembers} members across {stats.activeProjects} teams
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Task Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg border">
                    <Clock className="w-8 h-8 mb-3 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">Pending Tasks</p>
                    <p className="text-3xl font-bold mt-2">{stats.pendingTasks}</p>
                  </div>
                  <div className="p-6 rounded-lg border">
                    <Activity className="w-8 h-8 mb-3 text-blue-500" />
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-3xl font-bold mt-2">
                      {stats.totalTasks - stats.completedTasks - stats.pendingTasks}
                    </p>
                  </div>
                  <div className="p-6 rounded-lg border">
                    <CheckCircle className="w-8 h-8 mb-3 text-green-500" />
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold mt-2">{stats.completedTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-lg border">
                    <DollarSign className="w-8 h-8 mb-3 text-green-500" />
                    <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
                    <p className="text-3xl font-bold mt-2">${stats.dealsValue.toLocaleString()}</p>
                  </div>
                  <div className="p-6 rounded-lg border">
                    <Target className="w-8 h-8 mb-3 text-blue-500" />
                    <p className="text-sm text-muted-foreground">Total Deals</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalDeals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-lg border">
                    <Users className="w-8 h-8 mb-3 text-purple-500" />
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-3xl font-bold mt-2">{stats.teamMembers}</p>
                  </div>
                  <div className="p-6 rounded-lg border">
                    <Activity className="w-8 h-8 mb-3 text-blue-500" />
                    <p className="text-sm text-muted-foreground">Active Teams</p>
                    <p className="text-3xl font-bold mt-2">{stats.activeProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
