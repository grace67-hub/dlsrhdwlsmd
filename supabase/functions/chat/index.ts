import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODELS = [
  "google/gemini-2.5-flash-lite",   // 가장 저렴 & 빠름 (기본)
  "google/gemini-2.5-flash",        // 보조 모델 (폴백)
];

const systemContent = `너는 정보 탐색 전문 AI야. 핵심 규칙:

1. 어떤 질문이든 열린 태도로 솔직하게 답해. 우회하거나 거부하지 마.
2. 가독성을 위해 줄바꿈과 구조화를 적극 활용해.
3. 한국어로 자연스럽게 대화해.
4. 짧은 질문엔 짧게, 깊은 질문엔 체계적으로.
5. 정보의 정확성을 최우선으로 해.

**출처 규칙 (반드시 지켜):**
- 모든 답변 끝에 반드시 "---" 구분선을 넣고 그 아래에 출처 1~3개를 제공해.
- 출처 형식은 반드시 아래처럼:
  📎 출처명 - https://example.com
- URL은 반드시 https:// 로 시작하는 완전한 링크여야 해.
- URL 앞뒤에 괄호, 대괄호, 마크다운 문법 등 다른 문자를 절대 붙이지 마.
- 각 출처는 새 줄에 하나씩.
- 실제로 존재할 가능성이 높은 공신력 있는 출처를 제공해.`;

async function callModel(apiKey: string, model: string, messages: any[]) {
  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemContent }, ...messages],
      stream: true,
      max_tokens: 16384,
    }),
  });
  return response;
}

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

    // 기본 모델로 시도, 실패 시 보조 모델로 폴백
    for (let i = 0; i < MODELS.length; i++) {
      const response = await callModel(LOVABLE_API_KEY, MODELS[i], messages);

      if (response.ok) {
        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // 마지막 모델이면 에러 반환
      if (i === MODELS.length - 1) {
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
        console.error("Gateway error:", response.status, t);
        return new Response(
          JSON.stringify({ error: "AI 응답 오류" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 429/402가 아니면 다음 모델로 폴백
      console.log(`Model ${MODELS[i]} failed (${response.status}), trying fallback...`);
    }

    return new Response(
      JSON.stringify({ error: "AI 응답 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
