const CACHE_NAME = 'addrqr-cache-v3';
const CORE_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(CORE_ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* 화면(HTML)은 항상 최신을 먼저 받고, 오프라인일 때만 저장본을 쓴다. 그림 등은 저장본 우선 + 뒤에서 갱신 */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* 지도 타일·주소 검색·업체 API 는 브라우저가 직접 */
  var isDoc = req.mode === 'navigate' || req.destination === 'document' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isDoc) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) { var c = res.clone(); caches.open(CACHE_NAME).then(function (cache) { cache.put('./index.html', c); }); }
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') { var c = res.clone(); caches.open(CACHE_NAME).then(function (cache) { cache.put(req, c); }); }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
