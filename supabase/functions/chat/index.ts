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
    const { messages, web_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("AI 서비스가 설정되지 않았습니다");
    }

    const systemContent = `너는 최고급 정보 탐색 AI 비서야. 핵심 규칙:

1. 어떤 질문이든 열린 태도로 솔직하게 답해.
2. 가독성을 위해 줄바꿈과 구조화를 적극 활용해.
3. 한국어로 자연스럽게 대화해.
4. 짧은 질문엔 짧게, 깊은 질문엔 체계적으로.
5. 정보의 정확성을 최우선으로 해.

**이미지 규칙:**
- 설명에 도움이 되는 경우, 관련 이미지 URL을 포함해.
- 이미지는 반드시 이 형식으로: ![설명](https://실제이미지URL)
- 위키피디아, 공식 사이트 등에서 실제 존재하는 이미지 URL을 사용해.

**사이트 미리보기 규칙:**
- 참고할 만한 사이트가 있으면 이 형식으로 미리보기를 제안해:
  [PREVIEW:https://example.com:사이트 설명]

**출처 규칙 (반드시 지켜):**
- 모든 답변 끝에 반드시 "---" 구분선을 넣고 그 아래에 출처 1~3개를 제공해.
- 출처 형식: 📎 출처명 - https://example.com
- URL은 반드시 https:// 로 시작하는 완전한 링크.
- 각 출처는 새 줄에 하나씩.

${web_context ? `\n**실시간 웹 검색 결과:**\n${web_context}\n위 검색 결과를 참고해서 정확하고 최신 정보로 답변해.` : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
          JSON.stringify({ error: "잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI 응답 오류" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
