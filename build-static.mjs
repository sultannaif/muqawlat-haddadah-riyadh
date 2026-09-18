import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const site = process.env.SITE_URL || 'https://muqawlat-haddadah-riyadh.pages.dev';
const phone = '966537857944';
const generalMessage = 'السلام عليكم، أحتاج تسعيرة لأعمال حدادة أو مظلات في الرياض.';
const whatsapp = (message) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

function layout(title, description, path, content) {
  const canonical = new URL(path, site).href;
  const schema = JSON.stringify({'@context':'https://schema.org','@type':'HomeAndConstructionBusiness',name:'مقاولات وحداده',url:site,telephone:'+966537857944',areaServed:{'@type':'City',name:'الرياض'}});
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="ar_SA"><meta name="theme-color" content="#172923"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"><script type="application/ld+json">${schema}</script></head><body><a class="skip" href="#main">انتقل إلى المحتوى</a><header><a class="brand" href="/" aria-label="مقاولات وحداده - الرئيسية"><span class="brandmark">م</span><span>مقاولات وحداده<small>الرياض · حدادة ومظلات</small></span></a><nav aria-label="القائمة الرئيسية"><a href="/shades/">المظلات</a><a href="/metalwork/">الحدادة</a><a href="/#projects">الأعمال</a></nav><a class="header-contact" href="${whatsapp(generalMessage)}" target="_blank" rel="noopener">تواصل واتساب <span>↗</span></a></header><main id="main">${content}</main><footer><a class="brand" href="/">مقاولات وحداده</a><p>حدادة ومظلات في الرياض. تواصل مباشر مع المقاول.</p><a dir="ltr" href="tel:+966537857944">+966 53 785 7944</a><p class="copyright">© ${new Date().getFullYear()} مقاولات وحداده</p></footer><div class="floating-actions"><a class="floating call" href="tel:+966537857944" aria-label="اتصل الآن على 0537857944">اتصال <span>☎</span></a><a class="floating whatsapp" href="${whatsapp(generalMessage)}" target="_blank" rel="noopener" aria-label="اطلب تسعيرة عبر واتساب">واتساب <span>↗</span></a></div></body></html>`;
}

const data = {
  index: {path:'/', message:'السلام عليكم، أحتاج تسعيرة. الخدمة: ... الحي في الرياض: ... المقاسات التقريبية: ...'},
  shades: {path:'/shades/', message:'السلام عليكم، أحتاج مظلة أو برجولة في الرياض. الحي: ... نوع المكان: ... المقاسات التقريبية: ...'},
  metalwork: {path:'/metalwork/', message:'السلام عليكم، أحتاج أعمال حدادة في الرياض. المطلوب: ... الحي: ... المقاسات التقريبية: ...'}
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
  await writeFile(out, layout(match[1], match[2], data[name].path, body));
}

if (existsSync('dist')) await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await cp('public', 'dist', {recursive:true});
for (const name of Object.keys(data)) await render(name);
await mkdir('dist/404', {recursive:true});
await writeFile('dist/404.html', layout('الصفحة غير موجودة | مقاولات وحداده','انتقل إلى خدمات الحدادة والمظلات في الرياض.','/404/', '<section class="section"><p class="eyebrow">404</p><h1>هذه الصفحة غير موجودة</h1><a class="button primary" href="/">العودة إلى الرئيسية</a></section>'));
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml',site).href}\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.values(data).map(v=>`<url><loc>${new URL(v.path,site).href}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${Object.keys(data).length} pages for ${site}`);
