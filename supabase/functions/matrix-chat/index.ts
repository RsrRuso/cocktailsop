import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { message, imageUrl } = await req.json();

    if (!message?.trim() && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Message or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant context from memory
    const { data: memories } = await supabaseClient
      .from('matrix_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent patterns and features
    const { data: patterns } = await supabaseClient
      .from('matrix_patterns')
      .select('title, description, category')
      .eq('status', 'confirmed')
      .limit(5);

    const { data: features } = await supabaseClient
      .from('matrix_roadmap_features')
      .select('title, description, status')
      .in('status', ['proposed', 'in_progress'])
      .limit(5);

    // Fetch platform members for source verification
    const { data: members } = await supabaseClient
      .from('profiles')
      .select('id, username, full_name, user_type, professional_title, badge_level')
      .limit(100);

    const appKnowledge = `
# SpecVerse Platform Complete Guide

## Core Features & Tools

### 1. INVENTORY MANAGEMENT SYSTEM
- **All Inventory**: View complete inventory across all stores with filters
- **Low Stock Tracking**: Automatic alerts for items below threshold
- **FIFO System**: First-in-first-out tracking with expiration dates
- **QR Code Operations**: Scan to receive, transfer, and track inventory
- **Live Transactions**: Real-time feed of all inventory movements
- **Multi-Store Support**: Manage multiple locations with workspace system
- **Batch Tracking**: Track items by batch number and expiration
- **Photo Documentation**: Attach photos to inventory items and transactions

### 2. STAFF SCHEDULING
- **Daily Breakdown**: Visual schedule with staff assignments
- **Station Management**: Indoor (3 stations) and Outdoor (2 stations) bars
- **Area Allocation**: Assign staff to indoor/outdoor areas
- **Role-Based Assignments**: Head Bartender, Senior, Bartender, Bar Back, Support
- **Rotating Schedules**: Automatic station rotation across days
- **PDF Export**: Download and print daily schedules

### 3. COCKTAIL SOP SYSTEM
- **Recipe Management**: Digital cocktail recipes with precise measurements
- **Technique Library**: Standard operating procedures for preparation
- **Classic Cocktails**: PDF library of classic cocktail recipes
- **Cost Analysis**: Track ingredient costs and pricing
- **Nutritional Info**: ABV, calories, allergen tracking
- **Batch Calculations**: Scale recipes for batch production
- **Photo Library**: Visual guides for each cocktail

### 4. BUSINESS HUB
- **Business Ideas**: Share and discover business opportunities
- **Investor Matching**: Connect founders with investors
- **Analytics Dashboard**: Track idea performance and engagement
- **Category Filtering**: Browse ideas by industry category
- **Funding Tracking**: Monitor funding goals and progress

### 5. SOCIAL FEATURES (NEURON)
- **Posts & Reels**: Share content with Instagram-style engagement
- **Stories**: 24-hour temporary content with editing tools
- **Music Sharing**: Share and discover music with Spotify integration
- **Events**: Create and manage industry events
- **Engagement**: Like, comment, share, save, and repost content
- **AI Smart Features**: AI-powered content insights and suggestions
- **Live Notifications**: Real-time alerts for all interactions

### 6. NEURON MESSAGING & EMAIL
- **Direct Messaging**: Fast, lightweight Instagram-style chat
- **Internal Email**: Formal team communication system
- **AI Smart Replies**: AI-generated message suggestions
- **Voice Messages**: Record and send voice notes
- **Group Chats**: Team conversations with workspace members
- **Message Reactions**: Like and react to messages
- **Swipe Actions**: Quick reply, forward, and delete

### 7. CRM SYSTEM
- **Contacts Management**: Store customer and client information
- **Leads Tracking**: Pipeline management for potential customers
- **Deals Management**: Track sales opportunities and revenue
- **Activities**: Log calls, meetings, and follow-ups
- **Notes**: Detailed customer interaction history

### 8. WORKSPACE & TEAM MANAGEMENT
- **Workspace Creation**: Multi-tenant workspaces for organizations
- **Team Invitations**: Invite members with role-based permissions
- **Access Control**: Owner, Admin, and Member permission levels
- **QR Code Access**: Members can scan QR codes for operations
- **Workspace Switching**: Easy navigation between workspaces

### 9. PROFILE & CAREER
- **Professional Profiles**: Showcase experience and skills
- **Work History**: Employment verification with venues
- **Certifications**: Display industry certifications
- **Competitions**: Track competition results and awards
- **Recognition**: Awards and achievements showcase
- **Badge System**: Earn badges based on career level
- **Career Metrics**: Track professional growth analytics

### 10. MATRIX AI SYSTEM (THIS SYSTEM)
- **AI Chat Assistant**: Context-aware guidance and support
- **Platform Insights**: User feedback and idea collection
- **Pattern Detection**: AI-powered trend analysis
- **Roadmap Generation**: AI-suggested feature priorities
- **Vision Recognition**: Analyze images via camera
- **Voice Assistant**: Voice input and audio responses
- **Memory System**: Persistent knowledge and learning
- **Source Verification**: Validate information accuracy

## Technical Capabilities
- PWA Installation: Install as mobile app on home screen
- Offline Support: Core features work without internet
- Push Notifications: Real-time alerts with sound
- Camera Access: Capture photos and QR codes
- Microphone Access: Voice input and recording
- Dark/Light Mode: Theme customization
- Responsive Design: Mobile-first, tablet, and desktop optimized

## User Roles & Permissions
- **Founder**: Full platform access, creates workspaces
- **Venue Manager**: Manages venue operations and staff
- **Bartender/Professional**: Career profiles and content creation
- **Investor**: Access to business hub and matching
- **Workspace Owner**: Creates and manages workspace
- **Workspace Admin**: Can manage members and settings
- **Workspace Member**: Limited access, can view and transact

## Navigation Structure
- Home: Social feed with posts, reels, and stories
- Explore: Discover new content and users
- Create: Upload posts, reels, and stories
- Neuron: Messaging and internal email
- Profile: Personal profile and career information
- Business Hub: Business ideas and investor matching
- Tools: Operational tools (inventory, scheduling, CRM)
- Matrix AI: This AI assistant system

## Support & Help
- Matrix AI provides guidance on all features
- Each tool has contextual help and instructions
- Community-driven insights and best practices
- Real-time error handling and suggestions
`;

    const context = {
      memories: memories?.map(m => m.content) || [],
      patterns: patterns || [],
      features: features || [],
      platformMembers: members || [],
      appKnowledge
    };

    // Build messages array for AI
    const messages: any[] = [{
      role: 'system',
      content: `You are MATRIX AI, the comprehensive guide and assistant for the SpecVerse platform. You have complete knowledge of every feature, tool, and capability in the application.

## Your Capabilities:
1. **Complete Platform Knowledge**: You know every detail about all features, tools, and workflows
2. **Visual Recognition**: You can analyze images from the camera and describe what you see
3. **Voice Interaction**: You communicate through both text and voice
4. **Source Verification**: You validate information accuracy and identify sources
5. **Contextual Guidance**: You provide step-by-step help for any platform feature
6. **Smart Assistance**: You offer proactive suggestions and insights

## Platform Knowledge:
${context.appKnowledge}

## Current Context:
- Recent Patterns: ${JSON.stringify(context.patterns)}
- Upcoming Features: ${JSON.stringify(context.features)}
- User Insights: ${JSON.stringify(context.memories.slice(0, 3))}
- Platform Members: ${JSON.stringify(context.platformMembers.slice(0, 20))}

## Communication Style:
- Be conversational, helpful, and friendly
- Provide clear, step-by-step guidance when explaining features
- Reference specific tools and features by name
- Verify sources when discussing information accuracy
- Offer relevant suggestions based on user questions
- When analyzing images, be detailed and specific about what you see

Remember: You are the complete guide to SpecVerse. Users rely on you to understand and navigate every aspect of the platform.`
    }];

    // Handle image input if provided
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message || 'What do you see in this image?'
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Call Lovable AI for chat response
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: imageUrl ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices[0]?.message?.content || 'I apologize, but I could not process your request.';

    // Store chat message
    await supabaseClient.from('matrix_chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: response }
    ]);

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
