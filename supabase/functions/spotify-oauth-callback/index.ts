import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/spotify-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials');
      return new Response(
        JSON.stringify({ error: 'Spotify credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Exchanging code for token...');

    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    
    // Get user's Supabase auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store or update Spotify connection
    const { error: upsertError } = await supabaseAdmin
      .from('spotify_connections')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('Spotify connection stored successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Spotify account connected successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in spotify-oauth-callback:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});