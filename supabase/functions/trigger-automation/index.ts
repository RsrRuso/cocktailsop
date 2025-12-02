import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { triggerId, payload } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trigger details
    const { data: trigger, error: triggerError } = await supabase
      .from('automation_triggers')
      .select('*, automation_webhooks(*)')
      .eq('id', triggerId)
      .eq('is_active', true)
      .single();

    if (triggerError || !trigger) {
      throw new Error('Trigger not found or inactive');
    }

    const webhook = trigger.automation_webhooks;
    if (!webhook || !webhook.is_active) {
      throw new Error('Webhook not found or inactive');
    }

    // Prepare webhook payload
    const webhookPayload = {
      trigger_type: trigger.trigger_type,
      trigger_name: trigger.name,
      timestamp: new Date().toISOString(),
      user_id: trigger.user_id,
      data: payload,
      config: trigger.config,
    };

    console.log('Triggering webhook:', webhook.webhook_url);

    // Call the webhook
    const webhookResponse = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const status = webhookResponse.ok ? 'success' : 'failed';
    const responseData = await webhookResponse.text();

    // Log the execution
    await supabase.from('automation_logs').insert({
      user_id: trigger.user_id,
      trigger_id: triggerId,
      webhook_id: webhook.id,
      status,
      payload: webhookPayload,
      response: { status: webhookResponse.status, body: responseData },
      error_message: status === 'failed' ? responseData : null,
    });

    return new Response(
      JSON.stringify({ 
        success: status === 'success',
        message: status === 'success' ? 'Automation triggered successfully' : 'Automation failed',
        response: responseData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Automation trigger error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});