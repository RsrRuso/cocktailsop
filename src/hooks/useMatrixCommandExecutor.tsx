import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
  navigateTo?: string;
}

export interface ParsedCommand {
  intent: string;
  tool: 'scheduling' | 'inventory' | 'batch' | 'general';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export function useMatrixCommandExecutor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const executeSchedulingCommand = useCallback(async (command: ParsedCommand): Promise<CommandResult> => {
    const { action, parameters } = command;

    try {
      switch (action) {
        case 'add_staff': {
          const { name, role, area } = parameters;
          const { error } = await supabase.from('staff_members').insert({
            user_id: user?.id,
            name: name || 'New Staff',
            title: role || 'Bartender',
            email: `${(name || 'staff').toLowerCase().replace(/\s/g, '.')}@venue.com`,
            area_allocation: area || 'indoor'
          });
          if (error) throw error;
          return { 
            success: true, 
            message: `✅ Added ${name || 'New Staff'} as ${role || 'Bartender'} (${area || 'indoor'})`,
            action: 'staff_added',
            navigateTo: '/staff-scheduling'
          };
        }

        case 'assign_station': {
          const { staffName, station, day } = parameters;
          // Find staff member
          const { data: staff } = await supabase
            .from('staff_members')
            .select('id, name')
            .eq('user_id', user?.id)
            .ilike('name', `%${staffName}%`)
            .single();
          
          if (!staff) {
            return { success: false, message: `❌ Could not find staff member "${staffName}"` };
          }

          const scheduleDate = new Date();
          // Adjust to requested day if specified
          if (day) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(day.toLowerCase());
            if (targetDay >= 0) {
              const currentDay = scheduleDate.getDay();
              const diff = targetDay - currentDay;
              scheduleDate.setDate(scheduleDate.getDate() + diff);
            }
          }

          const weekNumber = Math.ceil((scheduleDate.getDate() - scheduleDate.getDay() + 1) / 7);

          const { error } = await supabase.from('staff_schedules').insert({
            user_id: user?.id,
            staff_member_id: staff.id,
            station_type: station || 'Station 1',
            shift_type: 'evening',
            schedule_date: scheduleDate.toISOString().split('T')[0],
            week_number: weekNumber
          });
          if (error) throw error;
          return { 
            success: true, 
            message: `✅ Assigned ${staff.name} to ${station || 'Station 1'} on ${scheduleDate.toLocaleDateString()}`,
            action: 'station_assigned',
            navigateTo: '/staff-scheduling'
          };
        }

        case 'generate_schedule': {
          return { 
            success: true, 
            message: `📅 Opening schedule generator...`,
            action: 'navigate',
            navigateTo: '/staff-scheduling'
          };
        }

        case 'view_schedule': {
          return { 
            success: true, 
            message: '📅 Opening staff schedule...',
            action: 'navigate',
            navigateTo: '/staff-scheduling'
          };
        }

        default:
          return { success: false, message: `Unknown scheduling action: ${action}` };
      }
    } catch (error: any) {
      console.error('Scheduling command error:', error);
      return { success: false, message: `❌ ${error.message || 'Failed to execute scheduling command'}` };
    }
  }, [user?.id]);

  const executeInventoryCommand = useCallback(async (command: ParsedCommand): Promise<CommandResult> => {
    const { action, parameters } = command;

    try {
      switch (action) {
        case 'check_stock': {
          const { itemName } = parameters;
          
          // Query fifo_inventory with store items
          const { data: items, error } = await supabase
            .from('fifo_inventory')
            .select('id, quantity, status, store_id')
            .eq('user_id', user?.id)
            .limit(10);
          
          if (error) throw error;

          if (!items?.length) {
            return { 
              success: true, 
              message: itemName 
                ? `📦 No items found matching "${itemName}"` 
                : '📦 No inventory items found. Start by adding items in Inventory Manager.',
              navigateTo: '/inventory-manager'
            };
          }

          return { 
            success: true, 
            message: `📦 Found ${items.length} inventory items. Opening inventory for details...`,
            data: items,
            navigateTo: '/inventory-manager'
          };
        }

        case 'log_receive': {
          const { itemName, quantity } = parameters;
          return { 
            success: true, 
            message: `📥 Opening receive scanner for ${itemName || 'items'}...`,
            action: 'navigate',
            navigateTo: '/scan-receive'
          };
        }

        case 'transfer_item': {
          const { itemName } = parameters;
          return { 
            success: true, 
            message: `🔄 Opening transfer for ${itemName || 'items'}...`,
            action: 'navigate',
            navigateTo: '/scan-transfer'
          };
        }

        case 'check_low_stock': {
          const { data: lowItems, error } = await supabase
            .from('fifo_inventory')
            .select('id, quantity')
            .eq('user_id', user?.id)
            .lte('quantity', 5)
            .gt('quantity', 0)
            .limit(10);

          if (error) throw error;

          if (!lowItems?.length) {
            return { success: true, message: '✅ No low stock items found. All good!' };
          }

          return { 
            success: true, 
            message: `⚠️ Found ${lowItems.length} low stock items. Opening low stock view...`,
            data: lowItems,
            navigateTo: '/low-stock-inventory'
          };
        }

        case 'view_inventory': {
          return { 
            success: true, 
            message: '📦 Opening inventory manager...',
            action: 'navigate',
            navigateTo: '/inventory-manager'
          };
        }

        default:
          return { success: false, message: `Unknown inventory action: ${action}` };
      }
    } catch (error: any) {
      console.error('Inventory command error:', error);
      return { success: false, message: `❌ ${error.message || 'Failed to execute inventory command'}` };
    }
  }, [user?.id]);

  const executeBatchCommand = useCallback(async (command: ParsedCommand): Promise<CommandResult> => {
    const { action, parameters } = command;

    try {
      switch (action) {
        case 'create_batch': {
          const { recipeName, servings, liters } = parameters;
          
          // Find recipe
          const { data: recipe } = await supabase
            .from('batch_recipes')
            .select('id, recipe_name, ingredients')
            .eq('user_id', user?.id)
            .ilike('recipe_name', `%${recipeName || ''}%`)
            .limit(1)
            .single();

          if (!recipe) {
            return { 
              success: false, 
              message: `❌ Recipe "${recipeName}" not found. Opening Batch Calculator to create it...`,
              navigateTo: '/batch-calculator'
            };
          }

          const targetServings = servings || 10;
          const targetLiters = liters || 5;

          const { error } = await supabase.from('batch_productions').insert({
            user_id: user?.id,
            recipe_id: recipe.id,
            batch_name: `${recipe.recipe_name} Batch`,
            target_serves: targetServings,
            target_liters: targetLiters,
            production_date: new Date().toISOString().split('T')[0],
            produced_by_user_id: user?.id
          });

          if (error) throw error;
          return { 
            success: true, 
            message: `🧪 Created batch: ${recipe.recipe_name} - ${targetServings} servings / ${targetLiters}L`,
            action: 'batch_created',
            navigateTo: '/batch-calculator'
          };
        }

        case 'scale_recipe': {
          const { recipeName, servings } = parameters;
          return { 
            success: true, 
            message: `📊 Opening batch calculator to scale ${recipeName || 'recipe'}...`,
            action: 'navigate',
            navigateTo: '/batch-calculator'
          };
        }

        case 'view_batches': {
          const { data: batches, error } = await supabase
            .from('batch_productions')
            .select('batch_name, target_serves, production_date')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (error) throw error;

          if (!batches?.length) {
            return { 
              success: true, 
              message: '📋 No batch productions found yet. Opening Batch Calculator...', 
              navigateTo: '/batch-calculator' 
            };
          }

          const list = batches.map(b => `${b.batch_name} (${b.target_serves} servings)`).join(', ');
          return { 
            success: true, 
            message: `📋 Recent batches: ${list}`,
            data: batches,
            navigateTo: '/batch-calculator'
          };
        }

        case 'view_recipes': {
          return { 
            success: true, 
            message: '🍸 Opening batch calculator...',
            action: 'navigate',
            navigateTo: '/batch-calculator'
          };
        }

        default:
          return { success: false, message: `Unknown batch action: ${action}` };
      }
    } catch (error: any) {
      console.error('Batch command error:', error);
      return { success: false, message: `❌ ${error.message || 'Failed to execute batch command'}` };
    }
  }, [user?.id]);

  const executeCommand = useCallback(async (command: ParsedCommand): Promise<CommandResult> => {
    switch (command.tool) {
      case 'scheduling':
        return executeSchedulingCommand(command);
      case 'inventory':
        return executeInventoryCommand(command);
      case 'batch':
        return executeBatchCommand(command);
      case 'general':
        return { 
          success: true, 
          message: "I understood your request but it's a general query. Let me help you in the chat.",
          action: 'chat'
        };
      default:
        return { success: false, message: 'Unknown tool type' };
    }
  }, [executeSchedulingCommand, executeInventoryCommand, executeBatchCommand]);

  const handleNavigation = useCallback((result: CommandResult) => {
    if (result.navigateTo) {
      toast.success(result.message);
      setTimeout(() => navigate(result.navigateTo!), 800);
    }
  }, [navigate]);

  return { executeCommand, handleNavigation };
}
