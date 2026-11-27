const SITE = {
  name: "MAGUITO ASCENDIDO",
  portal: "PORTAL ASCENCION",
  tagline: "No mostrar a durmientes",
};

const LABELS = {
  character: "PERSONAJES",
  corporation: "CORPORACIONES",
  government: "PAISES",
  organization: "ORGANIZACIONES",
  relations: "RELACIONES",
  chart: "ESFERAS",
};

const CAT_ALIASES = {
  character: ["character", "characters", "personaje", "personajes"],
  corporation: ["corporation", "corporations", "empresa", "empresas", "corp"],
  government: ["government", "governments", "gobierno", "pais", "paises", "país", "países"],
  organization: ["organization", "organizations", "organizacion", "organización", "tradicion", "tradición"],
  relations: ["relations", "relacion", "relación", "relaciones", "arbol", "árbol"],
  chart: ["chart", "charts", "esfera", "esferas", "radar"],
  all: ["all", "todo", "todos"],
};

const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M7 10.5V20h10v-9.5"/>',
  grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  user: '<circle cx="12" cy="8" r="3"/><path d="M5.5 19c1.4-3 3.6-4.5 6.5-4.5S17.1 16 18.5 19"/>',
  users: '<circle cx="9" cy="9" r="2.4"/><circle cx="16" cy="9.5" r="2"/><path d="M4.5 18.5c.8-2.4 2.4-3.6 4.6-3.6 2.1 0 3.6 1.2 4.4 3.4"/><path d="M13 15.2c1.6-.2 3 .7 3.8 2.8"/>',
  building: '<path d="M5 20V6l7-2 7 2v14"/><path d="M9 20v-4h6v4"/><path d="M9 9h.01M12 9h.01M15 9h.01M9 12.5h.01M12 12.5h.01M15 12.5h.01"/>',
  bank: '<path d="M4 10h16"/><path d="M6 10v7M10 10v7M14 10v7M18 10v7"/><path d="M4 17h16M3 20h18M12 4 3 10h18L12 4z"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 7v4M12 11H6.5V16M12 11h5.5V16"/>',
};


const SPHERES = [
  "Correspondencia",
  "Entropia",
  "Espiritu",
  "Fuerzas",
  "Primordial",
  "Materia",
  "Mente",
  "Tiempo",
  "Vida",
];
const SPHERE_MIN = -1;
const SPHERE_MAX = 4;

const state = {
  docs: [],
  route: parseRoute(),
  view: "cards",
  log: [],
};

const app = document.querySelector("#app");
const logEl = document.querySelector("#log");
const promptEl = document.querySelector("#prompt");
const cmdEl = document.querySelector("#cmd");

document.querySelector("#shell-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const line = cmdEl.value.trim();
  cmdEl.value = "";
  if (!line) return;
  pushLog(`<span class="cmd">${esc(promptEl.textContent)} ${esc(line)}</span>`);
  runCommand(line);
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-search")) return;
  event.preventDefault();
  const q = new FormData(form).get("q");
  location.hash = `#/search?q=${encodeURIComponent(String(q || "").trim())}`;
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.id === "category") {
    const value = target.value;
    location.hash = value === "all" ? "#/archive" : `#/archive/${value}`;
    return;
  }
  render();
});

document.addEventListener("click", (event) => {
  const tint = event.target instanceof Element ? event.target.closest(".tint-toggle") : null;
  if (tint) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = tint.parentElement?.querySelector("canvas");
    const image = canvas?._source;
    if (!canvas || !image) return;
    const filtered = tint.getAttribute("aria-pressed") !== "true";
    dither(image, canvas, filtered);
    tint.setAttribute("aria-pressed", filtered ? "true" : "false");
    tint.setAttribute("aria-label", filtered ? "Quitar el filtro verde" : "Poner el filtro verde");
    return;
  }
  const button = event.target instanceof Element ? event.target.closest("[data-view]") : null;
  if (!button) return;
  state.view = button.getAttribute("data-view") || "cards";
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  event.preventDefault();
  document.querySelector(".top-search input")?.focus();
});

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  render();
  window.scrollTo(0, 0);
});

boot();

async function boot() {
  try {
    const response = await fetch("docs.json");
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    state.docs = payload
      .map(parseDoc)
      .filter((doc) => doc.title && doc.fm.type !== "atlas" && doc.fm.type !== "timeline" && doc.fm.type !== "radar-chart");
    const visible = state.docs.filter((doc) => !doc.supplement);
    pushLog(`${visible.length} fichas en el archivo.`);
    pushLog("Escribe <span class=\"cmd\">help</span>.");
    render();
  } catch {
    app.innerHTML = `<p class="error">No pude leer el archivo.</p>`;
  }
}

function parseRoute() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [pathname, query = ""] = hash.split("?");
  const parts = pathname.split("/").filter(Boolean);
  const params = new URLSearchParams(query);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "archive") return { name: "archive", category: parts[1] || "all" };
  if (parts[0] === "doc") return { name: "doc", id: decodeURIComponent(parts[1] || "") };
  if (parts[0] === "search") return { name: "search", q: params.get("q") || "" };
  return { name: "home" };
}

function parseDoc(entry) {
  const raw = entry.markdown.replace(/^\uFEFF/, "");
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      fm[match[1]] = value;
    }
  }
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
  const doc = {
    id: entry.rel.split("/").pop().replace(/\.md$/, ""),
    rel: entry.rel,
    title: "",
    category: categoryOf(fm),
    image: "",
    fields: [],
    quote: "",
    preamble: [],
    sections: [],
    supplement: fm.type === "radar-chart",
    fm,
  };

  let mode = "head";
  let paragraph = [];
  const flush = () => {
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (!text || isBoilerplate(text)) return;
    if (mode === "head") doc.preamble.push(text);
    else doc.sections.at(-1)?.paragraphs.push(text);
  };

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("# ")) {
      flush();
      doc.title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      mode = "section";
      doc.sections.push({ heading: line.slice(3).trim(), paragraphs: [] });
      continue;
    }
    if (mode === "head") {
      const image = line.match(/^!\[([^\]]*)\]\((.+)\)$/);
      if (image) {
        doc.image = imageUrl(entry.rel, image[2].trim());
        continue;
      }
      const field = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      if (field) {
        doc.fields.push({ label: field[1].trim(), value: field[2].trim() });
        continue;
      }
      const trimmed = line.trim();
      if (trimmed.startsWith("*") && trimmed.endsWith("*") && trimmed.length > 1) {
        if (!isBoilerplate(trimmed)) doc.quote = cleanQuote(trimmed);
        continue;
      }
    }
    if (line.trim() === "") flush();
    else paragraph.push(line);
  }
  flush();
  doc.sections = doc.sections.filter((section) => section.paragraphs.length);
  return doc;
}

function categoryOf(fm) {
  const entity = (fm.entityType || "").toLowerCase();
  if (entity) return entity;
  if (fm.type === "family-tree-v2") return "relations";
  if (fm.type === "radar-chart") return "chart";
  return "record";
}

function isBoilerplate(text) {
  return /open it in vvd/i.test(text);
}

function cleanQuote(value) {
  let text = value.trim().replace(/\\([*])/g, "$1");
  while (text.startsWith("*") && text.endsWith("*") && text.length > 1) text = text.slice(1, -1).trim();
  return text;
}

function imageUrl(rel, src) {
  const parts = ["world", ...rel.split("/").slice(0, -1)];
  for (const part of src.split(/[\\/]/)) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  if (parts.length === 0) return "";
  const tail = parts.map(encodeURIComponent).join("/");
  if (/\/wiki(\/|$)/.test(location.pathname)) {
    const folder = encodeURIComponent("Maguito Ascendido 2026-11-06");
    return `../${folder}/${tail}`;
  }
  return `export/${tail}`;
}

function visibleDocs() {
  return state.docs.filter((doc) => !doc.supplement);
}

function docsIn(category) {
  const list = !category || category === "all"
    ? visibleDocs()
    : state.docs.filter((doc) => doc.category === category && (category === "chart" || !doc.supplement));
  return sortDocs(list);
}

function sortDocs(list) {
  return [...list].sort((a, b) => a.title.localeCompare(b.title, "es"));
}

function counts() {
  const tally = new Map();
  for (const doc of visibleDocs()) tally.set(doc.category, (tally.get(doc.category) || 0) + 1);
  return tally;
}

function render() {
  const route = state.route;
  promptEl.textContent = `guest@ascendido:${promptPath(route)}$`;
  const doc = route.name === "doc" ? state.docs.find((item) => item.id === route.id) : null;
  document.title = doc ? `${doc.title} · Maguito Ascendido` : "Maguito Ascendido";
  let main = "";
  if (route.name === "home") main = renderHome();
  else if (route.name === "archive") main = renderArchive(route.category);
  else if (route.name === "doc") main = doc ? renderDoc(doc) : renderMissing(route.id);
  else if (route.name === "search") main = renderSearch(route.q);
  else main = renderHome();
  app.innerHTML = frame(main, currentNav(route, doc));
  mountImages(app);
}

function frame(main, current) {
  const tally = counts();
  const items = [
    ["home", "Portal", "#/", "home", true],
    ["all", "All records", "#/archive", "grid", true],
    ["character", "Characters", "#/archive/character", "user", tally.has("character")],
    ["organization", "Organizations", "#/archive/organization", "users", tally.has("organization")],
    ["corporation", "Corporations", "#/archive/corporation", "building", tally.has("corporation")],
    ["government", "Governments", "#/archive/government", "bank", tally.has("government")],
    ["relations", "Relations", "#/archive/relations", "tree", tally.has("relations")],
  ];
  const nav = items
    .filter((item) => item[4])
    .map(([id, label, href, icon,]) => {
      const pressed = id === current ? ' aria-current="page"' : "";
      return `<a class="nav-btn" href="${href}" aria-label="${label}" title="${label}"${pressed}>${svg(icon)}</a>`;
    })
    .join("");
  const query = state.route.name === "search" ? state.route.q : "";
  return `
    <div class="wrap">
      <header class="top">
        <a class="brand" href="#/">${esc(SITE.name)}</a>
        <form class="top-search" data-search>
          <input name="q" value="${esc(query)}" placeholder="BUSCAR" aria-label="Buscar en el archivo" />
          <span class="slash" aria-hidden="true">/</span>
        </form>
      </header>
      <nav class="nav" aria-label="Secciones">${nav}</nav>
      <main id="content">${main}</main>
    </div>`;
}

function renderHome() {
  const tally = counts();
  const order = ["character", "organization", "corporation", "government", "relations"];
  const rows = order
    .filter((key) => tally.has(key))
    .map((key) => {
      const count = String(tally.get(key)).padStart(2, "0");
      return `<a class="archive-row" href="#/archive/${key}"><span>${LABELS[key]}</span><span><span class="count">${count}</span> <span class="arrow">→</span></span></a>`;
    })
    .join("");
  return `
    <h1 class="portal-title">${esc(SITE.portal)}</h1>
    <p class="tagline">${esc(SITE.tagline)}</p>
    <form class="search-bar" data-search>
      <span aria-hidden="true">&gt;</span>
      <input name="q" placeholder="Buscar personajes, lugares, documentos..." aria-label="Buscar personas, lugares y documentos" />
      <button type="submit">Buscar /</button>
    </form>
    <section class="panel">
      <h2 class="panel-h"><span>Archivo</span><span>${String(visibleDocs().length).padStart(2, "0")} Fichas</span></h2>
      ${rows}
    </section>`;
}

function renderArchive(category) {
  const known = category === "all" || LABELS[category];
  const docs = known ? docsIn(category) : [];
  const title = category === "all" || !LABELS[category] ? "TODAS LAS FICHAS" : LABELS[category];
  const options = ["all", ...Object.keys(LABELS).filter((key) => key !== "chart" && counts().has(key))]
    .map((key) => `<option value="${key}"${key === (known ? category : "all") ? " selected" : ""}>${key === "all" ? "TODAS LAS FICHAS" : LABELS[key]}</option>`)
    .join("");
  const body = docs.length ? (state.view === "list" ? renderList(docs) : renderCards(docs)) : `<p class="empty">No hay fichas en esta categoría.</p>`;
  return `
    ${crumbs([["#/", SITE.name], ["#/archive", "TODAS LAS FICHAS"], ["", title]])}
    <h1 class="list-title"><span>${esc(title)}</span><span class="dim">${String(docs.length).padStart(2, "0")} fichas</span></h1>
    <div class="toolbar">
      <label>Category<select id="category">${options}</select></label>
      <div class="view-toggle">
        <button type="button" data-view="cards" aria-pressed="${state.view === "cards"}">Cartas</button>
        <button type="button" data-view="list" aria-pressed="${state.view === "list"}">Lista</button>
      </div>
    </div>
    ${body}`;
}

function renderCards(docs) {
  return `<div class="cards">${docs.map((doc) => `
    <a class="card${doc.image ? "" : " plain"}" href="#/doc/${encodeURIComponent(doc.id)}">
      <span class="meta">
        <span class="kicker">${esc(LABELS[doc.category] || doc.category)}</span>
        <h2>${esc(doc.title)}</h2>
      </span>
      ${doc.image ? photoHtml(doc.image, doc.title) : ""}
    </a>`).join("")}</div>`;
}

function renderList(docs) {
  return `<div class="list">${docs.map((doc) => `
    <a class="list-row" href="#/doc/${encodeURIComponent(doc.id)}">
      <strong>${esc(doc.title)}</strong>
      <span class="dim">${esc(LABELS[doc.category] || doc.category)}</span>
    </a>`).join("")}</div>`;
}

function renderDoc(doc) {
  const banner = `
    <header class="doc-banner">
      <div class="kicker">${esc(LABELS[doc.category] || doc.category)}</div>
      <h1>${esc(doc.title)}</h1>
    </header>`;
  const fields = doc.fields.length
    ? `<div class="fields">${doc.fields.map((field) => `
        <div class="field">
          <div class="k">${esc(field.label)}</div>
          <div>${renderInline(field.value, doc.id, true)}</div>
        </div>`).join("")}</div>`
    : "";
  const portrait = doc.image
    ? `<div class="portrait">${photoHtml(doc.image, doc.title)}</div>`
    : "";
  const quote = doc.quote ? `<blockquote class="quote">${esc(doc.quote)}</blockquote>` : "";
  const dump = looksLikeDump(doc.preamble.join(" ")) || doc.category === "relations" || doc.supplement;
  const preamble = dump ? "" : doc.preamble.map((paragraph) => `<p>${renderInline(paragraph, doc.id, false)}</p>`).join("");
  const sections = doc.sections.map((section) => renderSection(doc, section)).join("");
  const spheres = doc.category === "character" && !doc.sections.some((section) => norm(section.heading) === "esferas")
    ? `<section class="section"><h2>Esferas</h2>${renderRadar(sphereValues(doc))}</section>`
    : "";
  const stub = doc.supplement || (doc.category === "relations" && !doc.sections.length)
    ? `<div class="stub"><p>Este gráfico está guardado en Maguito Ascendido.vvd. El Markdown no trae los valores.</p></div>`
    : "";
  return `
    ${crumbs([["#/", SITE.name], ["#/archive", "TODAS LAS FICHAS"], ["", doc.title]])}
    ${banner}
    ${(doc.fields.length || doc.image) ? `<div class="record-top${doc.image ? "" : " solo"}">${fields || "<div></div>"}${portrait}</div>` : ""}
    ${quote}
    <div class="prose">${preamble}</div>
    ${stub}
    ${sections}
    ${spheres}`;
}

function renderSection(doc, section) {
  if (doc.category === "character" && norm(section.heading) === "esferas") {
    return `<section class="section"><h2>${esc(section.heading)}</h2>${renderRadar(sphereValues(doc))}</section>`;
  }
  return `
    <section class="section">
      <h2>${esc(section.heading)}</h2>
      <div class="prose">${section.paragraphs.map((paragraph) => `<p>${renderInline(paragraph, doc.id, false)}</p>`).join("")}</div>
    </section>`;
}

function sphereValues(doc) {
  const values = Object.fromEntries(SPHERES.map((name) => [norm(name), 0]));
  const section = doc.sections.find((item) => norm(item.heading) === "esferas");
  for (const paragraph of section?.paragraphs || []) {
    for (const line of paragraph.split("\n")) {
      const match = line.match(/^-\s*(.+?):\s*(-?\d+(?:[.,]\d+)?)\s*$/);
      if (!match) continue;
      const key = norm(match[1]);
      if (!(key in values)) continue;
      values[key] = Math.min(SPHERE_MAX, Math.max(SPHERE_MIN, Number(match[2].replace(",", "."))));
    }
  }
  return SPHERES.map((name) => ({ name, value: values[norm(name)] }));
}

function renderRadar(axes) {
  const cx = 180;
  const cy = 180;
  const radius = 108;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    const dist = ((value - SPHERE_MIN) / (SPHERE_MAX - SPHERE_MIN)) * radius;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist];
  };
  const rings = [0, 1, 2, 3, 4].map((step) => {
    const points = axes.map((_, index) => point(index, step).map((n) => n.toFixed(1)).join(",")).join(" ");
    return `<polygon class="ring" points="${points}" />`;
  }).join("");
  const spokes = axes.map((_, index) => {
    const [x, y] = point(index, SPHERE_MAX);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }).join("");
  const shape = axes.map((axis, index) => point(index, axis.value).map((n) => n.toFixed(1)).join(",")).join(" ");
  const labels = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    const x = cx + Math.cos(angle) * (radius + 28);
    const y = cy + Math.sin(angle) * (radius + 28);
    const anchor = x < cx - 12 ? "end" : x > cx + 12 ? "start" : "middle";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(axis.name)} ${axis.value}</text>`;
  }).join("");
  const dots = axes.map((axis, index) => {
    const [x, y] = point(index, axis.value);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" />`;
  }).join("");
  return `
    <svg class="radar" viewBox="-56 -28 472 416" role="img" aria-label="Esferas de ${SPHERE_MIN} a ${SPHERE_MAX}">
      ${rings}
      ${spokes}
      <polygon class="shape" points="${shape}" />
      ${dots}
      ${labels}
    </svg>`;
}

function renderSearch(query) {
  const found = searchDocs(query);
  const items = found.length
    ? `<div class="results">${found.map((hit) => `
        <a class="result" href="#/doc/${hit.doc.id}">
          <div class="kicker">${esc(LABELS[hit.doc.category] || hit.doc.category)}</div>
          <strong>${esc(hit.doc.title)}</strong>
          <p>${snippet(hit.doc, query)}</p>
        </a>`).join("")}</div>`
    : `<p class="empty">Sin coincidencias para “${esc(query)}”.</p>`;
  return `
    ${crumbs([["#/", SITE.name], ["", "SEARCH"]])}
    <h1 class="list-title"><span>Buscar</span><span class="dim">${found.length}</span></h1>
    ${items}`;
}

function renderMissing(id) {
  return `<p class="empty">No existe la ficha “${esc(id)}”.</p>`;
}

function crumbs(parts) {
  const html = parts.map(([href, label], index) => {
    const node = href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
    return index === 0 ? node : `<span aria-hidden="true">/</span>${node}`;
  }).join("");
  return `<nav class="crumbs" aria-label="Ruta">${html}</nav>`;
}

function renderInline(text, selfId, pill) {
  const re = /\[([^\]]+)\]\(([^)]+\.md)\)|\*\*([^*]+)\*\*/g;
  let html = "";
  let last = 0;
  for (const match of text.matchAll(re)) {
    html += linkifyPlain(text.slice(last, match.index), selfId, pill);
    if (match[1] != null) {
      const id = match[2].split("/").pop().replace(/\.md$/, "");
      const target = state.docs.find((doc) => doc.id === id);
      const className = pill ? ' class="pill"' : "";
      html += target
        ? `<a${className} href="#/doc/${target.id}">${esc(match[1])}</a>`
        : esc(match[1]);
    } else {
      html += `<strong>${esc(match[3])}</strong>`;
    }
    last = match.index + match[0].length;
  }
  html += linkifyPlain(text.slice(last), selfId, pill);
  return html.replace(/\n/g, "<br>");
}

function linkifyPlain(text, selfId, pill) {
  const names = [];
  for (const doc of state.docs) {
    if (doc.id === selfId || doc.supplement) continue;
    names.push([doc.title, doc.id]);
  }
  names.sort((a, b) => b[0].length - a[0].length);
  const chunks = [{ text }];
  for (const [name, id] of names) {
    if (name.length < 3) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeReg(name)}(?![\\p{L}\\p{N}_])`, "gu");
    const next = [];
    for (const chunk of chunks) {
      if (chunk.id) {
        next.push(chunk);
        continue;
      }
      let last = 0;
      for (const match of chunk.text.matchAll(re)) {
        if (match.index > last) next.push({ text: chunk.text.slice(last, match.index) });
        next.push({ id, label: match[0] });
        last = match.index + match[0].length;
      }
      if (last < chunk.text.length) next.push({ text: chunk.text.slice(last) });
    }
    chunks.length = 0;
    chunks.push(...next);
  }
  const className = pill ? ' class="pill"' : "";
  return chunks.map((chunk) => chunk.id
    ? `<a${className} href="#/doc/${chunk.id}">${esc(chunk.label)}</a>`
    : esc(chunk.text || "")).join("");
}

function looksLikeDump(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  const noisy = words.filter((word) => /^[0-9a-f-]{8,}$/i.test(word) || word.includes("|") || word.startsWith("tabler:")).length;
  return noisy > words.length * 0.25;
}

function searchDocs(query) {
  const needle = norm(query);
  if (!needle) return [];
  return visibleDocs()
    .map((doc) => ({ doc, score: scoreDoc(doc, needle) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, "es"));
}

function scoreDoc(doc, needle) {
  const title = norm(doc.title);
  if (title === needle) return 100;
  if (title.includes(needle)) return 70;
  const blob = norm(docBlob(doc));
  if (blob.includes(needle)) return 30;
  return 0;
}

function docBlob(doc) {
  return [
    doc.title,
    doc.quote,
    ...doc.fields.map((field) => `${field.label} ${field.value}`),
    ...doc.preamble,
    ...doc.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
  ].join("\n");
}

function snippet(doc, query) {
  const blob = docBlob(doc).replace(/\s+/g, " ");
  const index = blob.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return esc(blob.slice(0, 160));
  const start = Math.max(0, index - 40);
  const slice = blob.slice(start, index + query.length + 80);
  const local = index - start;
  return `${start ? "…" : ""}${esc(slice.slice(0, local))}<mark>${esc(slice.slice(local, local + query.length))}</mark>${esc(slice.slice(local + query.length))}…`;
}

function runCommand(line) {
  const [head, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ").trim();
  const command = norm(head);
  if (command === "help") {
    pushLog("help · ls · ls personajes · open naj · grep sabot · home · clear · back");
    return;
  }
  if (command === "clear") {
    state.log = [];
    paintLog();
    return;
  }
  if (command === "home" || command === "portal") {
    location.hash = "#/";
    return;
  }
  if (command === "back") {
    history.back();
    return;
  }
  if (command === "ls" || command === "dir") {
    listCommand(arg);
    return;
  }
  if (command === "cd") {
    changeDir(arg);
    return;
  }
  if (command === "open" || command === "cat") {
    openCommand(arg);
    return;
  }
  if (command === "grep" || command === "find" || command === "search") {
    grepCommand(arg);
    return;
  }
  pushLog(`No conozco “${esc(head)}”. Escribí help.`);
}

function listCommand(arg) {
  if (!arg) {
    const tally = counts();
    const order = ["character", "organization", "corporation", "government", "relations"];
    for (const key of order) {
      if (!tally.has(key)) continue;
      pushLog(`${(LABELS[key] || key).padEnd(14, " ")} ${String(tally.get(key)).padStart(2, "0")}`);
    }
    pushLog(`${String(visibleDocs().length).padStart(2, "0")} fichas. ls character para ver una categoría.`);
    return;
  }
  const category = resolveCat(arg);
  if (!category) {
    pushLog(`No hay categoría “${esc(arg)}”.`);
    return;
  }
  const docs = category === "all" ? sortDocs(state.docs) : sortDocs(state.docs.filter((doc) => doc.category === category));
  if (!docs.length) {
    pushLog("Vacío.");
    return;
  }
  for (const doc of docs) {
    pushLog(`<a href="#/doc/${doc.id}">${esc(doc.title)}</a>`);
  }
}

function changeDir(arg) {
  if (!arg || arg === "~" || arg === "/" || norm(arg) === "home") {
    location.hash = "#/";
    return;
  }
  const category = resolveCat(arg);
  if (!category) {
    pushLog(`No hay categoría “${esc(arg)}”.`);
    return;
  }
  location.hash = category === "all" ? "#/archive" : `#/archive/${category}`;
}

function openCommand(arg) {
  if (!arg) {
    pushLog("open necesita un nombre. Ejemplo: open naj");
    return;
  }
  const hits = findDocs(arg);
  if (hits.length === 1) {
    location.hash = `#/doc/${hits[0].id}`;
    return;
  }
  if (!hits.length) {
    pushLog(`Ninguna ficha coincide con “${esc(arg)}”.`);
    return;
  }
  pushLog("Hay varias. Elegí una:");
  for (const doc of hits.slice(0, 8)) pushLog(`<a href="#/doc/${doc.id}">${esc(doc.title)}</a>`);
}

function grepCommand(arg) {
  if (!arg) {
    pushLog("grep necesita un texto. Ejemplo: grep sabot");
    return;
  }
  const hits = searchDocs(arg).slice(0, 8);
  if (!hits.length) {
    pushLog(`Sin coincidencias para “${esc(arg)}”.`);
    return;
  }
  for (const hit of hits) {
    pushLog(`<a href="#/doc/${hit.doc.id}">${esc(hit.doc.title)}</a>`);
  }
  pushLog(`<a href="#/search?q=${encodeURIComponent(arg)}">Ver en el archivo</a>`);
}

function findDocs(query) {
  const needle = norm(query);
  const exact = state.docs.filter((doc) => norm(doc.title) === needle || norm(doc.id) === needle);
  if (exact.length === 1) return exact;
  const partial = state.docs.filter((doc) => norm(doc.title).includes(needle) || norm(doc.id).includes(needle));
  return partial;
}

function resolveCat(word) {
  const value = norm(word);
  for (const [category, aliases] of Object.entries(CAT_ALIASES)) {
    if (aliases.some((alias) => norm(alias) === value)) return category;
  }
  if (LABELS[value]) return value;
  return null;
}

function promptPath(route) {
  if (route.name === "doc") return `~/doc/${route.id}`;
  if (route.name === "archive") return route.category && route.category !== "all" ? `~/${route.category}` : "~/archive";
  if (route.name === "search") return "~/search";
  return "~";
}

function currentNav(route, doc) {
  if (route.name === "home") return "home";
  if (route.name === "doc") return doc?.category || "all";
  if (route.name === "archive") return !route.category || route.category === "all" ? "all" : route.category;
  return "all";
}

function pushLog(html) {
  state.log.push(html);
  state.log = state.log.slice(-40);
  paintLog();
}

function paintLog() {
  logEl.innerHTML = state.log.map((line) => `<div>${line}</div>`).join("");
  logEl.scrollTop = logEl.scrollHeight;
}

function photoHtml(src, label) {
  return `<span class="photo"><canvas data-src="${esc(src)}" role="img" aria-label="${esc(label)}"></canvas><button type="button" class="tint-toggle" aria-pressed="true" aria-label="Quitar el filtro verde">${tintIcon()}</button></span>`;
}

function tintIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>`;
}

function mountImages(root) {
  for (const canvas of root.querySelectorAll("canvas[data-src]")) {
    const image = new Image();
    image.onload = () => {
      canvas._source = image;
      dither(image, canvas, true);
    };
    image.onerror = () => noSignal(canvas);
    image.src = canvas.dataset.src;
  }
}

function dither(image, canvas, tinted = true) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  if (!tinted) return;
  const frame = ctx.getImageData(0, 0, width, height);
  const data = frame.data;
  const dark = [5, 16, 11];
  const light = [188, 255, 214];
  for (let index = 0; index < data.length; index += 4) {
    const lum = (data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114) / 255;
    data[index] = dark[0] + (light[0] - dark[0]) * lum;
    data[index + 1] = dark[1] + (light[1] - dark[1]) * lum;
    data[index + 2] = dark[2] + (light[2] - dark[2]) * lum;
  }
  ctx.putImageData(frame, 0, 0);
}

function noSignal(canvas) {
  const size = Number(canvas.dataset.size) || 160;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#04110c";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#7dcaa3";
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText("NO SIGNAL", 8, size / 2);
}

function svg(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function escapeReg(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
