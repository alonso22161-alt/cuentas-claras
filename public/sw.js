// Service worker: guarda la app en el teléfono para que abra rápido y sin conexión.
// Los datos NO pasan por aquí; van directo a tu Apps Script.
const CACHE = 'micontrol-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const fuentes = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!propio && !fuentes) return;

  // Página: primero red (para recibir actualizaciones); si falla usa la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copia)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Archivos: primero copia guardada, y se actualiza en segundo plano
  e.respondWith(
    caches.match(req).then((guardado) => {
      const red = fetch(req)
        .then((r) => { if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); } return r; })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
