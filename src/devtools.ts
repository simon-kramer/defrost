// Registers the panel in the browser DevTools.
// Works in Chrome (chrome.*) and Firefox (browser.* aliased to chrome.*).
const api: typeof chrome = typeof browser !== "undefined" ? browser : chrome;

api.devtools.panels.create("Defrost", "", "panel.html");

export {};
