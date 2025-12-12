import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProcurementWorkspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcurementWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export const useProcurementWorkspace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all workspaces user has access to
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['procurement-workspaces', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('procurement_workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ProcurementWorkspace[];
    },
    enabled: !!user?.id
  });

  // Create workspace mutation
  const createWorkspace = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await (supabase as any)
        .from('procurement_workspaces')
        .insert({
          name,
          description,
          owner_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-workspaces'] });
      toast.success("Workspace created");
    },
    onError: (error: any) => {
      toast.error("Failed to create workspace: " + error.message);
    }
  });

  // Update workspace mutation
  const updateWorkspace = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await (supabase as any)
        .from('procurement_workspaces')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-workspaces'] });
      toast.success("Workspace updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update workspace: " + error.message);
    }
  });

  // Delete workspace mutation
  const deleteWorkspace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('procurement_workspaces')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-workspaces'] });
      toast.success("Workspace deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete workspace: " + error.message);
    }
  });

  // Get members of a specific workspace
  const useWorkspaceMembers = (workspaceId: string | null) => {
    return useQuery({
      queryKey: ['procurement-workspace-members', workspaceId],
      queryFn: async () => {
        if (!workspaceId) return [];
        
        const { data, error } = await (supabase as any)
          .from('procurement_workspace_members')
          .select(`
            id,
            workspace_id,
            user_id,
            role,
            joined_at
          `)
          .eq('workspace_id', workspaceId);
        
        if (error) throw error;
        
        // Fetch profiles for members
        const userIds = (data || []).map((m: any) => m.user_id);
        if (userIds.length === 0) return [];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, email')
          .in('id', userIds);
        
        return (data || []).map((member: any) => ({
          ...member,
          profile: (profiles || []).find((p: any) => p.id === member.user_id)
        })) as ProcurementWorkspaceMember[];
      },
      enabled: !!workspaceId
    });
  };

  // Add member to workspace
  const addMember = useMutation({
    mutationFn: async ({ workspaceId, userId, role = 'member' }: { workspaceId: string; userId: string; role?: string }) => {
      const { data, error } = await (supabase as any)
        .from('procurement_workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-workspace-members', variables.workspaceId] });
      toast.success("Member added");
    },
    onError: (error: any) => {
      toast.error("Failed to add member: " + error.message);
    }
  });

  // Remove member from workspace
  const removeMember = useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from('procurement_workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-workspace-members', variables.workspaceId] });
      toast.success("Member removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove member: " + error.message);
    }
  });

  return {
    workspaces,
    isLoadingWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    useWorkspaceMembers,
    addMember,
    removeMember
  };
};
