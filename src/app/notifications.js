// Aviso do sistema (fora da página) quando chega algo em Amigos e o app está em segundo plano.
// Funciona com o app aberto em alguma aba ou minimizado; com tudo fechado não há aviso
// (isso exigiria push pelo servidor). A escolha fica neste aparelho.
import { showToast } from '../ui/feedback.js';
import { registerActions } from '../ui/actions.js';
import { storage } from '../utils/storage.js';

const KEY = 'notify_device';
const TITLE = 'O Que Assistir?';

const supported = () => 'Notification' in window;

function stored() {
  try {
    return storage.getText(KEY) === '1';
  } catch {
    return false;
  }
}

function store(on) {
  try {
    storage.setText(KEY, on ? '1' : '0');
  } catch { /* sem armazenamento: vale só nesta visita */ }
}

const deviceNotifyEnabled = () => supported() && stored() && Notification.permission === 'granted';

export function renderDeviceNotify() {
  const input = document.getElementById('friends-notify');
  if (input) input.checked = deviceNotifyEnabled();
}

async function toggleDeviceNotify(input) {
  if (!input.checked) {
    store(false);
    showToast('Avisos neste aparelho desligados.');
    return;
  }
  if (!supported()) {
    input.checked = false;
    showToast('Este navegador não mostra avisos do sistema. Os avisos continuam aparecendo dentro do app.', 'warning');
    return;
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    input.checked = false;
    store(false);
    showToast('O navegador bloqueou os avisos. Libere nas configurações do site e tente de novo.', 'warning');
    return;
  }
  store(true);
  showToast('Pronto! Avisamos neste aparelho quando chegar algo.');
}

// Só com o app fora de vista: com ele na tela, o aviso dentro do app já basta
export async function notifyDevice(text) {
  if (!document.hidden || !deviceNotifyEnabled()) return;
  const options = { body: text, icon: 'icons/icon-192.png', badge: 'icons/icon-72.png', tag: 'amigos', data: { url: location.href } };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(TITLE, options);
      return;
    }
  } catch { /* sem service worker: tenta direto pela página */ }
  try {
    const notification = new Notification(TITLE, options);
    notification.onclick = () => { window.focus(); notification.close(); };
  } catch { /* alguns celulares só aceitam pelo service worker */ }
}

registerActions({
  change: {
    toggleDeviceNotify,
  },
});
