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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success("Member added!");

      // Notify all existing group members about new member
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      const { data: newMemberProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user_id)
        .single();

      const { data: groupInfo } = await supabase
        .from('mixologist_groups')
        .select('name')
        .eq('id', data.group_id)
        .single();

      // Notify ALL group members including inviter (like procurement pattern)
      // Only exclude the new member from notification about themselves
      const { data: members } = await supabase
        .from('mixologist_group_members')
        .select('user_id')
        .eq('group_id', data.group_id)
        .neq('user_id', data.user_id);

      if (members && inviterProfile && newMemberProfile && groupInfo) {
        for (const member of members) {
          try {
            await supabase.from('notifications').insert({
              user_id: member.user_id,
              type: 'member_added',
              content: `${inviterProfile.username} added ${newMemberProfile.username} to ${groupInfo.name}`,
              read: false
            });
          } catch (e) {
            // Ignore duplicate notification errors
          }
        }
      }
    },
    onError: (error) => {
      toast.error("Failed to add member: " + error.message);
    },
  });

  const getGroupMembers = async (groupId: string) => {
    // Fetch members first
    const { data: memberRows, error: membersError } = await supabase
      .from('mixologist_group_members')
      .select('*')
      .eq('group_id', groupId);

    if (membersError) throw membersError;
    if (!memberRows || memberRows.length === 0) return [];

    // Fetch their profiles separately (no implicit FK required)
    const userIds = memberRows.map((m) => m.user_id).filter(Boolean);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, p);
    });

    const enriched = memberRows.map((m: any) => ({
      ...m,
      profiles: profileMap.get(m.user_id) || null,
    }));

    return enriched;
  };

  return {
    groups,
    isLoading,
    createGroup: createGroup.mutate,
    addMember: addMember.mutate,
    getGroupMembers,
  };
};