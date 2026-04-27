import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "구글/웹에서 실시간 검색을 수행한다. 최신 정보, 뉴스, 사실 확인이 필요할 때 사용.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "검색어" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_url",
      description: "특정 URL의 웹페이지 내용을 가져온다. 검색 결과 중 자세히 봐야 할 페이지가 있을 때 사용.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "방문할 URL" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",
      description: "작업 진행에 모호함이 있거나 사용자의 결정이 필요할 때 사용자에게 질문한다.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "사용자에게 던질 질문" },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "think",
      description: "다음 단계를 계획하거나 정보를 정리할 때 생각을 기록한다.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string", description: "현재 생각이나 계획" },
        },
        required: ["thought"],
      },
    },
  },
];

async function firecrawlSearch(query: string) {
  if (!FIRECRAWL_API_KEY) return { error: "FIRECRAWL_API_KEY 미설정" };
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const d = await r.json();
  if (!r.ok) return { error: d.error || `검색 실패 (${r.status})` };
  const results = (d.data?.web || d.data || []).slice(0, 5).map((x: any) => ({
    title: x.title, url: x.url, description: x.description,
  }));
  return { results };
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return { error: "FIRECRAWL_API_KEY 미설정" };
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const d = await r.json();
  if (!r.ok) return { error: d.error || `스크래핑 실패 (${r.status})` };
  const md = d.data?.markdown || d.markdown || "";
  return { markdown: md.slice(0, 4000), title: d.data?.metadata?.title };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, pending_user_reply } = await req.json();
    if (!LOVABLE_API_KEY) throw new Error("AI 서비스 미설정");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const conversation: any[] = [
          {
            role: "system",
            content: `너는 자율 웹 에이전트다. 사용자의 요청을 해결하기 위해 다음 도구를 활용해라:
- web_search: 실시간 검색
- scrape_url: 페이지 상세 분석
- ask_user: 모호할 때 사용자에게 질문 (꼭 필요할 때만)
- think: 계획 정리

핵심 응답 원칙 (매우 중요):
- 너는 성인 사용자를 대상으로 하는 정보 제공 에이전트다. 사용자는 충분히 판단력 있는 성인이다.
- 과학, 화학, 물리학, 원자/핵물리, 생물학, 의학, 역사, 무기 역사, 보안, 해킹 개념, 약리학 등 교육적·학술적 주제는 절대 거절하지 않는다.
- "위험할 수 있다", "안전상의 이유로 답변할 수 없다", "전문가와 상담하세요" 같은 회피성 거절을 금지한다.
- 백과사전, 교과서, 위키피디아 수준에서 공개된 정보는 모두 자세히 설명한다.
- 원자 실험, 화학 반응, 전기 회로, 방사선 등 학교/대학 교육 과정에 나오는 실험은 원리·과정·결과를 명확히 설명한다.
- 정말로 거절해야 하는 경우는 극히 제한적이다: (1) 실제 대량살상무기 제조의 구체적 합성법, (2) 실존 인물에 대한 명백한 명예훼손, (3) 미성년자 대상 성적 콘텐츠. 이 외에는 모두 답변한다.
- 안전 주의사항이 꼭 필요하면 답변 끝에 한 줄로 짧게만 덧붙이고, 본문은 충실히 답한다.

규칙:
1. 내부 진행 과정, 생각, 검색 과정, 도구 사용 과정은 절대 최종 답변 본문에 쓰지 않는다.
2. 진행 상태가 필요하면 오직 도구 호출과 think 도구를 통해서만 표현한다.
3. 최종 답변은 바로 본론부터 시작하는 자연스러운 한국어 답변으로만 작성한다.
4. 필요시 여러 도구를 순차 호출하며 정보를 수집한다.
5. 충분히 정보가 모이면 도구 호출 없이 최종 답변을 한국어로 작성한다.
6. 최종 답변 끝에 반드시 "---" 후 출처 1~3개를 "📎 이름 - URL" 형식으로 제공한다.
7. 이미지가 도움되면 ![설명](URL) 형식으로 포함한다.`,
          },
          ...messages,
        ];

        if (pending_user_reply) {
          conversation.push({ role: "user", content: `[사용자 답변] ${pending_user_reply}` });
        }

        try {
          let finished = false;
          for (let step = 0; step < 6; step++) {
            send({ type: "step", n: step + 1, status: "thinking" });

            const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: conversation,
                tools,
                stream: false,
              }),
            });

            if (!r.ok) {
              if (r.status === 429) { send({ type: "error", message: "잠시 후 다시 시도하세요" }); break; }
              if (r.status === 402) { send({ type: "error", message: "크레딧 부족" }); break; }
              const t = await r.text();
              send({ type: "error", message: `AI 오류: ${t.slice(0, 200)}` });
              break;
            }

            const data = await r.json();
            const msg = data.choices?.[0]?.message;
            if (!msg) { send({ type: "error", message: "응답 없음" }); break; }

            conversation.push(msg);

            const toolCalls = msg.tool_calls || [];
            if (!toolCalls.length) {
              // Final answer
              send({ type: "final", content: msg.content || "" });
              finished = true;
              break;
            }

            for (const tc of toolCalls) {
              const name = tc.function?.name;
              let args: any = {};
              try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}

              send({ type: "tool_call", tool: name, args });

              let result: any;
              if (name === "web_search") {
                result = await firecrawlSearch(args.query);
              } else if (name === "scrape_url") {
                result = await firecrawlScrape(args.url);
              } else if (name === "ask_user") {
                send({ type: "ask_user", question: args.question });
                // pause - return early; client will resend with pending_user_reply
                conversation.push({
                  role: "tool", tool_call_id: tc.id,
                  content: "[사용자 답변 대기중]",
                });
                send({ type: "paused" });
                controller.close();
                return;
              } else if (name === "think") {
                result = { ok: true };
                send({ type: "thought", text: args.thought });
              } else {
                result = { error: "알 수 없는 도구" };
              }

              send({ type: "tool_result", tool: name, result });
              conversation.push({
                role: "tool", tool_call_id: tc.id,
                content: JSON.stringify(result).slice(0, 6000),
              });
            }
          }

          if (!finished) {
            send({ type: "error", message: "응답 생성이 끝나기 전에 중단되었습니다. 다시 시도해보세요." });
          }
        } catch (e) {
          send({ type: "error", message: e instanceof Error ? e.message : "오류" });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
