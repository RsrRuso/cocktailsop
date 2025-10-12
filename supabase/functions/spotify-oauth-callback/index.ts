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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // User ID
    const error = url.searchParams.get('error');
    
    // If user denied access
    if (error) {
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ type: 'spotify-auth-error', error: '${error}' }, '*');
          window.close();
        </script></body></html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 200,
        }
      );
    }
    
    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Authorization code and user ID required' }),
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

    console.log('Spotify Config:', {
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      redirectUri,
      supabaseUrl
    });

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials');
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ type: 'spotify-auth-error', error: 'Spotify credentials not configured' }, '*');
          window.close();
        </script></body></html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 200,
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
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ type: 'spotify-auth-error', error: 'Failed to exchange code for token' }, '*');
          window.close();
        </script></body></html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 200,
        }
      );
    }

    const tokenData = await tokenResponse.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store connection with the user's app ID from state parameter
    const { error: upsertError } = await supabaseAdmin
      .from('spotify_connections')
      .upsert({
        user_id: state, // App user ID from state parameter
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ type: 'spotify-auth-error', error: 'Failed to store connection' }, '*');
          window.close();
        </script></body></html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 200,
        }
      );
    }

    console.log('Spotify connection stored successfully');

    // Return HTML that closes popup and notifies parent
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ type: 'spotify-auth-success' }, '*');
        window.close();
      </script></body></html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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