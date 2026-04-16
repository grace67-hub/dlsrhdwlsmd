import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, scrape_url } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    // If scrape_url is provided, scrape that specific URL
    if (scrape_url) {
      const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: scrape_url,
          formats: ["markdown", "screenshot", "links"],
          onlyMainContent: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Scrape failed: ${response.status}`);
      }

      return new Response(JSON.stringify({ success: true, type: "scrape", data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Otherwise, search
    if (!query) {
      throw new Error("query or scrape_url required");
    }

    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Search failed: ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, type: "search", data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
