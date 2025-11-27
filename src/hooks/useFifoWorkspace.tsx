import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FifoWorkspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
  workspace_type: string;
}

interface FifoWorkspaceContextType {
  currentWorkspace: FifoWorkspace | null;
  workspaces: FifoWorkspace[];
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<FifoWorkspace | null>;
  refreshWorkspaces: () => Promise<void>;
}

const FifoWorkspaceContext = createContext<FifoWorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  isLoading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => null,
  refreshWorkspaces: async () => {},
});

export const useFifoWorkspace = () => useContext(FifoWorkspaceContext);

export const FifoWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<FifoWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<FifoWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch FIFO workspaces user owns
      const { data: ownedWorkspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('workspace_type', 'fifo_inventory');

      // Fetch FIFO workspaces user is member of
      const { data: memberWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces!inner(*)')
        .eq('user_id', user.id)
        .eq('workspace.workspace_type', 'fifo_inventory');

      const memberWorkspacesData = memberWorkspaces?.map((m: any) => m.workspace).filter(Boolean) || [];
      const allWorkspaces = [...(ownedWorkspaces || []), ...memberWorkspacesData];

      // Remove duplicates
      const uniqueWorkspaces = Array.from(
        new Map(allWorkspaces.map(w => [w.id, w])).values()
      );

      setWorkspaces(uniqueWorkspaces);

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('currentFifoWorkspaceId');
      const workspace = savedWorkspaceId
        ? uniqueWorkspaces.find(w => w.id === savedWorkspaceId)
        : uniqueWorkspaces[0];

      setCurrentWorkspace(workspace || null);
    } catch (error) {
      console.error('Error fetching FIFO workspaces:', error);
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
      localStorage.removeItem('currentFifoWorkspaceId');
      return;
    }

    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentFifoWorkspaceId', workspaceId);
    }
  };

  const createWorkspace = async (name: string, description?: string): Promise<FifoWorkspace | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          description,
          owner_id: user.id,
          workspace_type: 'fifo_inventory',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWorkspaces();
      return data;
    } catch (error) {
      console.error('Error creating FIFO workspace:', error);
      return null;
    }
  };

  return (
    <FifoWorkspaceContext.Provider
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
    </FifoWorkspaceContext.Provider>
  );
};
