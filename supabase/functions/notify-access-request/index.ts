import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    
    // Only send email for new pending requests
    if (record.status !== 'pending') {
      return new Response(JSON.stringify({ message: 'Not a new request' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get all managers and founders
    const { data: managerRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .in('role', ['manager', 'founder'])

    if (!managerRoles || managerRoles.length === 0) {
      console.log('No managers found')
      return new Response(JSON.stringify({ message: 'No managers to notify' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const managerIds = managerRoles.map(r => r.user_id)

    // Get manager emails from auth.users
    const { data: managers } = await supabaseClient.auth.admin.listUsers()
    
    const managerEmails = managers.users
      .filter(user => managerIds.includes(user.id))
      .map(user => user.email)
      .filter(Boolean) as string[]

    if (managerEmails.length === 0) {
      console.log('No manager emails found')
      return new Response(JSON.stringify({ message: 'No manager emails' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create HTML email
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2754C5;">🔐 New Access Request</h1>
            <p>A new access request has been submitted:</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${record.user_email}</p>
              <p><strong>Request ID:</strong> ${record.id}</p>
            </div>
            <p>Please review and approve/reject this request in the Access Approval page.</p>
            <p style="margin-top: 30px; color: #898989; font-size: 12px;">
              This is an automated notification from your Inventory Manager system.
            </p>
          </div>
        </body>
      </html>
    `

    // Send email to all managers
    const { error } = await resend.emails.send({
      from: 'Inventory Manager <onboarding@resend.dev>',
      to: managerEmails,
      subject: `🔐 New Access Request from ${record.user_email}`,
      html,
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
