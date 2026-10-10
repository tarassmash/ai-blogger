// Kadro: сервер собран в один файл.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server.mjs
import http from "node:http";
import fs4 from "node:fs";
import path4 from "node:path";
import crypto4 from "node:crypto";
import { fileURLToPath } from "node:url";

// src/db.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.resolve("data");
var PERSISTENT = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR);
var FILE = path.join(DATA_DIR, "kadro-db.json");
var DEFAULT_PACKS = [
  { id: "start", credits: 60, price: 15, name: { ru: "\u0421\u0442\u0430\u0440\u0442", en: "Starter" }, popular: false },
  { id: "pro", credits: 200, price: 39, name: { ru: "\u0411\u043B\u043E\u0433\u0435\u0440", en: "Creator" }, popular: true },
  { id: "max", credits: 600, price: 99, name: { ru: "\u0421\u0442\u0443\u0434\u0438\u044F", en: "Studio" }, popular: false }
];
var empty = () => ({
  keys: {},
  // KEY -> { credits, email, created, source, note, spent }
  orders: [],
  // { id, key, email, pack, credits, amount, currency, created }
  gens: [],
  // { id, key, style, format, count, status, images, created, error, statusUrl, responseUrl, refunded, showcase: [] }
  settings: { packs: DEFAULT_PACKS, currency: "eur" }
});
var db = empty();
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) db = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
} catch (e) {
  console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0431\u0430\u0437\u0443:", e.message);
}
var timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}
function flush() {
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0431\u0430\u0437\u0443:", e.message);
  }
}
process.on("SIGTERM", () => {
  flush();
  process.exit(0);
});
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newKey() {
  let k;
  do {
    const b = crypto.randomBytes(12);
    const chars = [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
    k = `KD-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  } while (db.keys[k]);
  return k;
}
var normKey = (k) => String(k || "").trim().toUpperCase();
var newId = () => crypto.randomBytes(8).toString("hex");

// src/fal.mjs
var fal_exports = {};
__export(fal_exports, {
  COST_PER_IMAGE: () => COST_PER_IMAGE,
  MODEL: () => MODEL,
  RESOLUTION: () => RESOLUTION,
  UserError: () => UserError,
  falError: () => falError,
  falFetch: () => falFetch,
  falKey: () => falKey,
  probe: () => probe,
  submit: () => submit
});
var MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana-pro/edit";
var RESOLUTION = process.env.FAL_RESOLUTION || "2K";
var COST_PER_IMAGE = parseFloat(process.env.FAL_COST_PER_IMAGE || "0.15");
var UserError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
function falKey() {
  const k = (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
  if (!k) throw new UserError("\u041D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D FAL_KEY. Railway \u2192 \u0441\u0435\u0440\u0432\u0438\u0441 \u2192 Variables.", 500);
  return k;
}
async function falFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { authorization: "Key " + falKey(), "content-type": "application/json", ...opts.headers || {} }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}
function falError(status, data) {
  let d = data?.detail ?? data?.error ?? data?.message ?? data?.raw ?? "";
  if (Array.isArray(d)) d = d.map((x) => x.msg || JSON.stringify(x)).join("; ");
  else if (typeof d === "object") d = JSON.stringify(d);
  d = String(d);
  if (status === 402 || /balance|credit|locked|billing/i.test(d)) return { msg: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", admin: "\u041D\u0430 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435 fal.ai \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F \u0431\u0430\u043B\u0430\u043D\u0441." };
  if (status === 401 || status === 403) return { msg: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", admin: `fal.ai \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043A\u043B\u044E\u0447 (${status}).` };
  if (/nsfw|safety|content policy|flagged/i.test(d)) return { msg: "\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442.", admin: d.slice(0, 200) };
  return { msg: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.", admin: `(${status}) ${d.slice(0, 300)}` };
}
async function submit(input) {
  const url = `https://queue.fal.run/${MODEL}`;
  const full = { ...input, aspect_ratio: input.aspect_ratio, resolution: RESOLUTION };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(full) });
  if (r.status === 422) {
    const { aspect_ratio, resolution, ...base } = full;
    r = await falFetch(url, { method: "POST", body: JSON.stringify(base) });
  }
  return r;
}
async function probe() {
  const key = (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
  if (!key) return { ok: false, text: "FAL_KEY \u043D\u0435 \u0437\u0430\u0434\u0430\u043D" };
  try {
    const app = MODEL.split("/").slice(0, 2).join("/");
    const r = await fetch(`https://queue.fal.run/${app}/requests/00000000-0000-0000-0000-000000000000/status`, { headers: { authorization: "Key " + key } });
    const t = await r.text();
    if (/balance|locked|billing/i.test(t)) return { ok: false, text: "\u041A\u043B\u044E\u0447 \u0432\u0435\u0440\u043D\u044B\u0439, \u043D\u043E \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F \u0431\u0430\u043B\u0430\u043D\u0441 fal.ai" };
    if (r.status === 401 || r.status === 403) return { ok: false, text: "fal.ai \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043A\u043B\u044E\u0447" };
    return { ok: true, text: "\u041A\u043B\u044E\u0447 \u043F\u0440\u0438\u043D\u044F\u0442" };
  } catch (e) {
    return { ok: false, text: "\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441 fal.ai: " + e.message };
  }
}

// src/stripe.mjs
import crypto2 from "node:crypto";
var SK = () => (process.env.STRIPE_SECRET_KEY || "").trim();
var stripeEnabled = () => SK().startsWith("sk_");
var webhookEnabled = () => Boolean((process.env.STRIPE_WEBHOOK_SECRET || "").trim());
var STRIPE_API = process.env.STRIPE_API_BASE || "https://api.stripe.com";
function form(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}
async function stripe(method, path5, body2) {
  const res = await fetch(STRIPE_API + path5, {
    method,
    headers: { authorization: "Bearer " + SK(), "content-type": "application/x-www-form-urlencoded" },
    body: body2 ? form(body2) : void 0
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`);
  return data;
}
function createCheckout({ pack, currency: currency2, key, origin: origin2, lang: lang2, brand }) {
  return stripe("POST", "/v1/checkout/sessions", {
    mode: "payment",
    locale: lang2 === "en" ? "en" : "ru",
    success_url: `${origin2}/app?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin2}/#pricing`,
    allow_promotion_codes: "true",
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: currency2,
          unit_amount: Math.round(pack.price * 100),
          product_data: {
            name: `${brand} \u2014 ${pack.name[lang2] || pack.name.ru}`,
            description: lang2 === "en" ? `${pack.credits} credits for AI characters and videos` : `${pack.credits} \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432 \u043D\u0430 \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439 \u0438 \u0432\u0438\u0434\u0435\u043E`
          }
        }
      }
    },
    metadata: { pack: pack.id, credits: pack.credits, key: key || "" }
  });
}
var retrieveSession = (id) => stripe("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}`);
function verifyWebhook(raw, header2) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header2) return null;
  const parts = Object.fromEntries(header2.split(",").map((p) => p.split("=")));
  const t = parts.t;
  const sigs = header2.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return null;
  if (Math.abs(Date.now() / 1e3 - Number(t)) > 600) return null;
  const expected = crypto2.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const ok = sigs.some((s) => s.length === expected.length && crypto2.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  if (!ok) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// src/blog.mjs
import fs2 from "node:fs";
import path2 from "node:path";
import crypto3 from "node:crypto";

// src/md.mjs
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var TR = { \u0430: "a", \u0431: "b", \u0432: "v", \u0433: "g", \u0434: "d", \u0435: "e", \u0451: "e", \u0436: "zh", \u0437: "z", \u0438: "i", \u0439: "y", \u043A: "k", \u043B: "l", \u043C: "m", \u043D: "n", \u043E: "o", \u043F: "p", \u0440: "r", \u0441: "s", \u0442: "t", \u0443: "u", \u0444: "f", \u0445: "h", \u0446: "ts", \u0447: "ch", \u0448: "sh", \u0449: "sch", \u044A: "", \u044B: "y", \u044C: "", \u044D: "e", \u044E: "yu", \u044F: "ya", \u0456: "i", \u0457: "yi", \u0454: "ye", \u0491: "g" };
function slugify(s) {
  return String(s || "").toLowerCase().split("").map((c) => TR[c] ?? c).join("").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
}
var safeUrl = (u) => /^(https?:\/\/|\/)[^\s"'<>]*$/i.test(u);
function inline(text) {
  return text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => safeUrl(src) ? `<img src="${src}" alt="${alt}" loading="lazy">` : alt).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => safeUrl(u) ? `<a href="${u}"${/^https?:/i.test(u) ? ' rel="noopener" target="_blank"' : ""}>${t}</a>` : t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function renderMarkdown(md, { linker } = {}) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  const out = [], toc = [], ids = /* @__PURE__ */ new Set(), para = [];
  const L = (h) => linker ? linker(h) : h;
  const flush2 = () => {
    if (para.length) {
      out.push(`<p>${L(inline(esc(para.join(" "))))}</p>`);
      para.length = 0;
    }
  };
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (!line.trim()) {
      flush2();
      i++;
      continue;
    }
    if (m = line.match(/^(#{2,4})\s+(.+?)\s*#*$/)) {
      flush2();
      const lvl = m[1].length, txt = m[2].trim();
      let id = slugify(txt) || "section", n = 2;
      while (ids.has(id)) id = `${slugify(txt) || "section"}-${n++}`;
      ids.add(id);
      if (lvl === 2) toc.push({ id, text: txt });
      out.push(`<h${lvl} id="${id}">${inline(esc(txt))}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      flush2();
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush2();
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush2();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${L(inline(esc(q.join(" "))))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flush2();
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((t) => `<li>${L(inline(esc(t)))}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush2();
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map((t) => `<li>${L(inline(esc(t)))}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush2();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|?\s*:?-{2,}/.test(lines[i])) rows.push(cells(lines[i]));
        i++;
      }
      if (rows.length) {
        const [head2, ...body2] = rows;
        out.push(`<div class="tbl"><table><thead><tr>${head2.map((c) => `<th>${inline(esc(c))}</th>`).join("")}</tr></thead><tbody>${body2.map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      }
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush2();
  return { html: out.join("\n"), toc };
}
function makeLinker(rules, { max = 6, selfUrl = "" } = {}) {
  const used = /* @__PURE__ */ new Set();
  let count = 0;
  const compiled = [];
  for (const r of rules) {
    if (!r.url || r.url === selfUrl) continue;
    for (const a of String(r.anchors || "").split(/[,;\n]/).map((x) => x.trim()).filter((x) => x.length >= 3)) {
      compiled.push({ url: r.url, len: a.length, re: new RegExp(`(?<![\\p{L}\\p{N}])(${escRe(esc(a))})(?![\\p{L}\\p{N}])`, "iu") });
    }
  }
  compiled.sort((a, b) => b.len - a.len);
  const linker = (html) => {
    for (const r of compiled) {
      if (count >= max) break;
      if (used.has(r.url)) continue;
      const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/);
      for (let k = 0; k < parts.length; k += 2) {
        const m = parts[k].match(r.re);
        if (!m) continue;
        parts[k] = parts[k].slice(0, m.index) + `<a href="${esc(r.url)}" class="il">${m[1]}</a>` + parts[k].slice(m.index + m[1].length);
        used.add(r.url);
        count++;
        html = parts.join("");
        break;
      }
    }
    return html;
  };
  linker.links = () => [...used];
  return linker;
}
var stripMd = (md) => String(md || "").replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/[*_`>|#-]/g, " ").replace(/\s+/g, " ").trim();
var wordCount = (md) => (stripMd(md).match(/[\p{L}\p{N}]+/gu) || []).length;

// src/blog.mjs
var { UserError: UserError2 } = fal_exports;
var BRAND = process.env.STUDIO_NAME || "Kadro";
var IMG_DIR = path2.join(DATA_DIR, "blog-img");
fs2.mkdirSync(IMG_DIR, { recursive: true });
var COVER_MODEL = process.env.FAL_COVER_MODEL || "fal-ai/nano-banana-pro";
var LLM_MODELS = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (\u043B\u0443\u0447\u0448\u0435\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E)" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5 (\u043B\u0443\u0447\u0448\u0438\u0439 \u0441\u0442\u0438\u043B\u044C \u0442\u0435\u043A\u0441\u0442\u0430)" },
  { id: "openai/gpt-4.1", name: "GPT-4.1" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (\u0431\u044B\u0441\u0442\u0440\u043E \u0438 \u0434\u0451\u0448\u0435\u0432\u043E)" }
];
db.posts ||= [];
db.seoJobs ||= [];
db.seo ||= {};
var S = db.seo;
S.home ||= { ru: { title: "", description: "" }, en: { title: "", description: "" } };
S.verify ||= { google: "", yandex: "", bing: "" };
S.analytics ||= { ga4: "", metrika: "" };
S.links ||= [];
S.maxLinks ??= 6;
S.llm ||= LLM_MODELS[0].id;
S.indexnow ??= true;
S.indexnowKey ||= crypto3.randomBytes(16).toString("hex");
S.plan ||= [];
S.ogImage ||= "";
S.autoCover ??= true;
S.autoPin ??= true;
S.pinText ??= true;
var seo = S;
var DEFAULT_HOME = {
  ru: { title: `${BRAND} \u2014 \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0438 \u0438 \u0432\u0438\u0434\u0435\u043E \u0441 \u043D\u0438\u043C\u0438`, description: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0440\u0435\u0430\u043B\u0438\u0441\u0442\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u0441\u043E \u0441\u0432\u043E\u0438\u043C \u043B\u0438\u0446\u043E\u043C \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u043C \u0438 \u0441\u043D\u0438\u043C\u0430\u0439\u0442\u0435 \u0441 \u043D\u0438\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0432\u0438\u0434\u0435\u043E: \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u0432 \u043A\u0430\u0434\u0440, \u0438\u0433\u0440\u0430\u0435\u0442 \u0441\u0446\u0435\u043D\u044B, \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u0442 \u0438\u0437 \u0440\u043E\u043B\u0438\u043A\u0430 \u0432 \u0440\u043E\u043B\u0438\u043A." },
  en: { title: `${BRAND} \u2014 AI characters and videos with them`, description: "Create a realistic AI character with a fixed face and voice, then make short videos: talking to camera, acting in scenes, carried from clip to clip." }
};
var homeMeta = (lang2) => ({ title: S.home[lang2]?.title || DEFAULT_HOME[lang2].title, description: S.home[lang2]?.description || DEFAULT_HOME[lang2].description });
var blogBase = (lang2) => lang2 === "en" ? "/en/blog" : "/blog";
var postUrl = (p) => `${blogBase(p.lang)}/${p.slug}`;
var tagUrl = (lang2, tag) => `${blogBase(lang2)}/tag/${encodeURIComponent(slugify(tag) || tag)}`;
function originOf(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const o = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers["x-forwarded-host"] || req.headers.host}`;
  if (!/localhost|127\.0\.0\.1/.test(o)) S.origin = o;
  return o;
}
var knownOrigin = () => (process.env.PUBLIC_URL || S.origin || "").replace(/\/$/, "");
var published = (lang2) => db.posts.filter((p) => p.status === "published" && (!lang2 || p.lang === lang2)).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
var findPost = (id) => db.posts.find((p) => p.id === id);
var findBySlug = (lang2, slug) => db.posts.find((p) => p.lang === lang2 && p.slug === slug && p.status === "published");
function uniqueSlug(lang2, base, selfId) {
  let s = slugify(base) || "post", n = 2;
  const taken = (x) => db.posts.some((p) => p.lang === lang2 && p.slug === x && p.id !== selfId);
  const root = s;
  while (taken(s)) s = `${root}-${n++}`;
  return s;
}
var clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
function normalizePost(input, existing) {
  const lang2 = input.lang === "en" ? "en" : "ru";
  const p = existing || { id: newId(), created: Date.now(), views: 0, daily: {}, status: "draft" };
  p.lang = lang2;
  p.title = clean(input.title, 140);
  if (!p.title) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438.");
  p.keyword = clean(input.keyword, 80);
  p.description = clean(input.description, 300);
  p.anchors = clean(Array.isArray(input.anchors) ? input.anchors.join(", ") : input.anchors, 300);
  p.tags = (Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",")).map((t) => clean(t, 40)).filter(Boolean).slice(0, 6);
  p.body = String(input.body ?? p.body ?? "").slice(0, 12e4);
  p.faq = (Array.isArray(input.faq) ? input.faq : []).map((f) => ({ q: clean(f.q, 240), a: String(f.a || "").trim().slice(0, 1500) })).filter((f) => f.q && f.a).slice(0, 10);
  p.coverAlt = clean(input.coverAlt, 200) || p.title;
  if (input.coverPrompt !== void 0) p.coverPrompt = clean(input.coverPrompt, 600);
  p.translationId = db.posts.some((x) => x.id === input.translationId && x.lang !== lang2) ? input.translationId : "";
  p.slug = uniqueSlug(lang2, input.slug || p.slug || p.title, p.id);
  p.updated = Date.now();
  return p;
}
function savePost(input) {
  const existing = input.id ? findPost(input.id) : null;
  if (input.id && !existing) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const p = normalizePost(input, existing);
  if (!existing) db.posts.unshift(p);
  for (const x of db.posts) if (x.translationId === p.id && x.id !== p.translationId) x.translationId = "";
  if (p.translationId) findPost(p.translationId).translationId = p.id;
  save();
  return p;
}
function setPublished(id, on) {
  const p = findPost(id);
  if (!p) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  if (on && wordCount(p.body) < 150) throw new UserError2("\u0412 \u0441\u0442\u0430\u0442\u044C\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u043E \u0442\u0435\u043A\u0441\u0442\u0430 \u0434\u043B\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438.");
  p.status = on ? "published" : "draft";
  if (on && !p.publishedAt) p.publishedAt = Date.now();
  p.updated = Date.now();
  if (on && S.autoPin && !p.pin && !p.pinJob) startPin(p.id).catch(() => {
  });
  save();
  return p;
}
function deletePost(id) {
  const p = findPost(id);
  if (!p) return;
  for (const f of fs2.readdirSync(IMG_DIR)) if (f.startsWith(id + ".") || f.startsWith(id + "-pin.")) fs2.rmSync(path2.join(IMG_DIR, f), { force: true });
  for (const x of db.posts) if (x.translationId === id) x.translationId = "";
  db.posts = db.posts.filter((x) => x.id !== id);
  save();
}
var BUILTIN = { ru: [{ anchors: "\u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436, \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430, \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0438, \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439, AI-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436, AI-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430", url: "/" }], en: [{ anchors: "AI character, AI characters", url: "/" }] };
function linkRules(lang2) {
  const auto = published(lang2).filter((p) => p.keyword).map((p) => ({ anchors: [p.keyword, p.anchors].filter(Boolean).join(", "), url: postUrl(p), auto: true }));
  const manual = S.links.filter((l) => l.lang === lang2 || l.lang === "all");
  return [...manual, ...auto, ...BUILTIN[lang2]];
}
function renderPost(p) {
  const linker = makeLinker(linkRules(p.lang), { max: S.maxLinks, selfUrl: postUrl(p) });
  const r = renderMarkdown(p.body, { linker });
  return { ...r, links: linker.links() };
}
function related(p, n = 3) {
  const kw = new Set(String(p.keyword || "").toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  return published(p.lang).filter((x) => x.id !== p.id).map((x) => ({ x, s: x.tags.filter((t) => p.tags.includes(t)).length * 3 + String(x.keyword || "").toLowerCase().split(/\s+/).filter((w) => kw.has(w)).length })).sort((a, b) => b.s - a.s || (b.x.publishedAt || 0) - (a.x.publishedAt || 0)).slice(0, n).map((r) => r.x);
}
function linkGraph() {
  const incoming = {}, outgoing = {};
  for (const p of published()) {
    const links = renderPost(p).links;
    outgoing[p.id] = links.length;
    for (const u of links) incoming[u] = (incoming[u] || 0) + 1;
  }
  return { incoming, outgoing };
}
function analyze(p) {
  const kw = String(p.keyword || "").toLowerCase().trim();
  const text = stripMd(p.body).toLowerCase();
  const words = wordCount(p.body);
  const firstPara = (String(p.body || "").split(/\n\s*\n/).map(stripMd).find((x) => x.length > 40) || "").toLowerCase();
  const h2 = (String(p.body || "").match(/^##\s+.+$/gm) || []).map((h) => h.toLowerCase());
  const kwStem = kw.split(/\s+/).filter(Boolean).map((w) => w.slice(0, Math.max(4, w.length - 2)));
  const has = (s) => kw && kwStem.every((st) => s.includes(st));
  const kwCount = kw ? (text.match(new RegExp(kwStem.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\p{L}]*\\s+"), "giu")) || []).length : 0;
  const density = words ? kwCount * Math.max(1, kw.split(/\s+/).length) / words * 100 : 0;
  const paras = String(p.body || "").split(/\n\s*\n/).map(stripMd).filter((x) => x.length > 0 && !/^#/.test(x));
  const avgPara = paras.length ? paras.reduce((s, x) => s + x.split(/\s+/).length, 0) / paras.length : 0;
  const rendered = renderPost(p);
  const tl = (p.title || "").length, dl = (p.description || "").length;
  const checks = [
    { w: 8, ok: !!kw, t: "\u0417\u0430\u0434\u0430\u043D\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E", tip: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441, \u043F\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u0441\u0442\u0430\u0442\u044C\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F." },
    { w: 10, ok: tl >= 30 && tl <= 65, warn: tl > 0, t: `\u0414\u043B\u0438\u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 ${tl} \u0441\u0438\u043C\u0432. (\u043B\u0443\u0447\u0448\u0435 30\u201365)`, tip: "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0442\u0435\u0440\u044F\u0435\u0442 \u0441\u043B\u043E\u0432\u0430, \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u043E\u0431\u0440\u0435\u0437\u0430\u0435\u0442\u0441\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435." },
    { w: 10, ok: has((p.title || "").toLowerCase()), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435", tip: "\u041F\u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u043B\u0438\u0436\u0435 \u043A \u043D\u0430\u0447\u0430\u043B\u0443 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430." },
    { w: 10, ok: dl >= 110 && dl <= 165, warn: dl > 0, t: `\u0414\u043B\u0438\u043D\u0430 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F ${dl} \u0441\u0438\u043C\u0432. (\u043B\u0443\u0447\u0448\u0435 110\u2013165)`, tip: "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u0432 \u043F\u043E\u0438\u0441\u043A\u0435: \u043E\u0442 \u043D\u0435\u0433\u043E \u0437\u0430\u0432\u0438\u0441\u0438\u0442, \u043A\u043B\u0438\u043A\u043D\u0443\u0442 \u043B\u0438." },
    { w: 5, ok: has((p.description || "").toLowerCase()), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438", tip: "\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u0438\u043A \u0432\u044B\u0434\u0435\u043B\u044F\u0435\u0442 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u0436\u0438\u0440\u043D\u044B\u043C." },
    { w: 4, ok: (p.slug || "").length > 0 && (p.slug || "").length <= 60, t: "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0430\u0434\u0440\u0435\u0441 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B", tip: "\u0414\u043E 60 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0435\u0439." },
    { w: 8, ok: has(firstPara), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043F\u0435\u0440\u0432\u043E\u043C \u0430\u0431\u0437\u0430\u0446\u0435", tip: "\u0421\u0440\u0430\u0437\u0443 \u043F\u043E\u043A\u0430\u0436\u0438\u0442\u0435, \u043E \u0447\u0451\u043C \u0441\u0442\u0430\u0442\u044C\u044F." },
    { w: 6, ok: density >= 0.4 && density <= 3, warn: kwCount > 0, t: `\u0427\u0430\u0441\u0442\u043E\u0442\u0430 \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0433\u043E \u0441\u043B\u043E\u0432\u0430 ${density.toFixed(1)}% (\u043B\u0443\u0447\u0448\u0435 0,4\u20133%)`, tip: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0447\u0430\u0441\u0442\u043E \u2014 \u044D\u0442\u043E \u043F\u0435\u0440\u0435\u0441\u043F\u0430\u043C, \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0440\u0435\u0434\u043A\u043E \u2014 \u0442\u0435\u043C\u0430 \u043D\u0435\u044F\u0441\u043D\u0430." },
    { w: 12, ok: words >= 1e3, warn: words >= 600, t: `\u041E\u0431\u044A\u0451\u043C ${words} \u0441\u043B\u043E\u0432 (\u043B\u0443\u0447\u0448\u0435 \u043E\u0442 1000)`, tip: "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u0447\u0430\u0449\u0435 \u0437\u0430\u043D\u0438\u043C\u0430\u044E\u0442 \u0432\u0435\u0440\u0445\u043D\u0438\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438." },
    { w: 7, ok: h2.length >= 3, t: `\u041F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 H2: ${h2.length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 3)`, tip: "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0438 \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044E, \u0438 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u0438\u043A\u0443." },
    { w: 4, ok: h2.some(has), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435", tip: "\u0425\u043E\u0442\u044F \u0431\u044B \u0432 \u043E\u0434\u043D\u043E\u043C H2." },
    { w: 5, ok: !!p.cover, t: "\u0415\u0441\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u0430", tip: "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0443\u0436\u043D\u0430 \u0434\u043B\u044F \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u0438 Google Discover." },
    { w: 6, ok: rendered.links.length >= 2, warn: rendered.links.length === 1, t: `\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A: ${rendered.links.length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 2)`, tip: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0438 \u0438\u043B\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u0442\u0430\u0442\u0435\u0439 \u043F\u043E \u0442\u0435\u043C\u0435." },
    { w: 3, ok: (p.faq || []).length >= 3, t: `\u0412\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0432 FAQ: ${(p.faq || []).length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 3)`, tip: "FAQ \u043B\u043E\u0432\u0438\u0442 \u0434\u043B\u0438\u043D\u043D\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430." },
    { w: 2, ok: avgPara > 0 && avgPara <= 90, t: "\u0410\u0431\u0437\u0430\u0446\u044B \u043D\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", tip: "\u0412 \u0441\u0440\u0435\u0434\u043D\u0435\u043C \u0434\u043E 90 \u0441\u043B\u043E\u0432 \u043D\u0430 \u0430\u0431\u0437\u0430\u0446." }
  ];
  const score = Math.round(checks.reduce((s, c) => s + (c.ok ? c.w : c.warn ? c.w * 0.5 : 0), 0));
  return {
    score,
    words,
    kwCount,
    density: +density.toFixed(2),
    checks: checks.map(({ w, ok, warn, t, tip }) => ({ ok, warn: !ok && !!warn, t, tip, w })),
    html: rendered.html,
    toc: rendered.toc,
    links: rendered.links,
    readMin: Math.max(1, Math.round(words / 200))
  };
}
function audit(req) {
  const pub = published();
  const graph = linkGraph();
  const titles = {};
  for (const p of pub) titles[p.title.toLowerCase()] = (titles[p.title.toLowerCase()] || 0) + 1;
  const thin = pub.filter((p) => wordCount(p.body) < 600);
  const noDesc = pub.filter((p) => (p.description || "").length < 50);
  const noCover = pub.filter((p) => !p.cover);
  const orphans = pub.filter((p) => !graph.incoming[postUrl(p)]);
  const dupes = Object.values(titles).filter((n) => n > 1).length;
  const low = pub.filter((p) => analyze(p).score < 60);
  const home = ["ru", "en"].map((l) => homeMeta(l));
  const C = (w, ok, t, tip, warn) => ({ w, ok, warn: !ok && !!warn, t, tip });
  const checks = [
    C(8, !!process.env.PUBLIC_URL, "\u0417\u0430\u0434\u0430\u043D \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0430\u0434\u0440\u0435\u0441 \u0441\u0430\u0439\u0442\u0430 (PUBLIC_URL)", "Railway \u2192 Variables \u2192 PUBLIC_URL = https://\u0432\u0430\u0448-\u0434\u043E\u043C\u0435\u043D. \u0411\u0435\u0437 \u044D\u0442\u043E\u0433\u043E canonical \u0438 sitemap \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.", !!knownOrigin()),
    C(6, !!process.env.RAILWAY_VOLUME_MOUNT_PATH || !!process.env.DATA_DIR, "\u0421\u0442\u0430\u0442\u044C\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043D\u0430 Volume", "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 Volume /data, \u0438\u043D\u0430\u0447\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438."),
    C(8, !!S.verify.google, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D Google Search Console", "\u0411\u0435\u0437 \u043D\u0435\u0433\u043E \u043D\u0435 \u0432\u0438\u0434\u043D\u043E, \u043F\u043E \u043A\u0430\u043A\u0438\u043C \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u043C \u0432\u0430\u0441 \u043D\u0430\u0445\u043E\u0434\u044F\u0442, \u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u0443\u0441\u043A\u043E\u0440\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441\u0430\u0446\u0438\u044E."),
    C(4, !!S.verify.yandex, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u042F\u043D\u0434\u0435\u043A\u0441.\u0412\u0435\u0431\u043C\u0430\u0441\u0442\u0435\u0440", "\u0412\u0430\u0436\u043D\u043E \u0434\u043B\u044F \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E \u0442\u0440\u0430\u0444\u0438\u043A\u0430."),
    C(3, !!S.verify.bing, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D Bing Webmaster", "Bing \u0442\u0430\u043A\u0436\u0435 \u043F\u0438\u0442\u0430\u0435\u0442 \u043F\u043E\u0438\u0441\u043A \u0432 ChatGPT \u0438 Copilot."),
    C(6, !!(S.analytics.ga4 || S.analytics.metrika), "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", "Google Analytics 4 \u0438\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0430."),
    C(5, home.every((h) => h.title.length <= 65 && h.description.length <= 170), "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0432 \u043D\u043E\u0440\u043C\u0435", "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2192 \u0433\u043B\u0430\u0432\u043D\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430."),
    C(15, pub.length >= 20, `\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E \u0441\u0442\u0430\u0442\u0435\u0439: ${pub.length} (\u0446\u0435\u043B\u044C \u2014 \u043E\u0442 20, \u043B\u0443\u0447\u0448\u0435 50+)`, "\u0422\u0440\u0430\u0444\u0438\u043A \u0440\u0430\u0441\u0442\u0451\u0442 \u043E\u0442 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u043F\u043E \u0440\u0430\u0437\u043D\u044B\u043C \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u043C.", pub.length >= 5),
    C(5, published("en").length >= 3, `\u0421\u0442\u0430\u0442\u0435\u0439 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u043C: ${published("en").length}`, "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0434\u0430\u0451\u0442 \u0432 \u0440\u0430\u0437\u044B \u0431\u043E\u043B\u044C\u0448\u0438\u0439 \u0440\u044B\u043D\u043E\u043A."),
    C(10, thin.length === 0, `\u0421\u043B\u0430\u0431\u044B\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 (< 600 \u0441\u043B\u043E\u0432): ${thin.length}`, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0438\u043B\u0438 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u0441 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438: \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0442\u044F\u043D\u0443\u0442 \u0441\u0430\u0439\u0442 \u0432\u043D\u0438\u0437.", thin.length <= 2),
    C(6, noDesc.length === 0, `\u0411\u0435\u0437 \u043C\u0435\u0442\u0430-\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F: ${noDesc.length}`, "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0443 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0438."),
    C(4, noCover.length === 0, `\u0411\u0435\u0437 \u043E\u0431\u043B\u043E\u0436\u043A\u0438: ${noCover.length}`, "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043E\u0431\u043B\u043E\u0436\u043A\u0443."),
    C(8, orphans.length === 0, `\u0421\u0442\u0430\u0442\u044C\u0438-\u0441\u0438\u0440\u043E\u0442\u044B \u0431\u0435\u0437 \u0432\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A: ${orphans.length}`, "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0445 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u0434\u0440\u0443\u0433\u0438\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u0438\u043B\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0438.", orphans.length <= 2),
    C(4, dupes === 0, `\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: ${dupes}`, "\u0423 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A."),
    C(8, low.length === 0, `\u0421\u0442\u0430\u0442\u044C\u0438 \u0441 SEO-\u043E\u0446\u0435\u043D\u043A\u043E\u0439 \u043D\u0438\u0436\u0435 60: ${low.length}`, "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u044C\u044E \u0438 \u043F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u043F\u043E \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0443 \u0441\u043F\u0440\u0430\u0432\u0430.", low.length <= 2)
  ];
  const score = Math.round(checks.reduce((s, c) => s + (c.ok ? c.w : c.warn ? c.w * 0.5 : 0), 0) / checks.reduce((s, c) => s + c.w, 0) * 100);
  return { score, checks: checks.map(({ w, ...c }) => c), orphans: orphans.map((p) => p.id) };
}
var BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|lighthouse|headless/i;
var day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
function countView(p, req) {
  if (BOT.test(req.headers["user-agent"] || "")) return;
  p.views = (p.views || 0) + 1;
  p.daily ||= {};
  const d = day();
  p.daily[d] = (p.daily[d] || 0) + 1;
  const keys = Object.keys(p.daily);
  if (keys.length > 120) for (const k of keys.sort().slice(0, keys.length - 120)) delete p.daily[k];
  save();
}
function viewsByDay(n = 30) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = day(Date.now() - i * 864e5);
    out.push({ day: d, views: db.posts.reduce((s, p) => s + (p.daily?.[d] || 0), 0) });
  }
  return out;
}
async function indexNow(urls) {
  const origin2 = knownOrigin();
  if (!S.indexnow) return { skipped: "IndexNow \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445" };
  if (!origin2 || /localhost|127\.0\.0\.1/.test(origin2)) return { skipped: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D \u0430\u0434\u0440\u0435\u0441 \u0441\u0430\u0439\u0442\u0430: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 PUBLIC_URL" };
  const host = new URL(origin2).host;
  const list = [...new Set(urls.map((u) => u.startsWith("http") ? u : origin2 + u))].slice(0, 1e4);
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: S.indexnowKey, keyLocation: `${origin2}/${S.indexnowKey}.txt`, urlList: list })
    });
    S.lastIndexNow = { at: Date.now(), status: r.status, count: list.length };
  } catch (e) {
    S.lastIndexNow = { at: Date.now(), status: 0, count: list.length, error: e.message };
  }
  save();
  return S.lastIndexNow;
}
var allUrls = () => ["/", "/?lang=en", "/blog", "/en/blog", ...published().map(postUrl)];
function saveImage(id, buf, type) {
  for (const f of fs2.readdirSync(IMG_DIR)) if (f.startsWith(id + ".")) fs2.rmSync(path2.join(IMG_DIR, f), { force: true });
  const ext = /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg";
  fs2.writeFileSync(path2.join(IMG_DIR, `${id}.${ext}`), buf);
  return `/blog-img/${id}.${ext}?v=${Date.now()}`;
}
function uploadCover(id, dataUrl) {
  const p = findPost(id);
  if (!p) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError2("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  p.cover = saveImage(p.id, Buffer.from(m[2], "base64"), m[1]);
  save();
  return p;
}
function uploadPin(id, dataUrl) {
  const p = findPost(id);
  if (!p) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError2("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  p.pin = saveImage(`${p.id}-pin`, Buffer.from(m[2], "base64"), m[1]);
  save();
  return p;
}
var pinImage = (p) => String(p.pin || p.cover || "").replace(/\?.*$/, "");
function uploadOg(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError2("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  S.ogImage = saveImage("og-default", Buffer.from(m[2], "base64"), m[1]);
  save();
}
function serveImage(res, name) {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return false;
  const file = path2.join(IMG_DIR, name);
  if (!fs2.existsSync(file)) return false;
  res.writeHead(200, { "content-type": name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": "public, max-age=604800" });
  fs2.createReadStream(file).pipe(res);
  return true;
}
var LANG_NAME = { ru: "Russian", en: "English" };
var SYSTEM = (lang2) => [
  `You are a senior SEO editor and an experienced short-form video producer writing for ${BRAND}, an online service where people create realistic fictional AI characters with a fixed face and voice and then make short videos with them: talking-head clips, UGC-style ads, scenes with dialogue, series for Reels, TikTok and YouTube Shorts.`,
  "Write genuinely helpful, expert and specific content that demonstrates first-hand experience (E-E-A-T): concrete settings, examples, checklists and common mistakes.",
  "No filler, no clich\xE9s, no invented statistics, studies, quotes or experts, and no claims you cannot support.",
  `Write in ${LANG_NAME[lang2]} only, in a natural native style.`
].join(" ");
function parseJSON(text) {
  const t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (!a.length || b < Math.min(...a)) throw new Error("\u0418\u0418 \u0432\u0435\u0440\u043D\u0443\u043B \u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON");
  return JSON.parse(t.slice(Math.min(...a), b + 1));
}
var NEEDS_REASONING = /gemini-2\.5-pro|deepseek-r1|\/o3$/;
var needsReasoning = (text) => /reasoning/i.test(text || "");
function llmInput(prompt, system, maxTokens, { reasoning, model = S.llm, temperature = 0.7 } = {}) {
  const on = reasoning ?? NEEDS_REASONING.test(model);
  const input = { prompt, system_prompt: system, model, temperature, reasoning: on };
  if (maxTokens) input.max_tokens = on ? maxTokens + 16e3 : maxTokens;
  return input;
}
var errText = (r) => JSON.stringify(r.data || "");
async function submitLLM(prompt, system, maxTokens, opts) {
  const url = "https://queue.fal.run/fal-ai/any-llm";
  const input = llmInput(prompt, system, maxTokens, opts);
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422 && needsReasoning(errText(r)) && !input.reasoning) r = await falFetch(url, { method: "POST", body: JSON.stringify({ ...input, reasoning: true, max_tokens: maxTokens ? maxTokens + 16e3 : void 0 }) });
  else if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify(llmInput(prompt, system, null, { model: "google/gemini-2.5-flash", reasoning: false })) });
  return r;
}
async function submitImage(prompt, aspect = "16:9") {
  const url = `https://queue.fal.run/${COVER_MODEL}`;
  const input = { prompt, num_images: 1, output_format: "jpeg", aspect_ratio: aspect, resolution: "1K" };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify({ prompt, num_images: 1 }) });
  return r;
}
function articlePrompt({ keyword, title, intent, lang: lang2 }) {
  return [
    "Write an in-depth blog article.",
    `Focus keyword: ${keyword}`,
    title ? `Working title: ${title}` : "",
    intent ? `Search intent: ${intent}` : "",
    "Requirements:",
    "- 1600\u20132200 words.",
    "- No H1. Start with a 2\u20133 sentence intro paragraph that contains the focus keyword naturally.",
    "- 5\u20138 sections with ## headings and ### subheadings where useful. Put the focus keyword (or a close variant) in at least one ## heading.",
    "- Use the focus keyword naturally 3\u20136 times in total, plus related terms and synonyms. Never stuff keywords.",
    "- Be practical: step-by-step instructions, checklists, concrete examples (scripts, hooks, shot types, video length, posting strategy, character design), typical mistakes and how to avoid them.",
    `- Mention ${BRAND} naturally 1\u20132 times only where it genuinely helps the reader (for example, as a way to create a consistent AI character and make videos with it). It must not read like an advertisement.`,
    "- Do not add any links; internal links are added automatically.",
    "- Markdown only: paragraphs, ## and ### headings, bullet and numbered lists, **bold**, optionally one table. Keep paragraphs short (2\u20134 sentences).",
    "- Also write 4\u20135 FAQ questions people really search for, with concise 2\u20134 sentence answers that do not repeat the article verbatim.",
    `- Language: ${LANG_NAME[lang2]}.`,
    "Return ONLY valid JSON without code fences, with this exact shape:",
    '{"title":"SEO title, 45\u201360 characters, contains the focus keyword","description":"meta description, 130\u2013155 characters, contains the focus keyword, ends with a soft call to action","slug":"short-latin-url-slug-3-to-6-words","tags":["2\u20134 short topic tags"],"anchors":["2\u20133 grammatical variants of the focus keyword for internal links"],"cover_prompt":"English prompt for a photorealistic editorial cover photo that illustrates the topic; no text, no logos, no celebrities","body":"the article in Markdown","faq":[{"q":"question","a":"answer"}]}'
  ].filter(Boolean).join("\n");
}
function planPrompt({ seed, lang: lang2, count, existing }) {
  return [
    `Create a content plan of ${count} blog articles for ${BRAND}.`,
    `Niche and topics: ${seed}`,
    `Language of keywords and titles: ${LANG_NAME[lang2]}.`,
    "Mix search intents: informational (how-to, guides, ideas), commercial (best options, comparisons, prices) and long-tail questions people actually type into Google.",
    "Prefer realistic low-competition long-tail keywords that a new site can rank for. Group topics into clusters so articles can link to each other.",
    existing.length ? `Do not duplicate these existing topics: ${existing.slice(0, 80).join("; ")}` : "",
    'Return ONLY a valid JSON array without code fences: [{"keyword":"...","title":"...","intent":"informational|commercial|transactional","cluster":"..."}]'
  ].filter(Boolean).join("\n");
}
async function startArticle({ keyword, title, intent, lang: lang2, planId }) {
  keyword = clean(keyword, 100);
  if (keyword.length < 3) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0442\u0435\u043C\u0443 \u0441\u0442\u0430\u0442\u044C\u0438.");
  lang2 = lang2 === "en" ? "en" : "ru";
  const r = await submitLLM(articlePrompt({ keyword, title: clean(title, 140), intent: clean(intent, 40), lang: lang2 }), SYSTEM(lang2), 12e3);
  if (!r.ok || !r.data.request_id) throw new UserError2("\u0418\u0418 \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0437\u0430\u0434\u0430\u0447\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "article", status: "working", input: { keyword, title, intent, lang: lang2, planId }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now(), llm: { prompt: articlePrompt({ keyword, title: clean(title, 140), intent: clean(intent, 40), lang: lang2 }), system: SYSTEM(lang2), maxTokens: 12e3 } };
  db.seoJobs.unshift(job);
  if (planId) {
    const it = S.plan.find((x) => x.id === planId);
    if (it) {
      it.status = "writing";
      it.jobId = job.id;
    }
  }
  save();
  return job;
}
async function startPlan({ seed, lang: lang2, count }) {
  lang2 = lang2 === "en" ? "en" : "ru";
  count = Math.max(5, Math.min(40, parseInt(count, 10) || 20));
  seed = clean(seed, 600) || (lang2 === "en" ? "AI characters, AI influencers, talking avatar videos, AI UGC ads, faceless content for TikTok, Reels and Shorts, consistent characters in AI video" : "\u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0438, \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0431\u043B\u043E\u0433\u0435\u0440\u044B, \u0433\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0435 \u0430\u0432\u0430\u0442\u0430\u0440\u044B, UGC-\u0440\u0435\u043A\u043B\u0430\u043C\u0430 \u0441 \u0418\u0418, \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0431\u0435\u0437 \u043B\u0438\u0446\u0430 \u0434\u043B\u044F Reels, TikTok \u0438 Shorts, \u043E\u0434\u0438\u043D \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u0432\u0438\u0434\u0435\u043E");
  const existing = [...db.posts.map((p) => p.title), ...S.plan.map((x) => x.title)];
  const r = await submitLLM(planPrompt({ seed, lang: lang2, count, existing }), SYSTEM(lang2), 6e3);
  if (!r.ok || !r.data.request_id) throw new UserError2("\u0418\u0418 \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0437\u0430\u0434\u0430\u0447\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "plan", status: "working", input: { seed, lang: lang2, count }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now(), llm: { prompt: planPrompt({ seed, lang: lang2, count, existing }), system: SYSTEM(lang2), maxTokens: 6e3 } };
  db.seoJobs.unshift(job);
  save();
  return job;
}
async function startPin(postId) {
  const p = findPost(postId);
  if (!p) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  if (p.pinJob) return null;
  const prompt = [
    "A vertical Pinterest pin image for a blog article, 2:3 portrait format.",
    S.pinText ? `It shows a large, perfectly legible headline that reads exactly, letter for letter: "${p.title}". Elegant modern typography on a clean solid or softly blurred band in the upper or lower third, high contrast, correct ${p.lang === "en" ? "English" : "Russian Cyrillic"} spelling. The only other text is a small "${BRAND}" wordmark at the very bottom.` : "No text and no letters anywhere in the image.",
    p.coverPrompt ? `Background image: ${p.coverPrompt}.` : `Background: a photorealistic editorial photograph illustrating "${p.title}".`,
    "High-end editorial photography style, natural colours, professional composition. Any people are fictional, not real or famous persons. No watermark and no logos other than the wordmark."
  ].join(" ");
  const r = await submitImage(prompt, "2:3");
  if (!r.ok || !r.data.request_id) throw new UserError2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043F\u0438\u043D: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "pin", status: "working", input: { postId }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now() };
  db.seoJobs.unshift(job);
  p.pinJob = job.id;
  save();
  return job;
}
async function startMissingPins(lang2) {
  const list = published(lang2).filter((p) => !p.pin && !p.pinJob).slice(0, 20);
  for (const p of list) await startPin(p.id);
  return list.length;
}
async function startCover(postId) {
  const p = findPost(postId);
  if (!p) throw new UserError2("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const prompt = [
    p.coverPrompt || `Editorial photograph illustrating the topic: ${p.title}`,
    "Photorealistic, high-end editorial photography, natural colours, shallow depth of field, clean composition with negative space.",
    "No text, no letters, no watermark, no logo. Any people are fictional, not real or famous persons."
  ].join(" ");
  const r = await submitImage(prompt);
  if (!r.ok || !r.data.request_id) throw new UserError2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "cover", status: "working", input: { postId }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now() };
  db.seoJobs.unshift(job);
  p.coverJob = job.id;
  save();
  return job;
}
async function improveMeta({ title, description, keyword, body: body2, lang: lang2 }) {
  lang2 = lang2 === "en" ? "en" : "ru";
  const prompt = [
    "Rewrite the SEO title and meta description for this article to maximise click-through rate from Google while staying accurate.",
    `Focus keyword: ${clean(keyword, 100)}`,
    `Current title: ${clean(title, 140)}`,
    `Current description: ${clean(description, 300)}`,
    `Article start: ${stripMd(body2).slice(0, 1500)}`,
    "Title: 45\u201360 characters, focus keyword near the beginning, specific benefit or number if it fits, no clickbait, no ALL CAPS.",
    "Description: 130\u2013155 characters, includes the focus keyword, promises a concrete outcome, ends with a soft call to action.",
    `Language: ${LANG_NAME[lang2]}.`,
    'Return ONLY JSON: {"title":"...","description":"..."}'
  ].join("\n");
  const input = llmInput(prompt, SYSTEM(lang2), null, { temperature: 0.6 });
  let r = await falFetch("https://fal.run/fal-ai/any-llm", { method: "POST", body: JSON.stringify(input) });
  if (!r.ok && needsReasoning(errText(r)) && !input.reasoning) r = await falFetch("https://fal.run/fal-ai/any-llm", { method: "POST", body: JSON.stringify({ ...input, reasoning: true }) });
  if (!r.ok) throw new UserError2("\u0418\u0418 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B: " + falError(r.status, r.data).admin, 502);
  if (r.data.error) throw new UserError2("\u0418\u0418 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B: " + r.data.error, 502);
  const j = parseJSON(r.data.output);
  return { title: clean(j.title, 140), description: clean(j.description, 300) };
}
var running = null;
function pollJobs() {
  if (!running) running = stepJobs().finally(() => {
    running = null;
  });
  return running;
}
async function stepJobs() {
  for (const job of db.seoJobs) {
    if (job.status !== "working") continue;
    try {
      const st = await falFetch(job.statusUrl);
      if (!st.ok) {
        if (st.status < 500) failJob(job, falError(st.status, st.data).admin);
        continue;
      }
      if (st.data.status !== "COMPLETED") {
        if (Date.now() - job.created > 15 * 60 * 1e3) failJob(job, "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E");
        continue;
      }
      const out = await falFetch(job.responseUrl);
      const llmErr = !out.ok ? errText(out) : out.data?.error || "";
      if (job.llm && !job.retried && needsReasoning(llmErr)) {
        const r2 = await submitLLM(job.llm.prompt, job.llm.system, job.llm.maxTokens, { reasoning: true });
        job.retried = true;
        if (r2.ok && r2.data.request_id) {
          job.statusUrl = r2.data.status_url;
          job.responseUrl = r2.data.response_url;
          continue;
        }
        failJob(job, falError(r2.status, r2.data).admin);
        continue;
      }
      if (!out.ok) {
        failJob(job, falError(out.status, out.data).admin);
        continue;
      }
      if (job.type === "cover" || job.type === "pin") {
        const img = (out.data.images || [])[0];
        const src = typeof img === "string" ? img : img?.url;
        const p = findPost(job.input.postId);
        if (!src) {
          failJob(job, "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443");
          continue;
        }
        if (p) {
          const res = await fetch(src);
          if (!res.ok) {
            failJob(job, "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443");
            continue;
          }
          const buf = Buffer.from(await res.arrayBuffer()), type = res.headers.get("content-type") || "";
          if (job.type === "pin") {
            p.pin = saveImage(`${p.id}-pin`, buf, type);
            delete p.pinJob;
          } else {
            p.cover = saveImage(p.id, buf, type);
            p.coverAlt ||= p.title;
            delete p.coverJob;
          }
        }
        job.status = "done";
        continue;
      }
      if (out.data.error) {
        failJob(job, out.data.error);
        continue;
      }
      const data = parseJSON(out.data.output);
      if (job.type === "plan") {
        const items = (Array.isArray(data) ? data : data.items || []).map((x) => ({
          id: newId(),
          lang: job.input.lang,
          keyword: clean(x.keyword, 100),
          title: clean(x.title, 140),
          intent: clean(x.intent, 30),
          cluster: clean(x.cluster, 60),
          status: "idea",
          created: Date.now()
        })).filter((x) => x.keyword && x.title);
        S.plan.unshift(...items);
        job.result = { added: items.length };
        job.status = "done";
      } else if (job.type === "article") {
        const p = savePost({
          lang: job.input.lang,
          title: data.title || job.input.title || job.input.keyword,
          keyword: job.input.keyword,
          description: data.description,
          slug: data.slug,
          tags: data.tags,
          anchors: data.anchors,
          body: data.body,
          faq: data.faq,
          coverPrompt: data.cover_prompt
        });
        p.ai = true;
        job.result = { postId: p.id };
        job.status = "done";
        if (job.input.planId) {
          const it = S.plan.find((x) => x.id === job.input.planId);
          if (it) {
            it.status = "done";
            it.postId = p.id;
          }
        }
        if (S.autoCover) await startCover(p.id).catch(() => {
        });
      }
    } catch (e) {
      failJob(job, e.message);
    }
  }
  if (db.seoJobs.length > 300) db.seoJobs.length = 300;
  save();
}
function failJob(job, err) {
  job.status = "failed";
  job.error = String(err || "\u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 300);
  if (job.type === "article" && job.input.planId) {
    const it = S.plan.find((x) => x.id === job.input.planId);
    if (it) it.status = "idea";
  }
  if (job.type === "cover") {
    const p = findPost(job.input.postId);
    if (p) delete p.coverJob;
  }
  if (job.type === "pin") {
    const p = findPost(job.input.postId);
    if (p) delete p.pinJob;
  }
}
var jobsBusy = () => db.seoJobs.some((j) => j.status === "working");
var code = (v) => {
  const raw = String(v ?? "");
  const m = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  return clean(m ? m[1] : raw, 120).replace(/[^\w\-.:]/g, "");
};
function saveSettings(b) {
  for (const l of ["ru", "en"]) S.home[l] = { title: clean(b.home?.[l]?.title, 120), description: clean(b.home?.[l]?.description, 300) };
  S.verify = { google: code(b.verify?.google), yandex: code(b.verify?.yandex), bing: code(b.verify?.bing), pinterest: code(b.verify?.pinterest) };
  const ga = clean(b.analytics?.ga4, 30).toUpperCase(), ym = clean(b.analytics?.metrika, 20);
  if (ga && !/^G-[A-Z0-9]{4,}$/.test(ga)) throw new UserError2("ID Google Analytics \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0442\u0430\u043A: G-XXXXXXXXXX.");
  if (ym && !/^\d{5,12}$/.test(ym)) throw new UserError2("\u041D\u043E\u043C\u0435\u0440 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0446\u0438\u0444\u0440\u044B.");
  S.analytics = { ga4: ga, metrika: ym };
  if (LLM_MODELS.some((m) => m.id === b.llm)) S.llm = b.llm;
  S.indexnow = b.indexnow !== false;
  S.autoCover = b.autoCover !== false;
  save();
}
function savePinSettings(b) {
  S.autoPin = b.autoPin !== false;
  S.pinText = b.pinText !== false;
  save();
}
var csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function pinterestCsv({ lang: lang2, board, perDay, start, part }, origin2) {
  board = clean(board, 100);
  if (!board) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043E\u0441\u043A\u0438 \u0442\u0430\u043A \u0436\u0435, \u043A\u0430\u043A \u043E\u043D\u043E \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0432 Pinterest.");
  const all = published(lang2 === "all" ? "" : lang2).filter((p) => pinImage(p)).reverse();
  const parts = Math.max(1, Math.ceil(all.length / 200));
  part = Math.min(parts, Math.max(1, parseInt(part, 10) || 1));
  const rows = all.slice((part - 1) * 200, part * 200);
  perDay = Math.max(0, Math.min(50, parseInt(perDay, 10) || 0));
  const t0 = start && !isNaN(Date.parse(start)) ? Date.parse(start) : Date.now() + 36e5;
  const offset = (part - 1) * 200;
  const lines = [["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"].join(",")];
  rows.forEach((p, i) => {
    const when = perDay ? new Date(t0 + Math.floor((offset + i) / perDay) * 864e5 + (offset + i) % perDay * Math.floor(864e5 / perDay)).toISOString().slice(0, 19) : "";
    const desc = [p.description, p.tags.length ? p.tags.join(", ") : ""].filter(Boolean).join(" \xB7 ").slice(0, 500);
    lines.push([csvCell(p.title.slice(0, 100)), csvCell(origin2 + pinImage(p)), csvCell(board), csvCell(""), csvCell(desc), csvCell(origin2 + postUrl(p)), csvCell(when), csvCell([p.keyword, ...p.tags].filter(Boolean).join(", "))].join(","));
  });
  return { csv: "\uFEFF" + lines.join("\r\n") + "\r\n", total: all.length, parts, part, count: rows.length };
}
function saveLinks(b) {
  S.links = (Array.isArray(b.links) ? b.links : []).map((l) => ({
    anchors: clean(l.anchors, 300),
    url: clean(l.url, 300),
    lang: ["ru", "en", "all"].includes(l.lang) ? l.lang : "ru"
  })).filter((l) => l.anchors && /^(\/|https?:\/\/)/.test(l.url)).slice(0, 300);
  S.maxLinks = Math.max(1, Math.min(20, parseInt(b.maxLinks, 10) || 6));
  save();
}
function removePlanItem(id) {
  S.plan = S.plan.filter((x) => x.id !== id);
  save();
}
var postSummary = (p) => {
  const a = analyze(p);
  return {
    id: p.id,
    lang: p.lang,
    title: p.title,
    slug: p.slug,
    keyword: p.keyword,
    status: p.status,
    ai: !!p.ai,
    cover: p.cover || "",
    coverBusy: !!p.coverJob,
    pin: p.pin || "",
    pinBusy: !!p.pinJob,
    tags: p.tags,
    views: p.views || 0,
    words: a.words,
    score: a.score,
    created: p.created,
    updated: p.updated,
    publishedAt: p.publishedAt || 0,
    url: postUrl(p),
    translationId: p.translationId || ""
  };
};

// src/pages.mjs
var T = {
  ru: { blog: "\u0411\u043B\u043E\u0433", blogTitle: "\u0411\u043B\u043E\u0433 \u043E\u0431 \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430\u0445 \u0438 \u0432\u0438\u0434\u0435\u043E", blogLead: "\u041A\u0430\u043A \u043F\u0440\u0438\u0434\u0443\u043C\u0430\u0442\u044C \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430, \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0438 \u0441\u043D\u0438\u043C\u0430\u0442\u044C \u0440\u043E\u043B\u0438\u043A\u0438 \u0434\u043B\u044F Reels, TikTok, Shorts \u0438 \u0440\u0435\u043A\u043B\u0430\u043C\u044B.", home: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", create: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430", all: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u044C\u0438", read: "\u043C\u0438\u043D \u0447\u0442\u0435\u043D\u0438\u044F", toc: "\u0421\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435", faq: "\u0427\u0430\u0441\u0442\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B", related: "\u0427\u0438\u0442\u0430\u0439\u0442\u0435 \u0442\u0430\u043A\u0436\u0435", tag: "\u0422\u0435\u043C\u0430", ctaT: "\u0421\u0432\u043E\u0439 \u0418\u0418-\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0437\u0430 \u043F\u0430\u0440\u0443 \u043C\u0438\u043D\u0443\u0442", ctaP: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u043E\u043B\u043E\u0441 \u0438 \u0441\u043D\u0438\u043C\u0430\u0439\u0442\u0435 \u0441 \u043D\u0438\u043C \u0432\u0438\u0434\u0435\u043E: \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0443\u0437\u043D\u0430\u0432\u0430\u0435\u043C \u0432 \u043A\u0430\u0436\u0434\u043E\u043C \u0440\u043E\u043B\u0438\u043A\u0435.", ctaB: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C", empty: "\u0421\u0442\u0430\u0442\u044C\u0438 \u0441\u043A\u043E\u0440\u043E \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F.", prev: "\u2190 \u041D\u043E\u0432\u0435\u0435", next: "\u0421\u0442\u0430\u0440\u0448\u0435 \u2192", page: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430", nf: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", nfP: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0435\u0451 \u0443\u0434\u0430\u043B\u0438\u043B\u0438 \u0438\u043B\u0438 \u0430\u0434\u0440\u0435\u0441 \u043D\u0430\u0431\u0440\u0430\u043D \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439.", updated: "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E", other: "English", pin: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432 Pinterest" },
  en: { blog: "Blog", blogTitle: "AI characters and video blog", blogLead: "How to design a character, write a script and make clips for Reels, TikTok, Shorts and ads.", home: "Home", create: "Create a character", all: "All articles", read: "min read", toc: "Contents", faq: "FAQ", related: "Read next", tag: "Topic", ctaT: "Your own AI character in minutes", ctaP: "Describe the look, pick a voice and make videos with it: the character stays recognisable in every clip.", ctaB: "Try it", empty: "Articles are coming soon.", prev: "\u2190 Newer", next: "Older \u2192", page: "Page", nf: "Page not found", nfP: "It may have been removed or the address is mistyped.", updated: "Updated", other: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", pin: "Save to Pinterest" }
};
var fmtDate = (ts, lang2) => new Date(ts).toLocaleDateString(lang2 === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "long", year: "numeric" });
var iso = (ts) => new Date(ts || Date.now()).toISOString();
var ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
function headExtras() {
  const s = seo, out = [];
  if (s.verify.google) out.push(`<meta name="google-site-verification" content="${esc(s.verify.google)}">`);
  if (s.verify.yandex) out.push(`<meta name="yandex-verification" content="${esc(s.verify.yandex)}">`);
  if (s.verify.bing) out.push(`<meta name="msvalidate.01" content="${esc(s.verify.bing)}">`);
  if (s.verify.pinterest) out.push(`<meta name="p:domain_verify" content="${esc(s.verify.pinterest)}">`);
  if (s.analytics.ga4) out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(s.analytics.ga4)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${esc(s.analytics.ga4)}");</script>`);
  if (s.analytics.metrika) out.push(`<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${s.analytics.metrika},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>`);
  return out.join("\n");
}
function ogImageAbs(origin2, img) {
  return img ? img.startsWith("http") ? img : origin2 + img : "";
}
function head({ lang: lang2, title, description, canonical, origin: origin2, image, type = "website", alternates = [], robots: robots2 = "index,follow", jsonld = [], extra = "" }) {
  const img = ogImageAbs(origin2, image || seo.ogImage);
  return `<!doctype html>
<html lang="${lang2}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots2},max-image-preview:large">
${canonical ? `<link rel="canonical" href="${esc(origin2 + canonical)}">` : ""}
${alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(origin2 + a.url)}">`).join("\n")}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(origin2 + canonical)}">` : ""}
${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:image" content="${esc(img)}">` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)} \u2014 ${T[lang2].blog}" href="${blogBase(lang2)}/rss.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23141414'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23ff4a2e'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
${jsonld.map(ld).join("\n")}
${headExtras()}
${extra}
<style>${CSS}</style>
</head>`;
}
var CSS = `
:root{--paper:#f3f1ec;--card:#fff;--ink:#151413;--muted:#625d56;--line:#dcd6cc;--lamp:#e5402a;--lamp-ink:#fff;--soft:#e9e5dd;--link:#b3301e;
--f-display:"Unbounded","Manrope",system-ui,sans-serif;--f-body:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--paper:#0f0f10;--card:#18181a;--ink:#f1eee8;--muted:#a39e96;--line:#2b2a2d;--lamp:#ff5a3c;--lamp-ink:#0f0f10;--soft:#212024;--link:#ff8a70;color-scheme:dark}}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--paper);color:var(--ink);font:17px/1.65 var(--f-body);-webkit-font-smoothing:antialiased}
a{color:var(--link)}img{max-width:100%;height:auto}
:focus-visible{outline:2px solid var(--lamp);outline-offset:2px}
.wrap{max-width:1120px;margin:0 auto;padding-inline:20px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-block:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.logo i{width:28px;height:28px;border-radius:8px;background:var(--ink);position:relative;flex:none}
.logo i::after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--lamp);left:9.5px;top:9.5px;box-shadow:0 0 10px var(--lamp)}
.logo b{font:21px/1 var(--f-display)}
.nav{display:flex;gap:16px;align-items:center;font-size:15px}.nav a{color:var(--muted);text-decoration:none}.nav a:hover{color:var(--ink)}
.nav a.btn{color:var(--card)}.nav a.btn:hover{color:var(--card);filter:brightness(1.15)}
.btn{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:9px 18px;font-weight:700;font-size:15px;text-decoration:none;background:var(--ink);color:var(--card);border:0}
.btn.lamp{background:var(--lamp);color:var(--lamp-ink)}
.crumbs{font:13px var(--f-mono);color:var(--muted);margin:8px 0 18px;display:flex;flex-wrap:wrap;gap:6px}.crumbs a{color:var(--muted)}
h1{font:400 clamp(32px,5vw,52px)/1.08 var(--f-display);margin:0 0 14px;letter-spacing:-.01em;text-wrap:balance}
.lead{color:var(--muted);font-size:18px;max-width:62ch;margin:0 0 28px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;text-decoration:none;color:var(--ink)}
.card:hover{border-color:var(--ink)}
.card .ph{aspect-ratio:16/9;background:linear-gradient(135deg,var(--soft),var(--line))}.card .ph img{width:100%;height:100%;object-fit:cover;display:block}
.card .tx{padding:16px 18px 18px;display:grid;gap:8px;align-content:start}
.card h2,.card h3{font:600 19px/1.3 var(--f-body);margin:0;text-wrap:balance}
.card p{margin:0;color:var(--muted);font-size:15px;line-height:1.5}
.meta{font:12.5px var(--f-mono);color:var(--muted);display:flex;gap:10px;flex-wrap:wrap}
.tags{display:flex;gap:6px;flex-wrap:wrap}.tags a{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:3px 10px;text-decoration:none;color:var(--muted);background:var(--card)}
.art{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:48px;align-items:start}
@media(max-width:960px){.art{grid-template-columns:minmax(0,1fr)}.side{display:none}}
.cover{border-radius:16px;overflow:hidden;margin:18px 0 26px;aspect-ratio:16/9;background:var(--soft)}.cover img{width:100%;height:100%;object-fit:cover;display:block}
.prose{max-width:70ch;font-size:18px;line-height:1.75}
.prose h2{font:400 30px/1.2 var(--f-display);margin:44px 0 12px;scroll-margin-top:20px}
.prose h3{font:700 21px/1.3 var(--f-body);margin:30px 0 8px}.prose h4{font:700 18px/1.3 var(--f-body);margin:24px 0 6px}
.prose p{margin:0 0 18px}.prose ul,.prose ol{padding-left:24px;margin:0 0 18px}.prose li{margin:6px 0}
.prose blockquote{margin:22px 0;padding:6px 20px;border-left:3px solid var(--lamp);color:var(--muted)}
.prose a.il{text-decoration-color:var(--lamp);text-decoration-thickness:2px;text-underline-offset:3px}
.prose code{font:15px var(--f-mono);background:var(--soft);padding:1px 6px;border-radius:4px}
.prose hr{border:0;border-top:1px solid var(--line);margin:32px 0}
.tbl{overflow-x:auto;margin:0 0 20px}.prose table{border-collapse:collapse;width:100%;font-size:16px}.prose th,.prose td{border-bottom:1px solid var(--line);padding:9px 10px;text-align:left;vertical-align:top}.prose th{font:600 13px var(--f-mono);text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.side{position:sticky;top:20px;display:grid;gap:16px}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.box h2{font:600 12px var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.box ol{margin:0;padding-left:18px;font-size:14.5px;line-height:1.5}.box li{margin:6px 0}.box a{color:var(--ink);text-decoration:none}.box a:hover{text-decoration:underline}
.btn.pinbtn{background:#e60023;color:#fff}
.cta{background:var(--ink);color:var(--card);border-radius:18px;padding:28px;display:grid;gap:10px;margin:36px 0}
.cta b{font:400 26px/1.2 var(--f-display)}.cta p{margin:0;opacity:.85}.cta .btn{justify-self:start;background:var(--lamp);color:var(--lamp-ink)}
.side .cta{margin:0;padding:20px}.side .cta b{font-size:20px}
.faq{max-width:70ch}.faq details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:0 0 10px}
.faq summary{cursor:pointer;font-weight:700}.faq details p{margin:10px 0 0;color:var(--muted)}
.sec{margin-top:56px}.sec>h2{font:400 30px/1.2 var(--f-display);margin:0 0 18px}
.pager{display:flex;justify-content:space-between;gap:12px;margin:32px 0;font-weight:700}
footer{border-top:1px solid var(--line);margin-top:64px;padding-block:28px 40px;color:var(--muted);font-size:14px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
footer a{color:var(--muted)}`;
function header(lang2, otherHref) {
  const t = T[lang2];
  return `<body><header class="wrap bar"><a class="logo" href="${lang2 === "en" ? "/?lang=en" : "/"}"><i aria-hidden="true"></i><b>${esc(BRAND)}</b></a>
<nav class="nav"><a href="${blogBase(lang2)}">${t.blog}</a>${otherHref ? `<a href="${otherHref}" hreflang="${lang2 === "en" ? "ru" : "en"}">${t.other}</a>` : ""}<a class="btn" href="/app">${t.create}</a></nav></header>`;
}
function footer(lang2) {
  const t = T[lang2];
  return `<footer class="wrap"><span>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(BRAND)}</span><span><a href="/">${t.home}</a> \xB7 <a href="${blogBase(lang2)}">${t.blog}</a> \xB7 <a href="${blogBase(lang2)}/rss.xml">RSS</a> \xB7 <a href="/sitemap.xml">Sitemap</a></span></footer></body></html>`;
}
var card = (p, lang2, h = "h2") => `<a class="card" href="${postUrl(p)}"><div class="ph">${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.coverAlt || p.title)}" loading="lazy" width="640" height="360">` : ""}</div><div class="tx"><div class="meta"><span>${fmtDate(p.publishedAt, lang2)}</span><span>${Math.max(1, Math.round(wordCount(p.body) / 200))} ${T[lang2].read}</span></div><${h}>${esc(p.title)}</${h}><p>${esc(p.description)}</p></div></a>`;
var orgLd = (origin2) => ({ "@type": "Organization", "@id": origin2 + "/#org", name: BRAND, url: origin2 + "/" });
function blogList(req, lang2, { page = 1, tag = "" } = {}) {
  const origin2 = originOf(req), t = T[lang2], per = 12;
  let posts = published(lang2);
  let tagName = "";
  if (tag) {
    posts = posts.filter((p) => p.tags.some((x) => (slugify(x) || x) === tag));
    tagName = posts[0]?.tags.find((x) => (slugify(x) || x) === tag) || "";
    if (!posts.length) return null;
  }
  const pages = Math.max(1, Math.ceil(posts.length / per));
  if (page > pages) return null;
  const slice = posts.slice((page - 1) * per, page * per);
  const base = tag ? tagUrl(lang2, tagName) : blogBase(lang2);
  const canonical = page > 1 ? `${base}?page=${page}` : base;
  const title = tag ? `${tagName} \u2014 ${t.blog} ${BRAND}` : `${t.blogTitle} \u2014 ${BRAND}${page > 1 ? ` \xB7 ${t.page} ${page}` : ""}`;
  const desc = tag ? `${t.tag}: ${tagName}. ${t.blogLead}` : t.blogLead;
  const other = lang2 === "en" ? "/blog" : "/en/blog";
  const tags = [...new Set(published(lang2).flatMap((p) => p.tags))].slice(0, 30);
  const html = head({
    lang: lang2,
    title,
    description: desc,
    canonical,
    origin: origin2,
    alternates: tag ? [] : [{ lang: "ru", url: "/blog" }, { lang: "en", url: "/en/blog" }, { lang: "x-default", url: "/blog" }],
    robots: tag && posts.length < 2 ? "noindex,follow" : "index,follow",
    jsonld: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: origin2 + canonical,
      inLanguage: lang2,
      isPartOf: { "@type": "WebSite", name: BRAND, url: origin2 + "/" },
      breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: t.home, item: origin2 + "/" }, { "@type": "ListItem", position: 2, name: t.blog, item: origin2 + blogBase(lang2) }, ...tag ? [{ "@type": "ListItem", position: 3, name: tagName, item: origin2 + base }] : []] }
    }]
  }) + header(lang2, tag ? "" : other) + `<main class="wrap">
<nav class="crumbs" aria-label="breadcrumbs"><a href="/">${t.home}</a><span>\u203A</span>${tag ? `<a href="${blogBase(lang2)}">${t.blog}</a><span>\u203A</span><span>${esc(tagName)}</span>` : `<span>${t.blog}</span>`}</nav>
<h1>${tag ? esc(tagName) : t.blogTitle}</h1><p class="lead">${esc(desc)}</p>
${tags.length && !tag ? `<div class="tags" style="margin-bottom:24px">${tags.map((x) => `<a href="${tagUrl(lang2, x)}">${esc(x)}</a>`).join("")}</div>` : ""}
${slice.length ? `<div class="grid">${slice.map((p) => card(p, lang2)).join("")}</div>` : `<p>${t.empty}</p>`}
${pages > 1 ? `<nav class="pager">${page > 1 ? `<a href="${page === 2 ? base : `${base}?page=${page - 1}`}" rel="prev">${t.prev}</a>` : "<span></span>"}${page < pages ? `<a href="${base}?page=${page + 1}" rel="next">${t.next}</a>` : "<span></span>"}</nav>` : ""}
<div class="cta"><b>${t.ctaT}</b><p>${t.ctaP}</p><a class="btn" href="/app">${t.ctaB}</a></div>
</main>` + footer(lang2);
  return html;
}
function article(req, p) {
  const origin2 = originOf(req), lang2 = p.lang, t = T[lang2];
  const a = analyze(p);
  const tr = p.translationId ? findPost(p.translationId) : null;
  const trPub = tr && tr.status === "published" ? tr : null;
  const rel = related(p);
  const url = postUrl(p);
  const alternates = trPub ? [{ lang: lang2, url }, { lang: trPub.lang, url: postUrl(trPub) }, { lang: "x-default", url: lang2 === "ru" ? url : postUrl(trPub) }] : [];
  const crumbs = [{ n: t.home, u: "/" }, { n: t.blog, u: blogBase(lang2) }, ...p.tags[0] ? [{ n: p.tags[0], u: tagUrl(lang2, p.tags[0]) }] : [], { n: p.title, u: url }];
  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": origin2 + url + "#article",
      mainEntityOfPage: origin2 + url,
      headline: p.title.slice(0, 110),
      description: p.description,
      image: p.cover ? [ogImageAbs(origin2, p.cover)] : void 0,
      datePublished: iso(p.publishedAt),
      dateModified: iso(p.updated || p.publishedAt),
      inLanguage: lang2,
      wordCount: a.words,
      keywords: [p.keyword, ...p.tags].filter(Boolean).join(", "),
      author: orgLd(origin2),
      publisher: orgLd(origin2)
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.n, item: origin2 + c.u })) },
    ...p.faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []
  ];
  const extra = `<meta property="article:published_time" content="${iso(p.publishedAt)}"><meta property="article:modified_time" content="${iso(p.updated)}">${p.tags.map((x) => `<meta property="article:tag" content="${esc(x)}">`).join("")}`;
  let body2 = a.html;
  const h2s = [...body2.matchAll(/<h2 /g)];
  const ctaHtml = `<div class="cta"><b>${t.ctaT}</b><p>${t.ctaP}</p><a class="btn" href="/app">${t.ctaB}</a></div>`;
  if (h2s.length >= 4) body2 = body2.slice(0, h2s[3].index) + ctaHtml + body2.slice(h2s[3].index);
  return head({ lang: lang2, title: `${p.title} \u2014 ${BRAND}`, description: p.description || p.title, canonical: url, origin: origin2, image: p.cover, type: "article", alternates, jsonld, extra }) + header(lang2, trPub ? postUrl(trPub) : "") + `<main class="wrap">
<nav class="crumbs" aria-label="breadcrumbs">${crumbs.slice(0, -1).map((c) => `<a href="${c.u}">${esc(c.n)}</a><span>\u203A</span>`).join("")}</nav>
<div class="art"><article>
<h1>${esc(p.title)}</h1>
<div class="meta"><time datetime="${iso(p.publishedAt)}">${fmtDate(p.publishedAt, lang2)}</time>${p.updated - (p.publishedAt || 0) > 864e5 ? `<span>${t.updated}: ${fmtDate(p.updated, lang2)}</span>` : ""}<span>${a.readMin} ${t.read}</span></div>
${p.cover ? `<figure class="cover"><img src="${esc(p.cover)}" alt="${esc(p.coverAlt || p.title)}" width="1280" height="720" fetchpriority="high"></figure>` : `<div style="height:20px"></div>`}
<div class="prose">${body2}</div>
${h2s.length < 4 ? ctaHtml : ""}
${p.faq.length ? `<section class="sec faq"><h2>${t.faq}</h2>${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>` : ""}
${p.tags.length ? `<div class="tags" style="margin-top:28px">${p.tags.map((x) => `<a href="${tagUrl(lang2, x)}">${esc(x)}</a>`).join("")}</div>` : ""}
${pinImage(p) ? `<p style="margin-top:22px"><a class="btn pinbtn" rel="noopener" target="_blank" href="https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(origin2 + url)}&amp;media=${encodeURIComponent(origin2 + pinImage(p))}&amp;description=${encodeURIComponent(p.title)}">${t.pin}</a></p>` : ""}
</article>
<aside class="side">${a.toc.length >= 3 ? `<nav class="box" aria-label="${t.toc}"><h2>${t.toc}</h2><ol>${a.toc.map((x) => `<li><a href="#${x.id}">${esc(x.text)}</a></li>`).join("")}</ol></nav>` : ""}<div class="cta"><b>${t.ctaT}</b><a class="btn" href="/app">${t.ctaB}</a></div></aside></div>
${rel.length ? `<section class="sec"><h2>${t.related}</h2><div class="grid">${rel.map((x) => card(x, lang2, "h3")).join("")}</div></section>` : ""}
</main>` + footer(lang2);
}
function notFound(req, lang2 = "ru") {
  const t = T[lang2], origin2 = originOf(req);
  const latest = published(lang2).slice(0, 3);
  return head({ lang: lang2, title: `${t.nf} \u2014 ${BRAND}`, description: t.nfP, canonical: "", origin: origin2, robots: "noindex,follow" }) + header(lang2, "") + `<main class="wrap"><h1>${t.nf}</h1><p class="lead">${t.nfP}</p><p><a class="btn" href="/">${t.home}</a></p>${latest.length ? `<section class="sec"><h2>${t.blog}</h2><div class="grid">${latest.map((p) => card(p, lang2, "h3")).join("")}</div></section>` : ""}</main>` + footer(lang2);
}
function sitemap(req) {
  const origin2 = originOf(req);
  const urls = [
    { loc: "/", lastmod: Date.now(), pr: "1.0", alt: [["ru", "/"], ["en", "/?lang=en"]] },
    { loc: "/?lang=en", lastmod: Date.now(), pr: "0.9", alt: [["ru", "/"], ["en", "/?lang=en"]] },
    { loc: "/blog", lastmod: published("ru")[0]?.updated, pr: "0.8", alt: [["ru", "/blog"], ["en", "/en/blog"]] },
    { loc: "/en/blog", lastmod: published("en")[0]?.updated, pr: "0.8", alt: [["ru", "/blog"], ["en", "/en/blog"]] }
  ];
  for (const p of published()) {
    const tr = p.translationId && findPost(p.translationId);
    urls.push({ loc: postUrl(p), lastmod: p.updated || p.publishedAt, pr: "0.7", img: p.cover, alt: tr && tr.status === "published" ? [[p.lang, postUrl(p)], [tr.lang, postUrl(tr)]] : [] });
  }
  for (const lang2 of ["ru", "en"]) {
    const counts = {};
    for (const p of published(lang2)) for (const x2 of p.tags) counts[x2] = (counts[x2] || 0) + 1;
    for (const [x2, n] of Object.entries(counts)) if (n >= 2) urls.push({ loc: tagUrl(lang2, x2), pr: "0.4", alt: [] });
  }
  const x = (s) => esc(origin2 + s);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `<url><loc>${x(u.loc)}</loc>${u.lastmod ? `<lastmod>${iso(u.lastmod).slice(0, 10)}</lastmod>` : ""}<priority>${u.pr}</priority>${u.alt.map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${x(h)}"/>`).join("")}${u.img ? `<image:image><image:loc>${esc(ogImageAbs(origin2, u.img))}</image:loc></image:image>` : ""}</url>`).join("\n")}
</urlset>`;
}
function robots(req) {
  const origin2 = originOf(req);
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /editor
Disallow: /seo
Disallow: /api/

Sitemap: ${origin2}/sitemap.xml
`;
}
var imgType = (u) => /\.png$/i.test(u) ? "image/png" : /\.webp$/i.test(u) ? "image/webp" : "image/jpeg";
function feed(req, lang2, { items, self, title, pinterest = false }) {
  const origin2 = originOf(req), t = T[lang2];
  const item = (p) => {
    const img = pinterest ? pinImage(p) : String(p.cover || "").replace(/\?.*$/, "");
    const desc = pinterest ? [p.description, p.tags.join(", ")].filter(Boolean).join(" \xB7 ").slice(0, 500) : p.description;
    return `<item><title>${esc(pinterest ? p.title.slice(0, 100) : p.title)}</title><link>${esc(origin2 + postUrl(p))}</link><guid isPermaLink="true">${esc(origin2 + postUrl(p))}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${esc(desc)}</description>${img ? `<enclosure url="${esc(origin2 + img)}" type="${imgType(img)}" length="0"/><media:content url="${esc(origin2 + img)}" medium="image" type="${imgType(img)}"/>` : ""}</item>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<title>${esc(title || `${BRAND} \u2014 ${t.blog}`)}</title><link>${esc(origin2 + blogBase(lang2))}</link><description>${esc(t.blogLead)}</description><language>${lang2}</language>
<atom:link href="${esc(origin2 + self)}" rel="self" type="application/rss+xml"/>
${items.map(item).join("\n")}
</channel></rss>`;
}
function rss(req, lang2) {
  return feed(req, lang2, { items: published(lang2).slice(0, 30), self: `${blogBase(lang2)}/rss.xml` });
}
function pinterestFeed(req, lang2, tag = "") {
  let items = published(lang2).filter((p) => pinImage(p));
  let tagName = "";
  if (tag) {
    items = items.filter((p) => p.tags.some((x) => (slugify(x) || x) === tag));
    tagName = items[0]?.tags.find((x) => (slugify(x) || x) === tag) || tag;
  }
  return feed(req, lang2, { items: items.slice(0, 500), pinterest: true, self: tag ? `${tagUrl(lang2, tagName)}/pinterest.xml` : `${blogBase(lang2)}/pinterest.xml`, title: `${BRAND} \u2014 ${tagName || T[lang2].blog}` });
}
function pinterestFeeds() {
  const out = [];
  for (const lang2 of ["ru", "en"]) {
    const pub = published(lang2).filter((p) => pinImage(p));
    out.push({ lang: lang2, label: lang2 === "en" ? "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u043C" : "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C", url: `${blogBase(lang2)}/pinterest.xml`, count: pub.length });
    const counts = {};
    for (const p of pub) for (const x of p.tags) counts[x] = (counts[x] || 0) + 1;
    for (const [x, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30)) out.push({ lang: lang2, label: `\u0422\u0435\u043C\u0430 \xAB${x}\xBB`, url: `${tagUrl(lang2, x)}/pinterest.xml`, count: n });
  }
  return out;
}
function latestFor(lang2, n = 3) {
  return published(lang2).slice(0, n).map((p) => ({ url: postUrl(p), title: p.title, description: p.description, cover: p.cover || "", alt: p.coverAlt || p.title, date: fmtDate(p.publishedAt, lang2) }));
}
function injectHome(html, req, { packs: packs2 = [], currency: currency2 = "eur", lang: lang2 = "ru" } = {}) {
  const origin2 = originOf(req);
  const ru = homeMeta("ru"), en = homeMeta("en");
  const cur = lang2 === "en" ? en : ru;
  const self = lang2 === "en" ? "/?lang=en" : "/";
  const prices2 = packs2.map((p) => p.price);
  const jsonld = [
    { "@context": "https://schema.org", ...orgLd(origin2) },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": origin2 + "/#site", name: BRAND, url: origin2 + "/", inLanguage: ["ru", "en"], publisher: { "@id": origin2 + "/#org" } },
    ...prices2.length ? [{
      "@context": "https://schema.org",
      "@type": "Service",
      name: ru.title,
      serviceType: "AI character video generation",
      provider: { "@id": origin2 + "/#org" },
      areaServed: "Worldwide",
      url: origin2 + "/",
      offers: { "@type": "AggregateOffer", priceCurrency: currency2.toUpperCase(), lowPrice: Math.min(...prices2), highPrice: Math.max(...prices2), offerCount: prices2.length }
    }] : []
  ];
  const img = ogImageAbs(origin2, seo.ogImage);
  const headAdd = [
    `<link rel="canonical" href="${esc(origin2 + self)}">`,
    `<link rel="alternate" hreflang="ru" href="${esc(origin2)}/"><link rel="alternate" hreflang="en" href="${esc(origin2)}/?lang=en"><link rel="alternate" hreflang="x-default" href="${esc(origin2)}/">`,
    `<meta property="og:type" content="website"><meta property="og:url" content="${esc(origin2 + self)}"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:locale" content="${lang2 === "en" ? "en_US" : "ru_RU"}">`,
    img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">` : `<meta name="twitter:card" content="summary">`,
    `<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)}" href="${blogBase(lang2)}/rss.xml">`,
    ...jsonld.map(ld),
    `<script>window.__SEO=${JSON.stringify({ ru, en }).replace(/</g, "\\u003c")};</script>`,
    headExtras()
  ].join("\n");
  const posts = latestFor(lang2);
  const cards = posts.map((p) => `<a class="post" href="${esc(p.url)}"><span class="ph">${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.alt)}" loading="lazy">` : ""}</span><span class="tx"><span class="d">${esc(p.date)}</span><b>${esc(p.title)}</b><span class="s">${esc(p.description)}</span></span></a>`).join("");
  return html.replace('<html lang="ru">', `<html lang="${lang2}">`).replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(cur.title)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(cur.description)}">`).replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(cur.title)}">`).replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(cur.description)}">`).replace("<!--SEO_HEAD-->", headAdd).replace("<!--LATEST_POSTS-->", cards).replace('<section class="sec" id="blogPosts" hidden>', posts.length ? '<section class="sec" id="blogPosts">' : '<section class="sec" id="blogPosts" hidden>');
}

// src/engine.mjs
import fs3 from "node:fs";
import path3 from "node:path";
var MEDIA_DIR = path3.join(DATA_DIR, "media");
fs3.mkdirSync(MEDIA_DIR, { recursive: true });
var TIMEOUT = 25 * 60 * 1e3;
async function submit2(endpoint, input, optional = []) {
  const url = `https://queue.fal.run/${endpoint}`;
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422 && optional.length) {
    const slim = { ...input };
    for (const k of optional) delete slim[k];
    r = await falFetch(url, { method: "POST", body: JSON.stringify(slim) });
  }
  if (r.ok && r.data.request_id) return { ok: true, job: { endpoint, statusUrl: r.data.status_url, responseUrl: r.data.response_url, started: Date.now() } };
  return { ok: false, error: falError(r.status, r.data), status: r.status, data: r.data };
}
async function check(job) {
  if (!job) return { state: "failed", error: "\u043D\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0438" };
  const st = await falFetch(job.statusUrl);
  if (!st.ok) return st.status >= 400 && st.status < 500 ? { state: "failed", error: falError(st.status, st.data).admin } : { state: "working" };
  if (st.data.status !== "COMPLETED") return Date.now() - job.started > TIMEOUT ? { state: "failed", error: "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E" } : { state: "working", queue: st.data.queue_position ?? null };
  const out = await falFetch(job.responseUrl);
  if (!out.ok) return { state: "failed", error: falError(out.status, out.data).admin };
  if (out.data?.error) return { state: "failed", error: String(out.data.error).slice(0, 300) };
  return { state: "done", data: out.data };
}
var urlOf = (x) => typeof x === "string" ? x : x?.url;
var imagesOf = (d) => (d?.images || (d?.image ? [d.image] : [])).map(urlOf).filter(Boolean);
var videoOf = (d) => urlOf(d?.video);
var audioOf = (d) => urlOf(d?.audio);
var EXT = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "video/mp4": "mp4", "video/quicktime": "mov" };
var extFor = (type, fallback) => EXT[String(type || "").split(";")[0].trim()] || fallback;
function removeMedia(prefix) {
  for (const f of fs3.readdirSync(MEDIA_DIR)) if (f.startsWith(prefix)) fs3.rmSync(path3.join(MEDIA_DIR, f), { force: true });
}
async function saveRemote(url, name, fallbackExt) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B");
  const ext = extFor(r.headers.get("content-type"), fallbackExt);
  removeMedia(name + ".");
  const file = `${name}.${ext}`;
  fs3.writeFileSync(path3.join(MEDIA_DIR, file), Buffer.from(await r.arrayBuffer()));
  return `/media/${file}`;
}
var TYPE = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp3: "audio/mpeg", wav: "audio/wav", mp4: "video/mp4", mov: "video/quicktime" };
var fileOf = (mediaPath) => path3.join(MEDIA_DIR, String(mediaPath).replace(/^\/media\//, "").replace(/\?.*$/, ""));
var ORIGIN = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
function noteOrigin(o) {
  if (!process.env.PUBLIC_URL && o && !/localhost|127\.0\.0\.1/.test(o)) ORIGIN = o.replace(/\/$/, "");
}
var publicUrl = (mediaPath) => ORIGIN && mediaPath ? ORIGIN + String(mediaPath).replace(/\?.*$/, "") : "";
var ref = (mediaPath) => publicUrl(mediaPath) || toDataUrl(mediaPath);
function toDataUrl(mediaPath) {
  const f = fileOf(mediaPath);
  const ext = path3.extname(f).slice(1);
  return `data:${TYPE[ext] || "application/octet-stream"};base64,${fs3.readFileSync(f).toString("base64")}`;
}
var mediaExists = (mediaPath) => !!mediaPath && fs3.existsSync(fileOf(mediaPath));
function serveMedia(req, res, name) {
  if (!/^[\w-]+\.(jpg|png|webp|mp3|wav|mp4|mov)$/.test(name)) return false;
  const file = path3.join(MEDIA_DIR, name);
  if (!fs3.existsSync(file)) return false;
  const size = fs3.statSync(file).size;
  const type = TYPE[path3.extname(name).slice(1)];
  const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "public, max-age=604800", "x-content-type-options": "nosniff" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range) {
    let start = range[1] === "" ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== "" && range[2] !== "" ? Number(range[2]) : size - 1;
    if (isNaN(start) || start < 0 || start >= size || end < start) {
      res.writeHead(416, { "content-range": `bytes */${size}` });
      res.end();
      return true;
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
    fs3.createReadStream(file, { start, end }).pipe(res);
    return true;
  }
  res.writeHead(200, { ...base, "content-length": size });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs3.createReadStream(file).pipe(res);
  return true;
}
function diskUsage() {
  let bytes = 0, files = 0;
  for (const f of fs3.readdirSync(MEDIA_DIR)) {
    bytes += fs3.statSync(path3.join(MEDIA_DIR, f)).size;
    files++;
  }
  return { bytes, files };
}

// src/catalog.mjs
var VOICES = [
  { id: "Wise_Woman", g: "female", ru: "\u0412\u0437\u0440\u043E\u0441\u043B\u0430\u044F, \u043C\u0443\u0434\u0440\u0430\u044F", en: "Mature, wise" },
  { id: "Calm_Woman", g: "female", ru: "\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u0430\u044F", en: "Calm" },
  { id: "Lively_Girl", g: "female", ru: "\u0416\u0438\u0432\u0430\u044F, \u043C\u043E\u043B\u043E\u0434\u0430\u044F", en: "Lively, young" },
  { id: "Inspirational_girl", g: "female", ru: "\u0412\u0434\u043E\u0445\u043D\u043E\u0432\u043B\u044F\u044E\u0449\u0430\u044F", en: "Inspiring" },
  { id: "Sweet_Girl_2", g: "female", ru: "\u041D\u0435\u0436\u043D\u0430\u044F", en: "Soft" },
  { id: "Exuberant_Girl", g: "female", ru: "\u042D\u043D\u0435\u0440\u0433\u0438\u0447\u043D\u0430\u044F", en: "Energetic" },
  { id: "Abbess", g: "female", ru: "\u041D\u0438\u0437\u043A\u0430\u044F, \u0441\u0442\u0440\u043E\u0433\u0430\u044F", en: "Low, stern" },
  { id: "Deep_Voice_Man", g: "male", ru: "\u0413\u043B\u0443\u0431\u043E\u043A\u0438\u0439", en: "Deep" },
  { id: "Casual_Guy", g: "male", ru: "\u041F\u0440\u043E\u0441\u0442\u043E\u0439, \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439", en: "Casual" },
  { id: "Patient_Man", g: "male", ru: "\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u044B\u0439", en: "Patient" },
  { id: "Determined_Man", g: "male", ru: "\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439", en: "Determined" },
  { id: "Elegant_Man", g: "male", ru: "\u042D\u043B\u0435\u0433\u0430\u043D\u0442\u043D\u044B\u0439", en: "Elegant" },
  { id: "Young_Knight", g: "male", ru: "\u041C\u043E\u043B\u043E\u0434\u043E\u0439", en: "Young" },
  { id: "Imposing_Manner", g: "male", ru: "\u0412\u043B\u0430\u0441\u0442\u043D\u044B\u0439", en: "Imposing" }
];
var voiceById = (id) => VOICES.find((v) => v.id === id);
var defaultVoice = (gender) => gender === "male" ? "Deep_Voice_Man" : "Wise_Woman";
var LANGS = [
  { id: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", en: "Russian", boost: "Russian" },
  { id: "en", name: "English", en: "English", boost: "English" },
  { id: "uk", name: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", en: "Ukrainian", boost: "auto" },
  { id: "es", name: "Espa\xF1ol", en: "Spanish", boost: "Spanish" },
  { id: "de", name: "Deutsch", en: "German", boost: "German" },
  { id: "fr", name: "Fran\xE7ais", en: "French", boost: "French" },
  { id: "it", name: "Italiano", en: "Italian", boost: "Italian" },
  { id: "pt", name: "Portugu\xEAs", en: "Portuguese", boost: "Portuguese" },
  { id: "tr", name: "T\xFCrk\xE7e", en: "Turkish", boost: "auto" }
];
var langById = (id) => LANGS.find((l) => l.id === id) || LANGS[0];
var EMOTIONS = ["neutral", "happy", "sad", "angry", "surprised", "fearful"];
var ASPECTS = ["9:16", "16:9", "1:1"];
var IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana-pro";
var EDIT_MODEL = process.env.FAL_EDIT_MODEL || "fal-ai/nano-banana-pro/edit";
var TTS_MODEL = process.env.FAL_TTS_MODEL || "fal-ai/minimax/speech-2.6-hd";
var COST = { image: 0.15, tts1k: 0.1, merge: 0, frame: 2e-3 };
var TALK_MODELS = [
  { id: "avatar_pro", endpoint: "fal-ai/kling-video/ai-avatar/v2/pro", perSec: 0.115, ru: "Kling Avatar Pro \u2014 \u043B\u0443\u0447\u0448\u0435\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E", en: "Kling Avatar Pro \u2014 best quality" },
  { id: "avatar_std", endpoint: "fal-ai/kling-video/ai-avatar/v2/standard", perSec: 0.06, ru: "Kling Avatar Standard \u2014 \u0434\u0435\u0448\u0435\u0432\u043B\u0435", en: "Kling Avatar Standard \u2014 cheaper" }
];
var SCENE_MODELS = [
  {
    id: "seedance2",
    endpoint: "bytedance/seedance-2.0/reference-to-video",
    perSec: 0.3034,
    durations: [4, 5, 6, 8, 10, 12, 15],
    aspects: ["9:16", "16:9", "1:1"],
    maxImages: 9,
    audioRef: true,
    ru: "Seedance 2.0 \u2014 \u0434\u0435\u0440\u0436\u0438\u0442 \u043B\u0438\u0446\u043E \u0438 \u0433\u043E\u043B\u043E\u0441 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430",
    en: "Seedance 2.0 \u2014 keeps the character's face and voice"
  },
  {
    id: "veo31",
    endpoint: "fal-ai/veo3.1/reference-to-video",
    perSec: 0.4,
    durations: [8],
    aspects: ["9:16", "16:9"],
    maxImages: 3,
    audioRef: false,
    ru: "Veo 3.1 \u2014 \u043A\u0438\u043D\u0435\u043C\u0430\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0447\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430, 8 \u0441\u0435\u043A",
    en: "Veo 3.1 \u2014 cinematic look, 8 s"
  }
];
var DEFAULT_PRICES = { character: 8, reroll: 4, voice: 1, talkBase: 2, talkPerSec: 1, scenePerSec: { seedance2: 3, veo31: 4 }, merge: 1 };
db.settings.prices ||= {};
db.settings.models ||= {};
function prices() {
  const p = db.settings.prices;
  return { ...DEFAULT_PRICES, ...p, scenePerSec: { ...DEFAULT_PRICES.scenePerSec, ...p.scenePerSec || {} } };
}
function modelSettings() {
  const m = db.settings.models;
  const scene = (m.scene || SCENE_MODELS.map((x) => x.id)).filter((id) => SCENE_MODELS.some((x) => x.id === id));
  return {
    talk: TALK_MODELS.some((x) => x.id === m.talk) ? m.talk : TALK_MODELS[0].id,
    scene: scene.length ? scene : [SCENE_MODELS[0].id]
  };
}
var talkModel = () => TALK_MODELS.find((x) => x.id === modelSettings().talk);
var sceneModel = (id) => SCENE_MODELS.find((x) => x.id === id && modelSettings().scene.includes(id)) || SCENE_MODELS.find((x) => x.id === modelSettings().scene[0]);
function savePrices(b) {
  const n = (v, d, max = 200) => Math.max(0, Math.min(max, Math.round(Number(v)))) || d;
  const cur = prices();
  db.settings.prices = {
    character: n(b.character, cur.character),
    reroll: n(b.reroll, cur.reroll),
    voice: n(b.voice, cur.voice),
    talkBase: n(b.talkBase, cur.talkBase),
    talkPerSec: n(b.talkPerSec, cur.talkPerSec),
    merge: Math.max(0, Math.min(50, Math.round(Number(b.merge ?? cur.merge)))),
    scenePerSec: Object.fromEntries(SCENE_MODELS.map((x) => [x.id, n(b.scenePerSec?.[x.id], cur.scenePerSec[x.id])]))
  };
  const scene = (Array.isArray(b.scene) ? b.scene : []).filter((id) => SCENE_MODELS.some((x) => x.id === id));
  if (!scene.length) throw new UserError("\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F \u0441\u0446\u0435\u043D.");
  db.settings.models = { talk: TALK_MODELS.some((x) => x.id === b.talk) ? b.talk : TALK_MODELS[0].id, scene };
  save();
}
function publicCatalog() {
  return {
    prices: prices(),
    voices: VOICES.map(({ id, g, ru, en }) => ({ id, g, ru, en })),
    langs: LANGS.map(({ id, name }) => ({ id, name })),
    emotions: EMOTIONS,
    aspects: ASPECTS,
    sceneModels: modelSettings().scene.map((id) => {
      const x = SCENE_MODELS.find((m) => m.id === id);
      return { id, ru: x.ru, en: x.en, durations: x.durations, aspects: x.aspects };
    })
  };
}
var estSeconds = (text) => Math.max(3, Math.min(60, Math.ceil(String(text || "").length / 14)));

// src/credits.mjs
function charge(key, n) {
  const rec = db.keys[key];
  if (!rec) throw new UserError("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041A\u0443\u043F\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434.", 401);
  if (n <= 0) return;
  if (rec.credits < n) throw new UserError(rec.credits ? `\u041D\u0443\u0436\u043D\u043E ${n} \u043A\u0440., \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 ${rec.credits}. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.` : "\u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.", 402);
  rec.credits -= n;
  rec.spent = (rec.spent || 0) + n;
  save();
}
function refund(key, n) {
  const rec = db.keys[key];
  if (!rec || n <= 0) return;
  rec.credits += n;
  rec.spent = Math.max(0, (rec.spent || 0) - n);
  save();
}

// src/chars.mjs
db.chars ||= [];
var clean2 = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
var gw = (g) => g === "male" ? "man" : "woman";
var REAL = /(похож(ий|ая|ее|е)?\s+на|похожа\s+на|двойник|копи[яю]\s|как\s+у\s+(актёр|актер|певц|певиц|блогер|президент)|look\s*-?\s*alike|looks?\s+like|resembl|celebrit|famous|знаменит|президент|president|политик|politician)/i;
function checkFictional(...texts) {
  if (texts.some((t) => REAL.test(t || ""))) throw new UserError("\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u0432\u044B\u043C\u044B\u0448\u043B\u0435\u043D\u043D\u044B\u043C\u0438. \u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u0431\u0435\u0437 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F \u0441 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u043B\u044E\u0434\u044C\u043C\u0438.");
}
var IDENTITY = "Keep the exact same person: identical face, facial features, skin tone, age, hairstyle, hair colour, body type, the same clothes and the same signature accessories and details.";
function portraitPrompt(c) {
  return [
    `Photorealistic head-and-shoulders portrait photograph of a fictional ${c.age}-year-old ${gw(c.gender)}.`,
    c.look ? `Appearance: ${c.look}.` : "",
    c.outfit ? `Clothing: ${c.outfit}.` : "",
    c.quirk ? `Signature detail that makes this character instantly recognisable: ${c.quirk}. Make it clearly visible.` : "",
    c.quirk || c.catch ? "Characterful, warm and slightly comedic expression, like a memorable sitcom character, while staying a natural photorealistic person." : "",
    "The person is entirely fictional and must not resemble any real or famous person.",
    "Facing the camera, relaxed natural expression, natural skin texture with visible pores, soft even studio lighting, plain light grey background, sharp focus, 85mm lens.",
    "No text, no watermark, no logo."
  ].filter(Boolean).join(" ");
}
var SHEET = [
  { key: "full", aspect: "9:16", prompt: `Show this person as a full-body photo standing naturally and facing the camera, arms relaxed, plain light grey studio background, soft even light, photorealistic. ${IDENTITY}` },
  { key: "three", aspect: "3:4", prompt: `Show this person in a three-quarter view, head and shoulders, turned about 40 degrees to the side, looking slightly off camera, plain light grey studio background, soft even light, photorealistic. ${IDENTITY}` },
  { key: "profile", aspect: "3:4", prompt: `Show this person in side profile, head and shoulders, plain light grey studio background, soft even light, photorealistic. ${IDENTITY}` }
];
var SAMPLE = {
  ru: (c) => `\u041F\u0440\u0438\u0432\u0435\u0442! \u041C\u0435\u043D\u044F \u0437\u043E\u0432\u0443\u0442 ${c.name}. ${c.gender === "male" ? "\u0420\u0430\u0434" : "\u0420\u0430\u0434\u0430"} \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u0443 \u2014 \u0434\u0430\u0432\u0430\u0439 \u0441\u043D\u0438\u043C\u0435\u043C \u0447\u0442\u043E-\u043D\u0438\u0431\u0443\u0434\u044C \u043A\u043B\u0430\u0441\u0441\u043D\u043E\u0435.`,
  en: (c) => `Hi! I'm ${c.name}. Nice to meet you \u2014 let's make something great together.`
};
var sampleText = (c) => c.catch ? `${c.sampleLang === "ru" ? "\u041F\u0440\u0438\u0432\u0435\u0442! \u041C\u0435\u043D\u044F \u0437\u043E\u0432\u0443\u0442" : "Hi! I'm"} ${c.name}. ${c.catch}` : (SAMPLE[c.sampleLang] || SAMPLE.en)(c);
async function startTTS(text, voice, lang2, gender, emotion = "neutral") {
  const L = langById(lang2);
  const input = (vid) => ({
    prompt: text,
    output_format: "url",
    language_boost: L.boost,
    voice_setting: { voice_id: vid, speed: voice.speed || 1, pitch: voice.pitch || 0, vol: 1, emotion: EMOTIONS.includes(emotion) ? emotion : "neutral" },
    audio_setting: { format: "mp3", sample_rate: 32e3, bitrate: 128e3, channel: 1 }
  });
  let r = await submit2(TTS_MODEL, input(voice.id), ["audio_setting", "language_boost"]);
  if (!r.ok && voice.id !== defaultVoice(gender)) r = await submit2(TTS_MODEL, input(defaultVoice(gender)), ["audio_setting", "language_boost"]);
  return r;
}
var own = (key, id) => {
  const c = db.chars.find((x) => x.id === id && x.key === key);
  if (!c) throw new UserError("\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
  return c;
};
var fail = (c, err, refundN) => {
  c.status = "failed";
  c.error = String(err || "\u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 300);
  delete c.job;
  delete c.jobs;
  if (refundN) {
    refund(c.key, refundN);
    c.refunded = refundN;
  }
};
async function create(key, b) {
  const c = {
    id: newId(),
    key,
    created: Date.now(),
    name: clean2(b.name, 40),
    gender: b.gender === "male" ? "male" : "female",
    age: Math.max(18, Math.min(80, parseInt(b.age, 10) || 28)),
    look: clean2(b.look, 500),
    outfit: clean2(b.outfit, 300),
    sampleLang: LANGS.some((l) => l.id === b.lang) ? b.lang : "ru",
    voice: { id: voiceById(b.voice)?.id || defaultVoice(b.gender), speed: Math.max(0.7, Math.min(1.4, Number(b.speed) || 1)), pitch: Math.max(-6, Math.min(6, parseInt(b.pitch, 10) || 0)) },
    quirk: clean2(b.quirk, 200),
    catch: clean2(b.catch, 120),
    preset: clean2(b.preset, 20).replace(/[^\w-]/g, ""),
    candidates: [],
    refs: [],
    status: "portraits"
  };
  if (!c.name) throw new UserError("\u0414\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0443 \u0438\u043C\u044F.");
  if (c.look.length < 10) throw new UserError("\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u043E\u0439 \u0444\u0440\u0430\u0437: \u0432\u043E\u043B\u043E\u0441\u044B, \u0433\u043B\u0430\u0437\u0430, \u0447\u0435\u0440\u0442\u044B \u043B\u0438\u0446\u0430.");
  checkFictional(c.name, c.look, c.outfit, c.quirk, c.catch);
  const price = prices().character;
  charge(key, price);
  c.paid = price;
  db.chars.unshift(c);
  const r = await submit2(IMAGE_MODEL, { prompt: portraitPrompt(c), num_images: 4, aspect_ratio: "3:4", resolution: "2K", output_format: "jpeg" }, ["aspect_ratio", "resolution", "output_format"]);
  if (!r.ok) {
    fail(c, r.error.admin, price);
    save();
    throw new UserError(r.error.msg, 502);
  }
  c.job = r.job;
  save();
  return c;
}
async function reroll(key, id, b = {}) {
  const c = own(key, id);
  if (c.status !== "pick" && c.status !== "failed") throw new UserError("\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B.");
  if (b.look) {
    c.look = clean2(b.look, 500);
    c.outfit = clean2(b.outfit ?? c.outfit, 300);
    checkFictional(c.look, c.outfit);
  }
  const price = c.status === "failed" && !c.candidates.length ? prices().character : prices().reroll;
  charge(key, price);
  removeMedia(`c-${c.id}-cand`);
  c.candidates = [];
  c.status = "portraits";
  c.error = "";
  const r = await submit2(IMAGE_MODEL, { prompt: portraitPrompt(c), num_images: 4, aspect_ratio: "3:4", resolution: "2K", output_format: "jpeg" }, ["aspect_ratio", "resolution", "output_format"]);
  if (!r.ok) {
    fail(c, r.error.admin, price);
    save();
    throw new UserError(r.error.msg, 502);
  }
  c.job = r.job;
  save();
  return c;
}
async function pick(key, id, index) {
  const c = own(key, id);
  if (c.status !== "pick") throw new UserError("\u0412\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u044B.");
  const src = c.candidates[index];
  if (!src) throw new UserError("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0434\u0438\u043D \u0438\u0437 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432.");
  c.portrait = src;
  c.status = "sheet";
  c.refs = [];
  c.jobs = {};
  const img = ref(src);
  for (const s of SHEET) {
    const r = await submit2(EDIT_MODEL, { prompt: s.prompt, image_urls: [img], num_images: 1, aspect_ratio: s.aspect, resolution: "2K", output_format: "jpeg" }, ["aspect_ratio", "resolution", "output_format"]);
    c.jobs[s.key] = r.ok ? r.job : { failed: r.error.admin };
  }
  const t = await startTTS(sampleText(c), c.voice, c.sampleLang, c.gender);
  c.jobs.tts = t.ok ? t.job : { failed: t.error.admin };
  save();
  return c;
}
async function setVoice(key, id, b) {
  const c = own(key, id);
  if (c.status !== "ready") throw new UserError("\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432.");
  if (c.voiceJob) throw new UserError("\u0413\u043E\u043B\u043E\u0441 \u0443\u0436\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F.");
  charge(key, prices().voice);
  c.voice = { id: voiceById(b.voice)?.id || c.voice.id, speed: Math.max(0.7, Math.min(1.4, Number(b.speed) || 1)), pitch: Math.max(-6, Math.min(6, parseInt(b.pitch, 10) || 0)) };
  if (LANGS.some((l) => l.id === b.lang)) c.sampleLang = b.lang;
  const t = await startTTS(sampleText(c), c.voice, c.sampleLang, c.gender);
  if (!t.ok) {
    refund(key, prices().voice);
    throw new UserError(t.error.msg, 502);
  }
  c.voiceJob = t.job;
  save();
  return c;
}
function rename(key, id, name) {
  const c = own(key, id);
  c.name = clean2(name, 40) || c.name;
  save();
  return c;
}
function remove(key, id) {
  const c = own(key, id);
  removeMedia(`c-${c.id}-`);
  db.chars = db.chars.filter((x) => x.id !== c.id);
  save();
}
var running2 = null;
var busy = () => db.chars.some((c) => ["portraits", "sheet"].includes(c.status) || c.voiceJob);
function poll() {
  if (!running2) running2 = step().finally(() => {
    running2 = null;
  });
  return running2;
}
async function step() {
  for (const c of db.chars) {
    try {
      if (c.status === "portraits") {
        const r = await check(c.job);
        if (r.state === "failed") {
          fail(c, r.error, c.candidates.length ? 0 : c.paid);
          continue;
        }
        if (r.state !== "done") continue;
        const imgs = imagesOf(r.data).slice(0, 4);
        if (!imgs.length) {
          fail(c, "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0444\u043E\u0442\u043E", c.paid);
          continue;
        }
        c.candidates = [];
        for (let i = 0; i < imgs.length; i++) c.candidates.push(await saveRemote(imgs[i], `c-${c.id}-cand${i}`, "jpg"));
        c.status = "pick";
        delete c.job;
      } else if (c.status === "sheet") {
        let pending = false;
        for (const [k, job] of Object.entries(c.jobs)) {
          if (!job || job.failed || job.done) continue;
          const r = await check(job);
          if (r.state === "working") {
            pending = true;
            continue;
          }
          if (r.state === "failed") {
            c.jobs[k] = { failed: r.error };
            continue;
          }
          if (k === "tts") {
            const a = audioOf(r.data);
            if (a) {
              c.sample = await saveRemote(a, `c-${c.id}-voice`, "mp3");
              c.sampleMs = r.data.duration_ms || 0;
            }
          } else {
            const img = imagesOf(r.data)[0];
            if (img) c[`ref_${k}`] = await saveRemote(img, `c-${c.id}-${k}`, "jpg");
          }
          c.jobs[k] = { done: true };
        }
        if (pending) continue;
        c.refs = ["full", "three", "profile"].map((k) => c[`ref_${k}`]).filter(Boolean);
        c.status = "ready";
        c.readyAt = Date.now();
        delete c.jobs;
        for (let i = 0; i < c.candidates.length; i++) if (c.candidates[i] !== c.portrait) removeMedia(`c-${c.id}-cand${i}.`);
        c.candidates = [];
      }
      if (c.voiceJob) {
        const r = await check(c.voiceJob);
        if (r.state === "working") continue;
        if (r.state === "done" && audioOf(r.data)) {
          c.sample = await saveRemote(audioOf(r.data), `c-${c.id}-voice`, "mp3");
          c.sampleMs = r.data.duration_ms || 0;
        } else refund(c.key, prices().voice);
        delete c.voiceJob;
      }
    } catch (e) {
      if (c.status === "portraits") fail(c, e.message, c.candidates.length ? 0 : c.paid);
      else if (c.status === "sheet") {
        c.status = "ready";
        c.refs = c.refs || [];
        delete c.jobs;
      }
    }
  }
  save();
}
var summary = (c) => ({
  id: c.id,
  name: c.name,
  gender: c.gender,
  age: c.age,
  look: c.look,
  outfit: c.outfit,
  quirk: c.quirk || "",
  catch: c.catch || "",
  preset: c.preset || "",
  voice: c.voice,
  sampleLang: c.sampleLang,
  status: c.status,
  error: c.error || "",
  candidates: c.candidates,
  portrait: c.portrait || "",
  refs: c.refs || [],
  sample: c.sample || "",
  voiceBusy: !!c.voiceJob,
  created: c.created,
  refunded: c.refunded || 0
});
var mine = (key) => db.chars.filter((c) => c.key === key).map(summary);
var findReady = (key, id) => {
  const c = own(key, id);
  if (c.status !== "ready") throw new UserError(`\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \xAB${c.name}\xBB \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432.`);
  return c;
};

// src/videos.mjs
db.videos ||= [];
var clean3 = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
var gw2 = (g) => g === "male" ? "man" : "woman";
var frameWord = (a) => a === "9:16" ? "vertical 9:16" : a === "16:9" ? "horizontal 16:9" : "square 1:1";
var EMO = { neutral: "Calm and friendly", happy: "Cheerful, smiling", sad: "Sad, thoughtful", angry: "Irritated, intense", surprised: "Surprised, animated", fearful: "Worried, nervous" };
var REAL2 = /(look\s*-?\s*alike|looks?\s+like\s+[A-Z]|celebrit|двойник|знаменит)/i;
var own2 = (key, id) => {
  const v = db.videos.find((x) => x.id === id && x.key === key);
  if (!v) throw new UserError("\u0412\u0438\u0434\u0435\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.", 404);
  return v;
};
var reachable = (v) => publicUrl(v.result) || v.src;
function previous(key, id) {
  if (!id) return null;
  const p = own2(key, id);
  if (p.status !== "done") throw new UserError("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0435 \u0432\u0438\u0434\u0435\u043E \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u043E.");
  return { id: p.id, url: reachable(p), chars: p.chars || [], aspect: p.aspect };
}
async function startLastFrame(url) {
  return submit2("fal-ai/ffmpeg-api/extract-frame", { video_url: url, frame_type: "last" });
}
function fail2(v, err) {
  v.status = "failed";
  v.error = String(err || "\u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 300);
  if (v.paid) {
    refund(v.key, v.paid);
    v.refunded = v.paid;
    v.paid = 0;
  }
  delete v.jobs;
  delete v.job;
}
async function createTalk(key, b, origin2) {
  const c = findReady(key, b.char);
  const text = clean3(b.text, 800);
  if (text.length < 2) throw new UserError("\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u0441\u043A\u0430\u0436\u0435\u0442 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436.");
  const scene = clean3(b.scene, 400);
  if (REAL2.test(scene)) throw new UserError("\u0412 \u0441\u0446\u0435\u043D\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0445 \u0437\u043D\u0430\u043C\u0435\u043D\u0438\u0442\u043E\u0441\u0442\u0435\u0439.");
  let aspect = ASPECTS.includes(b.aspect) ? b.aspect : "9:16";
  const lang2 = langById(b.lang).id;
  const emotion = EMOTIONS.includes(b.emotion) ? b.emotion : "neutral";
  const prev = previous(key, b.from);
  if (prev && !prev.chars.includes(c.id)) throw new UserError(`\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0438\u0434\u0435\u043E, \u0433\u0434\u0435 \u0435\u0441\u0442\u044C ${c.name}.`);
  const P = prices();
  if (prev?.aspect) aspect = prev.aspect;
  const est = estSeconds(text);
  const price = P.talkBase + est * P.talkPerSec;
  charge(key, price);
  const v = {
    id: newId(),
    key,
    mode: "talk",
    chars: [c.id],
    charNames: [c.name],
    text,
    scene,
    lang: lang2,
    aspect,
    emotion,
    model: talkModel().id,
    from: prev?.id || "",
    est,
    paid: price,
    status: "working",
    stage: "prep",
    jobs: {},
    created: Date.now()
  };
  db.videos.unshift(v);
  try {
    if (prev) {
      const r = await startLastFrame(prev.url);
      v.jobs.frame = r.ok ? r.job : { failed: r.error.admin };
    } else {
      const images = [c.portrait, ...c.refs.slice(0, 2)].map(ref);
      const prompt = [
        "The person shown in the reference images (all images show the same person from different angles).",
        "Keep the exact same face, facial features, skin tone, age, hairstyle and body type.",
        c.quirk ? `Keep the character's signature detail clearly visible: ${c.quirk}.` : "",
        scene ? `Scene: ${scene}. Keep the same clothes unless the scene describes different clothing.` : "Setting: a clean, softly lit modern room. Keep the same clothes.",
        `Medium close-up from the chest up, the person faces the camera and looks straight into the lens, mouth closed, natural expression, ready to speak. Flattering natural light, photorealistic, ${frameWord(aspect)} frame. No text, no watermark.`
      ].filter(Boolean).join(" ");
      const r = await submit2(EDIT_MODEL, { prompt, image_urls: images, num_images: 1, aspect_ratio: aspect, resolution: "2K", output_format: "jpeg" }, ["resolution", "output_format"]);
      v.jobs.frame = r.ok ? r.job : { failed: r.error.admin };
    }
    const t = await startTTS(text, c.voice, lang2, c.gender, emotion);
    v.jobs.tts = t.ok ? t.job : { failed: t.error.admin };
    if (v.jobs.frame.failed || v.jobs.tts.failed) fail2(v, v.jobs.frame.failed || v.jobs.tts.failed);
  } catch (e) {
    fail2(v, e.message);
  }
  save();
  if (v.status === "failed") throw new UserError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B.", 502);
  return v;
}
function scenePrompt(model, chars, scene, lines, lang2, frameIdx, audioIdx) {
  const L = langById(lang2).en;
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));
  const dlg = lines.filter((l) => l.text && byId[l.char]);
  if (model.id === "seedance2") {
    let n = 0;
    const who = chars.map((c, i) => {
      const imgs = c._imgs.map(() => `@Image${++n}`).join(", ");
      return `- ${c.name}, a ${c.age}-year-old ${gw2(c.gender)}: ${imgs} show this same person.${c.quirk ? ` Signature detail: ${c.quirk}.` : ""}${audioIdx[i] ? ` Voice: @Audio${audioIdx[i]}.` : ""}`;
    });
    return [
      "Photorealistic cinematic video with natural motion and real-world physics.",
      "Characters (keep their faces and identities exactly as in the references):",
      ...who,
      `Scene: ${scene}`,
      dlg.length ? `Dialogue, spoken in ${L} with natural lip-sync and no subtitles:` : "No dialogue; natural ambient sound only.",
      ...dlg.map((l) => `${byId[l.char].name}: "${l.text}"`),
      frameIdx ? `@Image${frameIdx} is the last frame of the previous shot: continue seamlessly from it, same location, lighting and clothing.` : "",
      "No text, captions, logos or watermarks on screen."
    ].filter(Boolean).join("\n");
  }
  return [
    `Photorealistic cinematic video. The reference images show ${chars.map((c) => `${c.name}, a ${c.age}-year-old ${gw2(c.gender)}`).join(" and ")}. Keep their faces exactly as in the references.`,
    frameIdx ? "One reference image is the last frame of the previous shot: continue seamlessly from it, same location, lighting and clothing." : "",
    `Scene: ${scene}`,
    dlg.length ? `Dialogue in ${L}: ${dlg.map((l) => `${byId[l.char].name} says: "${l.text}"`).join(" ")}` : "No dialogue; natural ambient sound only.",
    "No subtitles or text on screen."
  ].filter(Boolean).join("\n");
}
async function submitScene(v) {
  const model = SCENE_MODELS.find((m) => m.id === v.model);
  const chars = v.chars.map((id) => db.chars.find((c) => c.id === id)).filter(Boolean);
  if (chars.length !== v.chars.length) throw new Error("\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0443\u0434\u0430\u043B\u0451\u043D");
  const perChar = model.id === "seedance2" ? 3 : Math.max(1, Math.floor((model.maxImages - (v.frameUrl ? 1 : 0)) / chars.length));
  for (const c of chars) c._imgs = [c.portrait, c.ref_full, c.ref_three].filter(Boolean).slice(0, perChar);
  const image_urls = chars.flatMap((c) => c._imgs.map(ref));
  let frameIdx = 0;
  if (v.frameUrl) {
    image_urls.push(v.frameUrl);
    frameIdx = image_urls.length;
  }
  const audioIdx = [], audio_urls = [];
  if (model.audioRef) for (const c of chars) {
    if (c.sample && mediaExists(c.sample)) {
      audio_urls.push(ref(c.sample));
      audioIdx.push(audio_urls.length);
    } else audioIdx.push(0);
  }
  const prompt = scenePrompt(model, chars, v.scene, v.lines, v.lang, frameIdx, audioIdx);
  for (const c of chars) delete c._imgs;
  v.prompt = prompt;
  const input = model.id === "seedance2" ? { prompt, image_urls: image_urls.slice(0, 9), ...audio_urls.length ? { audio_urls } : {}, duration: String(v.duration), aspect_ratio: v.aspect, resolution: "720p", generate_audio: true } : { prompt, image_urls: image_urls.slice(0, model.maxImages), aspect_ratio: v.aspect, duration: "8s", resolution: "720p", generate_audio: true };
  const r = await submit2(model.endpoint, input, ["resolution"]);
  if (!r.ok) throw new Error(r.error.admin);
  v.job = r.job;
  v.stage = "video";
}
async function createScene(key, b, origin2) {
  const ids = [...new Set((Array.isArray(b.chars) ? b.chars : [b.chars]).filter(Boolean))].slice(0, 2);
  if (!ids.length) throw new UserError("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430.");
  const chars = ids.map((id) => findReady(key, id));
  const scene = clean3(b.scene, 600);
  if (scene.length < 10) throw new UserError("\u041E\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0432 \u0441\u0446\u0435\u043D\u0435.");
  if (REAL2.test(scene)) throw new UserError("\u0412 \u0441\u0446\u0435\u043D\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0445 \u0437\u043D\u0430\u043C\u0435\u043D\u0438\u0442\u043E\u0441\u0442\u0435\u0439.");
  const model = sceneModel(b.model);
  const lines = (Array.isArray(b.lines) ? b.lines : []).map((l) => ({ char: ids.includes(l.char) ? l.char : ids[0], text: clean3(l.text, 220) })).filter((l) => l.text).slice(0, 4);
  const duration = model.durations.includes(Number(b.duration)) ? Number(b.duration) : model.durations.includes(8) ? 8 : model.durations[0];
  const aspect = model.aspects.includes(b.aspect) ? b.aspect : model.aspects[0];
  const lang2 = langById(b.lang).id;
  const prev = previous(key, b.from);
  const price = duration * (prices().scenePerSec[model.id] || 3);
  charge(key, price);
  const v = {
    id: newId(),
    key,
    mode: "scene",
    chars: ids,
    charNames: chars.map((c) => c.name),
    scene,
    lines,
    lang: lang2,
    aspect,
    duration,
    model: model.id,
    from: prev?.id || "",
    paid: price,
    status: "working",
    stage: prev ? "frame" : "video",
    jobs: {},
    created: Date.now()
  };
  db.videos.unshift(v);
  try {
    if (prev) {
      const r = await startLastFrame(prev.url);
      if (!r.ok) throw new Error(r.error.admin);
      v.jobs.frame = r.job;
    } else await submitScene(v);
  } catch (e) {
    fail2(v, e.message);
  }
  save();
  if (v.status === "failed") throw new UserError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B.", 502);
  return v;
}
async function merge(key, ids, origin2) {
  const list = [...new Set(Array.isArray(ids) ? ids : [])].slice(0, 10).map((id) => own2(key, id));
  if (list.length < 2) throw new UserError("\u041E\u0442\u043C\u0435\u0442\u044C\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u0434\u0432\u0430 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u0432\u0438\u0434\u0435\u043E.");
  if (list.some((v2) => v2.status !== "done")) throw new UserError("\u0421\u043A\u043B\u0435\u0438\u0432\u0430\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0433\u043E\u0442\u043E\u0432\u044B\u0435 \u0432\u0438\u0434\u0435\u043E.");
  const price = prices().merge;
  charge(key, price);
  const v = {
    id: newId(),
    key,
    mode: "merge",
    chars: [...new Set(list.flatMap((x) => x.chars))],
    charNames: [...new Set(list.flatMap((x) => x.charNames))],
    parts: list.map((x) => x.id),
    aspect: list[0].aspect,
    paid: price,
    status: "working",
    stage: "video",
    created: Date.now()
  };
  db.videos.unshift(v);
  const r = await submit2("fal-ai/ffmpeg-api/merge-videos", { video_urls: list.map((x) => reachable(x)), resolution_aspect_ratio_video_index: 0 }, ["resolution_aspect_ratio_video_index"]);
  if (!r.ok) {
    fail2(v, r.error.admin);
    save();
    throw new UserError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043B\u0435\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B.", 502);
  }
  v.job = r.job;
  save();
  return v;
}
function remove2(key, id) {
  const v = own2(key, id);
  if (v.status === "working") throw new UserError("\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438.");
  removeMedia(`v-${v.id}`);
  db.videos = db.videos.filter((x) => x.id !== v.id);
  save();
}
var running3 = null;
var busy2 = () => db.videos.some((v) => v.status === "working");
function poll2() {
  if (!running3) running3 = step2().finally(() => {
    running3 = null;
  });
  return running3;
}
async function finish(v, data) {
  const src = videoOf(data);
  if (!src) throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0432\u0438\u0434\u0435\u043E");
  v.src = src;
  v.result = await saveRemote(src, `v-${v.id}`, "mp4");
  v.seconds = Number(data.duration) || (v.audioMs ? v.audioMs / 1e3 : v.duration) || 0;
  v.status = "done";
  v.done = Date.now();
  v.stage = "";
  delete v.job;
  delete v.jobs;
}
async function step2() {
  for (const v of db.videos) {
    if (v.status !== "working") continue;
    try {
      if (v.mode === "talk" && v.stage === "prep") {
        for (const k of ["frame", "tts"]) {
          const job = v.jobs[k];
          if (!job || job.done) continue;
          const r = await check(job);
          if (r.state === "failed") throw new Error(r.error);
          if (r.state !== "done") continue;
          if (k === "frame") {
            v.frameUrl = imagesOf(r.data)[0];
            if (!v.frameUrl) throw new Error("\u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0441\u044F \u043A\u0430\u0434\u0440");
            v.poster = await saveRemote(v.frameUrl, `v-${v.id}-poster`, "jpg");
          } else {
            v.audioUrl = audioOf(r.data);
            if (!v.audioUrl) throw new Error("\u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0430\u0441\u044C \u0440\u0435\u0447\u044C");
            v.audioMs = r.data.duration_ms || 0;
          }
          v.jobs[k] = { done: true };
        }
        if (v.frameUrl && v.audioUrl) {
          if (v.audioMs) {
            const P = prices();
            const real = P.talkBase + Math.ceil(v.audioMs / 1e3) * P.talkPerSec;
            if (real < v.paid) {
              refund(v.key, v.paid - real);
              v.paid = real;
            }
          }
          const model = TALK_MODELS.find((m) => m.id === v.model) || talkModel();
          const r = await submit2(model.endpoint, { image_url: v.frameUrl, audio_url: v.audioUrl, prompt: `${EMO[v.emotion] || EMO.neutral}, talking to the camera with natural head movement, blinking and subtle hand gestures.` }, ["prompt"]);
          if (!r.ok) throw new Error(r.error.admin);
          v.job = r.job;
          v.stage = "video";
        }
      } else if (v.stage === "frame") {
        const r = await check(v.jobs.frame);
        if (r.state === "failed") throw new Error(r.error);
        if (r.state !== "done") continue;
        v.frameUrl = imagesOf(r.data)[0];
        if (!v.frameUrl) throw new Error("\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0437\u044F\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043A\u0430\u0434\u0440");
        await submitScene(v);
      } else if (v.stage === "video") {
        const r = await check(v.job);
        if (r.state === "failed") throw new Error(r.error);
        if (r.state === "done") await finish(v, r.data);
      }
    } catch (e) {
      fail2(v, e.message);
    }
  }
  save();
}
var STAGE = { prep: "\u043A\u0430\u0434\u0440 \u0438 \u0433\u043E\u043B\u043E\u0441", frame: "\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043A\u0430\u0434\u0440", video: "\u0432\u0438\u0434\u0435\u043E" };
var summary2 = (v) => ({
  id: v.id,
  mode: v.mode,
  charNames: v.charNames,
  chars: v.chars,
  text: v.text || "",
  scene: v.scene || "",
  lines: v.lines || [],
  lang: v.lang,
  aspect: v.aspect,
  duration: v.duration || 0,
  model: v.model || "",
  from: v.from || "",
  status: v.status,
  stage: STAGE[v.stage] || "",
  error: v.error ? "\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B." : "",
  result: v.result || "",
  poster: v.poster || "",
  seconds: Math.round(v.seconds || 0),
  paid: v.paid || 0,
  created: v.created,
  showcase: !!v.showcase
});
var mine2 = (key) => db.videos.filter((v) => v.key === key).slice(0, 200).map(summary2);
var showcase = () => db.videos.filter((v) => v.showcase && v.status === "done" && v.result).slice(0, 12).map((v) => ({ id: v.id, result: v.result, poster: v.poster || "", mode: v.mode, aspect: v.aspect, charNames: v.charNames, caption: v.caption || "" }));
function setShowcase(id, on, caption) {
  const v = db.videos.find((x) => x.id === id);
  if (!v || v.status !== "done") throw new UserError("\u0412\u0438\u0434\u0435\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0438\u043B\u0438 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u043E.", 404);
  v.showcase = !!on;
  if (caption !== void 0) v.caption = clean3(caption, 80);
  save();
}

// src/server.mjs
var { UserError: UserError3 } = fal_exports;
var BRAND2 = BRAND;
var CONTACT = process.env.CONTACT_EMAIL || "";
var ROOT = path4.dirname(fileURLToPath(import.meta.url));
var PUBLIC = fs4.existsSync(path4.join(ROOT, "public", "index.html")) ? path4.join(ROOT, "public") : ROOT;
var PORT = process.env.PORT || 3e3;
var json = (res, data, status = 200) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
};
async function readBody(req, limit = 12e6) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new UserError3("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441.", 413);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}
var parse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new UserError3("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441.");
  }
};
var body = async (req, limit) => parse(await readBody(req, limit));
var origin = (req) => {
  const o = originOf(req);
  noteOrigin(o);
  return o;
};
var lang = (v) => v === "en" ? "en" : "ru";
var packs = () => db.settings.packs;
var currency = () => db.settings.currency || "eur";
function clientKey(req) {
  const k = normKey(req.headers["x-key"]);
  if (!db.keys[k]) throw new UserError3("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041A\u0443\u043F\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434.", 401);
  return k;
}
function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD || "";
  const got = String(req.headers["x-admin"] || "");
  if (!pass) throw new UserError3("\u0410\u0434\u043C\u0438\u043D\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 ADMIN_PASSWORD \u0432 Railway \u2192 Variables.", 403);
  const a = crypto4.createHash("sha256").update(pass).digest();
  const b = crypto4.createHash("sha256").update(got).digest();
  if (!crypto4.timingSafeEqual(a, b)) throw new UserError3("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C.", 401);
}
function fulfill(session) {
  if (!session || session.payment_status !== "paid") return null;
  const existing = db.orders.find((o) => o.id === session.id);
  if (existing) return { key: existing.key, added: 0, credits: db.keys[existing.key]?.credits ?? 0 };
  const credits = parseInt(session.metadata?.credits, 10) || 0;
  let key = normKey(session.metadata?.key);
  const email = session.customer_details?.email || session.customer_email || "";
  if (!db.keys[key]) {
    key = newKey();
    db.keys[key] = { credits: 0, spent: 0, email, created: Date.now(), source: "stripe", note: "" };
  }
  db.keys[key].credits += credits;
  if (email && !db.keys[key].email) db.keys[key].email = email;
  db.orders.unshift({ id: session.id, key, email, pack: session.metadata?.pack || "", credits, amount: (session.amount_total || 0) / 100, currency: session.currency || currency(), created: Date.now() });
  save();
  return { key, added: credits, credits: db.keys[key].credits };
}
async function pump(key) {
  if (db.chars.some((c) => c.key === key) && busy()) await poll();
  if (db.videos.some((v) => v.key === key && v.status === "working")) await poll2();
}
function falCost() {
  let sum = 0;
  for (const c of db.chars) sum += (c.status === "failed" && !c.portrait ? 0 : 4 * COST.image) + (c.portrait ? 3 * COST.image : 0);
  for (const v of db.videos) {
    if (v.status !== "done") continue;
    if (v.mode === "talk") sum += COST.image + (v.text || "").length / 1e3 * COST.tts1k + (v.seconds || 0) * (TALK_MODELS.find((m) => m.id === v.model)?.perSec || 0.115);
    if (v.mode === "scene") sum += (v.duration || 8) * (SCENE_MODELS.find((m) => m.id === v.model)?.perSec || 0.3);
  }
  return +sum.toFixed(2);
}
var routes = {
  "GET /api/config": async (req, res) => json(res, {
    brand: BRAND2,
    contact: CONTACT,
    currency: currency(),
    stripe: stripeEnabled(),
    packs: packs(),
    catalog: publicCatalog(),
    showcase: showcase(),
    latest: { ru: latestFor("ru"), en: latestFor("en") }
  }),
  "GET /api/balance": async (req, res) => {
    const k = clientKey(req);
    json(res, { key: k, credits: db.keys[k].credits });
  },
  "GET /api/state": async (req, res) => {
    const k = clientKey(req);
    origin(req);
    await pump(k);
    json(res, { credits: db.keys[k].credits, chars: mine(k), videos: mine2(k) });
  },
  // персонажи
  "POST /api/chars": async (req, res) => {
    const k = clientKey(req);
    origin(req);
    const c = await create(k, await body(req));
    json(res, { char: summary(c), credits: db.keys[k].credits });
  },
  "POST /api/chars/reroll": async (req, res) => {
    const k = clientKey(req);
    const b = await body(req);
    const c = await reroll(k, b.id, b);
    json(res, { char: summary(c), credits: db.keys[k].credits });
  },
  "POST /api/chars/pick": async (req, res) => {
    const k = clientKey(req);
    origin(req);
    const b = await body(req);
    const c = await pick(k, b.id, parseInt(b.index, 10));
    json(res, { char: summary(c) });
  },
  "POST /api/chars/voice": async (req, res) => {
    const k = clientKey(req);
    const b = await body(req);
    const c = await setVoice(k, b.id, b);
    json(res, { char: summary(c), credits: db.keys[k].credits });
  },
  "POST /api/chars/rename": async (req, res) => {
    const k = clientKey(req);
    const b = await body(req);
    json(res, { char: summary(rename(k, b.id, b.name)) });
  },
  "POST /api/chars/delete": async (req, res) => {
    const k = clientKey(req);
    remove(k, (await body(req)).id);
    json(res, { ok: true });
  },
  // видео
  "POST /api/videos/talk": async (req, res) => {
    const k = clientKey(req);
    const o = origin(req);
    const v = await createTalk(k, await body(req), o);
    json(res, { video: summary2(v), credits: db.keys[k].credits });
  },
  "POST /api/videos/scene": async (req, res) => {
    const k = clientKey(req);
    const o = origin(req);
    const v = await createScene(k, await body(req), o);
    json(res, { video: summary2(v), credits: db.keys[k].credits });
  },
  "POST /api/videos/merge": async (req, res) => {
    const k = clientKey(req);
    const o = origin(req);
    const v = await merge(k, (await body(req)).ids, o);
    json(res, { video: summary2(v), credits: db.keys[k].credits });
  },
  "POST /api/videos/delete": async (req, res) => {
    const k = clientKey(req);
    remove2(k, (await body(req)).id);
    json(res, { ok: true });
  },
  // оплата
  "POST /api/checkout": async (req, res) => {
    if (!stripeEnabled()) throw new UserError3("\u041E\u043F\u043B\u0430\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430.", 503);
    const b = await body(req);
    const pack = packs().find((p) => p.id === b.pack);
    if (!pack) throw new UserError3("\u041F\u0430\u043A\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
    const key = db.keys[normKey(b.key)] ? normKey(b.key) : "";
    const s = await createCheckout({ pack, currency: currency(), key, origin: origin(req), lang: lang(b.lang), brand: BRAND2 });
    json(res, { url: s.url });
  },
  "GET /api/checkout/confirm": async (req, res, url) => {
    const id = url.searchParams.get("session_id") || "";
    if (!/^cs_[\w]+$/.test(id)) throw new UserError3("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436.");
    const r = fulfill(await retrieveSession(id));
    if (!r) throw new UserError3("\u041F\u043B\u0430\u0442\u0451\u0436 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443.", 402);
    json(res, r);
  },
  "POST /api/stripe/webhook": async (req, res) => {
    const raw = await readBody(req, 1e6);
    const event = verifyWebhook(raw, req.headers["stripe-signature"]);
    if (!event) return json(res, { error: "bad signature" }, 400);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") fulfill(event.data.object);
    json(res, { received: true });
  },
  "GET /api/health": async (req, res) => {
    const p = await probe();
    json(res, {
      fal: p.text,
      falOk: p.ok,
      stripe: stripeEnabled() ? "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (STRIPE_SECRET_KEY)",
      webhook: webhookEnabled() ? "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (STRIPE_WEBHOOK_SECRET)",
      storage: PERSISTENT ? `\u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F (${DATA_DIR})` : "\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0435",
      publicUrl: process.env.PUBLIC_URL ? "\u0437\u0430\u0434\u0430\u043D" : "\u043D\u0435 \u0437\u0430\u0434\u0430\u043D (PUBLIC_URL)",
      admin: process.env.ADMIN_PASSWORD ? "\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430 (ADMIN_PASSWORD)"
    });
  },
  // ---------- админка ----------
  "GET /api/admin/stats": async (req, res) => {
    isAdmin(req);
    origin(req);
    const DAY = 864e5;
    const start = /* @__PURE__ */ new Date();
    start.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const from = start.getTime() - i * DAY, to = from + DAY;
      const vs = db.videos.filter((v) => v.created >= from && v.created < to && v.status === "done");
      const os = db.orders.filter((o) => o.created >= from && o.created < to);
      days.push({ day: from, videos: vs.length, revenue: os.reduce((s, o) => s + o.amount, 0), orders: os.length });
    }
    const done = db.videos.filter((v) => v.status === "done");
    const since = (ms) => db.orders.filter((o) => o.created >= Date.now() - ms);
    const sum = (a) => a.reduce((s, o) => s + o.amount, 0);
    const p = await probe();
    json(res, {
      brand: BRAND2,
      currency: currency(),
      days,
      today: days[13],
      revenue7: sum(since(7 * DAY)),
      revenue30: sum(since(30 * DAY)),
      revenueAll: sum(db.orders),
      orders: db.orders.length,
      videos: done.length,
      seconds: Math.round(done.reduce((s, v) => s + (v.seconds || 0), 0)),
      byMode: { talk: done.filter((v) => v.mode === "talk").length, scene: done.filter((v) => v.mode === "scene").length, merge: done.filter((v) => v.mode === "merge").length },
      failed: db.videos.filter((v) => v.status === "failed").length,
      working: db.videos.filter((v) => v.status === "working").length,
      chars: db.chars.filter((c) => c.status === "ready").length,
      falCost: falCost(),
      creditsOutstanding: Object.values(db.keys).reduce((s, k) => s + k.credits, 0),
      clients: Object.keys(db.keys).length,
      disk: diskUsage(),
      system: { fal: p.text, falOk: p.ok, stripe: stripeEnabled(), webhook: webhookEnabled(), persistent: PERSISTENT, dataDir: DATA_DIR, publicUrl: !!process.env.PUBLIC_URL }
    });
  },
  "GET /api/admin/videos": async (req, res) => {
    isAdmin(req);
    json(res, db.videos.slice(0, 200).map((v) => ({ ...summary2(v), email: db.keys[v.key]?.email || "", key: v.key, caption: v.caption || "", rawError: v.error || "" })));
  },
  "POST /api/admin/showcase": async (req, res) => {
    isAdmin(req);
    const b = await body(req);
    setShowcase(b.id, b.on, b.caption);
    json(res, { ok: true });
  },
  "GET /api/admin/chars": async (req, res) => {
    isAdmin(req);
    json(res, db.chars.slice(0, 300).map((c) => ({ ...summary(c), email: db.keys[c.key]?.email || "", key: c.key, videos: db.videos.filter((v) => v.chars?.includes(c.id)).length })));
  },
  "GET /api/admin/prices": async (req, res) => {
    isAdmin(req);
    json(res, { prices: prices(), models: modelSettings(), talkModels: TALK_MODELS.map(({ id, ru, perSec }) => ({ id, name: ru, perSec })), sceneModels: SCENE_MODELS.map(({ id, ru, perSec, durations }) => ({ id, name: ru, perSec, durations })), cost: COST });
  },
  "POST /api/admin/prices": async (req, res) => {
    isAdmin(req);
    savePrices(await body(req));
    json(res, { ok: true, prices: prices(), models: modelSettings() });
  },
  "GET /api/admin/orders": async (req, res) => {
    isAdmin(req);
    json(res, db.orders.slice(0, 300));
  },
  "GET /api/admin/keys": async (req, res) => {
    isAdmin(req);
    json(res, Object.entries(db.keys).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.created - a.created).slice(0, 500));
  },
  "POST /api/admin/keys": async (req, res) => {
    isAdmin(req);
    const { credits, note, email } = await body(req);
    const c = Math.max(0, Math.min(1e5, parseInt(credits, 10) || 0));
    if (!c) throw new UserError3("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432.");
    const key = newKey();
    db.keys[key] = { credits: c, spent: 0, email: String(email || "").slice(0, 120), created: Date.now(), source: "promo", note: String(note || "").slice(0, 120) };
    save();
    json(res, { key, ...db.keys[key] });
  },
  "POST /api/admin/keys/adjust": async (req, res) => {
    isAdmin(req);
    const { key, delta } = await body(req);
    const rec = db.keys[normKey(key)];
    if (!rec) throw new UserError3("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
    rec.credits = Math.max(0, rec.credits + (parseInt(delta, 10) || 0));
    save();
    json(res, { key: normKey(key), credits: rec.credits });
  },
  "POST /api/admin/packs": async (req, res) => {
    isAdmin(req);
    const { packs: list, currency: cur } = await body(req);
    if (!Array.isArray(list) || !list.length || list.length > 6) throw new UserError3("\u041D\u0443\u0436\u043D\u043E \u043E\u0442 1 \u0434\u043E 6 \u043F\u0430\u043A\u0435\u0442\u043E\u0432.");
    db.settings.packs = list.map((p, i) => ({
      id: String(p.id || `pack${i}`).replace(/[^\w-]/g, "").slice(0, 20) || `pack${i}`,
      credits: Math.max(1, parseInt(p.credits, 10) || 1),
      price: Math.max(0.5, Math.round((parseFloat(p.price) || 1) * 100) / 100),
      name: { ru: String(p.name?.ru || "").slice(0, 40) || "\u041F\u0430\u043A\u0435\u0442", en: String(p.name?.en || "").slice(0, 40) || "Pack" },
      popular: Boolean(p.popular)
    }));
    if (["eur", "usd", "gbp"].includes(cur)) db.settings.currency = cur;
    save();
    json(res, { packs: db.settings.packs, currency: db.settings.currency });
  },
  // ---------- Блог и SEO ----------
  "GET /api/admin/seo": async (req, res) => {
    isAdmin(req);
    originOf(req);
    if (jobsBusy()) await pollJobs();
    const graph = linkGraph();
    json(res, {
      brand: BRAND2,
      origin: originOf(req),
      publicUrl: !!process.env.PUBLIC_URL,
      settings: { home: seo.home, defaults: DEFAULT_HOME, verify: seo.verify, analytics: seo.analytics, llm: seo.llm, indexnow: seo.indexnow, autoCover: seo.autoCover, ogImage: seo.ogImage, indexnowKey: seo.indexnowKey, lastIndexNow: seo.lastIndexNow || null },
      llmModels: LLM_MODELS,
      pinterest: { feeds: pinterestFeeds(), autoPin: seo.autoPin, pinText: seo.pinText, verified: !!seo.verify.pinterest },
      posts: db.posts.map((p) => ({ ...postSummary(p), incoming: graph.incoming[postUrl(p)] || 0, outgoing: graph.outgoing[p.id] || 0 })),
      jobs: db.seoJobs.slice(0, 40).map(({ statusUrl, responseUrl, llm, ...j }) => j),
      plan: seo.plan.slice(0, 300),
      links: { manual: seo.links, max: seo.maxLinks, auto: ["ru", "en"].flatMap((l) => linkRules(l).filter((r) => r.auto).map((r) => ({ ...r, lang: l }))) },
      audit: audit(req),
      views: viewsByDay(30)
    });
  },
  "GET /api/admin/seo/post": async (req, res, url) => {
    isAdmin(req);
    const p = findPost(url.searchParams.get("id"));
    if (!p) throw new UserError3("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
    json(res, { post: p, analysis: analyze(p) });
  },
  "POST /api/admin/seo/post": async (req, res) => {
    isAdmin(req);
    const p = savePost(await body(req, 2e6));
    if (p.status === "published") indexNow([postUrl(p), "/sitemap.xml"]).catch(() => {
    });
    json(res, { post: p, analysis: analyze(p) });
  },
  "POST /api/admin/seo/analyze": async (req, res) => {
    isAdmin(req);
    const b = await body(req, 2e6);
    const p = { lang: b.lang === "en" ? "en" : "ru", title: String(b.title || ""), keyword: String(b.keyword || ""), description: String(b.description || ""), slug: slugify(b.slug || b.title || ""), body: String(b.body || ""), faq: Array.isArray(b.faq) ? b.faq : [], tags: [], anchors: "", cover: b.cover || "", id: b.id || "" };
    json(res, analyze(p));
  },
  "POST /api/admin/seo/publish": async (req, res) => {
    isAdmin(req);
    const { id, published: on } = await body(req);
    const p = setPublished(id, !!on);
    const r = on ? await indexNow([postUrl(p), "/blog", "/en/blog", "/sitemap.xml"]) : null;
    json(res, { post: postSummary(p), indexnow: r });
  },
  "POST /api/admin/seo/delete": async (req, res) => {
    isAdmin(req);
    deletePost((await body(req)).id);
    json(res, { ok: true });
  },
  "POST /api/admin/seo/cover": async (req, res) => {
    isAdmin(req);
    const b = await body(req);
    if (b.image) {
      uploadCover(b.id, b.image);
      return json(res, { ok: true, post: findPost(b.id) });
    }
    await startCover(b.id);
    json(res, { ok: true, post: findPost(b.id) });
  },
  "POST /api/admin/seo/ai/article": async (req, res) => {
    isAdmin(req);
    const b = await body(req);
    const items = Array.isArray(b.items) ? b.items.slice(0, 10) : [b];
    for (const it of items) await startArticle(it);
    json(res, { ok: true, started: items.length });
  },
  "POST /api/admin/seo/ai/plan": async (req, res) => {
    isAdmin(req);
    await startPlan(await body(req));
    json(res, { ok: true });
  },
  "POST /api/admin/seo/ai/meta": async (req, res) => {
    isAdmin(req);
    json(res, await improveMeta(await body(req, 2e6)));
  },
  "POST /api/admin/seo/plan/remove": async (req, res) => {
    isAdmin(req);
    removePlanItem((await body(req)).id);
    json(res, { ok: true });
  },
  "POST /api/admin/seo/links": async (req, res) => {
    isAdmin(req);
    saveLinks(await body(req));
    json(res, { ok: true });
  },
  "POST /api/admin/seo/settings": async (req, res) => {
    isAdmin(req);
    saveSettings(await body(req));
    json(res, { ok: true });
  },
  "POST /api/admin/seo/og": async (req, res) => {
    isAdmin(req);
    uploadOg((await body(req)).image);
    json(res, { ok: true, ogImage: seo.ogImage });
  },
  "POST /api/admin/seo/pin": async (req, res) => {
    isAdmin(req);
    const b = await body(req);
    if (b.image) {
      uploadPin(b.id, b.image);
      return json(res, { ok: true, post: findPost(b.id) });
    }
    const p = findPost(b.id);
    if (p) delete p.pinJob;
    await startPin(b.id);
    json(res, { ok: true, post: findPost(b.id) });
  },
  "POST /api/admin/seo/pins/missing": async (req, res) => {
    isAdmin(req);
    json(res, { started: await startMissingPins((await body(req)).lang || "") });
  },
  "POST /api/admin/seo/pinterest/settings": async (req, res) => {
    isAdmin(req);
    savePinSettings(await body(req));
    json(res, { ok: true });
  },
  "GET /api/admin/seo/pinterest.csv": async (req, res, url) => {
    isAdmin(req);
    const q = Object.fromEntries(url.searchParams);
    const r = pinterestCsv(q, originOf(req));
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "x-total": String(r.total), "x-parts": String(r.parts), "x-count": String(r.count), "content-disposition": `attachment; filename="pinterest-${q.lang || "all"}-${r.part}.csv"` });
    res.end(r.csv);
  },
  "POST /api/admin/seo/indexnow": async (req, res) => {
    isAdmin(req);
    originOf(req);
    json(res, await indexNow(allUrls()));
  }
};
var TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp" };
var PAGES = { "/": "index.html", "/app": "app.html", "/admin": "admin.html", "/seo": "seo.html" };
var send = (res, status, type, data, cache = "no-cache") => {
  res.writeHead(status, { "content-type": type, "cache-control": cache, "x-content-type-options": "nosniff" });
  res.end(data);
};
var HTML = "text/html; charset=utf-8";
function serveStatic(req, res, pathname) {
  const page = PAGES[pathname];
  const name = page || pathname.replace(/^\/+/, "");
  const file = path4.join(PUBLIC, name);
  if ((page || /^[\w.-]+\.(png|jpe?g|svg|ico|webp)$/i.test(name)) && fs4.existsSync(file)) {
    if (pathname === "/") return send(res, 200, HTML, injectHome(fs4.readFileSync(file, "utf8"), req, { packs: packs(), currency: currency(), lang: new URL(req.url, "http://x").searchParams.get("lang") === "en" ? "en" : "ru" }));
    if (page && pathname !== "/app") res.setHeader("x-robots-tag", "noindex, nofollow");
    res.writeHead(200, { "content-type": TYPES[path4.extname(file).toLowerCase()] || "application/octet-stream", "x-content-type-options": "nosniff" });
    return fs4.createReadStream(file).pipe(res);
  }
  send(res, 404, HTML, notFound(req, pathname.startsWith("/en/") ? "en" : "ru"));
}
function dynamic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const p = url.pathname;
  if (p.length > 1 && p.endsWith("/")) {
    res.writeHead(301, { location: p.replace(/\/+$/, "") + url.search });
    res.end();
    return true;
  }
  if (p.startsWith("/media/")) return serveMedia(req, res, p.slice(7));
  if (p === "/sitemap.xml") return send(res, 200, "application/xml; charset=utf-8", sitemap(req)), true;
  if (p === "/robots.txt") return send(res, 200, "text/plain; charset=utf-8", robots(req)), true;
  if (p === `/${seo.indexnowKey}.txt`) return send(res, 200, "text/plain; charset=utf-8", seo.indexnowKey), true;
  if (p.startsWith("/blog-img/")) return serveImage(res, p.slice(10));
  const m = p.match(/^(\/en)?\/blog(?:\/(rss\.xml|pinterest\.xml|tag\/([^/]+?)(\/pinterest\.xml)?|([a-z0-9-]+)))?$/);
  if (!m) return false;
  const lng = m[1] ? "en" : "ru";
  const page = Math.max(1, parseInt(url.searchParams.get("page"), 10) || 1);
  const RSS = "application/rss+xml; charset=utf-8";
  if (m[2] === "rss.xml") return send(res, 200, RSS, rss(req, lng)), true;
  if (m[2] === "pinterest.xml") return send(res, 200, RSS, pinterestFeed(req, lng)), true;
  if (m[3] && m[4]) return send(res, 200, RSS, pinterestFeed(req, lng, decodeURIComponent(m[3]))), true;
  if (m[3]) {
    const html2 = blogList(req, lng, { page, tag: decodeURIComponent(m[3]) });
    return send(res, html2 ? 200 : 404, HTML, html2 || notFound(req, lng)), true;
  }
  if (m[5]) {
    const post = findBySlug(lng, m[5]);
    if (!post) return send(res, 404, HTML, notFound(req, lng)), true;
    countView(post, req);
    return send(res, 200, HTML, article(req, post)), true;
  }
  const html = blogList(req, lng, { page });
  return send(res, html ? 200 : 404, HTML, html || notFound(req, lng)), true;
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (handler) return await handler(req, res, url);
    if (url.pathname.startsWith("/api/")) return json(res, { error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }, 404);
    if (dynamic(req, res, url)) return;
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!(e instanceof UserError3)) console.error(e);
    if (!res.headersSent) json(res, { error: e instanceof UserError3 ? e.message : "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }, e.status || 500);
  }
}).listen(PORT, () => console.log(`${BRAND2}: \u0441\u0435\u0440\u0432\u0438\u0441 \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 ${PORT}. \u0414\u0430\u043D\u043D\u044B\u0435: ${DATA_DIR}${PERSISTENT ? "" : " (Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D!)"}`));
setInterval(() => {
  if (busy()) poll().catch(() => {
  });
  if (busy2()) poll2().catch(() => {
  });
  if (jobsBusy()) pollJobs().catch(() => {
  });
}, 4e3);
