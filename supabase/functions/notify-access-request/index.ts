import { createClient } from 'jsr:@supabase/supabase-js@2'
import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { AccessRequestEmail } from './_templates/access-request.tsx'

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

    // Render email template
    const html = await renderAsync(
      React.createElement(AccessRequestEmail, {
        user_email: record.user_email,
        request_id: record.id,
        app_url: Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('//')[1].split('.')[0] 
          ? `https://${Deno.env.get('SUPABASE_URL')?.split('//')[1].split('.')[0]}.lovable.app`
          : 'https://your-app.lovable.app',
      })
    )

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
