import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProcurementPinLogin from "@/components/procurement/ProcurementPinLogin";
import { Loader2 } from "lucide-react";

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

export default function POPinAccess() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInStaff, setLoggedInStaff] = useState<ProcurementStaff | null>(null);
  const [loggedInWorkspace, setLoggedInWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    fetchWorkspaces();
    
    // Check for existing session
    const savedSession = sessionStorage.getItem('po_staff_session');
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

  const handleLogin = (staff: ProcurementStaff, workspace: Workspace) => {
    setLoggedInStaff(staff);
    setLoggedInWorkspace(workspace);
    
    // Save session
    sessionStorage.setItem('po_staff_session', JSON.stringify({ staff, workspace }));
    
    // Navigate to PO page with staff context
    navigate('/purchase-orders', { 
      state: {
        staffMode: true, 
        staffId: staff.id, 
        staffName: staff.full_name,
        workspaceId: workspace.id,
        workspaceName: workspace.name
      }
    });
  };

  const handleLogout = () => {
    setLoggedInStaff(null);
    setLoggedInWorkspace(null);
    sessionStorage.removeItem('po_staff_session');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loggedInStaff && loggedInWorkspace) {
    // Redirect to PO page if already logged in
    navigate('/purchase-orders', { 
      state: { 
        staffMode: true, 
        staffId: loggedInStaff.id, 
        staffName: loggedInStaff.full_name,
        workspaceId: loggedInWorkspace.id,
        workspaceName: loggedInWorkspace.name
      }
    });
    return null;
  }

  return (
    <ProcurementPinLogin
      workspaces={workspaces}
      onLogin={handleLogin}
      type="po"
    />
  );
}
