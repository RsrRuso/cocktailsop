import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

type EmailActionType =
  | "recovery"
  | "signup"
  | "magiclink"
  | "invite"
  | "email_change";

interface SendEmailHookPayload {
  user: {
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
  };
}

const safeOriginFromRedirect = (redirectTo: string) => {
  try {
    return new URL(redirectTo).origin;
  } catch {
    return "https://specverse.app";
  }
};

const buildVerifyLink = (siteUrl: string, tokenHash: string, type: EmailActionType, redirectTo: string) => {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirectTo)}`;
};

const emailShell = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(135deg,#141421 0%,#0b1324 100%);border-radius:18px;overflow:hidden;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const passwordRecoveryTemplate = (brandIconUrl: string, resetLink: string, userName?: string) =>
  emailShell(`
  <tr>
    <td style="padding:40px 40px 16px 40px;text-align:center;">
      <img src="${brandIconUrl}" alt="SpecVerse" width="64" height="64" style="display:inline-block;border-radius:14px;margin-bottom:14px;" />
      <div style="font-size:28px;font-weight:800;letter-spacing:0.2px;color:#ffffff;">SpecVerse</div>
      <div style="margin-top:6px;color:#8f96a3;font-size:13px;">Password Recovery</div>
    </td>
  </tr>
  <tr>
    <td style="padding:18px 40px 38px 40px;">
      <div style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 10px 0;">Reset your password</div>
      <div style="color:#b7bfcb;font-size:15px;line-height:1.7;">
        ${userName ? `Hi ${userName},` : "Hi there,"}<br><br>
        You recently requested to reset your password. Click the button below to choose a new one:
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr>
          <td align="center">
            <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:#ffffff;color:#0b1324;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:22px;color:#8f96a3;font-size:13px;line-height:1.7;">
        If you didn’t request this, you can safely ignore this email.
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px;background:rgba(0,0,0,0.28);text-align:center;">
      <div style="color:#71798a;font-size:12px;">© ${new Date().getFullYear()} SpecVerse. All rights reserved.</div>
    </td>
  </tr>
`);

serve(async (req: Request) => {
  try {
    const payload: SendEmailHookPayload = await req.json();

    const to = payload.user?.email;
    const action = payload.email_data?.email_action_type;

    if (!to || !action) {
      return new Response(JSON.stringify({ ok: false, error: "Missing user.email or email_data.email_action_type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Brand icon is a static asset; use a real JPEG file to avoid content-type mismatches in email clients.
    const brandOrigin = safeOriginFromRedirect(payload.email_data.redirect_to);
    const brandIconUrl = `${brandOrigin}/specverse-icon.jpeg`;

    // Build the verify link ourselves (this is what the built-in template does).
    const verifyLink = buildVerifyLink(
      payload.email_data.site_url,
      payload.email_data.token_hash,
      payload.email_data.email_action_type,
      payload.email_data.redirect_to,
    );

    let subject = "SpecVerse";
    let html = emailShell(`<tr><td style="padding:40px;color:#fff;">SpecVerse</td></tr>`);

    if (action === "recovery") {
      subject = "Reset your SpecVerse password";
      const userName = typeof payload.user.user_metadata?.full_name === "string"
        ? (payload.user.user_metadata?.full_name as string)
        : undefined;
      html = passwordRecoveryTemplate(brandIconUrl, verifyLink, userName);
    } else if (action === "signup") {
      subject = "Confirm your SpecVerse email";
      html = emailShell(`
        <tr><td style="padding:40px;color:#ffffff;">Please confirm your email to finish setting up your SpecVerse account.</td></tr>
      `);
    } else {
      // For other email types, fall back to a simple branded message to avoid breaking auth flows.
      subject = "SpecVerse";
      html = emailShell(`
        <tr>
          <td style="padding:40px;text-align:center;">
            <img src="${brandIconUrl}" alt="SpecVerse" width="56" height="56" style="border-radius:14px;margin-bottom:12px;" />
            <div style="color:#ffffff;font-size:18px;font-weight:700;">SpecVerse</div>
            <div style="margin-top:10px;color:#b7bfcb;font-size:14px;">This is an automated message.</div>
          </td>
        </tr>
      `);
    }

    const emailResponse = await resend.emails.send({
      from: "SpecVerse <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    return new Response(JSON.stringify({ ok: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
