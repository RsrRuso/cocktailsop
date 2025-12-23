import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PinNotificationRequest {
  userId: string;
  pin: string;
  workspaceName: string;
  workspaceType: "fifo" | "store_management" | "procurement" | "mixologist" | "lab_ops";
}

const getEmailTemplate = (pin: string, workspaceName: string, workspaceType: string, userName?: string) => {
  const workspaceTypeLabel = {
    fifo: "FIFO Workspace",
    store_management: "Store Management",
    procurement: "Procurement Workspace",
    mixologist: "Mixologist Group",
    lab_ops: "LAB Ops Outlet"
  }[workspaceType] || "Workspace";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🔐</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">
                Access PIN Granted
              </h1>
              <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">${workspaceTypeLabel}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 40px 40px;">
              <p style="margin: 0 0 24px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                ${userName ? `Hi ${userName},` : 'Hello,'}<br><br>
                You've been granted access to <strong style="color: #ffffff;">${workspaceName}</strong>. Use the PIN below for mobile access:
              </p>
              
              <!-- PIN Display Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 4px; display: inline-block;">
                      <div style="background: #1a1a2e; border-radius: 10px; padding: 20px 40px;">
                        <p style="margin: 0 0 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your PIN Code</p>
                        <p style="margin: 0; font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #f59e0b; font-family: 'Courier New', monospace;">
                          ${pin}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0; color: #f59e0b; font-size: 14px; font-weight: 600;">⚠️ Keep this PIN secure</p>
                <p style="margin: 8px 0 0 0; color: #888; font-size: 13px; line-height: 1.5;">
                  This PIN grants access to workspace features. Do not share it with anyone who shouldn't have access.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: rgba(0,0,0,0.3); text-align: center;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                © ${new Date().getFullYear()} SpecVerse. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #666; font-size: 11px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pin-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, pin, workspaceName, workspaceType }: PinNotificationRequest = await req.json();
    
    console.log(`Sending PIN notification to user: ${userId} for workspace: ${workspaceName}`);

    // Initialize Supabase client to get user email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's email and name from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Could not find user email");
    }

    const html = getEmailTemplate(pin, workspaceName, workspaceType, profile.full_name);

    const emailResponse = await resend.emails.send({
      from: "SpecVerse <onboarding@resend.dev>",
      to: [profile.email],
      subject: `🔐 Your Access PIN for ${workspaceName}`,
      html,
    });

    console.log("PIN notification email sent successfully:", emailResponse);

    // Create internal email (Neuron Email)
    const workspaceTypeLabel = {
      fifo: "FIFO Workspace",
      store_management: "Store Management",
      procurement: "Procurement Workspace",
      mixologist: "Mixologist Group",
      lab_ops: "LAB Ops Outlet"
    }[workspaceType] || "Workspace";

    await supabase.from("internal_emails").insert({
      sender_id: userId, // Self-sent system notification
      recipient_id: userId,
      subject: `🔐 Access PIN Granted - ${workspaceName}`,
      body: `<div>
        <h2 style="color: #f59e0b; margin-bottom: 16px;">Access PIN Granted</h2>
        <p>You've been granted access to <strong>${workspaceName}</strong> (${workspaceTypeLabel}).</p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Your PIN Code</p>
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace; margin: 0;">${pin}</p>
        </div>
        <p style="font-size: 14px; margin-top: 16px;">⚠️ Keep this PIN secure. Do not share it with anyone who shouldn't have access.</p>
        <p style="font-size: 13px; margin-top: 12px;">Use this PIN to log in via the mobile app or POS terminal.</p>
      </div>`,
      read: false,
      starred: true,
      archived: false,
      is_draft: false
    });

    // Also create in-app notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "pin_granted",
      content: `🔐 You've been granted access PIN: **${pin}** for ${workspaceName}. Check your Neuron Email for details.`,
      read: false
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending PIN notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
