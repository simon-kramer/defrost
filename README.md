# Defrost

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
