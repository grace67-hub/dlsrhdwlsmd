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

    // scrape_url 처리: 페이지 내용을 가져옴
    if (scrape_url) {
      try {
        const res = await fetch(scrape_url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SearchBot/1.0)" },
        });
        const html = await res.text();
        // 간단한 텍스트 추출 (태그 제거)
        const markdown = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);

        return new Response(
          JSON.stringify({ success: true, type: "scrape", data: { markdown } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: "스크래핑 실패" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!query) {
      throw new Error("query or scrape_url required");
    }

    // DuckDuckGo Instant Answer API 사용 (무료, API 키 불필요)
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SearchBot/1.0)" },
    });
    const ddgData = await ddgRes.json();

    // 결과 정리
    const results: any[] = [];

    // Abstract (주요 정보)
    if (ddgData.AbstractText) {
      results.push({
        title: ddgData.Heading || query,
        url: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        description: ddgData.AbstractText,
        markdown: ddgData.AbstractText,
      });
    }

    // RelatedTopics
    if (ddgData.RelatedTopics) {
      for (const topic of ddgData.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 80),
            url: topic.FirstURL,
            description: topic.Text,
            markdown: topic.Text,
          });
        }
      }
    }

    // Answer
    if (ddgData.Answer) {
      results.unshift({
        title: `답변: ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        description: ddgData.Answer,
        markdown: ddgData.Answer,
      });
    }

    // 결과가 없으면 기본 검색 링크 제공
    if (results.length === 0) {
      results.push({
        title: `"${query}" 검색 결과`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        description: `Google에서 "${query}" 검색하기`,
        markdown: `"${query}"에 대한 자세한 정보는 Google에서 검색하세요.`,
      });
      results.push({
        title: `네이버 검색: ${query}`,
        url: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
        description: `네이버에서 "${query}" 검색하기`,
        markdown: `"${query}"에 대한 국내 정보는 네이버에서 검색하세요.`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, type: "search", data: { data: results } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
