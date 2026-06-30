import { decode } from "turbo-stream";

const api: typeof chrome = typeof browser !== "undefined" ? browser : chrome;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

const listEl = byId("list");
const outputEl = byId("output");
const emptyEl = byId("empty");
const countEl = byId("count");
const filterEl = byId<HTMLInputElement>("filter");
const copyBtn = byId<HTMLButtonElement>("copy");
const clearBtn = byId<HTMLButtonElement>("clear");
const expandBtn = byId<HTMLButtonElement>("expand");
const collapseBtn = byId<HTMLButtonElement>("collapse");

let selectedLi: HTMLElement | null = null;
let lastRendered = "";
let total = 0;

// Levels expanded by default: root -> route id -> wrapper -> data fields.
const DEFAULT_OPEN_DEPTH = 3;

// React Router single-fetch data requests end in `.data`; the response is
// turbo-stream encoded and served as `text/x-script`.
function isDataRequest(req: DevToolsRequest): boolean {
  let url: URL;
  try {
    url = new URL(req.request.url);
  } catch {
    return false;
  }
  if (url.pathname.endsWith(".data")) return true;
  const mime = req.response?.content?.mimeType ?? "";
  return mime.toLowerCase().includes("text/x-script");
}

// getContent is callback-style in Chrome and promise-style in Firefox.
function getContent(req: DevToolsRequest): Promise<{ content: string; encoding: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ret: unknown = req.getContent((content, encoding) => {
      settled = true;
      resolve({ content, encoding: encoding || "" });
    });
    if (ret && typeof (ret as PromiseLike<unknown>).then === "function") {
      (ret as PromiseLike<unknown>).then((res) => {
        if (settled) return;
        if (Array.isArray(res)) resolve({ content: res[0], encoding: res[1] || "" });
        else resolve({ content: res as string, encoding: "" });
      }, reject);
    }
  });
}

function stringToStream(str: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(str));
      controller.close();
    },
  });
}

// turbo-stream may hand back Promises for deferred loader data. The whole body
// arrives in one chunk here, so those are already settled — just await them and
// preserve the special types JSON.stringify would otherwise drop.
async function deepResolve(value: unknown): Promise<unknown> {
  let v = value;
  if (v && typeof (v as PromiseLike<unknown>).then === "function") {
    v = await (v as PromiseLike<unknown>);
  }
  if (v === null || typeof v !== "object") return v;
  if (v instanceof Date || v instanceof RegExp) return v;
  if (v instanceof Map) {
    const m = new Map<unknown, unknown>();
    for (const [k, val] of v) m.set(k, await deepResolve(val));
    return m;
  }
  if (v instanceof Set) {
    const s = new Set<unknown>();
    for (const val of v) s.add(await deepResolve(val));
    return s;
  }
  if (Array.isArray(v)) {
    const out: unknown[] = [];
    for (const item of v) out.push(await deepResolve(item));
    return out;
  }
  const record = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(record)) out[k] = await deepResolve(record[k]);
  return out;
}

function replacer(_key: string, val: unknown): unknown {
  if (typeof val === "bigint") return `${val.toString()}n`;
  if (val instanceof Map) return { "@@Map": Object.fromEntries(val) };
  if (val instanceof Set) return { "@@Set": [...val] };
  if (val === undefined) return "@@undefined";
  return val;
}

// ---- tree rendering -------------------------------------------------------

type Container = unknown[] | Record<string, unknown> | Map<unknown, unknown> | Set<unknown>;

function isContainer(v: unknown): v is Container {
  if (v === null || typeof v !== "object") return false;
  if (v instanceof Date || v instanceof RegExp) return false;
  return true; // plain object, array, Map, Set
}

function entriesOf(v: Container): Array<[string, unknown]> {
  if (Array.isArray(v)) return v.map((item, i) => [String(i), item]);
  if (v instanceof Map) return [...v.entries()].map(([k, val]) => [String(k), val]);
  if (v instanceof Set) return [...v].map((item, i) => [String(i), item]);
  return Object.entries(v);
}

function containerSize(v: Container): number {
  if (Array.isArray(v)) return v.length;
  if (v instanceof Map || v instanceof Set) return v.size;
  return Object.keys(v).length;
}

function containerLabel(v: Container): string {
  const n = containerSize(v);
  if (Array.isArray(v)) return `Array(${n})`;
  if (v instanceof Map) return `Map(${n})`;
  if (v instanceof Set) return `Set(${n})`;
  return n === 1 ? "{ 1 key }" : `{ ${n} keys }`;
}

function emptyLabel(v: Container): string {
  if (Array.isArray(v) || v instanceof Set) return "[]";
  if (v instanceof Map) return "Map(0)";
  return "{}";
}

function keySpan(key: string): HTMLSpanElement {
  const k = document.createElement("span");
  k.className = "key";
  k.textContent = key;
  return k;
}

function valueSpan(value: unknown): HTMLSpanElement {
  const span = document.createElement("span");
  if (value === null) {
    span.className = "v-null";
    span.textContent = "null";
  } else if (value === undefined) {
    span.className = "v-undefined";
    span.textContent = "undefined";
  } else if (value instanceof Date) {
    span.className = "v-date";
    span.textContent = `Date ${value.toISOString()}`;
  } else if (value instanceof RegExp) {
    span.className = "v-string";
    span.textContent = String(value);
  } else {
    switch (typeof value) {
      case "string":
        span.className = "v-string";
        span.textContent = JSON.stringify(value);
        break;
      case "number":
        span.className = "v-number";
        span.textContent = String(value);
        break;
      case "boolean":
        span.className = "v-boolean";
        span.textContent = String(value);
        break;
      case "bigint":
        span.className = "v-number";
        span.textContent = `${value}n`;
        break;
      default:
        span.textContent = String(value);
    }
  }
  return span;
}

function leafRow(key: string | null, value: unknown): HTMLElement {
  const row = document.createElement("div");
  row.className = "row";
  if (key !== null) row.appendChild(keySpan(key));
  row.appendChild(valueSpan(value));
  return row;
}

function buildNode(key: string | null, value: unknown, depth: number): HTMLElement {
  if (!isContainer(value)) return leafRow(key, value);

  if (containerSize(value) === 0) {
    const row = document.createElement("div");
    row.className = "row";
    if (key !== null) row.appendChild(keySpan(key));
    const empty = document.createElement("span");
    empty.className = "preview";
    empty.textContent = emptyLabel(value);
    row.appendChild(empty);
    return row;
  }

  const details = document.createElement("details");
  details.open = depth < DEFAULT_OPEN_DEPTH;

  const summary = document.createElement("summary");
  if (key !== null) summary.appendChild(keySpan(key));
  const preview = document.createElement("span");
  preview.className = "preview";
  preview.textContent = containerLabel(value);
  summary.appendChild(preview);
  details.appendChild(summary);

  const children = document.createElement("div");
  children.className = "children";
  for (const [ck, cv] of entriesOf(value)) {
    children.appendChild(buildNode(ck, cv, depth + 1));
  }
  details.appendChild(children);
  return details;
}

function renderTree(value: unknown): void {
  outputEl.classList.remove("error");
  outputEl.replaceChildren(buildNode(null, value, 0));
}

function setAllDetails(open: boolean): void {
  for (const d of outputEl.querySelectorAll("details")) d.open = open;
}

// ---- request handling -----------------------------------------------------

async function showRequest(req: DevToolsRequest, li: HTMLElement): Promise<void> {
  if (selectedLi) selectedLi.classList.remove("active");
  selectedLi = li;
  li.classList.add("active");
  emptyEl.style.display = "none";
  outputEl.classList.remove("error");
  outputEl.textContent = "Decoding…";
  try {
    const { content, encoding } = await getContent(req);
    if (content == null) throw new Error("Kein Response-Body verfügbar");
    const text = encoding === "base64" ? atob(content) : content;
    const { value, done } = await decode(stringToStream(text));
    if (done && typeof done.then === "function") await done.catch(() => {});
    const resolved = await deepResolve(value);
    lastRendered = JSON.stringify(resolved, replacer, 2);
    renderTree(resolved);
  } catch (err) {
    outputEl.classList.add("error");
    outputEl.textContent = `⚠️ Decode fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
    lastRendered = "";
  }
}

function applyFilter(): void {
  const term = filterEl.value.trim().toLowerCase();
  for (const li of Array.from(listEl.children) as HTMLElement[]) {
    const path = li.dataset.path ?? "";
    li.style.display = !term || path.toLowerCase().includes(term) ? "" : "none";
  }
}

function addRequest(req: DevToolsRequest): void {
  if (!isDataRequest(req)) return;
  emptyEl.style.display = "none";

  let pathname: string;
  let search: string;
  try {
    const url = new URL(req.request.url);
    pathname = url.pathname;
    search = url.search;
  } catch {
    pathname = req.request.url;
    search = "";
  }
  const fullPath = `${pathname}${search}`;
  const method = req.request.method || "GET";
  const status = req.response?.status ?? "";

  const li = document.createElement("li");
  li.dataset.path = fullPath;

  const m = document.createElement("span");
  m.className = "method";
  m.textContent = method;

  const p = document.createElement("span");
  p.className = "path";
  p.textContent = fullPath;
  p.title = fullPath;

  const b = document.createElement("span");
  b.className = "badge";
  b.textContent = status ? String(status) : "";

  li.append(m, p, b);
  li.addEventListener("click", () => {
    void showRequest(req, li);
  });
  listEl.appendChild(li);

  total += 1;
  countEl.textContent = String(total);
  applyFilter();
}

api.devtools.network.onRequestFinished.addListener((req) => {
  addRequest(req as unknown as DevToolsRequest);
});

filterEl.addEventListener("input", applyFilter);
expandBtn.addEventListener("click", () => setAllDetails(true));
collapseBtn.addEventListener("click", () => setAllDetails(false));

clearBtn.addEventListener("click", () => {
  listEl.innerHTML = "";
  outputEl.replaceChildren();
  outputEl.classList.remove("error");
  lastRendered = "";
  selectedLi = null;
  total = 0;
  countEl.textContent = "0";
  emptyEl.style.display = "";
});

copyBtn.addEventListener("click", () => {
  if (!lastRendered) return;
  void navigator.clipboard
    .writeText(lastRendered)
    .then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 1200);
    })
    .catch(() => {
      /* clipboard may be unavailable in some panel contexts */
    });
});

// Clear the list on full page navigations so it tracks the current page.
api.devtools.network.onNavigated?.addListener(() => {
  clearBtn.click();
});
