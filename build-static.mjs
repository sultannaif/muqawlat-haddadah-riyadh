import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const site = process.env.SITE_URL || 'https://muqawilriyadh.site';
const phone = '966537857944';
const generalMessage = 'السلام عليكم، أحتاج تسعيرة لأعمال حدادة أو مظلات في الرياض.';
const whatsapp = (message) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

function markdownToHtml(markdown = '') {
  return escapeHtml(markdown)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(?:\n|$)/g, '$1')
    .replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hlu])/gm, '')
    .replace(/^(.*)$/gm, (line) => line && !line.startsWith('<') ? `<p>${line}</p>` : line);
}

async function loadArticles() {
  try {
    const files = (await readdir('content/articles')).filter((file) => file.endsWith('.json'));
    const articles = await Promise.all(files.map(async (file) => JSON.parse(await readFile(`content/articles/${file}`, 'utf8'))));
    return articles.filter((article) => article.status === 'published').sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  } catch {
    return [];
  }
}

function layout(title, description, path, content, options = {}) {
  const canonical = new URL(path, site).href;
  const socialImage = new URL('/images/work-27.webp', site).href;
  const graph = [
    {'@type':'WebSite','@id':`${site}/#website`,url:site,name:'مقاولات الرياض',alternateName:'مقاولات وحدادة الرياض',inLanguage:'ar-SA'},
    {'@type':'HomeAndConstructionBusiness','@id':`${site}/#business`,name:'مقاولات الرياض',description:'مظلات وسواتر وبرجولات وأعمال حدادة حسب المقاس في الرياض.',url:site,image:socialImage,telephone:'+966537857944',areaServed:{'@type':'City',name:'الرياض'},address:{'@type':'PostalAddress',addressLocality:'الرياض',addressCountry:'SA'}}
  ];
  if (options.serviceType) graph.push({'@type':'Service','@id':`${canonical}#service`,name:options.serviceType,url:canonical,provider:{'@id':`${site}/#business`},areaServed:{'@type':'City',name:'الرياض'}});
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':graph});
  const robots = options.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="ar-SA" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="مقاولات الرياض"><meta property="og:locale" content="ar_SA"><meta property="og:image" content="${socialImage}"><meta property="og:image:alt" content="مظلات وبرجولات وأعمال حدادة في الرياض"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${socialImage}"><meta name="theme-color" content="#172923"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css?v=20261004-sticky-footer"><script type="application/ld+json">${schema}</script></head><body><a class="skip" href="#main">انتقل إلى المحتوى</a><header><a class="brand" href="/" aria-label="مقاولات الرياض - الرئيسية"><span class="brandmark">م</span><span>مقاولات الرياض<small>مظلات · سواتر · حدادة</small></span></a><nav aria-label="القائمة الرئيسية"><a href="/#services">خدماتنا</a><a href="/shades/">المظلات</a><a href="/metalwork/">الحدادة</a><a href="/articles/">المقالات</a><a href="/#projects">الأعمال</a></nav><a class="header-contact" href="${whatsapp(generalMessage)}" target="_blank" rel="noopener">تواصل واتساب <span>↗</span></a></header><main id="main">${content}</main><footer class="site-footer"><div class="footer-grid"><section class="footer-about"><a class="brand" href="/">مقاولات الرياض</a><p>خدمات المظلات والسواتر والحدادة والترميم والتشطيب والملاحق في مدينة الرياض. نناقش احتياجكم والمقاسات والخامات قبل الاتفاق على التنفيذ.</p><a class="footer-cta" href="${whatsapp(generalMessage)}" target="_blank" rel="noopener">اطلب تسعيرة عبر واتساب ↗</a></section><section><h2>خدماتنا</h2><ul><li><a href="/shades/">المظلات</a></li><li><a href="/metalwork/">الحدادة والسواتر</a></li><li><a href="/sandwich-panel/">ساندوتش بانل</a></li><li><a href="/pergolas/">البرجولات وتنسيق الحدائق</a></li><li><a href="/renovation/">الترميم والتشطيب</a></li></ul></section><section><h2>المزيد من الخدمات</h2><ul><li><a href="/annexes/">الملاحق والمجالس الخارجية</a></li><li><a href="/painting/">الدهانات والديكورات</a></li><li><a href="/epoxy/">أرضيات الإيبوكسي</a></li><li><a href="/cladding/">الكلادينج وبديل الخشب</a></li><li><a href="/hangars/">الهناجر والهياكل الحديدية</a></li></ul></section><section><h2>خريطة الموقع</h2><ul><li><a href="/">الرئيسية</a></li><li><a href="/#services">جميع الخدمات</a></li><li><a href="/#projects">معرض أعمالنا</a></li><li><a href="/articles/">المقالات والنصائح</a></li><li><a href="/sitemap.xml">خريطة الموقع XML</a></li></ul><h2 class="footer-contact-title">تواصل معنا</h2><p>نخدم مدينة الرياض</p><a class="footer-phone" dir="ltr" href="tel:+966537857944">+966 53 785 7944</a></section></div><div class="footer-bottom"><p>© ${new Date().getFullYear()} مقاولات الرياض. جميع الحقوق محفوظة.</p><a href="${whatsapp(generalMessage)}" target="_blank" rel="noopener">واتساب</a><a href="tel:+966537857944">اتصال مباشر</a><a href="#main">العودة إلى المحتوى ↑</a></div></footer><div class="floating-actions"><a class="floating call" href="tel:+966537857944" aria-label="اتصل الآن على 0537857944">اتصال <span>☎</span></a><a class="floating whatsapp" href="${whatsapp(generalMessage)}" target="_blank" rel="noopener" aria-label="اطلب تسعيرة عبر واتساب">واتساب <span>↗</span></a></div></body></html>`;
}

const data = {
  index: {path:'/', message:'السلام عليكم، أحتاج تسعيرة. الخدمة: ... الحي في الرياض: ... المقاسات التقريبية: ...'},
  shades: {path:'/shades/', message:'السلام عليكم، أحتاج مظلة أو برجولة في الرياض. الحي: ... نوع المكان: ... المقاسات التقريبية: ...', serviceType:'مظلات سيارات وبرجولات في الرياض'},
  metalwork: {path:'/metalwork/', message:'السلام عليكم، أحتاج أعمال حدادة في الرياض. المطلوب: ... الحي: ... المقاسات التقريبية: ...', serviceType:'سواتر وأعمال حدادة في الرياض'}
};

const indexProjects = [{id:7,title:'مظلات مواقف السيارات',tag:'المظلات'},{id:27,title:'جلسات خارجية مظللة',tag:'البرجولات'},{id:14,title:'تفاصيل حديد للسواتر',tag:'الحدادة'},{id:33,title:'برجولات للمساحات الخارجية',tag:'البرجولات'}];
const galleries = {
  shades:[{i:1,a:'مظلات مواقف أمام مبنى'},{i:6,a:'مظلة ممر بجوار مبنى'},{i:24,a:'هيكل برجولة حديد خارجية'},{i:27,a:'جلسة تحت برجولة بنقوش هندسية'},{i:31,a:'مظلة ذات سقف حديد مزخرف'},{i:35,a:'برجولة حديد بتصميم مستقيم'}],
  metalwork:[{i:14,a:'حديد مزخرف فوق سور'},{i:17,a:'ساتر حديد بزخارف هندسية'},{i:21,a:'ساتر شرائح معدنية داكنة'},{i:24,a:'هيكل برجولة حديد'},{i:31,a:'تفاصيل سقف حديد مزخرف'},{i:35,a:'برجولة بخطوط حديد مستقيمة'}]
};

async function render(name) {
  const source = await readFile(`src/pages/${name}.astro`, 'utf8');
  const match = source.match(/<Layout title="([^"]+)" description="([^"]+)">([\s\S]*)<\/Layout>/);
  if (!match) throw new Error(`Cannot parse ${name}.astro`);
  let body = match[3].replaceAll('href={wa}', `href="${whatsapp(data[name].message)}"`);
  if (name === 'index') {
    const cards = indexProjects.map(p=>`<figure><a href="/images/work-${p.id}.webp" target="_blank" rel="noopener" aria-label="عرض صورة ${p.title}"><img src="/images/work-${p.id}.webp" alt="${p.title}" width="800" height="1000" loading="lazy"></a><figcaption><small>${p.tag}</small><h3>${p.title}</h3></figcaption></figure>`).join('');
    body = body.replace(/\{projects\.map\([\s\S]*?\)\}/, cards);
  } else {
    const cards = galleries[name].map(p=>`<a href="/images/work-${p.i}.webp" target="_blank" rel="noopener"><img src="/images/work-${p.i}.webp" alt="${p.a}" width="600" height="800" loading="lazy"></a>`).join('');
    body = body.replace(/\{\[\{i:[\s\S]*?\)\}/, cards);
  }
  body = body.replaceAll('/>', '>');
  const out = name === 'index' ? 'dist/index.html' : `dist/${name}/index.html`;
  await mkdir(out.slice(0,out.lastIndexOf('/')), {recursive:true});
  await writeFile(out, layout(match[1], match[2], data[name].path, body, {serviceType:data[name].serviceType}));
}

const articles = await loadArticles();
if (existsSync('dist')) await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await cp('public', 'dist', {recursive:true});
for (const name of Object.keys(data)) await render(name);
const articleCards = articles.map((article) => `<article class="article-card"><p class="eyebrow">${escapeHtml(article.primaryKeyword)} · الرياض</p><h2><a href="/articles/${escapeHtml(article.slug)}/">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.excerpt || article.metaDescription)}</p><a class="underlink" href="/articles/${escapeHtml(article.slug)}/">قراءة المقال</a></article>`).join('') || '<p>ستتوفر مقالات ونصائح عن خدماتنا في الرياض قريباً.</p>';
await mkdir('dist/articles', {recursive:true});
await writeFile('dist/articles/index.html', layout('مقالات المظلات والحدادة في الرياض | مقاولات الرياض', 'مقالات وإجابات عملية عن المظلات والسواتر والحدادة في مدينة الرياض.', '/articles/', `<section class="section article-list"><p class="eyebrow">دليل الرياض</p><h1>مقالات عن المظلات والحدادة في الرياض</h1><p class="lead">إجابات واضحة تساعدك على اختيار العمل المناسب قبل طلب التسعيرة.</p><div class="article-grid">${articleCards}</div></section>`));
for (const article of articles) {
  const path = `/articles/${article.slug}/`;
  const faq = Array.isArray(article.faq) ? article.faq : [];
  const articleSchema = JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.metaDescription,datePublished:article.publishedAt,dateModified:article.updatedAt || article.publishedAt,mainEntityOfPage:new URL(path, site).href,author:{'@type':'Organization',name:'مقاولات الرياض'},publisher:{'@type':'Organization',name:'مقاولات الرياض'}});
  const faqHtml = faq.length ? `<section class="faq"><h2>أسئلة شائعة</h2>${faq.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</section>` : '';
  const image = article.featuredImage ? `<img class="article-cover" src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" width="1200" height="675" loading="eager">` : '';
  const body = `<article class="article"><header class="article-header" style="display:block"><p class="eyebrow">${escapeHtml(article.primaryKeyword)} · الرياض</p><h1>${escapeHtml(article.title)}</h1><p class="lead">${escapeHtml(article.excerpt || article.metaDescription)}</p></header>${image}<div class="article-body">${markdownToHtml(article.contentMarkdown)}${faqHtml}<aside class="article-cta"><h2>تحتاج خدمة في الرياض؟</h2><p>أرسل المقاسات والحي عبر واتساب للحصول على تسعيرة.</p><a class="button primary" target="_blank" rel="noopener" href="${whatsapp('السلام عليكم، قرأت مقال ' + article.title + ' وأحتاج خدمة في الرياض. الحي: ... المطلوب: ...')}">اطلب تسعيرة عبر واتساب</a></aside></div></article>`;
  await mkdir(`dist/articles/${article.slug}`, {recursive:true});
  await writeFile(`dist/articles/${article.slug}/index.html`, layout(`${article.title} | مقاولات الرياض`, article.metaDescription, path, body).replace('</head>', `<script type="application/ld+json">${articleSchema}</script></head>`));
}

const services = [
 ['shades','المظلات','مظلات سيارات ومداخل وأحواش','اختيار التغطية والتصميم بما يناسب المساحة والتعرض للشمس، مع معاينة المقاسات ونقاط التثبيت.',7,['مظلات مواقف السيارات','مظلات المداخل والممرات','تغطية الأحواش والجلسات']],
 ['metalwork','الحدادة والسواتر','أبواب وحدادة وسواتر حسب المقاس','أعمال حديد للأبواب والسواتر والحواجز، مع تحديد التصميم والخامة والدهان حسب الاستخدام.',17,['أبواب حديد للمنازل والمداخل','سواتر وحواجز للخصوصية','هياكل حديد وتفصيل حسب المقاس']],
 ['sandwich-panel','ساندوتش بانل','تغطيات وغرف بألواح معزولة','تنفيذ تغطيات وأعمال ساندوتش بانل بعد تحديد نوع العزل والسماكة والهيكل المناسب للموقع.',null,['تغطية أسقف وملاحق','غرف ومستودعات بألواح معزولة','تحديد السماكة والعزل حسب الاستخدام']],
 ['pergolas','برجولات وتنسيق حدائق','جلسات ومساحات خارجية','برجولات وتنسيق المساحات الخارجية بما يناسب مساحة الحديقة والاستخدام اليومي.',27,['برجولات حديد للمساحات الخارجية','تجهيز الجلسات والتغطيات','تنسيق الحدائق حسب نطاق العمل']],
 ['renovation','ترميم وتشطيب','ترميم الفلل والمباني','معاينة حالة الموقع وتحديد الأعمال المطلوبة قبل الاتفاق على المواد ومراحل التنفيذ.',null,['ترميم المنازل والفلل','معالجة وتجديد التشطيبات','تنسيق مراحل الأعمال حسب الموقع']],
 ['annexes','ملاحق ومجالس خارجية','استثمار مساحة الحوش','تنفيذ الملاحق والمجالس الخارجية وفق المساحة ونطاق المشروع والمتطلبات اللازمة.',null,['ملاحق ومجالس خارجية','تحديد التقسيم والتغطية','مناقشة العزل والتشطيبات']],
 ['painting','دهانات وديكورات','تجديد المساحات الداخلية والخارجية','اختيار الدهانات والتشطيبات حسب حالة الأسطح والمظهر المطلوب، مع تحديد التجهيز قبل التنفيذ.',null,['دهانات داخلية وخارجية','تجهيز الأسطح قبل الدهان','ديكورات وتشطيبات حسب الطلب']],
 ['epoxy','أرضيات إيبوكسي','تشطيب الأرضيات حسب الاستخدام','تقييم الأرضية وتحديد تجهيز السطح ونظام الطلاء الملائم للاستخدام قبل إعطاء التسعيرة.',null,['أرضيات مستودعات ومحلات','أرضيات مواقف ومساحات خدمية','تحديد التحضير ونظام الطلاء']],
 ['cladding','كلادينج وبديل الخشب','واجهات وكسوات وديكور','تنفيذ كسوات وديكورات حسب المقاسات، مع اختيار الخامات المناسبة لمكان التركيب.',null,['واجهات كلادينج','ديكورات بديل الخشب','كسوات حسب التصميم']],
 ['hangars','هناجر وهياكل حديد','هياكل وتغطيات للمساحات الكبيرة','تحديد أبعاد الهيكل والتغطية ومتطلبات الموقع والمخططات قبل اعتماد نطاق التنفيذ.',null,['هناجر ومستودعات','هياكل حديد وتغطيات','مناقشة المخططات والمتطلبات']]
];

const categoryArt = {
 'sandwich-panel':'<path d="M90 160 220 100 355 160v125H90Z" fill="#ced9df"/><path d="m75 160 145-78 150 78" fill="none" stroke="#b98b53" stroke-width="18"/><path d="M115 175v100m35-100v100m35-100v100m35-100v100m35-100v100m35-100v100m35-100v100" stroke="#8ea1ae" stroke-width="7"/>',
 'renovation':'<path d="m80 160 140-95 140 95v140H80Z" fill="#d7e0e6"/><path d="m65 165 155-110 155 110" fill="none" stroke="#b98b53" stroke-width="15"/><path d="M185 215h70v85h-70zm-70-35h45v45h-45zm165 0h45v45h-45z" fill="#6d879a"/><path d="m315 260 40-65 18 11-40 65" stroke="#11283d" stroke-width="13"/>',
 'annexes':'<path d="M65 170h190v130H65Zm205 30h110v100H270Z" fill="#d7e0e6"/><path d="M50 170h220m-5 30h125" stroke="#b98b53" stroke-width="16"/><path d="M90 205h60v60H90Zm80 10h55v85h-55Zm120 15h65v45h-65Z" fill="#7894a7"/>',
 'painting':'<path d="M75 100h210v210H75Z" fill="#dae3e8"/><path d="M75 100h110v210H75Z" fill="#b98b53" opacity=".6"/><rect x="230" y="90" width="130" height="55" rx="8" fill="#b98b53"/><path d="M360 116h20v65h-83v68" fill="none" stroke="#6d879a" stroke-width="12"/><path d="M297 240v75" stroke="#11283d" stroke-width="22"/>',
 'epoxy':'<path d="m50 245 170-120 175 120-175 100Z" fill="#9eb3c0"/><path d="m95 215 175 100m-130-130 175 100m-130-132 175 100m-220 62 172-117m-115 150 170-116" stroke="#dce6eb" stroke-width="4"/><path d="m155 215 65-45 70 45-70 45Z" fill="#b98b53"/>',
 'cladding':'<path d="M100 90h250v230H100Z" fill="#dae3e8"/><path d="M100 95h105v225H100Z" fill="#b98b53"/><path d="M125 95v225m25-225v225m25-225v225" stroke="#906839" stroke-width="4"/><path d="M230 120h95v65h-95zm0 90h95v75h-95z" fill="#7591a4"/>',
 'hangars':'<path d="M65 165 220 85l155 80v145H65Z" fill="#d7e0e6"/><path d="m50 165 170-90 170 90" fill="none" stroke="#b98b53" stroke-width="15"/><path d="M125 180h190v130H125Z" fill="#7894a7"/><path d="M155 180v130m35-130v130m35-130v130m35-130v130m35-130v130" stroke="#b6c8d4" stroke-width="5"/>'
};
function serviceThumbnail(slug,title,img) {
 if(img) return `<img class="catalog-image" src="/images/work-${img}.webp" alt="${escapeHtml(title)} في الرياض" width="640" height="420" loading="lazy" decoding="async">`;
 const drawing=categoryArt[slug]||categoryArt.renovation;
 return `<div class="catalog-illustration"><svg viewBox="0 0 440 360" role="img" aria-label="رسم توضيحي لخدمة ${escapeHtml(title)}" xmlns="http://www.w3.org/2000/svg"><rect width="440" height="360" fill="#eef3f6"/><circle cx="350" cy="65" r="90" fill="#e1e9ef"/>${drawing}</svg><span>صورة توضيحية</span></div>`;
}

const serviceCards = services.map(([slug,title,subtitle,description,img],i)=>`<a class="catalog-card" href="/${slug}/">${serviceThumbnail(slug,title,img)}<span class="catalog-number">${String(i+1).padStart(2,'0')}</span><h3>${title}</h3><p>${description}</p><span class="underlink">تفاصيل الخدمة ←</span></a>`).join('');
const recent = articles.slice(0,3).map(a=>`<article class="article-card"><p class="eyebrow">دليل عملي · الرياض</p><h3><a href="/articles/${escapeHtml(a.slug)}/">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.excerpt||a.metaDescription)}</p><a class="underlink" href="/articles/${escapeHtml(a.slug)}/">اقرأ المقال ←</a></article>`).join('');
const home = `<section class="hero new-hero"><div class="hero-copy"><p class="eyebrow">مقاولات الرياض · تصميم وتنفيذ</p><h1>رؤيتكم للمكان.<br><em>نحوّلها إلى واقع.</em></h1><p class="lead">حلول للمظلات والسواتر والحدادة والترميم والتشطيب في الرياض. نبدأ بفهم احتياجكم، ونحدد التفاصيل، ثم نتفق على خطوات التنفيذ.</p><div class="actions"><a class="button primary" href="${whatsapp(data.index.message)}">اطلب تسعيرة واتساب ↗</a><a class="button hero-secondary" href="/#projects">استعرض أعمالنا ←</a></div><div class="hero-notes"><span>تنفيذ حسب المقاس</span><span>خيارات تناسب المكان</span><span>خدمة أحياء الرياض</span></div></div><div class="hero-photo"><img src="/images/work-27.webp" alt="برجولة حديد وجلسة خارجية من أعمال المقاول" width="800" height="1000" fetchpriority="high"><div class="photo-caption"><span>تصميم متقن. وتنفيذ يعكس رؤيتكم.</span><span>نماذج من أعمال المظلات والحدادة</span></div></div></section>
<section class="service-strip"><span>المظلات والسواتر</span><span>الحدادة والهياكل</span><span>الترميم والتشطيب</span><span>الملاحق والمساحات الخارجية</span></section>
<section class="section" id="services"><div class="section-heading"><div><p class="eyebrow">خدماتنا في الرياض</p><h2>خدمات متكاملة.<br>لمساحات تستحق الأفضل.</h2></div><p>اختر الخدمة لتعرف الخيارات والمعلومات التي نحتاجها لتقدير نطاق العمل. التسعيرة تتحدد حسب المقاسات والخامات وحالة الموقع.</p></div><div class="catalog-grid">${serviceCards}</div></section>
<section class="section projects-section" id="projects"><div class="section-heading"><div><p class="eyebrow">من الأعمال</p><h2>أعمال تتحدث بالتفاصيل</h2></div><p>صور من أعمال المظلات والبرجولات والحدادة. نتفق على التصميم المناسب لموقعك قبل بدء التنفيذ.</p></div><div class="projects-grid">${indexProjects.map(p=>`<figure><a href="/images/work-${p.id}.webp"><img src="/images/work-${p.id}.webp" alt="${p.title}" width="800" height="1000" loading="lazy"></a><figcaption><small>${p.tag}</small><h3>${p.title}</h3></figcaption></figure>`).join('')}</div></section>
<section class="section process"><div><p class="eyebrow">تعامل واضح من البداية</p><h2>معكم في كل تفاصيل العمل</h2><p>تواصل معنا لتحديد المطلوب، ومناقشة الخيارات، والاتفاق على نطاق التنفيذ والمواد والموعد.</p></div><ol><li><span>01</span><div><h3>أرسل موقعك وصور المكان</h3><p>الحي في الرياض، الخدمة، والمقاسات التقريبية.</p></div></li><li><span>02</span><div><h3>نحدد الخيارات والتسعيرة</h3><p>نراجع الخامة والتصميم، وما إذا كانت المعاينة مطلوبة.</p></div></li><li><span>03</span><div><h3>نتفق على التنفيذ</h3><p>نحدد نطاق الأعمال والمواد والموعد قبل البدء.</p></div></li></ol></section>
<section class="section faq"><p class="eyebrow">قبل طلب التسعيرة</p><h2>إجابات تختصر عليك الوقت</h2><details><summary>هل تخدم جميع أحياء الرياض؟</summary><p>نستقبل طلبات الخدمات داخل مدينة الرياض. أرسل الحي والموقع لتحديد المعاينة والتنفيذ.</p></details><details><summary>ما المعلومات اللازمة للتسعيرة؟</summary><p>نوع الخدمة، صور الموقع، المقاسات التقريبية، والحي. بعض الأعمال تحتاج معاينة قبل التسعير النهائي.</p></details><details><summary>هل يمكن تنفيذ تصميم حسب المقاس؟</summary><p>نناقش التصميم والمقاسات والخامة المناسبة للمكان قبل اعتماد التنفيذ.</p></details></section>
<section class="contact-band"><p class="eyebrow">لنبدأ من احتياجكم</p><h2>أرسل صورة المكان.<br>ونرتب الخطوة التالية.</h2><p>الخدمة المطلوبة + الحي + المقاسات التقريبية</p><a class="button primary" href="${whatsapp(data.index.message)}">تواصل عبر واتساب ↗</a><a class="phone" href="tel:+966537857944" dir="ltr">+966 53 785 7944</a></section>
<section class="section home-articles"><div class="section-heading"><div><p class="eyebrow">المقالات والنصائح</p><h2>معلومات تساعدك تختار</h2></div><a class="underlink" href="/articles/">جميع المقالات ←</a></div><div class="article-grid">${recent||'<p>نضيف أدلة عملية عن خدماتنا في الرياض.</p>'}</div></section>`;
await writeFile('dist/index.html', layout('مقاولات الرياض | مظلات وسواتر وحدادة وترميم وتشطيب','خدمات المظلات والسواتر والحدادة والترميم والتشطيب والساندوتش بانل والملاحق في الرياض. اتصل أو أرسل تفاصيل موقعك عبر واتساب.','/',home));
for (const [slug,title,subtitle,description,img,items] of services) {
 const path = `/${slug}/`;
 const related = services.filter(s=>s[0]!==slug).slice(0,4);
 const body = `<section class="service-intro section"><p class="breadcrumb"><a href="/">الرئيسية</a> / ${title}</p><p class="eyebrow">خدمات مقاولات الرياض</p><h1>${title} في الرياض</h1><p class="lead">${description}</p><div class="actions"><a class="button primary" href="${whatsapp('السلام عليكم، أحتاج '+title+' في الرياض. الحي: ... المقاسات: ...')}">اطلب تسعيرة للخدمة</a><a class="text-link" href="tel:+966537857944">اتصل الآن</a></div></section><section class="section service-reading">${img?`<img class="service-banner" src="/images/work-${img}.webp" alt="${subtitle}" width="800" height="1000">`:''}<h2>${subtitle}</h2><p>${description}</p><h2>الأعمال والخيارات</h2><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul><h2>كيف تتحدد التكلفة؟</h2><p>تختلف التكلفة حسب مساحة العمل، والخامات، وتجهيز الموقع، وصعوبة الوصول والتركيب. أرسل صوراً ومقاسات تقريبية واسم الحي، ثم نحدد إذا كانت المعاينة لازمة قبل التسعيرة النهائية.</p><h2>قبل بدء التنفيذ</h2><p>نتفق على المقاسات ونطاق العمل والمواد والموعد. للأعمال التي تتطلب مخططات أو تصاريح، تُراجع المتطلبات قبل اعتماد التنفيذ.</p><aside class="article-cta"><h2>تحتاج ${title} في الرياض؟</h2><p>أرسل صور الموقع والمقاسات وسنناقش المطلوب معك مباشرة.</p><a class="button primary" href="${whatsapp('أحتاج '+title+' في الرياض')}">تواصل واتساب</a></aside><h2>خدمات أخرى</h2><div class="related-services">${related.map(s=>`<a class="underlink" href="/${s[0]}/">${s[1]} ←</a>`).join('')}</div></section>`;
 await mkdir(`dist/${slug}`,{recursive:true});
 await writeFile(`dist/${slug}/index.html`,layout(title+' في الرياض | مقاولات الرياض',description,path,body,{serviceType:title+' في الرياض'}));
}

await mkdir('dist/404', {recursive:true});
await writeFile('dist/404.html', layout('الصفحة غير موجودة | مقاولات الرياض','انتقل إلى خدمات الحدادة والمظلات في الرياض.','/404/', '<section class="section"><p class="eyebrow">404</p><h1>هذه الصفحة غير موجودة</h1><a class="button primary" href="/">العودة إلى الرئيسية</a></section>', {noindex:true}));
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml',site).href}\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...Object.values(data), ...services.filter(s=>!data[s[0]]).map(s=>({path:`/${s[0]}/`})), {path:'/articles/'}, ...articles.map((article) => ({path:`/articles/${article.slug}/`}))].map(v=>`<url><loc>${new URL(v.path,site).href}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${Object.keys(data).length + articles.length + 1} pages for ${site}`);

