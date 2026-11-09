// Service Worker - O Que Assistir? PWA
// CACHE_VERSION e a lista abaixo são gerados por scripts/sw-assets.mjs (npm run sw:assets).
// O activate apaga os caches de versões anteriores.
const CACHE_VERSION = 'ce97e55a28';
const STATIC_CACHE = `oqueassistir-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `oqueassistir-dynamic-${CACHE_VERSION}`;

// Recursos estáticos para cache offline
const STATIC_ASSETS = [
    // <assets>
    '/',
    '/index.html',
    '/manifest.json',
    '/src/api/supabase.js',
    '/src/api/tmdb.js',
    '/src/api/tmdbSeries.js',
    '/src/app/accountData.js',
    '/src/app/auth.js',
    '/src/app/badges.js',
    '/src/app/battle.js',
    '/src/app/blacklist.js',
    '/src/app/blindSession.js',
    '/src/app/dailyPicks.js',
    '/src/app/discover.js',
    '/src/app/episodeStore.js',
    '/src/app/episodes.js',
    '/src/app/filters.js',
    '/src/app/friends.js',
    '/src/app/guestLibrary.js',
    '/src/app/help.js',
    '/src/app/homeRows.js',
    '/src/app/legacyImport.js',
    '/src/app/library.js',
    '/src/app/libraryStore.js',
    '/src/app/lifeStats.js',
    '/src/app/listShare.js',
    '/src/app/listStore.js',
    '/src/app/match.js',
    '/src/app/matchHistory.js',
    '/src/app/myProviders.js',
    '/src/app/notifications.js',
    '/src/app/onboarding.js',
    '/src/app/profile.js',
    '/src/app/progress.js',
    '/src/app/pwa.js',
    '/src/app/reactions.js',
    '/src/app/roulette.js',
    '/src/app/sorteioHistory.js',
    '/src/app/tasteDna.js',
    '/src/app/ticket.js',
    '/src/app/titleModal.js',
    '/src/app/urlSync.js',
    '/src/app/userLists.js',
    '/src/config/constants.js',
    '/src/domain/badges.js',
    '/src/domain/battle.js',
    '/src/domain/blind.js',
    '/src/domain/challenges.js',
    '/src/domain/cinemaRelease.js',
    '/src/domain/collections.js',
    '/src/domain/countries.js',
    '/src/domain/dailyPicks.js',
    '/src/domain/filters.js',
    '/src/domain/genres.js',
    '/src/domain/gestures.js',
    '/src/domain/history.js',
    '/src/domain/inbox.js',
    '/src/domain/legacyData.js',
    '/src/domain/lifeStats.js',
    '/src/domain/liveMatch.js',
    '/src/domain/match.js',
    '/src/domain/matchHistory.js',
    '/src/domain/mediaItem.js',
    '/src/domain/moods.js',
    '/src/domain/passwordStrength.js',
    '/src/domain/profileName.js',
    '/src/domain/progress.js',
    '/src/domain/providers.js',
    '/src/domain/qr.js',
    '/src/domain/reactions.js',
    '/src/domain/roulette.js',
    '/src/domain/screens.js',
    '/src/domain/seriesProgress.js',
    '/src/domain/surprise.js',
    '/src/domain/tasteDna.js',
    '/src/domain/tasteMatch.js',
    '/src/domain/titleFacts.js',
    '/src/domain/titleShare.js',
    '/src/domain/urlState.js',
    '/src/domain/userLists.js',
    '/src/main.js',
    '/src/state/appState.js',
    '/src/state/events.js',
    '/src/styles/style.css',
    '/src/ui/actions.js',
    '/src/ui/badgeIcons.js',
    '/src/ui/busy.js',
    '/src/ui/chipFilters.js',
    '/src/ui/dragReorder.js',
    '/src/ui/drawReveal.js',
    '/src/ui/feedback.js',
    '/src/ui/filterFields.js',
    '/src/ui/icons.js',
    '/src/ui/listIcons.js',
    '/src/ui/modals.js',
    '/src/ui/motion.js',
    '/src/ui/navigation.js',
    '/src/ui/phosphor.js',
    '/src/ui/share.js',
    '/src/ui/sheet.js',
    '/src/ui/tilt.js',
    '/src/utils/cache.js',
    '/src/utils/date.js',
    '/src/utils/debounce.js',
    '/src/utils/escapeHtml.js',
    '/src/utils/format.js',
    '/src/utils/shuffle.js',
    '/src/utils/storage.js',
    '/src/vendor/qrcode.js',
    'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=Big+Shoulders+Display:wght@700;800;900&display=swap',
    // </assets>
];

self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Cacheando recursos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((err) => console.log('[SW] Erro ao cachear:', err))
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Removendo cache antigo:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Proxy do TMDB: Network First, com o último resultado disponível offline
    if (url.pathname.includes('/functions/v1/tmdb')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Ignorar requisições do Supabase (sempre online)
    if (url.hostname.includes('supabase')) return;

    // Estratégia para imagens: Cache First
    if (request.destination === 'image') {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Arquivos do próprio app (HTML/JS/CSS/manifest): Network First.
    // Cache First aqui fazia o navegador servir JS antigo mesmo após o deploy.
    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Demais recursos externos (fontes, SDK do Supabase): Cache First
    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        throw error;
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        // Offline e sem cache da página pedida: abre o app
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        throw error;
    }
}

// A versão nova espera a pessoa escolher "Atualizar agora" (src/app/pwa.js)
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
            // App já aberto: traz a aba para a frente em vez de abrir outra
            const open = windows.find(w => new URL(w.url).origin === self.location.origin);
            return open ? open.focus() : clients.openWindow(url);
        })
    );
});
