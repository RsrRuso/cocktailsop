import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MixologistGroup {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  qr_code_data?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export const useMixologistGroups = () => {
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['mixologist-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mixologist_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MixologistGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (group: Omit<MixologistGroup, 'id' | 'created_at' | 'updated_at' | 'qr_code_data' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('mixologist_groups')
        .insert([{ ...group, created_by: user.id }])
        .select()
        .single();
      
      if (error) throw error;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('mixologist_group_members')
        .insert([{
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        }]);
      
      if (memberError) throw memberError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixologist-groups'] });
      toast.success("Group created!");
    },
    onError: (error) => {
      toast.error("Failed to create group: " + error.message);
    },
  });

  const addMember = useMutation({
    mutationFn: async ({ groupId, userId, role = 'member' }: { groupId: string; userId: string; role?: string }) => {
      const { data, error } = await supabase
        .from('mixologist_group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          role
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success("Member added!");
    },
    onError: (error) => {
      toast.error("Failed to add member: " + error.message);
    },
  });

  const getGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from('mixologist_group_members')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('group_id', groupId);
    
    if (error) throw error;
    return data;
  };

  return {
    groups,
    isLoading,
    createGroup: createGroup.mutate,
    addMember: addMember.mutate,
    getGroupMembers,
  };
};