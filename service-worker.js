// Wrong-note-app service worker: caches all app assets so the app works fully
// offline after the first successful load (install once while online).
const CACHE_NAME = "wrong-note-cache-v2";

const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/db.js",
  "js/image.js",
  "js/charts.js",
  "js/typeAnalysis.js",
  "js/app.js",
  "data/mathTypes.js",
  "data/typeCrossRef.js",
  "data/ssenProblems.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js",
];

const FIGURE_ASSETS = [
  "data/figures/0018.png",
  "data/figures/0020.png",
  "data/figures/0025.png",
  "data/figures/0036.png",
  "data/figures/0037.png",
  "data/figures/0038.png",
  "data/figures/0039.png",
  "data/figures/0062.png",
  "data/figures/0063.png",
  "data/figures/0066.png",
  "data/figures/0070.png",
  "data/figures/0071.png",
  "data/figures/0075.png",
  "data/figures/0079.png",
  "data/figures/0080.png",
  "data/figures/0082.png",
  "data/figures/0083.png",
  "data/figures/0084.png",
  "data/figures/0126.png",
  "data/figures/0128.png",
  "data/figures/0139.png",
  "data/figures/0140.png",
  "data/figures/0141.png",
  "data/figures/0142.png",
  "data/figures/0152.png",
  "data/figures/0172.png",
  "data/figures/0173.png",
  "data/figures/0174.png",
  "data/figures/0178.png",
  "data/figures/0190.png",
  "data/figures/0195.png",
  "data/figures/0196.png",
  "data/figures/0208.png",
  "data/figures/0210.png",
  "data/figures/0211.png",
  "data/figures/0214.png",
  "data/figures/0217.png",
  "data/figures/0259.png",
  "data/figures/0265.png",
  "data/figures/0278.png",
  "data/figures/0284.png",
  "data/figures/0293.png",
  "data/figures/0328.png",
  "data/figures/0340.png",
  "data/figures/0343.png",
  "data/figures/0345.png",
  "data/figures/0346.png",
  "data/figures/0347.png",
  "data/figures/0348.png",
  "data/figures/0350.png",
  "data/figures/0352.png",
  "data/figures/0354.png",
  "data/figures/0359.png",
  "data/figures/0360.png",
  "data/figures/0362.png",
  "data/figures/0364.png",
  "data/figures/0365.png",
  "data/figures/0366.png",
  "data/figures/0367.png",
  "data/figures/0368.png",
  "data/figures/0454.png",
  "data/figures/0455.png",
  "data/figures/0456.png",
  "data/figures/0457.png",
  "data/figures/0468.png",
  "data/figures/0471.png",
  "data/figures/0474.png",
  "data/figures/0480.png",
  "data/figures/0481.png",
  "data/figures/0483.png",
  "data/figures/0485.png",
  "data/figures/0488.png",
  "data/figures/0534.png",
  "data/figures/0551.png",
  "data/figures/0554.png",
  "data/figures/0577.png",
  "data/figures/0651.png",
  "data/figures/0658.png",
  "data/figures/0690.png",
  "data/figures/0691.png",
  "data/figures/0692.png",
  "data/figures/0693.png",
  "data/figures/0705.png",
  "data/figures/0797.png",
  "data/figures/0802.png",
  "data/figures/0835.png",
  "data/figures/0870.png",
  "data/figures/0871.png",
  "data/figures/0872.png",
  "data/figures/0882.png",
  "data/figures/0883.png",
  "data/figures/0884.png",
  "data/figures/0886.png",
  "data/figures/0897.png",
  "data/figures/0898.png",
  "data/figures/0900.png",
  "data/figures/0960.png",
  "data/figures/0965.png",
  "data/figures/0980.png",
  "data/figures/0998.png",
  "data/figures/1003.png",
  "data/figures/1015.png",
  "data/figures/1018.png",
  "data/figures/1019.png",
  "data/figures/1020.png",
  "data/figures/1021.png",
  "data/figures/1022.png",
  "data/figures/1023.png",
  "data/figures/1024.png",
  "data/figures/1040.png",
  "data/figures/1048.png",
  "data/figures/1049.png",
  "data/figures/1050.png",
  "data/figures/1057.png",
  "data/figures/1058.png",
  "data/figures/1072.png",
  "data/figures/1164.png",
  "data/figures/1165.png",
  "data/figures/1166.png",
  "data/figures/1169.png",
  "data/figures/1179.png",
  "data/figures/1181.png",
  "data/figures/1182.png",
  "data/figures/1186.png",
  "data/figures/1199.png",
  "data/figures/1206.png",
  "data/figures/1207.png",
  "data/figures/1287.png",
  "data/figures/1288.png",
  "data/figures/1289.png",
  "data/figures/1290.png",
  "data/figures/1308.png",
  "data/figures/1314.png",
  "data/figures/1315.png",
  "data/figures/1318.png",
  "data/figures/1320.png",
  "data/figures/1322.png",
  "data/figures/1323.png",
];

const ALL_ASSETS = CORE_ASSETS.concat(FIGURE_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        ALL_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("precache failed:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});