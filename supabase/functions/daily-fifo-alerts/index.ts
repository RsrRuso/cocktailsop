import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    console.log('Fetching expiring inventory items...');

    // Calculate date 30 days from now
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Fetch items expiring within 30 days
    const { data: expiringItems, error: itemsError } = await supabase
      .from('inventory')
      .select(`
        id,
        quantity,
        expiration_date,
        priority_score,
        items(name),
        stores(name)
      `)
      .lte('expiration_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('quantity', 1)
      .order('priority_score', { ascending: false })
      .limit(50);

    if (itemsError) {
      throw new Error(`Error fetching inventory: ${itemsError.message}`);
    }

    if (!expiringItems || expiringItems.length === 0) {
      console.log('No expiring items found');
      return new Response(
        JSON.stringify({ message: 'No expiring items found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiringItems.length} expiring items`);

    // Fetch workspace owners/managers to send emails
    const { data: workspaceMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role, profiles!inner(email, full_name)')
      .in('role', ['owner', 'manager']);

    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
    }

    const recipients = workspaceMembers
      ?.filter((m: any) => m.profiles?.email)
      .map((m: any) => ({
        email: m.profiles.email,
        name: m.profiles.full_name
      })) || [];

    // Format email content
    const itemsList = expiringItems
      .map((item: any, i: number) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const itemName = Array.isArray(item.items) ? item.items[0]?.name : item.items?.name;
        const storeName = Array.isArray(item.stores) ? item.stores[0]?.name : item.stores?.name;
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${itemName || 'Unknown'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${storeName || 'Unknown'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(item.expiration_date).toLocaleDateString()}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <span style="padding: 4px 8px; border-radius: 4px; background: ${
                daysUntilExpiry <= 7 ? '#fee2e2' : '#fef3c7'
              }; color: ${
                daysUntilExpiry <= 7 ? '#991b1b' : '#92400e'
              }; font-weight: 600;">
                ${daysUntilExpiry} days
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>FIFO Inventory Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚨 FIFO Inventory Alert</h1>
            <p style="color: #fee2e2; margin: 10px 0 0 0;">Items Expiring Soon - Action Required</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Good day! This is your automated daily inventory alert. The following items are expiring within the next 30 days:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">#</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">Item</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">Store</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">Qty</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">Expires</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc2626;">Days Left</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">
                📋 Action Required: Please review these items and take appropriate action to minimize waste.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This is an automated message sent from your inventory management system. 
              To manage your inventory, please log in to your dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>Inventory Management System - Daily FIFO Alert</p>
          </div>
        </body>
      </html>
    `;

    // Send emails to all recipients
    if (recipients.length === 0) {
      console.log('No recipients found');
      return new Response(
        JSON.stringify({ message: 'No recipients to send emails', itemsFound: expiringItems.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailPromises = recipients.map((recipient: any) =>
      resend.emails.send({
        from: 'Inventory System <onboarding@resend.dev>',
        to: recipient.email,
        subject: `🚨 FIFO Alert: ${expiringItems.length} Items Expiring Soon`,
        html: emailHtml,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`Emails sent: ${successCount}/${recipients.length}`);

    return new Response(
      JSON.stringify({
        message: 'FIFO alerts sent successfully',
        itemsFound: expiringItems.length,
        emailsSent: successCount,
        recipients: recipients.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-fifo-alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
