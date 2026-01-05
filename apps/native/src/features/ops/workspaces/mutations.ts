import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type CreateWorkspaceInput = {
  ownerId: string;
  name: string;
  description?: string;
};

export function useCreateFifoWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const name = input.name.trim();
      const description = (input.description ?? '').trim();
      if (!name) throw new Error('Workspace name is required.');

      const attemptWithType = await supabase.from('workspaces').insert({
        owner_id: input.ownerId,
        name,
        description: description ? description : null,
        workspace_type: 'fifo',
      } as any);
      if (!attemptWithType.error) return;

      // Fallback if workspace_type isn't present in DB schema.
      const attemptWithoutType = await supabase.from('workspaces').insert({
        owner_id: input.ownerId,
        name,
        description: description ? description : null,
      } as any);
      if (attemptWithoutType.error) throw attemptWithoutType.error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['ops', 'fifoWorkspaces', vars.ownerId] });
    },
  });
}

