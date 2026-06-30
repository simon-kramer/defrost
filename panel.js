"use strict";
(() => {
  // node_modules/.pnpm/turbo-stream@2.4.1/node_modules/turbo-stream/dist/turbo-stream.mjs
  var HOLE = -1;
  var NAN = -2;
  var NEGATIVE_INFINITY = -3;
  var NEGATIVE_ZERO = -4;
  var NULL = -5;
  var POSITIVE_INFINITY = -6;
  var UNDEFINED = -7;
  var TYPE_BIGINT = "B";
  var TYPE_DATE = "D";
  var TYPE_ERROR = "E";
  var TYPE_MAP = "M";
  var TYPE_NULL_OBJECT = "N";
  var TYPE_PROMISE = "P";
  var TYPE_REGEXP = "R";
  var TYPE_SET = "S";
  var TYPE_SYMBOL = "Y";
  var TYPE_URL = "U";
  var TYPE_PREVIOUS_RESOLVED = "Z";
  var Deferred = class {
    promise;
    resolve;
    reject;
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  };
  function createLineSplittingTransform() {
    const decoder = new TextDecoder();
    let leftover = "";
    return new TransformStream({
      transform(chunk, controller) {
        const str = decoder.decode(chunk, { stream: true });
        const parts = (leftover + str).split("\n");
        leftover = parts.pop() || "";
        for (const part of parts) {
          controller.enqueue(part);
        }
      },
      flush(controller) {
        if (leftover) {
          controller.enqueue(leftover);
        }
      }
    });
  }
  var objectProtoNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
  var globalObj = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : void 0;
  function unflatten(parsed) {
    const { hydrated, values } = this;
    if (typeof parsed === "number")
      return hydrate.call(this, parsed);
    if (!Array.isArray(parsed) || !parsed.length)
      throw new SyntaxError();
    const startIndex = values.length;
    for (const value of parsed) {
      values.push(value);
    }
    hydrated.length = values.length;
    return hydrate.call(this, startIndex);
  }
  function hydrate(index) {
    const { hydrated, values, deferred, plugins } = this;
    let result;
    const stack = [
      [
        index,
        (v) => {
          result = v;
        }
      ]
    ];
    let postRun = [];
    while (stack.length > 0) {
      const [index2, set] = stack.pop();
      switch (index2) {
        case UNDEFINED:
          set(void 0);
          continue;
        case NULL:
          set(null);
          continue;
        case NAN:
          set(NaN);
          continue;
        case POSITIVE_INFINITY:
          set(Infinity);
          continue;
        case NEGATIVE_INFINITY:
          set(-Infinity);
          continue;
        case NEGATIVE_ZERO:
          set(-0);
          continue;
      }
      if (hydrated[index2]) {
        set(hydrated[index2]);
        continue;
      }
      const value = values[index2];
      if (!value || typeof value !== "object") {
        hydrated[index2] = value;
        set(value);
        continue;
      }
      if (Array.isArray(value)) {
        if (typeof value[0] === "string") {
          const [type, b, c] = value;
          switch (type) {
            case TYPE_DATE:
              set(hydrated[index2] = new Date(b));
              continue;
            case TYPE_URL:
              set(hydrated[index2] = new URL(b));
              continue;
            case TYPE_BIGINT:
              set(hydrated[index2] = BigInt(b));
              continue;
            case TYPE_REGEXP:
              set(hydrated[index2] = new RegExp(b, c));
              continue;
            case TYPE_SYMBOL:
              set(hydrated[index2] = Symbol.for(b));
              continue;
            case TYPE_SET:
              const newSet = /* @__PURE__ */ new Set();
              hydrated[index2] = newSet;
              for (let i = 1; i < value.length; i++)
                stack.push([
                  value[i],
                  (v) => {
                    newSet.add(v);
                  }
                ]);
              set(newSet);
              continue;
            case TYPE_MAP:
              const map = /* @__PURE__ */ new Map();
              hydrated[index2] = map;
              for (let i = 1; i < value.length; i += 2) {
                const r = [];
                stack.push([
                  value[i + 1],
                  (v) => {
                    r[1] = v;
                  }
                ]);
                stack.push([
                  value[i],
                  (k) => {
                    r[0] = k;
                  }
                ]);
                postRun.push(() => {
                  map.set(r[0], r[1]);
                });
              }
              set(map);
              continue;
            case TYPE_NULL_OBJECT:
              const obj = /* @__PURE__ */ Object.create(null);
              hydrated[index2] = obj;
              for (const key of Object.keys(b).reverse()) {
                const r = [];
                stack.push([
                  b[key],
                  (v) => {
                    r[1] = v;
                  }
                ]);
                stack.push([
                  Number(key.slice(1)),
                  (k) => {
                    r[0] = k;
                  }
                ]);
                postRun.push(() => {
                  obj[r[0]] = r[1];
                });
              }
              set(obj);
              continue;
            case TYPE_PROMISE:
              if (hydrated[b]) {
                set(hydrated[index2] = hydrated[b]);
              } else {
                const d = new Deferred();
                deferred[b] = d;
                set(hydrated[index2] = d.promise);
              }
              continue;
            case TYPE_ERROR:
              const [, message, errorType] = value;
              let error = errorType && globalObj && globalObj[errorType] ? new globalObj[errorType](message) : new Error(message);
              hydrated[index2] = error;
              set(error);
              continue;
            case TYPE_PREVIOUS_RESOLVED:
              set(hydrated[index2] = hydrated[b]);
              continue;
            default:
              if (Array.isArray(plugins)) {
                const r = [];
                const vals = value.slice(1);
                for (let i = 0; i < vals.length; i++) {
                  const v = vals[i];
                  stack.push([
                    v,
                    (v2) => {
                      r[i] = v2;
                    }
                  ]);
                }
                postRun.push(() => {
                  for (const plugin of plugins) {
                    const result2 = plugin(value[0], ...r);
                    if (result2) {
                      set(hydrated[index2] = result2.value);
                      return;
                    }
                  }
                  throw new SyntaxError();
                });
                continue;
              }
              throw new SyntaxError();
          }
        } else {
          const array = [];
          hydrated[index2] = array;
          for (let i = 0; i < value.length; i++) {
            const n = value[i];
            if (n !== HOLE) {
              stack.push([
                n,
                (v) => {
                  array[i] = v;
                }
              ]);
            }
          }
          set(array);
          continue;
        }
      } else {
        const object = {};
        hydrated[index2] = object;
        for (const key of Object.keys(value).reverse()) {
          const r = [];
          stack.push([
            value[key],
            (v) => {
              r[1] = v;
            }
          ]);
          stack.push([
            Number(key.slice(1)),
            (k) => {
              r[0] = k;
            }
          ]);
          postRun.push(() => {
            object[r[0]] = r[1];
          });
        }
        set(object);
        continue;
      }
    }
    while (postRun.length > 0) {
      postRun.pop()();
    }
    return result;
  }
  async function decode(readable, options) {
    const { plugins } = options ?? {};
    const done = new Deferred();
    const reader = readable.pipeThrough(createLineSplittingTransform()).getReader();
    const decoder = {
      values: [],
      hydrated: [],
      deferred: {},
      plugins
    };
    const decoded = await decodeInitial.call(decoder, reader);
    let donePromise = done.promise;
    if (decoded.done) {
      done.resolve();
    } else {
      donePromise = decodeDeferred.call(decoder, reader).then(done.resolve).catch((reason) => {
        for (const deferred of Object.values(decoder.deferred)) {
          deferred.reject(reason);
        }
        done.reject(reason);
      });
    }
    return {
      done: donePromise.then(() => reader.closed),
      value: decoded.value
    };
  }
  async function decodeInitial(reader) {
    const read = await reader.read();
    if (!read.value) {
      throw new SyntaxError();
    }
    let line;
    try {
      line = JSON.parse(read.value);
    } catch (reason) {
      throw new SyntaxError();
    }
    return {
      done: read.done,
      value: unflatten.call(this, line)
    };
  }
  async function decodeDeferred(reader) {
    let read = await reader.read();
    while (!read.done) {
      if (!read.value)
        continue;
      const line = read.value;
      switch (line[0]) {
        case TYPE_PROMISE: {
          const colonIndex = line.indexOf(":");
          const deferredId = Number(line.slice(1, colonIndex));
          const deferred = this.deferred[deferredId];
          if (!deferred) {
            throw new Error(`Deferred ID ${deferredId} not found in stream`);
          }
          const lineData = line.slice(colonIndex + 1);
          let jsonLine;
          try {
            jsonLine = JSON.parse(lineData);
          } catch (reason) {
            throw new SyntaxError();
          }
          const value = unflatten.call(this, jsonLine);
          deferred.resolve(value);
          break;
        }
        case TYPE_ERROR: {
          const colonIndex = line.indexOf(":");
          const deferredId = Number(line.slice(1, colonIndex));
          const deferred = this.deferred[deferredId];
          if (!deferred) {
            throw new Error(`Deferred ID ${deferredId} not found in stream`);
          }
          const lineData = line.slice(colonIndex + 1);
          let jsonLine;
          try {
            jsonLine = JSON.parse(lineData);
          } catch (reason) {
            throw new SyntaxError();
          }
          const value = unflatten.call(this, jsonLine);
          deferred.reject(value);
          break;
        }
        default:
          throw new SyntaxError();
      }
      read = await reader.read();
    }
  }

  // src/panel.ts
  var api = typeof browser !== "undefined" ? browser : chrome;
  function byId(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el;
  }
  var listEl = byId("list");
  var outputEl = byId("output");
  var emptyEl = byId("empty");
  var countEl = byId("count");
  var filterEl = byId("filter");
  var copyBtn = byId("copy");
  var clearBtn = byId("clear");
  var expandBtn = byId("expand");
  var collapseBtn = byId("collapse");
  var selectedLi = null;
  var lastRendered = "";
  var total = 0;
  var DEFAULT_OPEN_DEPTH = 3;
  function isDataRequest(req) {
    let url;
    try {
      url = new URL(req.request.url);
    } catch {
      return false;
    }
    if (url.pathname.endsWith(".data")) return true;
    const mime = req.response?.content?.mimeType ?? "";
    return mime.toLowerCase().includes("text/x-script");
  }
  function getContent(req) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ret = req.getContent((content, encoding) => {
        settled = true;
        resolve({ content, encoding: encoding || "" });
      });
      if (ret && typeof ret.then === "function") {
        ret.then((res) => {
          if (settled) return;
          if (Array.isArray(res)) resolve({ content: res[0], encoding: res[1] || "" });
          else resolve({ content: res, encoding: "" });
        }, reject);
      }
    });
  }
  function stringToStream(str) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(str));
        controller.close();
      }
    });
  }
  async function deepResolve(value) {
    let v = value;
    if (v && typeof v.then === "function") {
      v = await v;
    }
    if (v === null || typeof v !== "object") return v;
    if (v instanceof Date || v instanceof RegExp) return v;
    if (v instanceof Map) {
      const m = /* @__PURE__ */ new Map();
      for (const [k, val] of v) m.set(k, await deepResolve(val));
      return m;
    }
    if (v instanceof Set) {
      const s = /* @__PURE__ */ new Set();
      for (const val of v) s.add(await deepResolve(val));
      return s;
    }
    if (Array.isArray(v)) {
      const out2 = [];
      for (const item of v) out2.push(await deepResolve(item));
      return out2;
    }
    const record = v;
    const out = {};
    for (const k of Object.keys(record)) out[k] = await deepResolve(record[k]);
    return out;
  }
  function replacer(_key, val) {
    if (typeof val === "bigint") return `${val.toString()}n`;
    if (val instanceof Map) return { "@@Map": Object.fromEntries(val) };
    if (val instanceof Set) return { "@@Set": [...val] };
    if (val === void 0) return "@@undefined";
    return val;
  }
  function isContainer(v) {
    if (v === null || typeof v !== "object") return false;
    if (v instanceof Date || v instanceof RegExp) return false;
    return true;
  }
  function entriesOf(v) {
    if (Array.isArray(v)) return v.map((item, i) => [String(i), item]);
    if (v instanceof Map) return [...v.entries()].map(([k, val]) => [String(k), val]);
    if (v instanceof Set) return [...v].map((item, i) => [String(i), item]);
    return Object.entries(v);
  }
  function containerSize(v) {
    if (Array.isArray(v)) return v.length;
    if (v instanceof Map || v instanceof Set) return v.size;
    return Object.keys(v).length;
  }
  function containerLabel(v) {
    const n = containerSize(v);
    if (Array.isArray(v)) return `Array(${n})`;
    if (v instanceof Map) return `Map(${n})`;
    if (v instanceof Set) return `Set(${n})`;
    return n === 1 ? "{ 1 key }" : `{ ${n} keys }`;
  }
  function emptyLabel(v) {
    if (Array.isArray(v) || v instanceof Set) return "[]";
    if (v instanceof Map) return "Map(0)";
    return "{}";
  }
  function keySpan(key) {
    const k = document.createElement("span");
    k.className = "key";
    k.textContent = key;
    return k;
  }
  function valueSpan(value) {
    const span = document.createElement("span");
    if (value === null) {
      span.className = "v-null";
      span.textContent = "null";
    } else if (value === void 0) {
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
  function leafRow(key, value) {
    const row = document.createElement("div");
    row.className = "row";
    if (key !== null) row.appendChild(keySpan(key));
    row.appendChild(valueSpan(value));
    return row;
  }
  function buildNode(key, value, depth) {
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
  function renderTree(value) {
    outputEl.classList.remove("error");
    outputEl.replaceChildren(buildNode(null, value, 0));
  }
  function setAllDetails(open) {
    for (const d of outputEl.querySelectorAll("details")) d.open = open;
  }
  async function showRequest(req, li) {
    if (selectedLi) selectedLi.classList.remove("active");
    selectedLi = li;
    li.classList.add("active");
    emptyEl.style.display = "none";
    outputEl.classList.remove("error");
    outputEl.textContent = "Decoding\u2026";
    try {
      const { content, encoding } = await getContent(req);
      if (content == null) throw new Error("Kein Response-Body verf\xFCgbar");
      const text = encoding === "base64" ? atob(content) : content;
      const { value, done } = await decode(stringToStream(text));
      if (done && typeof done.then === "function") await done.catch(() => {
      });
      const resolved = await deepResolve(value);
      lastRendered = JSON.stringify(resolved, replacer, 2);
      renderTree(resolved);
    } catch (err) {
      outputEl.classList.add("error");
      outputEl.textContent = `\u26A0\uFE0F Decode fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
      lastRendered = "";
    }
  }
  function applyFilter() {
    const term = filterEl.value.trim().toLowerCase();
    for (const li of Array.from(listEl.children)) {
      const path = li.dataset.path ?? "";
      li.style.display = !term || path.toLowerCase().includes(term) ? "" : "none";
    }
  }
  function addRequest(req) {
    if (!isDataRequest(req)) return;
    emptyEl.style.display = "none";
    let pathname;
    let search;
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
    addRequest(req);
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
    void navigator.clipboard.writeText(lastRendered).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 1200);
    }).catch(() => {
    });
  });
  api.devtools.network.onNavigated?.addListener(() => {
    clearBtn.click();
  });
})();
