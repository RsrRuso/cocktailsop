import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  isLoading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => null,
  refreshWorkspaces: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch workspaces user owns (only store_management type)
      const { data: ownedWorkspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('workspace_type', 'store_management');

      // Fetch workspaces user is member of (only store_management type)
      const { data: memberWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces!inner(*)')
        .eq('user_id', user.id)
        .eq('workspace.workspace_type', 'store_management');

      const memberWorkspacesData = memberWorkspaces?.map((m: any) => m.workspace).filter(Boolean) || [];
      const allWorkspaces = [...(ownedWorkspaces || []), ...memberWorkspacesData];

      // Remove duplicates
      const uniqueWorkspaces = Array.from(
        new Map(allWorkspaces.map(w => [w.id, w])).values()
      );

      setWorkspaces(uniqueWorkspaces);

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const workspace = savedWorkspaceId
        ? uniqueWorkspaces.find(w => w.id === savedWorkspaceId)
        : uniqueWorkspaces[0];

      setCurrentWorkspace(workspace || null);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  const switchWorkspace = (workspaceId: string) => {
    // Handle personal inventory (no workspace)
    if (!workspaceId || workspaceId === 'personal') {
      setCurrentWorkspace(null);
      localStorage.removeItem('currentWorkspaceId');
      return;
    }

    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
  };
  const createWorkspace = async (name: string, description?: string): Promise<Workspace | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          description,
          owner_id: user.id,
          workspace_type: 'store_management',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWorkspaces();
      return data;
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        isLoading,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
