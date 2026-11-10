// Service worker e convite para instalar o app
import { confirmDialog } from '../ui/modals.js';
import { ph } from '../ui/phosphor.js';
import { showToast } from '../ui/feedback.js';
import { registerActions } from '../ui/actions.js';
import { storage } from '../utils/storage.js';

let deferredPrompt;

function promptUpdate(newWorker) {
  confirmDialog({
    title: 'Nova versão disponível',
    message: 'Atualize para usar a versão mais recente do app.',
    confirmLabel: 'Atualizar agora',
    cancelLabel: 'Depois'
  }).then(ok => {
    if (!ok) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    newWorker.postMessage('SKIP_WAITING');
  });
}

function showInstallPrompt() {
  if (!deferredPrompt || document.getElementById('pwa-install-banner')) return;

  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.className = 'install-banner';
  installBanner.innerHTML = `
    ${ph('download-simple', { weight: 'regular', cls: 'install-banner__icon' })}
    <div class="install-banner__text">
      <strong>Instalar App</strong>
      <span>Acesse mais rápido pela tela inicial</span>
    </div>
    <button type="button" class="install-banner__action" data-action="installPWA">Instalar</button>
    <button type="button" class="install-banner__dismiss" data-action="dismissInstall" aria-label="Dispensar instalação do app">${ph('x', { weight: 'bold', cls: 'icon-x' })}</button>
  `;
  document.body.appendChild(installBanner);
  syncInstallBannerHeight();
}

// No celular, o canto inferior direito (botão das indicações, avisos, "voltar ao topo") sobe acima da faixa:
// o CSS precisa saber a altura dela, que muda com a quebra de linha do texto
function syncInstallBannerHeight() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) document.documentElement.style.setProperty('--install-banner-h', `${banner.offsetHeight}px`);
  else document.documentElement.style.removeProperty('--install-banner-h');
}

function removeInstallBanner() {
  document.getElementById('pwa-install-banner')?.remove();
  syncInstallBannerHeight();
}

window.addEventListener('resize', syncInstallBannerHeight);

async function installPWA() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    showToast('App instalado com sucesso');
  }

  deferredPrompt = null;
  removeInstallBanner();
}

function dismissInstall() {
  storage.setText('pwa_install_dismissed', 'true');
  removeInstallBanner();
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

    setTimeout(() => {
      if (deferredPrompt && !storage.getText('pwa_install_dismissed')) {
        showInstallPrompt();
      }
    }, 30000);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showToast('App instalado! Acesse pela tela inicial.');
    removeInstallBanner();
  });
}

registerActions({
  click: {
    dismissInstall,
    installPWA,
  },
});
