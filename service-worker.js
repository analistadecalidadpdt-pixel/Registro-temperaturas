// Cambiar el número de versión (ej. de v1 a v2) obliga al teléfono a recargar todo
const CACHE_NAME = 'v2_tablero_calidad'; 

// Lista de archivos que la aplicación necesita para funcionar en el teléfono
const ASSETS = [
    './',
    './index.html',
    './temperaturas.html',
    './bpm.html',         // <--- Añadimos tu nueva matriz horizontal
    './manifest.json',
    './PDT.png'           // Tu logo de Pan de Tata
];

// 1. INSTALACIÓN: Guarda todos los archivos en la memoria del dispositivo
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// 2. ACTIVACIÓN: Borra cachés viejos si cambiaste el nombre de la versión
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cache) {
                    if (cache !== CACHE_NAME) {
                        console.log('Borrando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// 3. PETICIONES (FETCH): Responde con la caché para rapidez, si no, busca en red
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});