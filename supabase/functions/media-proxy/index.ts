import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });

    const { url } = await req.json().catch(() => ({}));
    if (typeof url !== "string" || !url.trim()) {
      return json(400, { error: "url is required" });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return json(400, { error: "Invalid URL" });
    }

    if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
      return json(400, { error: "Only http/https URLs are allowed" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "SpecVerse/1.0",
        "Accept": "image/*,video/*,application/octet-stream;q=0.9,*/*;q=0.8",
      },
    }).finally(() => clearTimeout(timeoutId));

    if (!upstream.ok) {
      return json(400, { error: `Upstream fetch failed: ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = Number(upstream.headers.get("content-length") || "0");

    // 50MB safety limit (client upload path still enforces its own limits)
    if (contentLength && contentLength > 50 * 1024 * 1024) {
      return json(413, { error: "File too large" });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > 50 * 1024 * 1024) {
      return json(413, { error: "File too large" });
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: msg });
  }
});
