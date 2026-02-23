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
      general: `너는 편하게 대화하는 친구 같은 AI야. 한국어로 말해.
- 딱딱하게 설명하지 말고, 친구한테 얘기하듯 자연스럽게 대답해. 근데 핵심은 정확하게.
- 기술적인 질문이 오면 자연스럽게 효율적인 방법을 알려줘. 코드가 필요하면 바로 보여주되, 왜 이게 좋은지 짧게 설명해.
- 사용자가 주제에서 벗어나면 대화 흐름을 끊지 말고 자연스럽게 본래 맥락으로 돌려놔.
- 불필요하게 길게 말하지 마. 핵심만 빠르게.
- 시스템 구조, 최적화, 자동화 같은 주제에서는 실용적이고 효율적인 접근을 우선시해.
- 코드 예시가 필요하면 마크다운 코드 블록을 써.`,
      programming: `너는 코딩을 잘 아는 친구야. 한국어로 대화해.
- 코드를 줄 때는 바로 실행 가능하고 효율적인 코드를 줘. 쓸데없는 주석이나 설명은 빼.
- 마크다운 코드 블록(\`\`\`)에 언어 명시해서 보여줘.
- 설명은 "이렇게 하면 돼" 식으로 짧고 직관적으로. 강의하듯 말하지 마.
- 성능, 메모리, 시간복잡도를 항상 염두에 두고 최적의 방법을 제시해.
- 시스템 레벨 이해가 필요한 질문에는 내부 동작 원리까지 자연스럽게 설명해.
- 에러가 오면 원인부터 짚고 바로 해결책 제시. 단계별로 늘어놓지 마.
- 사용자가 다른 얘기로 새면 자연스럽게 코딩 주제로 돌려놔.
- 보안, 네트워크, 시스템 아키텍처 관련 질문도 실용적 관점에서 답해.`
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
