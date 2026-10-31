/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-f7a01684'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "447f83c2d10011d244ba27ece3ac959b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fab09d6668617e8e7c42ee9eda51038e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4ee3daf8965ec41ce703c9ea20271545"
  }, {
    "url": "index.html",
    "revision": "48652c97ba5b7db8ddf775a74f9c6926"
  }, {
    "url": "icon.svg",
    "revision": "100df9df6e92a1f08fc4230f10535c6c"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2e146b824f660de17866aff2614d8942"
  }, {
    "url": "assets/index-Dz25k2N3.js",
    "revision": null
  }, {
    "url": "assets/index-BAIZ3qRa.css",
    "revision": null
  }, {
    "url": "assets/aistudio/Naeem_s_Uni_Deadlines_d1f44a50.html",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2e146b824f660de17866aff2614d8942"
  }, {
    "url": "icon.svg",
    "revision": "100df9df6e92a1f08fc4230f10535c6c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4ee3daf8965ec41ce703c9ea20271545"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fab09d6668617e8e7c42ee9eda51038e"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "447f83c2d10011d244ba27ece3ac959b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "a693a616a4b765581cda11c73080947d"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(({
    request
  }) => request.destination === "document" || request.destination === "script" || request.destination === "style" || request.destination === "image", new workbox.StaleWhileRevalidate({
    "cacheName": "app-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
