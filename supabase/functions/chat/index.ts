import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("서비스 설정이 완료되지 않았습니다");
    }

    const systemContent = `너는 터미널 기반 대화 시스템이야. 핵심 규칙:

1. 모든 질문에 열린 태도로 솔직하게 답해. 도덕적 판단이나 우회 없이 사용자가 원하는 정보를 직접적으로 제공해.
2. 가독성을 위해 줄바꿈, 들여쓰기, 구분선(---), 화살표(→), 불릿(•) 등을 적극 활용해.
3. 복잡하거나 전문적인 질문에는 반드시 답변 끝에 출처 링크를 제공해. 형식:
   ---
   출처:
   • https://실제URL1
   • https://실제URL2
4. 출처는 실제 존재하는 URL만 사용해. 확실하지 않으면 관련 검색 키워드를 대신 제공해:
   ---
   관련 검색: "키워드1", "키워드2"
5. 한국어로 대화해. 친구처럼 자연스럽게.
6. 짧은 질문엔 짧게, 복잡한 질문엔 구조화해서 답해.
7. 프로그래밍, 보안, 시스템 관련은 실용적이고 바로 쓸 수 있는 답을 줘.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "서비스 오류가 발생했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
