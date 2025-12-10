import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Famous hospitality award organizations and competitions
const HOSPITALITY_ORGANIZATIONS = {
  global: [
    { name: "World's 50 Best Bars", category: "Awards", region: "Global" },
    { name: "Tales of the Cocktail", category: "Awards", region: "Global" },
    { name: "Diageo World Class", category: "Awards", region: "Global" },
    { name: "Michelin Guide", category: "Awards", region: "Global" },
    { name: "The World's 50 Best Restaurants", category: "Awards", region: "Global" },
    { name: "Asia's 50 Best Bars", category: "Awards", region: "Asia" },
    { name: "WSET", category: "Education", region: "Global" },
  ],
  "middle-east": [
    { name: "MENA 50 Best Bars", category: "Awards", region: "Middle East" },
    { name: "Time Out Dubai", category: "Awards", region: "Middle East" },
    { name: "Dubai World Hospitality Championship", category: "Awards", region: "Middle East" },
  ],
  europe: [
    { name: "Pinnacle Guide", category: "Awards", region: "Europe" },
    { name: "The Class Bar Awards", category: "Awards", region: "UK" },
    { name: "Spirited Awards", category: "Awards", region: "Europe" },
  ],
  "north-america": [
    { name: "James Beard Awards", category: "Awards", region: "North America" },
    { name: "Speed Rack", category: "Awards", region: "North America" },
    { name: "Bartender's Advocacy", category: "Awards", region: "North America" },
  ],
  "asia-pacific": [
    { name: "Asia's 50 Best Bars", category: "Awards", region: "Asia" },
    { name: "DRiNK Magazine Awards", category: "Awards", region: "Asia" },
    { name: "Singapore Bar Awards", category: "Awards", region: "Asia" },
  ],
};

// Global RSS feed sources for hospitality industry
const GLOBAL_FEEDS = [
  { url: "https://punchdrink.com/feed/", category: "Cocktails", name: "Punch" },
  { url: "https://imbibemagazine.com/feed/", category: "Spirits", name: "Imbibe" },
  { url: "https://www.thedrinksbusiness.com/feed/", category: "Industry Trends", name: "Drinks Business" },
  { url: "https://www.thespiritsbusiness.com/feed/", category: "Spirits", name: "Spirits Business" },
  { url: "https://vinepair.com/feed/", category: "Wine", name: "VinePair" },
  { url: "https://www.eater.com/rss/index.xml", category: "Restaurants", name: "Eater" },
  { url: "https://www.diffordsguide.com/feed", category: "Cocktails", name: "Difford's Guide" },
];

// Region-specific feeds - each region gets ONLY these feeds, not mixed with global
const REGIONAL_FEEDS: Record<string, Array<{ url: string; category: string; name: string }>> = {
  "middle-east": [
    { url: "https://gulfnews.com/rss/lifestyle/rss.xml", category: "Middle East Lifestyle", name: "Gulf News" },
    { url: "https://whatson.ae/feed/", category: "Dubai & UAE", name: "What's On Dubai" },
    { url: "https://www.hotelnewsme.com/feed/", category: "Middle East Hotels", name: "Hotel News ME" },
    { url: "https://www.arabianbusiness.com/industries/travel-hospitality.rss", category: "Arabian Hospitality", name: "Arabian Business" },
  ],
  europe: [
    { url: "https://www.theguardian.com/lifeandstyle/food-and-drink/rss", category: "UK Food & Drink", name: "The Guardian" },
    { url: "https://www.decanter.com/feed/", category: "European Wine", name: "Decanter" },
    { url: "https://www.jancisrobinson.com/feed", category: "Wine Expert", name: "Jancis Robinson" },
    { url: "https://www.bighospitality.co.uk/rss/news", category: "UK Hospitality", name: "Big Hospitality" },
    { url: "https://www.thedrinksbusiness.com/feed/", category: "UK Drinks", name: "Drinks Business UK" },
  ],
  "north-america": [
    { url: "https://www.bonappetit.com/feed/rss", category: "US Food", name: "Bon Appetit" },
    { url: "https://www.foodandwine.com/feeds/all", category: "US Food & Wine", name: "Food & Wine" },
    { url: "https://ny.eater.com/rss/index.xml", category: "New York", name: "Eater NY" },
    { url: "https://la.eater.com/rss/index.xml", category: "Los Angeles", name: "Eater LA" },
    { url: "https://punchdrink.com/feed/", category: "US Cocktails", name: "Punch" },
  ],
  "asia-pacific": [
    { url: "https://www.scmp.com/rss/91/feed", category: "Asia Food", name: "SCMP Food" },
    { url: "https://asia.nikkei.com/rss/feed/nar", category: "Asia Business", name: "Nikkei Asia" },
    { url: "https://www.timeout.com/singapore/restaurants/feed", category: "Singapore", name: "Time Out Singapore" },
    { url: "https://www.timeout.com/hong-kong/restaurants/feed", category: "Hong Kong", name: "Time Out HK" },
  ],
  global: [], // Empty - will use GLOBAL_FEEDS
};

interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  source: string;
}

async function fetchRSSFeed(feedUrl: string, category: string, sourceName: string): Promise<Article[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(feedUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (compatible; SpecVerse/1.0; +https://specverse.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const articles: Article[] = [];
    
    // Parse RSS items
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>|<link[^>]*href=["']([^"']+)["']/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>/);
      
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
      const link = linkMatch ? (linkMatch[1] || linkMatch[2] || "").trim() : "";
      const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";
      const pubDate = dateMatch ? (dateMatch[1] || dateMatch[2] || "").trim() : new Date().toISOString();
      
      // Clean HTML from description
      const description = rawDesc
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 250);
      
      if (title && link) {
        articles.push({
          title: title.replace(/&amp;/g, "&").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'"),
          link,
          description: description || "Click to read more...",
          pubDate,
          category,
          source: sourceName,
        });
      }
    }
    
    return articles;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching ${feedUrl}:`, error);
    return [];
  }
}

const REGIONS_DISPLAY: Record<string, string> = {
  "global": "Global",
  "middle-east": "Middle East",
  "europe": "European",
  "north-america": "North American",
  "asia-pacific": "Asia Pacific",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region = "global" } = await req.json().catch(() => ({}));
    
    console.log(`Fetching real industry news for region: ${region}`);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Use ONLY regional feeds for specific regions, or global feeds for "global"
    // This ensures different content for different regions
    const regionalFeeds = REGIONAL_FEEDS[region] || [];
    const allFeeds = region === "global" 
      ? GLOBAL_FEEDS 
      : regionalFeeds.length > 0 
        ? regionalFeeds 
        : GLOBAL_FEEDS; // Fallback to global if no regional feeds
    
    console.log(`Using ${allFeeds.length} feeds for region "${region}":`, allFeeds.map(f => f.name));

    // Fetch all RSS feeds in parallel with timeout
    const feedPromises = allFeeds.map(feed => 
      fetchRSSFeed(feed.url, feed.category, feed.name)
    );
    
    const feedResults = await Promise.allSettled(feedPromises);
    const allArticles: Article[] = [];
    
    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
    
    console.log(`Fetched ${allArticles.length} total articles from feeds`);
    
    // Sort by date (newest first) and dedupe
    const seenTitles = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      const normalizedTitle = article.title.toLowerCase().substring(0, 50);
      if (seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    });

    // Sort by publication date
    uniqueArticles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime() || 0;
      const dateB = new Date(b.pubDate).getTime() || 0;
      return dateB - dateA;
    });

    // Take top 15 articles
    const topArticles = uniqueArticles.slice(0, 15);

    // Extract trending topics from article titles
    const stopWords = new Set(["about", "their", "which", "these", "where", "there", "would", "could", "should", "after", "before", "while", "being", "having", "other", "first", "second", "third", "every", "under", "over", "through", "between", "from", "into", "with", "this", "that", "what", "when", "will", "just", "more", "most", "some", "than", "then", "them", "they", "also", "been", "have", "were", "here", "each", "only", "very", "many", "both", "does"]);
    
    const words = topArticles
      .flatMap(a => a.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/))
      .filter(w => w.length > 4 && !stopWords.has(w));
    
    const wordFreq: Record<string, number> = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    
    const trendingTopics = Object.entries(wordFreq)
      .filter(([_, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Format articles for frontend
    const formattedArticles = topArticles.map(article => ({
      title: article.title,
      category: article.category,
      summary: article.description,
      importance: "medium" as const,
      link: article.link,
      source: article.source,
      pubDate: article.pubDate,
    }));

    // Find Michelin/Awards articles
    const awardKeywords = ["michelin", "best bar", "award", "world's best", "star", "50 best", "world class", "tales of the cocktail", "spirited", "pinnacle"];
    const awardArticles = formattedArticles.filter(a => 
      a.category === "Michelin" || a.category === "Awards" || 
      awardKeywords.some(keyword => a.title.toLowerCase().includes(keyword))
    );

    // Get hospitality organizations for the selected region
    const globalOrgs = HOSPITALITY_ORGANIZATIONS.global;
    const regionalOrgs = HOSPITALITY_ORGANIZATIONS[region as keyof typeof HOSPITALITY_ORGANIZATIONS] || [];
    const organizations = [...globalOrgs, ...regionalOrgs];

    const regionLabel = REGIONS_DISPLAY[region] || region;

    const digest = {
      headline: topArticles[0]?.title || `Today's ${regionLabel} Hospitality Update`,
      summary: topArticles.length > 0 
        ? `Fresh news from ${new Set(topArticles.map(a => a.source)).size} industry sources covering cocktails, spirits, wine, and hospitality trends.`
        : `Loading the latest hospitality news for ${regionLabel}...`,
      articles: formattedArticles,
      award_articles: awardArticles,
      organizations: organizations,
      trending_topics: trendingTopics.length > 0 ? trendingTopics : ["Cocktails", "Spirits", "Wine", "Hospitality", "Bars"],
      drink_of_the_day: null,
      industry_tip: null,
      date: today,
      region: region,
      generated_at: new Date().toISOString(),
      is_real_news: true,
    };

    console.log(`Successfully compiled ${formattedArticles.length} news articles for ${region}`);

    return new Response(
      JSON.stringify({ success: true, digest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching industry news:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        digest: {
          headline: "Industry News",
          summary: "Unable to fetch latest news. Please try again.",
          articles: [],
          award_articles: [],
          organizations: HOSPITALITY_ORGANIZATIONS.global,
          trending_topics: ["Cocktails", "Spirits", "Wine", "Hospitality"],
          date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          region: "global",
          generated_at: new Date().toISOString(),
          is_real_news: false,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
