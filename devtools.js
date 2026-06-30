"use strict";
(() => {
  // src/devtools.ts
  var api = typeof browser !== "undefined" ? browser : chrome;
  api.devtools.panels.create("Defrost", "", "panel.html");
})();
