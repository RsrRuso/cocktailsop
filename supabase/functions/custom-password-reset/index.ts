import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const getPasswordResetTemplate = (resetLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #2a2a2a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #333333; border-radius: 16px; overflow: hidden; max-width: 600px;">
          <!-- Header with SV Logo -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #333333;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="width: 80px; height: 80px; background-color: #1a1a1a; border-radius: 18px; text-align: center; vertical-align: middle;">
                    <span style="font-family: Arial Black, Arial, sans-serif; font-size: 36px; font-weight: bold;">
                      <span style="color: #5BB5E0;">S</span><span style="color: #F5D050;">v</span>
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0 0; color: #9a9a9a; font-size: 14px;">Your Professional Network</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #333333;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 24px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(90deg, #D4A55A 0%, #7BA8D4 100%); color: #1a1a1a; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #9a9a9a; font-size: 14px; line-height: 1.6;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <p style="margin: 16px 0 0 0; color: #707070; font-size: 12px;">
                This link will expire in 1 hour for security reasons.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #2a2a2a; text-align: center;">
              <p style="margin: 0; color: #707070; font-size: 12px;">
                © ${new Date().getFullYear()} SpecVerse. All rights reserved.
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

serve(async (req: Request) => {
  console.log("custom-password-reset function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email, siteUrl } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Processing password reset for: ${email}`);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("User not found, returning success anyway for security");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing token:", insertError);
      throw new Error("Failed to create reset token");
    }

    // Build reset link
    const baseUrl = siteUrl || "https://specverse.app";
    const resetLink = `${baseUrl}/password-reset?token=${token}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "SpecVerse <onboarding@resend.dev>",
      to: [email],
      subject: "Reset Your SpecVerse Password",
      html: getPasswordResetTemplate(resetLink),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in custom-password-reset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
