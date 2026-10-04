import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const services = ["مظلات سيارات الرياض", "سواتر الرياض", "حداد الرياض", "برجولات الرياض", "أبواب حديد الرياض"];
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

async function dataForSeoIdeas(seed: string) {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("لم تُضبط أسرار مزود الكلمات المفتاحية.");
  const auth = btoa(`${login}:${password}`);
  const request = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword: seed, location_name: "Saudi Arabia", language_name: "Arabic", limit: 50 }]),
  });
  if (!request.ok) throw new Error("تعذر جلب بيانات الكلمات المفتاحية.");
  const payload = await request.json();
  const items = asArray(payload?.tasks?.[0]?.result?.[0]?.items);
  return items.map((item: Record<string, unknown>) => {
    const data = (item.keyword_data ?? item) as Record<string, unknown>;
    const info = (data.keyword_info ?? {}) as Record<string, unknown>;
    return { keyword: String(data.keyword ?? ""), volume: Number(info.search_volume ?? 0), competition: Number(info.competition_index ?? 100) };
  }).filter((item: { keyword: string }) => item.keyword && /الرياض|مظلات|سواتر|حداد|حديد|برجولات/.test(item.keyword));
}

async function writeDraft(keyword: string, volume: number) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("لم يُضبط مفتاح OpenAI بعد.");
  const prompt = `أنت محرر محتوى محلي خبير في خدمات المقاولات بمدينة الرياض فقط. اكتب مسودة مقال عربية مفيدة وأصلية للعميل الذي يبحث عن خدمة، وليست حشواً أو ادعاءات أو أسعاراً مخترعة. الكلمة الأساسية: ${keyword}. حجم البحث المرجعي: ${volume}. أجب عن نية البحث بوضوح، واقترح متى يتواصل العميل لطلب معاينة أو تسعيرة. لا تذكر أنك ذكاء اصطناعي.\n\nأعد JSON صالحاً فقط بهذه المفاتيح: title (20-90 حرفاً)، slug (إنجليزي صغير بشرطات فقط)، metaDescription (70-180 حرفاً)، excerpt، contentMarkdown (700 كلمة عربية تقريباً بعناوين ## وقائمة عند الحاجة)، primaryKeyword، secondaryKeywords (مصفوفة)، faq (مصفوفة من 3 إلى 5 عناصر، في كل عنصر question وanswer)، seoScore (0-100).`;
  const request = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-5-mini", input: prompt, store: false }),
  });
  if (!request.ok) throw new Error("تعذر إنشاء مسودة المقال من OpenAI.");
  const result = await request.json();
  const text = result.output_text || asArray(result.output).flatMap((entry: Record<string, unknown>) => asArray(entry.content)).find((content: Record<string, unknown>) => content.type === "output_text")?.text;
  if (!text) throw new Error("لم يصل نص المقال من OpenAI.");
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "استخدم POST فقط." }, 405);
  const expected = Deno.env.get("CONTENT_CRON_SECRET");
  if (!expected || request.headers.get("X-Content-Cron-Secret") !== expected) return response({ error: "غير مخول." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const run = await supabase.from("content_runs").insert({ run_type: "daily_research", status: "running", input: { target_city: "الرياض" }, started_at: new Date().toISOString() }).select().single();
  try {
    const seed = services[new Date().getUTCDate() % services.length];
    const ideas = await dataForSeoIdeas(seed);
    const candidate = ideas.sort((a: { volume: number; competition: number }, b: { volume: number; competition: number }) => (b.volume - b.competition) - (a.volume - a.competition))[0];
    if (!candidate) throw new Error("لم تظهر فرصة مناسبة لخدمات الرياض اليوم.");
    const { data: duplicate } = await supabase.from("content_opportunities").select("id").eq("keyword", candidate.keyword).eq("status", "used").limit(1);
    if (duplicate?.length) throw new Error("الموضوع المختار منشور سابقاً؛ سيجرب النظام فرصة أخرى في التشغيل القادم.");
    const score = Math.min(100, Math.round(Math.log10(candidate.volume + 1) * 25 + (100 - candidate.competition) * 0.35));
    const opportunity = await supabase.from("content_opportunities").insert({ keyword: candidate.keyword, source: "DataForSEO", relevance_score: score, search_intent: "local-service", suggested_angle: "خدمة في الرياض", status: "selected" }).select().single();
    const draft = await writeDraft(candidate.keyword, candidate.volume);
    const article = await supabase.from("articles").insert({ slug: draft.slug, title: draft.title, meta_description: draft.metaDescription, excerpt: draft.excerpt, content_markdown: draft.contentMarkdown, primary_keyword: draft.primaryKeyword || candidate.keyword, secondary_keywords: draft.secondaryKeywords || [], category: "مقالات الخدمات", status: "review", schema_faq: draft.faq || [], research_notes: { source: "DataForSEO", seed, volume: candidate.volume, opportunity_id: opportunity.data?.id }, seo_score: draft.seoScore || null, generated_by: "daily-content-draft" }).select().single();
    if (article.error) throw new Error(article.error.message);
    await supabase.from("content_opportunities").update({ status: "used" }).eq("id", opportunity.data?.id);
    await supabase.from("content_runs").update({ status: "completed", result: { keyword: candidate.keyword, article_id: article.data.id }, completed_at: new Date().toISOString() }).eq("id", run.data?.id);
    return response({ ok: true, keyword: candidate.keyword, articleId: article.data.id });
  } catch (error) {
    await supabase.from("content_runs").update({ status: "failed", error_message: error instanceof Error ? error.message : "خطأ غير معروف", completed_at: new Date().toISOString() }).eq("id", run.data?.id);
    return response({ error: error instanceof Error ? error.message : "خطأ غير معروف" }, 500);
  }
});

