// Service worker e convite para instalar o app
import { confirmDialog } from '../ui/modals.js';
import { showToast } from '../ui/feedback.js';

let deferredPrompt;

function promptUpdate(newWorker) {
  confirmDialog({
    title: 'Nova versão disponível',
    message: 'Atualize para usar a versão mais recente do app.',
    confirmLabel: 'Atualizar agora',
    cancelLabel: 'Depois'
  }).then(ok => {
    if (!ok) return;
    newWorker.postMessage('SKIP_WAITING');
    window.location.reload();
  });
}

function showInstallPrompt() {
  if (!deferredPrompt) return;

  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.className = 'install-banner';
  installBanner.innerHTML = `
    <svg aria-hidden="true" class="install-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M15 6v2M15 11v2M15 16v2"/></svg>
    <div class="install-banner__text">
      <strong>Instalar App</strong>
      <span>Acesse mais rápido pela tela inicial</span>
    </div>
    <button type="button" class="install-banner__action" data-action="installPWA">Instalar</button>
    <button type="button" class="install-banner__dismiss" data-action="dismissInstall" aria-label="Dispensar instalação do app"><svg aria-hidden="true" class="icon-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;
  document.body.appendChild(installBanner);
}

export async function installPWA() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    showToast('App instalado com sucesso!');
  }

  deferredPrompt = null;
  document.getElementById('pwa-install-banner')?.remove();
}

export function dismissInstall() {
  localStorage.setItem('pwa_install_dismissed', 'true');
  document.getElementById('pwa-install-banner')?.remove();
}

export function initPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(newWorker);
            }
          });
        });
      } catch (error) {
        console.log('PWA: Erro ao registrar Service Worker:', error);
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar botão de instalação após 30 segundos de uso
    setTimeout(() => {
      if (deferredPrompt && !localStorage.getItem('pwa_install_dismissed')) {
        showInstallPrompt();
      }
    }, 30000);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showToast('App instalado! Acesse pela tela inicial.');
    document.getElementById('pwa-install-banner')?.remove();
  });
}
