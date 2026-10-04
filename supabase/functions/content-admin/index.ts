import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://muqawilriyadh.site",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "يلزم تسجيل الدخول." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const allowedEmail = Deno.env.get("ADMIN_EMAIL")?.trim().toLowerCase();
  if (userError || !userData.user || !allowedEmail || userData.user.email?.toLowerCase() !== allowedEmail) {
    return json({ error: "هذا الحساب غير مخول للوصول إلى لوحة الإدارة." }, 403);
  }

  const url = new URL(request.url);
  const body = request.method === "GET" ? {} : await request.json().catch(() => ({}));
  const action = request.method === "GET" ? url.searchParams.get("action") : body.action;

  if (request.method === "GET" && action === "articles") {
    const { data, error } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });
    return error ? json({ error: error.message }, 500) : json({ articles: data });
  }

  if (request.method === "GET" && action === "opportunities") {
    const { data, error } = await supabase.from("content_opportunities").select("*").order("relevance_score", { ascending: false }).limit(50);
    return error ? json({ error: error.message }, 500) : json({ opportunities: data });
  }

  if (request.method === "POST" && action === "saveDraft") {
    const article = body.article ?? {};
    const record = {
      slug: slugify(article.slug || ""), title: article.title?.trim(), meta_description: article.metaDescription?.trim(),
      excerpt: article.excerpt?.trim() || null, content_markdown: article.contentMarkdown?.trim(),
      primary_keyword: article.primaryKeyword?.trim(), secondary_keywords: article.secondaryKeywords ?? [],
      category: article.category?.trim() || null, status: article.status === "review" ? "review" : "draft",
      featured_image_path: article.featuredImage || null, featured_image_alt: article.featuredImageAlt?.trim() || null, schema_faq: article.faq ?? [],
      research_notes: article.researchNotes ?? {}, seo_score: article.seoScore ?? null,
      generated_by: article.generatedBy || "manual", updated_at: new Date().toISOString(),
    };
    if (!record.slug || !record.title || !record.meta_description || !record.content_markdown || !record.primary_keyword) return json({ error: "أكمل الحقول المطلوبة قبل الحفظ." }, 422);
    const query = article.id ? supabase.from("articles").update(record).eq("id", article.id).select().single() : supabase.from("articles").insert(record).select().single();
    const { data, error } = await query;
    return error ? json({ error: error.message }, 422) : json({ article: data });
  }

  if (request.method === "POST" && action === "uploadImage") {
    const image = body.image ?? {};
    if (!/^image\/(jpeg|png|webp)$/.test(image.type || "") || typeof image.base64 !== "string") return json({ error: "استخدم صورة JPG أو PNG أو WebP فقط." }, 422);
    const bytes = Uint8Array.from(atob(image.base64), (character) => character.charCodeAt(0));
    if (bytes.byteLength > 5 * 1024 * 1024) return json({ error: "حجم الصورة يجب ألا يتجاوز 5 ميغابايت." }, 422);
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const path = `articles/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("article-images").upload(path, bytes, { contentType: image.type, upsert: false });
    if (error) return json({ error: error.message }, 422);
    const { data } = supabase.storage.from("article-images").getPublicUrl(path);
    return json({ url: data.publicUrl, path });
  }

  if (request.method === "POST" && action === "publish") {
    const id = body.articleId;
    const { data: article, error } = await supabase.from("articles").select("*").eq("id", id).single();
    if (error || !article) return json({ error: "لم يتم العثور على المسودة." }, 404);
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const repository = Deno.env.get("GITHUB_REPOSITORY");
    if (!githubToken || !repository) return json({ error: "لم تُضبط أسرار النشر إلى GitHub بعد." }, 503);
    const now = new Date().toISOString();
    const source = {
      slug: article.slug, title: article.title, metaDescription: article.meta_description, excerpt: article.excerpt,
      contentMarkdown: article.content_markdown, primaryKeyword: article.primary_keyword, featuredImage: article.featured_image_path, featuredImageAlt: article.featured_image_alt,
      faq: article.schema_faq, status: "published", publishedAt: article.published_at || now, updatedAt: now,
    };
    const filePath = `content/articles/${article.slug}.json`;
    const response = await fetch(`https://api.github.com/repos/${repository}/contents/${filePath}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ message: `Publish article: ${article.slug}`, content: btoa(unescape(encodeURIComponent(JSON.stringify(source, null, 2)))), branch: "main" }),
    });
    if (!response.ok) return json({ error: "تعذر إرسال المقال إلى GitHub للنشر." }, 502);
    const { data, error: updateError } = await supabase.from("articles").update({ status: "published", published_at: source.publishedAt, updated_at: now }).eq("id", id).select().single();
    return updateError ? json({ error: updateError.message }, 500) : json({ article: data, deployed: true });
  }

  return json({ error: "الطلب غير معروف." }, 404);
});

