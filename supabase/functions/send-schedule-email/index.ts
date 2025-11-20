import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScheduleEmailRequest {
  staffEmail: string;
  staffName: string;
  weekRange: string;
  scheduleData: {
    [day: string]: {
      shift?: string;
      type?: string;
      station?: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { staffEmail, staffName, weekRange, scheduleData }: ScheduleEmailRequest = await req.json();

    console.log("Sending schedule email to:", staffEmail, "for week:", weekRange);

    // Create HTML schedule table
    const scheduleRows = Object.entries(scheduleData)
      .map(([day, data]) => {
        if (!data.shift || data.type === 'off') {
          return `
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">${day}</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; color: #9ca3af;">OFF</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">-</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">${day}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.shift}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${data.station || '-'}</td>
          </tr>
        `;
      })
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📅 Your Weekly Schedule</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${weekRange}</p>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hi <strong>${staffName}</strong>,
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px;">
                Your schedule for <strong>${weekRange}</strong> is ready. Please review your shifts below:
              </p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Day</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Shift Time</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Station</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleRows}
                </tbody>
              </table>

              <div style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #1e40af;">
                  <strong>Important:</strong> Please confirm your availability and report any conflicts to your manager as soon as possible.
                </p>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
                If you have any questions or concerns about your schedule, please reach out to your manager.
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                <strong>Specverse Management Team</strong>
              </p>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Specverse. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Specverse Schedule <onboarding@resend.dev>",
        to: [staffEmail],
        subject: `Your Schedule for ${weekRange}`,
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

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending schedule email:", error);
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
