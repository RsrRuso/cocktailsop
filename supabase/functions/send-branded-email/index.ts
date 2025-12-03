import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: "password_reset" | "welcome" | "notification";
  resetLink?: string;
  userName?: string;
  customMessage?: string;
}

const getPasswordResetTemplate = (resetLink: string, userName?: string) => `
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
                  <td style="width: 80px; height: 80px; background-color: #1a1a1a; border-radius: 18px; text-align: center; vertical-align: middle; font-family: 'Helvetica Neue', Arial, sans-serif;">
                    <span style="font-size: 38px; font-weight: 800; letter-spacing: -2px;">
                      <span style="background: linear-gradient(180deg, #5BB5E0 0%, #7BC5A0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">S</span><span style="color: #F5D050;">V</span>
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
                ${userName ? `Hi ${userName},<br><br>` : ''}We received a request to reset your password. Click the button below to create a new password.
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

const getWelcomeTemplate = (userName?: string) => `
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
                  <td style="width: 80px; height: 80px; background-color: #1a1a1a; border-radius: 18px; text-align: center; vertical-align: middle; font-family: 'Helvetica Neue', Arial, sans-serif;">
                    <span style="font-size: 38px; font-weight: 800; letter-spacing: -2px;">
                      <span style="background: linear-gradient(180deg, #5BB5E0 0%, #7BC5A0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">S</span><span style="color: #F5D050;">V</span>
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0 0; color: #9a9a9a; font-size: 14px;">Your Professional Network</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #333333; text-align: center;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Welcome${userName ? `, ${userName}` : ''}! 🎉
              </h2>
              <p style="margin: 0 0 24px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                You're now part of the SpecVerse community. Start exploring and connecting with professionals in your industry.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://specverse.app" style="display: inline-block; padding: 16px 40px; background: linear-gradient(90deg, #D4A55A 0%, #7BA8D4 100%); color: #1a1a1a; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Get Started
                    </a>
                  </td>
                </tr>
              </table>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-branded-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, resetLink, userName, customMessage }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to: ${to}`);

    let html: string;
    let emailSubject = subject;

    switch (type) {
      case "password_reset":
        if (!resetLink) {
          throw new Error("Reset link is required for password reset emails");
        }
        html = getPasswordResetTemplate(resetLink, userName);
        emailSubject = emailSubject || "Reset Your SpecVerse Password";
        break;
      case "welcome":
        html = getWelcomeTemplate(userName);
        emailSubject = emailSubject || "Welcome to SpecVerse!";
        break;
      default:
        html = `
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
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #333333;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="width: 80px; height: 80px; background-color: #1a1a1a; border-radius: 18px; text-align: center; vertical-align: middle; font-family: 'Helvetica Neue', Arial, sans-serif;">
                    <span style="font-size: 38px; font-weight: 800; letter-spacing: -2px;">
                      <span style="background: linear-gradient(180deg, #5BB5E0 0%, #7BC5A0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">S</span><span style="color: #F5D050;">V</span>
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0 0; color: #9a9a9a; font-size: 14px;">Your Professional Network</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px 40px; background-color: #333333;">
              <p style="margin: 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                ${customMessage || "You have a new notification from SpecVerse."}
              </p>
            </td>
          </tr>
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
    }

    const emailResponse = await resend.emails.send({
      from: "SpecVerse <onboarding@resend.dev>",
      to: [to],
      subject: emailSubject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
