// Firefox exposes the WebExtension API as `browser`; Chrome exposes it as
// `chrome`. The DevTools surface we use is shared, so we type `browser` after
// the `chrome` namespace and fall back to it at runtime.
declare const browser: typeof chrome | undefined;

// A network request as delivered by `devtools.network.onRequestFinished`. We
// model only the fields we read; `getContent` is callback-style in Chrome and
// promise-style in Firefox, so its return type is intentionally `unknown`.
interface DevToolsRequest {
  request: { url: string; method?: string };
  response?: { status?: number; content?: { mimeType?: string } };
  getContent(callback: (content: string, encoding: string) => void): unknown;
}
