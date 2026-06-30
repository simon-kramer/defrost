# Defrost

**English** · [Deutsch ↓](#defrost-deutsch)

A browser DevTools extension that thaws the "frozen" `.data` responses of
**React Router 7** (single-fetch, `turbo-stream` / `text/x-script`) right inside the
browser and shows them as a readable, collapsible JSON tree.

Runs as a **Manifest V3 extension in Chrome and Firefox** from a single codebase.

---

## Contents

- [The problem](#the-problem)
- [What the tool does](#what-the-tool-does)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Build](#build)
- [Install in Chrome](#install-in-chrome)
- [Install in Firefox](#install-in-firefox)
- [Usage](#usage)
- [Updating after changes](#updating-after-changes)
- [Keeping turbo-stream in sync](#keeping-turbo-stream-in-sync)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Script reference](#script-reference)
- [Troubleshooting](#troubleshooting)

---

## The problem

React Router 7 does not transmit loader/action data as plain JSON, but in the
`turbo-stream` format (content type `text/x-script`). In the browser's Network tab a
`.data` response therefore looks like a flat reference table:

```
[{"_1":2},"routes/_withNavbar+/customs-declarations+/shipments",{"_3":4},"data",
{"_5":6,"_7":8,...},"openShipments",[],"pagination",{"_9":10,...}]
```

The numbers (`_1`, `_3`, …) are pointers to other entries in the same table — the
format deduplicates values, supports streaming and richer types than JSON. But it is
not readable. **Defrost** decodes it back into the actual, nested object.

## What the tool does

- Adds a **"Defrost"** panel to the DevTools.
- Automatically lists every `.data` request on the current page (method, path, status).
- On clicking a request: shows the **decoded response as a JSON tree** (collapsible,
  type-colored).
- Resolves deferred promises; preserves `Date`, `Map`, `Set`, `BigInt`.
- **Copy JSON**, **Expand/Collapse all**, **Filter** by path, **Clear**.
- `turbo-stream` is bundled into the extension → no CDN, no CSP issues, works on
  production too (e.g. `shipping.formbench.com`).

---

## Requirements

- **Node.js** ≥ 20 (tested with 24)
- **pnpm** (via Corepack: `corepack enable`)
- **Chrome** (or Chromium/Edge/Brave) and/or **Firefox Developer Edition**
  (or Nightly/ESR) for permanently installing unsigned add-ons.

---

## Quick start

```sh
cd /Users/simon/Projekte/plugins/defrost
pnpm install
pnpm build       # produces panel.js + devtools.js
```

Then:

- **Chrome:** `chrome://extensions` → enable Developer mode → "Load unpacked" → select
  this folder.
- **Firefox:** `pnpm package` → install `defrost.xpi` via `about:addons`
  (see [Install in Firefox](#install-in-firefox)).

Open DevTools (F12) → **Defrost** tab → reload the page.

---

## Build

The tool is written in **TypeScript** and bundled with esbuild.

```sh
pnpm install        # once
pnpm build          # src/*.ts -> panel.js + devtools.js (turbo-stream bundled in)
pnpm watch          # rebuild on every change (during development)
pnpm typecheck      # tsc --noEmit (type check only, builds nothing)
pnpm package        # build + zip everything into defrost.xpi
```

`panel.js` and `devtools.js` in the root are **build artifacts**. After any change
under `src/` you must rebuild (`pnpm build`), otherwise the browser keeps running the
old version.

---

## Install in Chrome

Chrome loads unpacked extensions **permanently** — they survive restarts. Publishing
to the Web Store is not required for internal use.

1. Run `pnpm build` (produces `panel.js`/`devtools.js`).
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder.
5. The extension appears in the list and stays installed.
6. Open DevTools (F12 or `Cmd+Opt+I`) → **Defrost** tab.

### Permanent use in Chrome

- The extension survives browser restarts.
- Chrome occasionally shows a "Disable developer mode extensions" prompt on startup.
  You can dismiss it — the extension stays active. To avoid the prompt entirely the
  extension would have to be installed via the Web Store or an enterprise policy.
- **Updates:** after `pnpm build`, click the **reload icon** (↻) on the extension in
  `chrome://extensions`. Then close and reopen DevTools.

> Works identically in Edge (`edge://extensions`) and Brave (`brave://extensions`).

---

## Install in Firefox

Firefox normally does **not** install unsigned extensions permanently.
**Firefox Developer Edition**, **Nightly** and **ESR** allow it once signature
enforcement is disabled. This is the recommended path for internal use.

### Permanent (Developer Edition / Nightly / ESR)

1. **Disable signature enforcement** (once, **before** installing):
   - Type `about:config` in the address bar, accept the warning.
   - Search for `xpinstall.signatures.required`.
   - Set the value to **`false`** (double-click).
2. **Build the package:**
   ```sh
   pnpm package      # produces defrost.xpi
   ```
3. **Install:**
   - Open `about:addons`.
   - Click the **gear ⚙** (top right) → **Install Add-on From File…**.
   - Select `defrost.xpi` from the project folder.
   - Confirm with **Add**.
   - Alternatively: drag the `defrost.xpi` file onto the Firefox window.
4. Open DevTools (F12) → **Defrost** tab.

The extension now stays installed across restarts.

### Temporary (any Firefox, until restart)

Quick one-off look, no signature setting needed — disappears when Firefox quits:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` in the project folder.
4. Open DevTools (F12) → **Defrost** tab.

### Regular Firefox release (signed)

Regular Firefox release ignores `xpinstall.signatures.required` — there a
Mozilla-**signed** `.xpi` is mandatory. Use `web-ext sign` for that (AMO account + API
keys, "unlisted"/self-distribution). A `sign` script can be added on request.

### Permanent use in Firefox

- As long as `xpinstall.signatures.required = false` stays set, the file-installed
  `defrost.xpi` remains active permanently.
- **Updates:** build a new `defrost.xpi` with `pnpm package` and repeat the same
  "Install Add-on From File…" step — Firefox updates the add-on based on the same
  add-on ID (`defrost@plugins.local`).

---

## Usage

1. Open DevTools and switch to the **Defrost** tab.
2. **Important:** **reload or navigate the page while DevTools is open**. Only requests
   that happen while DevTools is open are captured.
3. The left list shows all `.data` requests with **method**, **path** and **status**.
4. Click an entry → the decoded JSON appears on the right as a tree.

| Control       | Function                                                          |
| ------------- | ----------------------------------------------------------------- |
| List (left)   | All `.data` requests on the current page.                         |
| Filter box    | Filters the list by substring in the path.                        |
| **Expand**    | Expands all nodes of the displayed tree.                          |
| **Collapse**  | Collapses all nodes.                                              |
| **Copy JSON** | Copies the decoded object as formatted JSON.                      |
| **Clear**     | Empties the list (also happens automatically on navigation).      |

In the tree, objects/arrays/`Map`/`Set` are collapsible (preview like `Array(3)`,
`{ 5 keys }`); by default the top levels are expanded down to the `data` fields. Values
are colored by type (string, number, boolean, `Date`, `null`).

---

## Updating after changes

1. Change a source under `src/`.
2. `pnpm build` (or keep `pnpm watch` running).
3. Reload the extension:
   - **Chrome:** `chrome://extensions` → ↻ on the extension.
   - **Firefox:** `pnpm package` and reinstall `defrost.xpi` via `about:addons`.
4. Close and reopen DevTools so the panel loads the new code.

---

## Keeping turbo-stream in sync

Decoding must match the `turbo-stream` version React Router uses. React Router 7.x uses
**turbo-stream v2**, so `package.json` pins `^2.4.0`. If the app ever moves to a new
major version, bump it here and rebuild.

---

## How it works

- `manifest.json` registers a panel via `chrome.devtools.panels.create` through
  `devtools_page` (→ `devtools.html` → `devtools.js`).
- The panel (`panel.html` + `panel.js`) listens to
  `chrome.devtools.network.onRequestFinished` and filters requests whose path ends in
  `.data` or whose MIME type is `text/x-script`.
- The response body is fetched with `request.getContent()` (callback style in Chrome,
  promise style in Firefox — both are handled).
- The body is fed through `decode()` from the bundled `turbo-stream`. Deferred promises
  are resolved, special types (`Date`, `Map`, `Set`, `BigInt`) are preserved.
- The result is rendered as a DOM tree using native `<details>` elements.

A single MV3 manifest works in Chrome and Firefox; the only browser-specific parts are
`browser_specific_settings.gecko` (ignored by Chrome) and the runtime fallback
`browser` → `chrome`.

---

## Project structure

```
defrost/
├─ manifest.json        MV3 manifest (Chrome + Firefox)
├─ devtools.html        loads the built devtools.js
├─ panel.html           panel UI (markup + styles)
├─ tsconfig.json        TypeScript config (type check only)
├─ package.json         scripts + dependencies (pnpm)
├─ src/
│  ├─ devtools.ts       registers the DevTools panel
│  ├─ panel.ts          request list, decode, tree view
│  └─ globals.d.ts      ambient types: browser global + DevToolsRequest
├─ panel.js             build artifact (from src/panel.ts)
├─ devtools.js          build artifact (from src/devtools.ts)
└─ defrost.xpi          Firefox package (from pnpm package)
```

---

## Script reference

| Script           | Effect                                                          |
| ---------------- | --------------------------------------------------------------- |
| `pnpm build`     | Bundles `src/panel.ts` and `src/devtools.ts` into `*.js`.       |
| `pnpm watch`     | Like `build`, rebuilds on every file change.                    |
| `pnpm typecheck` | `tsc --noEmit` — checks types without building.                 |
| `pnpm package`   | `build` + zips the add-on into `defrost.xpi`.                   |

---

## Troubleshooting

**The panel stays empty / no requests.**
DevTools must be open *before* loading/navigating. Open DevTools, select the
**Defrost** tab, then reload the page with F5.

**"This add-on could not be verified" / add-on gets disabled in Firefox.**
`xpinstall.signatures.required` was not `false` at install time. Set the pref, restart
Firefox, reinstall `defrost.xpi`. Only works in Developer Edition/Nightly/ESR — regular
release requires a signed `.xpi`.

**The panel shows "Decode failed".**
Usually a `turbo-stream` version mismatch with the app. See
[Keeping turbo-stream in sync](#keeping-turbo-stream-in-sync).

**Code changes have no effect.**
Forgot `pnpm build`, or didn't reload the extension. Build, reload the extension
(Chrome: ↻; Firefox: reinstall `defrost.xpi`), close and reopen DevTools.

**The build complains about esbuild / a missing binary.**
pnpm blocks build scripts by default. Run `pnpm approve-builds` once and allow esbuild,
then redo `pnpm install`.

**`__manifest` requests are missing.**
Intentional — Defrost only shows `.data` responses (the actual loader/action data). The
route manifest is just routing metadata.

<br>

---

<br>

# Defrost (Deutsch)

[English ↑](#defrost) · **Deutsch**

Eine Browser-DevTools-Erweiterung, die die „eingefrorenen" `.data`-Antworten von
**React Router 7** (Single-Fetch, `turbo-stream` / `text/x-script`) im laufenden
Browser wieder auftaut und als lesbaren, aufklappbaren JSON-Baum anzeigt.

Läuft als **Manifest-V3-Extension in Chrome und Firefox** aus derselben Codebasis.

---

## Inhalt

- [Das Problem](#das-problem)
- [Was das Tool macht](#was-das-tool-macht)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
- [Bauen](#bauen)
- [Installation in Chrome](#installation-in-chrome)
- [Installation in Firefox](#installation-in-firefox)
- [Bedienung](#bedienung)
- [Nach Änderungen aktualisieren](#nach-änderungen-aktualisieren)
- [turbo-stream-Version synchron halten](#turbo-stream-version-synchron-halten)
- [Funktionsweise](#funktionsweise)
- [Projektstruktur](#projektstruktur)
- [Script-Referenz](#script-referenz)
- [Fehlerbehebung](#fehlerbehebung)

---

## Das Problem

React Router 7 überträgt Loader-/Action-Daten nicht als normales JSON, sondern im
`turbo-stream`-Format (Content-Type `text/x-script`). Im Netzwerk-Tab des Browsers
sieht eine `.data`-Antwort darum aus wie eine flache Referenz-Tabelle:

```
[{"_1":2},"routes/_withNavbar+/customs-declarations+/shipments",{"_3":4},"data",
{"_5":6,"_7":8,...},"openShipments",[],"pagination",{"_9":10,...}]
```

Die Zahlen (`_1`, `_3`, …) sind Zeiger auf andere Einträge derselben Tabelle — das
Format dedupliziert Werte, unterstützt Streaming und reichere Typen als JSON. Lesbar
ist das aber nicht. **Defrost** dekodiert es zurück in das eigentliche, verschachtelte
Objekt.

## Was das Tool macht

- Fügt den DevTools ein Panel **„Defrost"** hinzu.
- Listet automatisch alle `.data`-Requests der aktuellen Seite (Methode, Pfad, Status).
- Beim Klick auf einen Request: zeigt die **dekodierte Antwort als JSON-Baum**
  (aufklappbar, typgefärbt).
- Auflösung von Deferred-Promises; Erhalt von `Date`, `Map`, `Set`, `BigInt`.
- **Copy JSON**, **Expand/Collapse alle**, **Filter** nach Pfad, **Clear**.
- `turbo-stream` ist in die Extension gebündelt → kein CDN, keine CSP-Probleme,
  funktioniert auch auf Produktion (z. B. `shipping.formbench.com`).

---

## Voraussetzungen

- **Node.js** ≥ 20 (getestet mit 24)
- **pnpm** (über Corepack: `corepack enable`)
- **Chrome** (oder Chromium/Edge/Brave) und/oder **Firefox Developer Edition**
  (bzw. Nightly/ESR) für die dauerhafte Installation unsignierter Add-ons.

---

## Schnellstart

```sh
cd /Users/simon/Projekte/plugins/defrost
pnpm install
pnpm build       # erzeugt panel.js + devtools.js
```

Danach:

- **Chrome:** `chrome://extensions` → Entwicklermodus an → „Entpackte Erweiterung
  laden" → diesen Ordner wählen.
- **Firefox:** `pnpm package` → `defrost.xpi` über `about:addons` installieren
  (siehe [Installation in Firefox](#installation-in-firefox)).

DevTools (F12) öffnen → Tab **Defrost** → Seite neu laden.

---

## Bauen

Das Tool ist in **TypeScript** geschrieben und wird mit esbuild gebündelt.

```sh
pnpm install        # einmalig
pnpm build          # src/*.ts -> panel.js + devtools.js (turbo-stream eingebündelt)
pnpm watch          # baut bei jeder Änderung neu (während der Entwicklung)
pnpm typecheck      # tsc --noEmit (reiner Typecheck, baut nichts)
pnpm package        # build + zippt alles zu defrost.xpi
```

`panel.js` und `devtools.js` im Wurzelverzeichnis sind **Build-Artefakte**. Nach jeder
Änderung unter `src/` muss neu gebaut werden (`pnpm build`), sonst läuft im Browser
weiter der alte Stand.

---

## Installation in Chrome

Chrome lädt entpackte Erweiterungen **dauerhaft** — sie bleiben über Neustarts
erhalten. Eine Veröffentlichung im Web Store ist für den internen Gebrauch nicht nötig.

1. `pnpm build` ausführen (erzeugt `panel.js`/`devtools.js`).
2. `chrome://extensions` öffnen.
3. Oben rechts **Entwicklermodus** aktivieren.
4. **Entpackte Erweiterung laden** klicken und diesen Projektordner auswählen.
5. Die Extension erscheint in der Liste und bleibt installiert.
6. DevTools öffnen (F12 oder `Cmd+Opt+I`) → Tab **Defrost**.

### Dauerhafte Nutzung in Chrome

- Die Extension überlebt Browser-Neustarts.
- Chrome zeigt beim Start gelegentlich den Hinweis „Entwicklermodus-Erweiterungen
  deaktivieren". Den kannst du wegklicken — die Extension bleibt aktiv. Um den Hinweis
  ganz zu vermeiden, müsste die Extension über den Web Store oder eine
  Unternehmensrichtlinie installiert werden.
- **Updates:** Nach `pnpm build` auf `chrome://extensions` bei der Extension auf das
  **Neu-laden-Symbol** (↻) klicken. Danach DevTools schließen und neu öffnen.

> Funktioniert identisch in Edge (`edge://extensions`) und Brave (`brave://extensions`).

---

## Installation in Firefox

Firefox installiert unsignierte Erweiterungen normalerweise **nicht** dauerhaft.
**Firefox Developer Edition**, **Nightly** und **ESR** erlauben es aber, wenn die
Signaturprüfung deaktiviert wird. Das ist der empfohlene Weg für den internen Gebrauch.

### Dauerhaft (Developer Edition / Nightly / ESR)

1. **Signaturprüfung abschalten** (einmalig, **vor** der Installation):
   - In die Adressleiste `about:config` eingeben, Warnung bestätigen.
   - Nach `xpinstall.signatures.required` suchen.
   - Wert auf **`false`** setzen (Doppelklick).
2. **Paket bauen:**
   ```sh
   pnpm package      # erzeugt defrost.xpi
   ```
3. **Installieren:**
   - `about:addons` öffnen.
   - Oben rechts auf das **Zahnrad ⚙** → **Add-on aus Datei installieren…**.
   - `defrost.xpi` aus dem Projektordner auswählen.
   - Mit **Hinzufügen** bestätigen.
   - Alternativ: die `defrost.xpi`-Datei einfach ins Firefox-Fenster ziehen.
4. DevTools öffnen (F12) → Tab **Defrost**.

Die Erweiterung bleibt jetzt über Neustarts hinweg installiert.

### Temporär (jeder Firefox, nur bis zum Neustart)

Schnell für einen einmaligen Blick, ohne Signatur-Einstellung — verschwindet beim
Beenden von Firefox:

1. `about:debugging#/runtime/this-firefox` öffnen.
2. **Temporäres Add-on laden…** klicken.
3. Die `manifest.json` im Projektordner auswählen.
4. DevTools öffnen (F12) → Tab **Defrost**.

### Normales Firefox-Release (signiert)

Im regulären Firefox-Release wird `xpinstall.signatures.required` ignoriert — dort ist
zwingend eine von Mozilla **signierte** `.xpi` nötig. Dafür gibt es `web-ext sign`
(AMO-Konto + API-Keys, „unlisted"/Self-Distribution). Bei Bedarf kann ein
`sign`-Script ergänzt werden.

### Dauerhafte Nutzung in Firefox

- Solange `xpinstall.signatures.required = false` gesetzt bleibt, bleibt die per Datei
  installierte `defrost.xpi` dauerhaft aktiv.
- **Updates:** Neue `defrost.xpi` mit `pnpm package` bauen und denselben
  „Add-on aus Datei installieren…"-Schritt erneut ausführen — Firefox aktualisiert das
  Add-on anhand der gleichen Add-on-ID (`defrost@plugins.local`).

---

## Bedienung

1. DevTools öffnen und in den Tab **Defrost** wechseln.
2. **Wichtig:** Die Seite **neu laden oder navigieren, während die DevTools offen
   sind**. Es werden nur Requests erfasst, die bei geöffneten DevTools passieren.
3. Links erscheinen alle `.data`-Requests mit **Methode**, **Pfad** und **Status**.
4. Auf einen Eintrag klicken → rechts erscheint das dekodierte JSON als Baum.

| Bedienelement   | Funktion                                                          |
| --------------- | ----------------------------------------------------------------- |
| Liste links     | Alle `.data`-Requests der aktuellen Seite.                        |
| Filterfeld      | Filtert die Liste nach Teilstring im Pfad.                        |
| **Expand**      | Klappt alle Knoten des angezeigten Baums auf.                     |
| **Collapse**    | Klappt alle Knoten zu.                                            |
| **Copy JSON**   | Kopiert das dekodierte Objekt als formatiertes JSON.              |
| **Clear**       | Leert die Liste (geschieht auch automatisch bei Seitenwechsel).   |

Im Baum sind Objekte/Arrays/`Map`/`Set` aufklappbar (Vorschau wie `Array(3)`,
`{ 5 keys }`); standardmäßig sind die obersten Ebenen bis zu den `data`-Feldern
geöffnet. Werte sind nach Typ eingefärbt (String, Number, Boolean, `Date`, `null`).

---

## Nach Änderungen aktualisieren

1. Quelle unter `src/` ändern.
2. `pnpm build` (oder dauerhaft `pnpm watch` laufen lassen).
3. Extension neu laden:
   - **Chrome:** `chrome://extensions` → ↻ bei der Extension.
   - **Firefox:** `pnpm package` und `defrost.xpi` erneut über `about:addons` installieren.
4. DevTools schließen und neu öffnen, damit das Panel den neuen Code lädt.

---

## turbo-stream-Version synchron halten

Das Dekodieren muss zur `turbo-stream`-Version passen, die React Router verwendet.
React Router 7.x nutzt **turbo-stream v2**. In `package.json` ist daher `^2.4.0`
gepinnt. Steigt die App irgendwann auf eine neue Hauptversion um, hier nachziehen und
neu bauen.

---

## Funktionsweise

- `manifest.json` registriert über `devtools_page` (→ `devtools.html` → `devtools.js`)
  ein Panel via `chrome.devtools.panels.create`.
- Das Panel (`panel.html` + `panel.js`) lauscht auf
  `chrome.devtools.network.onRequestFinished` und filtert Requests, deren Pfad auf
  `.data` endet oder deren MIME-Typ `text/x-script` ist.
- Der Response-Body wird mit `request.getContent()` geholt (Callback-Stil in Chrome,
  Promise-Stil in Firefox — beides wird abgedeckt).
- Der Body geht durch `decode()` aus dem gebündelten `turbo-stream`. Deferred-Promises
  werden aufgelöst, Spezialtypen (`Date`, `Map`, `Set`, `BigInt`) bleiben erhalten.
- Das Ergebnis wird als DOM-Baum mit nativen `<details>`-Elementen gerendert.

Eine einzige MV3-Manifestdatei funktioniert in Chrome und Firefox; der einzige
browserspezifische Teil ist `browser_specific_settings.gecko` (von Chrome ignoriert)
und der Laufzeit-Fallback `browser` → `chrome`.

---

## Projektstruktur

```
defrost/
├─ manifest.json        MV3-Manifest (Chrome + Firefox)
├─ devtools.html        lädt das gebaute devtools.js
├─ panel.html           Panel-UI (Markup + Styles)
├─ tsconfig.json        TypeScript-Konfiguration (nur Typecheck)
├─ package.json         Scripts + Dependencies (pnpm)
├─ src/
│  ├─ devtools.ts       registriert das DevTools-Panel
│  ├─ panel.ts          Request-Liste, Decode, Baum-Ansicht
│  └─ globals.d.ts      ambiente Typen: browser-Global + DevToolsRequest
├─ panel.js             Build-Artefakt (aus src/panel.ts)
├─ devtools.js          Build-Artefakt (aus src/devtools.ts)
└─ defrost.xpi          Firefox-Paket (aus pnpm package)
```

---

## Script-Referenz

| Script           | Wirkung                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm build`     | Bündelt `src/panel.ts` und `src/devtools.ts` nach `*.js`.        |
| `pnpm watch`     | Wie `build`, baut bei jeder Dateiänderung neu.                   |
| `pnpm typecheck` | `tsc --noEmit` — prüft Typen, ohne zu bauen.                     |
| `pnpm package`   | `build` + zippt das Add-on zu `defrost.xpi`.                     |

---

## Fehlerbehebung

**Das Panel bleibt leer / keine Requests.**
DevTools müssen *vor* dem Laden/Navigieren offen sein. DevTools öffnen, Tab
**Defrost** wählen, dann die Seite mit F5 neu laden.

**„This add-on could not be verified" / Add-on wird in Firefox deaktiviert.**
`xpinstall.signatures.required` war beim Installieren nicht auf `false`. Pref setzen,
Firefox neu starten, `defrost.xpi` erneut installieren. Greift nur in Developer
Edition/Nightly/ESR — im normalen Release ist eine signierte `.xpi` Pflicht.

**Im Panel steht „Decode fehlgeschlagen".**
Meist eine `turbo-stream`-Versionsabweichung zur App. Siehe
[turbo-stream-Version synchron halten](#turbo-stream-version-synchron-halten).

**Änderungen am Code wirken nicht.**
`pnpm build` vergessen, oder Extension nicht neu geladen. Bauen, Extension neu laden
(Chrome: ↻; Firefox: `defrost.xpi` neu installieren), DevTools schließen und neu öffnen.

**Der Build meckert über esbuild / fehlendes Binary.**
pnpm blockiert per Default Build-Scripts. Einmal `pnpm approve-builds` ausführen und
esbuild erlauben, dann `pnpm install` wiederholen.

**`__manifest`-Requests fehlen.**
Beabsichtigt — Defrost zeigt nur `.data`-Antworten (die eigentlichen Loader-/Action-
Daten). Das Route-Manifest ist nur Routing-Metainformation.
