import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitation_id: string;
  recipient_email: string;
  recipient_name: string;
  venue_name: string;
  outlet_name?: string;
  position_title: string;
  contract_terms: {
    responsibilities?: string[];
    reporting_to?: string;
    working_hours?: string;
    probation_period?: string;
    notice_period?: string;
  };
  salary_details?: {
    base_salary?: string;
    currency?: string;
    payment_frequency?: string;
  };
  benefits_package?: string[];
  start_date?: string;
  invitation_token: string;
  expires_at: string;
  hr_sender_name: string;
}

const generateContractEmail = (data: InvitationRequest): string => {
  const confirmationUrl = `${Deno.env.get("SITE_URL") || "https://preview--spirit-staffing-hub.lovable.app"}/gm-invitation/${data.invitation_token}`;
  
  const responsibilities = data.contract_terms?.responsibilities || [
    "Overall venue operations management",
    "Staff supervision and scheduling",
    "Financial performance oversight",
    "Quality control and compliance",
    "Customer satisfaction management"
  ];

  const benefits = data.benefits_package || [
    "Competitive salary package",
    "Performance bonuses",
    "Professional development opportunities",
    "Health insurance coverage"
  ];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GM Position Offer - ${data.venue_name}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 680px; 
      margin: 0 auto; 
      background: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      margin: 10px 0 0;
      font-size: 16px;
    }
    .content { 
      padding: 40px 30px; 
    }
    .welcome-box {
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      border-left: 4px solid #7c3aed;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #7c3aed;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .detail-item {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    .detail-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-top: 4px;
    }
    ul {
      padding-left: 20px;
      margin: 0;
    }
    li {
      margin-bottom: 8px;
      color: #4b5563;
    }
    .cta-section {
      background: #f9fafb;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin-top: 15px;
    }
    .terms-box {
      background: #fef3c7;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      border-left: 4px solid #f59e0b;
    }
    .footer {
      background: #1f2937;
      padding: 30px;
      text-align: center;
    }
    .footer p {
      color: #9ca3af;
      margin: 5px 0;
      font-size: 14px;
    }
    .expiry-notice {
      color: #ef4444;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Position Offer</h1>
      <p>General Manager Invitation</p>
    </div>
    
    <div class="content">
      <div class="welcome-box">
        <h2 style="margin: 0 0 10px; color: #1f2937;">Dear ${data.recipient_name},</h2>
        <p style="margin: 0; color: #4b5563;">
          We are delighted to extend this formal invitation for you to join 
          <strong>${data.venue_name}</strong>${data.outlet_name ? ` (${data.outlet_name})` : ''} 
          as our <strong>${data.position_title}</strong>.
        </p>
      </div>

      <div class="section">
        <div class="section-title">📋 Position Details</div>
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Position</div>
            <div class="detail-value">${data.position_title}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Venue</div>
            <div class="detail-value">${data.venue_name}</div>
          </div>
          ${data.start_date ? `
          <div class="detail-item">
            <div class="detail-label">Start Date</div>
            <div class="detail-value">${data.start_date}</div>
          </div>
          ` : ''}
          <div class="detail-item">
            <div class="detail-label">Reports To</div>
            <div class="detail-value">${data.contract_terms?.reporting_to || 'HR Department'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📌 Key Responsibilities</div>
        <ul>
          ${responsibilities.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      ${data.salary_details ? `
      <div class="section">
        <div class="section-title">💰 Compensation</div>
        <div class="detail-item">
          <div class="detail-label">Base Salary</div>
          <div class="detail-value">${data.salary_details.currency || 'AED'} ${data.salary_details.base_salary} ${data.salary_details.payment_frequency || 'per month'}</div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">🎁 Benefits Package</div>
        <ul>
          ${benefits.map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>

      <div class="terms-box">
        <strong>📜 Terms & Conditions</strong>
        <ul style="margin-top: 10px;">
          <li>Probation Period: ${data.contract_terms?.probation_period || '90 days'}</li>
          <li>Working Hours: ${data.contract_terms?.working_hours || 'As per venue requirements'}</li>
          <li>Notice Period: ${data.contract_terms?.notice_period || '30 days during probation, 60 days thereafter'}</li>
        </ul>
        <p style="margin: 10px 0 0; font-size: 14px; color: #92400e;">
          By accepting this invitation, you agree to abide by all company policies and procedures.
        </p>
      </div>

      <div class="cta-section">
        <p style="margin: 0; font-size: 16px; color: #4b5563;">
          To confirm your position and access your GM Dashboard, please click below:
        </p>
        <a href="${confirmationUrl}" class="cta-button">
          ✅ Accept & Confirm Position
        </a>
        <p class="expiry-notice" style="margin-top: 20px;">
          ⏰ This invitation expires on ${new Date(data.expires_at).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions about this offer, please don't hesitate to contact our HR department.
      </p>

      <p style="margin-top: 30px;">
        Warm regards,<br>
        <strong>${data.hr_sender_name}</strong><br>
        <span style="color: #6b7280;">Human Resources Department</span>
      </p>
    </div>

    <div class="footer">
      <p>This is an official invitation from ${data.venue_name}</p>
      <p>Please do not share this email as it contains a unique confirmation link</p>
    </div>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("GM Invitation email request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data: InvitationRequest = await req.json();
    console.log("Sending invitation to:", data.recipient_email);

    // Generate email HTML
    const emailHtml = generateContractEmail(data);

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "HR Department <hr@resend.dev>",
      to: [data.recipient_email],
      subject: `🎉 GM Position Offer - ${data.venue_name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update the invitation with sent_at timestamp
    const { error: updateError } = await supabaseClient
      .from("gm_invitations")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", data.invitation_id);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending GM invitation:", error);
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
