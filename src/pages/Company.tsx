import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Users, Plus, UserPlus, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface Department {
  id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Position {
  id: string;
  position_title: string;
  start_date: string;
  is_current: boolean;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
  departments?: {
    name: string;
  };
}

export default function Company() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDepartments();
    fetchPositions();
  }, [user, navigate]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch departments:", error);
      return;
    }

    // Fetch head profiles separately
    const deptsWithHeads = await Promise.all(
      (data || []).map(async (dept) => {
        if (!dept.head_id) return { ...dept, profiles: undefined };
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", dept.head_id)
          .single();
        
        return {
          ...dept,
          profiles: profile || undefined
        };
      })
    );

    setDepartments(deptsWithHeads);
  };

  const fetchPositions = async () => {
    const { data, error } = await supabase
      .from("employee_positions")
      .select("*")
      .eq("is_current", true)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Failed to fetch positions:", error);
      return;
    }

    // Fetch profiles and departments separately
    const positionsWithDetails = await Promise.all(
      (data || []).map(async (pos) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
          .eq("id", pos.user_id)
          .single();
        
        let department = undefined;
        if (pos.department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("name")
            .eq("id", pos.department_id)
            .single();
          department = dept;
        }
        
        return {
          ...pos,
          profiles: profile || { username: "Unknown", avatar_url: null, full_name: "Unknown" },
          departments: department
        };
      })
    );

    setPositions(positionsWithDetails);
  };

  const handleCreateDepartment = async () => {
    if (!newDept.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    const { error } = await supabase.from("departments").insert({
      name: newDept.name.trim(),
      description: newDept.description.trim() || null,
    });

    if (error) {
      toast.error("Failed to create department");
      return;
    }

    toast.success("Department created successfully");
    setDialogOpen(false);
    setNewDept({ name: "", description: "" });
    fetchDepartments();
  };

  const getEmployeeCount = (deptId: string) => {
    return positions.filter((p) => p.departments?.name === departments.find(d => d.id === deptId)?.name).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto pt-20 pb-20 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Company Structure</h1>
            <p className="text-muted-foreground">Manage departments and employees</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Department Name *</Label>
                  <Input
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    placeholder="Engineering, Sales, Marketing..."
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    placeholder="What does this department do?"
                  />
                </div>
                <Button onClick={handleCreateDepartment} className="w-full">
                  Create Department
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{positions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                New This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {positions.filter((p) => {
                  const startDate = new Date(p.start_date);
                  const now = new Date();
                  return (
                    startDate.getMonth() === now.getMonth() &&
                    startDate.getFullYear() === now.getFullYear()
                  );
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Departments */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      {dept.description && (
                        <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{getEmployeeCount(dept.id)} employees</Badge>
                  </div>
                </CardHeader>
                {dept.head_id && (
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={dept.profiles?.avatar_url || ""} />
                        <AvatarFallback>
                          {dept.profiles?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Department Head</p>
                        <p className="text-xs text-muted-foreground">{dept.profiles?.username}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Employees */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Employees</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {positions.map((position) => (
                  <div key={position.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={position.profiles?.avatar_url || ""} />
                          <AvatarFallback>
                            {position.profiles?.full_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{position.profiles?.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{position.position_title}</p>
                          {position.departments && (
                            <Badge variant="outline" className="mt-1">
                              {position.departments.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Started {format(new Date(position.start_date), "MMM yyyy")}
                        </div>
                        {position.is_current && (
                          <Badge variant="secondary" className="mt-2">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
