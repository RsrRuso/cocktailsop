import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invitationId }: InvitationRequest = await req.json();

    console.log("Processing invitation:", invitationId);

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (invitationError) {
      console.error("Error fetching invitation:", invitationError);
      throw new Error("Failed to fetch invitation details");
    }

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Get team details
    const { data: team } = await supabase
      .from("teams")
      .select("name, description")
      .eq("id", invitation.team_id)
      .single();

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", invitation.invited_by)
      .single();

    console.log("Invitation details:", invitation);

    // Create invitation link - use APP_URL env var or construct from Supabase URL
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(
      /https:\/\/.*\.supabase\.co/,
      "https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com"
    );
    const invitationLink = `${appUrl}/team-invitation?token=${invitation.token}`;

    const inviterName = inviterProfile?.full_name || 
                       inviterProfile?.username || 
                       "A team member";

    const teamName = team?.name || "a team";
    const teamDescription = team?.description || "";

    // Send email using Resend API
    const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              .team-info { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Team Invitation</h1>
              </div>
              <div class="content">
                <p><strong>${inviterName}</strong> has invited you to join their team on our platform!</p>
                
                <div class="team-info">
                  <h2 style="margin-top: 0; color: #667eea;">Team: ${teamName}</h2>
                  ${teamDescription ? `<p>${teamDescription}</p>` : ''}
                  <p><strong>Role:</strong> ${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}</p>
                </div>

                <p>Click the button below to accept this invitation and join the team:</p>
                
                <div style="text-align: center;">
                  <a href="${invitationLink}" class="button">Accept Invitation</a>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link into your browser:<br>
                  <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">
                    ${invitationLink}
                  </code>
                </p>

                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>Sent by Team Management System</p>
              </div>
            </div>
          </body>
        </html>
      `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Team Invitation <onboarding@resend.dev>",
        to: [invitation.invited_email],
        subject: `You're invited to join ${teamName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData.message || emailResponse.statusText}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailData.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-team-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send invitation email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
