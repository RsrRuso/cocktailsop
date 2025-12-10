import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RSS feed sources for hospitality industry
const RSS_FEEDS = [
  { url: "https://punchdrink.com/feed/", category: "Cocktails", name: "Punch" },
  { url: "https://imbibemagazine.com/feed/", category: "Spirits", name: "Imbibe" },
  { url: "https://www.thedrinksbusiness.com/feed/", category: "Industry Trends", name: "Drinks Business" },
  { url: "https://www.thespiritsbusiness.com/feed/", category: "Spirits", name: "Spirits Business" },
  { url: "https://www.foodandwine.com/feeds/all", category: "Restaurants", name: "Food & Wine" },
  { url: "https://vinepair.com/feed/", category: "Wine", name: "VinePair" },
];

interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  source: string;
}

async function fetchRSSFeed(feedUrl: string, category: string, sourceName: string): Promise<Article[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "SpecVerse News Aggregator" }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const articles: Article[] = [];
    
    // Simple XML parsing for RSS items
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches.slice(0, 3)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";
      const pubDate = dateMatch ? dateMatch[1].trim() : "";
      
      // Clean HTML from description
      const description = rawDesc
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .substring(0, 200);
      
      if (title && link) {
        articles.push({
          title,
          link,
          description: description || "Read more...",
          pubDate,
          category,
          source: sourceName,
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error(`Error fetching ${feedUrl}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching real industry news from RSS feeds...");

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Fetch all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => 
      fetchRSSFeed(feed.url, feed.category, feed.name)
    );
    
    const feedResults = await Promise.all(feedPromises);
    const allArticles = feedResults.flat();
    
    // Sort by date (newest first) and dedupe
    const seenTitles = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      const normalizedTitle = article.title.toLowerCase();
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

    // Take top 10 articles
    const topArticles = uniqueArticles.slice(0, 10);

    // Extract trending topics from article titles
    const words = topArticles
      .flatMap(a => a.title.toLowerCase().split(/\s+/))
      .filter(w => w.length > 4 && !["about", "their", "which", "these", "where", "there", "would", "could", "should"].includes(w));
    
    const wordFreq: Record<string, number> = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    
    const trendingTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
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

    const digest = {
      headline: topArticles[0]?.title || "Today's Hospitality Industry Update",
      summary: `Fresh news from ${new Set(topArticles.map(a => a.source)).size} industry sources covering cocktails, spirits, wine, and hospitality trends.`,
      articles: formattedArticles,
      trending_topics: trendingTopics.length > 0 ? trendingTopics : ["Cocktails", "Spirits", "Wine", "Hospitality"],
      drink_of_the_day: null,
      industry_tip: null,
      date: today,
      generated_at: new Date().toISOString(),
      is_real_news: true,
    };

    console.log(`Successfully fetched ${formattedArticles.length} real news articles`);

    return new Response(
      JSON.stringify({ success: true, digest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching industry news:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
