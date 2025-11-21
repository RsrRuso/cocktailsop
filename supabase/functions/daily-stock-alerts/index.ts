import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body for test mode
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const testMode = body.test === true;
    const testWorkspaceId = body.workspaceId;
    
    console.log('Starting daily stock alerts check...');
    console.log('Test mode:', testMode);
    console.log('Test workspace ID:', testWorkspaceId);

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Fetch all workspaces or specific workspace for testing
    const { data: workspaces, error: workspacesError } = testMode && testWorkspaceId
      ? await supabase
          .from('workspaces')
          .select('id, name, owner_id')
          .eq('id', testWorkspaceId)
      : await supabase
          .from('workspaces')
          .select('id, name, owner_id');

    if (workspacesError) throw workspacesError;

    console.log(`Found ${workspaces?.length || 0} workspaces to process`);

    const results = [];

    for (const workspace of workspaces || []) {
      console.log(`Processing workspace: ${workspace.name} (${workspace.id})`);

      // Get alert settings for this workspace
      const { data: settings } = await supabase
        .from('stock_alert_settings')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      // Default settings if none exist
      const minimumQuantity = settings?.minimum_quantity_threshold || 10;
      const alertEnabled = settings?.enabled ?? true;
      const alertTime = settings?.alert_time || '09:00';
      const customRecipients = settings?.alert_recipients || [];

      console.log(`Settings for ${workspace.name}:`, {
        minimumQuantity,
        alertEnabled,
        alertTime,
        recipientCount: customRecipients.length
      });

      // Check if alerts are enabled
      if (!alertEnabled && !testMode) {
        console.log(`Alerts disabled for workspace ${workspace.name}, skipping...`);
        continue;
      }

      // Parse alert time
      const [alertHour, alertMinute] = alertTime.split(':').map(Number);

      // Skip if not the right time (unless in test mode)
      if (!testMode && (currentHour !== alertHour || currentMinute < alertMinute)) {
        console.log(`Not time for alert yet for ${workspace.name} (current: ${currentHour}:${currentMinute}, alert: ${alertHour}:${alertMinute})`);
        continue;
      }

      // Get all inventory items below the minimum quantity threshold
      const { data: lowStockItems, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity,
          items(name),
          stores(name)
        `)
        .eq('workspace_id', workspace.id)
        .lte('quantity', minimumQuantity)
        .order('quantity', { ascending: true });

      if (inventoryError) {
        console.error(`Error fetching inventory for ${workspace.name}:`, inventoryError);
        continue;
      }

      console.log(`Found ${lowStockItems?.length || 0} low stock items for ${workspace.name}`);

      if (!lowStockItems || lowStockItems.length === 0) {
        console.log(`No low stock items for workspace ${workspace.name}`);
        results.push({
          workspace: workspace.name,
          itemsFound: 0,
          emailsSent: 0,
          notificationsSent: 0
        });
        continue;
      }

      // Determine email recipients
      let emailRecipients: string[] = [];

      if (customRecipients && customRecipients.length > 0) {
        // Use custom recipients from settings
        const { data: recipientProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', customRecipients);

        emailRecipients = recipientProfiles
          ?.map(p => p.email)
          .filter(email => email && email.trim() !== '') || [];
      } else {
        // Default to workspace owner and managers
        const { data: owner } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', workspace.owner_id)
          .single();

        const { data: managers } = await supabase
          .from('workspace_members')
          .select('user_id, profiles(email)')
          .eq('workspace_id', workspace.id)
          .eq('role', 'manager');

        const ownerEmail = owner?.email;
        const managerEmails = managers
          ?.map((m: any) => m.profiles?.email)
          .filter(email => email && email.trim() !== '') || [];

        emailRecipients = [
          ...(ownerEmail ? [ownerEmail] : []),
          ...managerEmails
        ].filter((email, index, self) => self.indexOf(email) === index);
      }

      console.log(`Email recipients for ${workspace.name}:`, emailRecipients);

      // Generate email HTML
      const itemsHtml = lowStockItems
        .map((item: any, index: number) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; text-align: left;">${index + 1}</td>
            <td style="padding: 12px; text-align: left; font-weight: 600;">${item.items?.name || 'Unknown'}</td>
            <td style="padding: 12px; text-align: left;">${item.stores?.name || 'Unknown'}</td>
            <td style="padding: 12px; text-align: center;">
              <span style="
                background: ${item.quantity === 0 ? '#fee2e2' : item.quantity <= 3 ? '#fed7aa' : '#dbeafe'};
                color: ${item.quantity === 0 ? '#dc2626' : item.quantity <= 3 ? '#ea580c' : '#2563eb'};
                padding: 4px 12px;
                border-radius: 12px;
                font-weight: 600;
              ">${item.quantity}</span>
            </td>
          </tr>
        `)
        .join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📦 Low Stock Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Workspace: ${workspace.name}</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${lowStockItems.length}</strong> item(s) are running low on stock in your inventory.
            </p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #6b7280;">
                <strong>Alert Threshold:</strong> Items with quantity ≤ ${minimumQuantity}
              </p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">#</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Item</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Store</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
              <p style="margin: 0; color: #78350f;">
                <strong>⚠️ Action Required:</strong> Please restock these items to maintain optimal inventory levels.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
            <p>This is an automated alert from your inventory management system.</p>
          </div>
        </body>
        </html>
      `;

      // Send email to all recipients
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const recipient of emailRecipients) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'Inventory Alerts <alerts@resend.dev>',
              to: [recipient],
              subject: `🔴 Low Stock Alert - ${workspace.name}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            console.log(`Email sent successfully to ${recipient}`);
            emailsSent++;
          } else {
            const errorData = await emailResponse.text();
            console.error(`Failed to send email to ${recipient}:`, errorData);
            emailsFailed++;
          }
        } catch (error) {
          console.error(`Error sending email to ${recipient}:`, error);
          emailsFailed++;
        }
      }

      // Create in-app notifications for all workspace members
      const { data: allMembers } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace.id);

      const memberIds = [
        workspace.owner_id,
        ...(allMembers?.map(m => m.user_id) || [])
      ].filter((id, index, self) => self.indexOf(id) === index);

      let notificationsSent = 0;

      for (const memberId of memberIds) {
        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: memberId,
              type: 'stock_alert',
              content: `⚠️ ${lowStockItems.length} items are running low on stock in ${workspace.name}`,
              read: false
            });

          if (!notifError) {
            notificationsSent++;
          } else {
            console.error('Error creating notification:', notifError);
          }
        } catch (error) {
          console.error('Error creating notification:', error);
        }
      }

      results.push({
        workspace: workspace.name,
        itemsFound: lowStockItems.length,
        emailsSent,
        emailsFailed,
        notificationsSent
      });
    }

    const response = {
      success: true,
      message: testMode 
        ? 'Test alert processed successfully' 
        : 'Daily stock alerts processed',
      results,
      timestamp: new Date().toISOString()
    };

    console.log('Stock alerts processing complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in daily-stock-alerts function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
