import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users, Target, Clock, CheckCircle, TrendingUp, Activity, BarChart3 } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface Team {
  id: string;
  name: string;
}

interface TeamStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  total_members: number;
  total_hours_logged: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  title: string;
  role: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: string;
  time_tracking: any;
  estimated_hours: number | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const TeamDashboard = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamData();
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
      if (data && data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async () => {
    if (!selectedTeamId) return;

    try {
      // Fetch team stats
      const { data: statsData, error: statsError } = await supabase
        .rpc("get_team_stats", { team_uuid: selectedTeamId });

      if (statsError) throw statsError;
      setTeamStats(statsData[0] || null);

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("id, user_id, title, role")
        .eq("team_id", selectedTeamId);

      if (membersError) throw membersError;

      // Fetch profiles for all members
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.id === member.user_id) || {
            username: "unknown",
            full_name: "Unknown User"
          }
        }));

        setTeamMembers(membersWithProfiles);
      } else {
        setTeamMembers([]);
      }

      // Fetch team tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status, priority, assigned_to, time_tracking, estimated_hours")
        .eq("team_id", selectedTeamId);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error: any) {
      toast.error("Failed to load team data");
    }
  };

  const getMemberWorkload = (userId: string) => {
    return tasks.filter(
      (task) => task.assigned_to === userId && !["completed", "cancelled"].includes(task.status)
    ).length;
  };

  const getMemberHours = (userId: string) => {
    return tasks
      .filter((task) => task.assigned_to === userId)
      .reduce((acc, task) => {
        const spent = task.time_tracking?.spent || 0;
        return acc + spent;
      }, 0);
  };

  const statusDistribution = [
    { name: "Completed", value: teamStats?.completed_tasks || 0, color: COLORS[0] },
    { name: "In Progress", value: teamStats?.in_progress_tasks || 0, color: COLORS[1] },
    { name: "Pending", value: teamStats?.pending_tasks || 0, color: COLORS[2] },
  ];

  const memberWorkloadData = teamMembers.map((member) => ({
    name: member.profiles.full_name,
    workload: getMemberWorkload(member.user_id),
    hours: getMemberHours(member.user_id),
  }));

  const completionRate = teamStats
    ? (teamStats.completed_tasks / (teamStats.total_tasks || 1)) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto p-4 pt-20 pb-24 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Team Dashboard</h1>
            <p className="text-muted-foreground">Track team performance and workload</p>
          </div>

          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {teamStats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamStats.total_tasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {teamStats.completed_tasks} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamStats.total_members}</div>
                  <p className="text-xs text-muted-foreground">Active collaborators</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamStats.total_hours_logged.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">Total time tracked</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
                  <Progress value={completionRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Task Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Member Workload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={memberWorkloadData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="workload" fill={COLORS[0]} name="Active Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Team Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members Performance</CardTitle>
                <CardDescription>Individual workload and time tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {teamMembers.map((member) => {
                      const workload = getMemberWorkload(member.user_id);
                      const hours = getMemberHours(member.user_id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{member.profiles.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              @{member.profiles.username}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{member.title}</Badge>
                              <Badge variant="secondary">{member.role}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-4 h-4" />
                              <span className="text-sm font-medium">{workload} tasks</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm text-muted-foreground">
                                {hours.toFixed(1)}h logged
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {teamMembers.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No team members found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TeamDashboard;