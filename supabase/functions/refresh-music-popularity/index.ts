import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting music popularity refresh...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all approved tracks
    const { data: tracks, error: tracksError } = await supabase
      .from('music_tracks')
      .select('id')
      .eq('status', 'approved')

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError)
      throw tracksError
    }

    console.log(`Found ${tracks?.length || 0} approved tracks to process`)

    let updatedCount = 0

    for (const track of tracks || []) {
      // Count usages
      const { count: usageCount } = await supabase
        .from('music_usage')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track.id)

      // Calculate score: (uses × 1.3) + (likes × 2)
      const calculatedScore = ((usageCount || 0) * 1.3)

      // Upsert popularity
      const { error: upsertError } = await supabase
        .from('music_popularity')
        .upsert({
          track_id: track.id,
          usage_count: usageCount || 0,
          likes_count: 0,
          usage_score: calculatedScore,
          last_updated: new Date().toISOString()
        }, { onConflict: 'track_id' })

      if (upsertError) {
        console.error(`Error updating popularity for track ${track.id}:`, upsertError)
      } else {
        updatedCount++
      }
    }

    console.log(`Successfully updated popularity for ${updatedCount} tracks`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedCount} track popularity scores`,
        tracksProcessed: tracks?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in refresh-music-popularity:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
