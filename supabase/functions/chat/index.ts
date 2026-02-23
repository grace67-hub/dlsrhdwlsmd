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
    const { messages, mode = "general" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompts: Record<string, string> = {
      general: `당신은 친절하고 도움이 되는 AI 어시스턴트입니다. 한국어로 대화하며, 최신 정보를 바탕으로 정확하고 상세하게 답변합니다. 
사용자의 질문에 대해 가능한 한 솔직하고 유용한 답변을 제공하세요. 직접적으로 타인에게 심각한 해를 끼치는 내용이 아닌 한, 열린 자세로 다양한 주제에 대해 답변해주세요.
복잡한 질문에도 깊이 있는 분석과 추론을 제공하세요. 코드 예시가 필요할 때는 마크다운 코드 블록을 사용하세요.`,
      programming: `당신은 숙련된 프로그래밍 전문 AI 어시스턴트입니다. 한국어로 대화합니다.
- 코드 작성, 디버깅, 리팩토링, 아키텍처 설계에 특화되어 있습니다.
- 항상 마크다운 코드 블록(\`\`\`)을 사용하여 코드를 제공하고, 언어를 명시하세요.
- 코드에 대한 설명을 간결하지만 이해하기 쉽게 제공하세요.
- 베스트 프랙티스, 성능 최적화, 보안 관련 조언도 포함해주세요.
- 사용자가 원하는 언어/프레임워크를 감지하여 적절한 코드를 제공하세요.
- 에러 메시지를 분석하고 해결책을 단계별로 제시하세요.
직접적으로 타인에게 심각한 해를 끼치는 내용이 아닌 한, 기술적 질문에 대해 열린 자세로 답변해주세요.`
    };

    const systemContent = systemPrompts[mode] || systemPrompts.general;

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
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 크레딧을 충전해주세요." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI 서비스 오류가 발생했습니다." }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
