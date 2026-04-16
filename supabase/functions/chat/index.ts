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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ì„œë¹„ìŠ¤ ì„¤ì •ì´ ì™„ë£Œë˜ì§€ ì•Šì•˜ìŠµë‹ˆë‹¤");
    }

    const systemContent = `ë„ˆëŠ” ìµœê³ ê¸‰ ì •ë³´ íƒìƒ‰ AI ë¹„ì„œì•¼. í•µì‹¬ ê·œì¹™:

1. ì–´ë–¤ ì§ˆë¬¸ì´ë“  ì—´ë¦° íƒœë„ë¡œ ì†”ì§í•˜ê²Œ ë‹µí•´.
2. ê°€ë…ì„±ì„ ìœ„í•´ ì¤„ë°”ê¿ˆê³¼ êµ¬ì¡°í™”ë¥¼ ì ê·¹ í™œìš©í•´.
3. í•œêµ­ì–´ë¡œ ìžì—°ìŠ¤ëŸ½ê²Œ ëŒ€í™”í•´.
4. ì§§ì€ ì§ˆë¬¸ì—” ì§§ê²Œ, ê¹Šì€ ì§ˆë¬¸ì—” ì²´ê³„ì ìœ¼ë¡œ.
5. ì •ë³´ì˜ ì •í™•ì„±ì„ ìµœìš°ì„ ìœ¼ë¡œ í•´.

**ì´ë¯¸ì§€ ê·œì¹™:**
- ì„¤ëª…ì— ë„ì›€ì´ ë˜ëŠ” ê²½ìš°, ê´€ë ¨ ì´ë¯¸ì§€ URLì„ í¬í•¨í•´.
- ì´ë¯¸ì§€ëŠ” ë°˜ë“œì‹œ ì´ í˜•ì‹ìœ¼ë¡œ: ![ì„¤ëª…](https://ì‹¤ì œì´ë¯¸ì§€URL)
- ìœ„í‚¤í”¼ë””ì•„, ê³µì‹ ì‚¬ì´íŠ¸ ë“±ì—ì„œ ì‹¤ì œ ì¡´ìž¬í•˜ëŠ” ì´ë¯¸ì§€ URLì„ ì‚¬ìš©í•´.

**ì‚¬ì´íŠ¸ ë¯¸ë¦¬ë³´ê¸° ê·œì¹™:**
- ì°¸ê³ í•  ë§Œí•œ ì‚¬ì´íŠ¸ê°€ ìžˆìœ¼ë©´ ì´ í˜•ì‹ìœ¼ë¡œ ë¯¸ë¦¬ë³´ê¸°ë¥¼ ì œì•ˆí•´:
  [PREVIEW:https://example.com:ì‚¬ì´íŠ¸ ì„¤ëª…]

**ì¶œì²˜ ê·œì¹™ (ë°˜ë“œì‹œ ì§€ì¼œ):**
- ëª¨ë“  ë‹µë³€ ëì— ë°˜ë“œì‹œ "---" êµ¬ë¶„ì„ ì„ ë„£ê³  ê·¸ ì•„ëž˜ì— ì¶œì²˜ 1~3ê°œë¥¼ ì œê³µí•´.
- ì¶œì²˜ í˜•ì‹: ðŸ“Ž ì¶œì²˜ëª… - https://example.com
- URLì€ ë°˜ë“œì‹œ https:// ë¡œ ì‹œìž‘í•˜ëŠ” ì™„ì „í•œ ë§í¬.
- ê° ì¶œì²˜ëŠ” ìƒˆ ì¤„ì— í•˜ë‚˜ì”©.

${web_context ? `\n**ì‹¤ì‹œê°„ ì›¹ ê²€ìƒ‰ ê²°ê³¼:**\n${web_context}\nìœ„ ê²€ìƒ‰ ê²°ê³¼ë¥¼ ì°¸ê³ í•´ì„œ ì •í™•í•˜ê³  ìµœì‹  ì •ë³´ë¡œ ë‹µë³€í•´.` : ''}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        system: systemContent,
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ì£¼ì„¸ìš”." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "í¬ë ˆë”§ì´ ë¶€ì¡±í•©ë‹ˆë‹¤." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI ì‘ë‹µ ì˜¤ë¥˜" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anthropic SSE â†’ OpenAI SSE í˜•ì‹ ë³€í™˜ (í”„ë¡ íŠ¸ì—”ë“œ í˜¸í™˜)
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const openAIChunk = {
                choices: [{ delta: { content: parsed.delta.text } }],
              };
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
              );
            } else if (parsed.type === "message_stop") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            }
          } catch {
            // ignore
          }
        }
      },
    });

    return new Response(response.body!.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "ì˜¤ë¥˜" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
