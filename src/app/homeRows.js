// Início: "Continue assistindo" no alto, em cartões deitados, com as séries em andamento (próximo episódio e progresso).
// Só aparece quando há alguma; "Ver tudo" leva à aba Em Andamento da Biblioteca.
// As indicações do dia (mais abaixo, depois do sorteio) ficam em src/app/dailyPicks.js.
import { session } from '../state/appState.js';
import { switchMode, switchTab } from '../ui/navigation.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { pluralize } from '../utils/format.js';
import { loadSeriesInProgress } from './library.js';
import { on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';
import { posterImg } from '../ui/icons.js';

const MAX_CARDS = 12;
let seq = 0;

function cardHtml({ id, title, poster, type, nextLabel, percent, remaining }) {
  const name = escapeHtml(title || 'Série');
  const left = `${remaining} ${pluralize(remaining, 'restante', 'restantes')}`;
  const image = poster
    ? posterImg(poster, { cls: 'home-card__poster' })
    : '<span class="home-card__poster home-card__poster--empty" aria-hidden="true"></span>';
  return `<li>
      <button type="button" class="home-card home-card--wide" data-action="abrirEpisodios" data-id="${id}" data-media="${type || 'tv'}" aria-label="Continuar ${name}, próximo ${nextLabel}, ${left}">
        ${image}
        <span class="home-card__title">${name}</span>
        <span class="home-card__meta">${nextLabel} · ${left}</span>
        <span class="home-card__progress" aria-hidden="true"><span style="width:${percent}%"></span></span>
      </button>
    </li>`;
}

// "Continue assistindo" do Início acompanha a biblioteca
on('library:changed', renderContinueRow);

async function renderContinueRow() {
  const row = document.getElementById('continue-row');
  if (!row) return;
  const mine = ++seq;
  if (!session.currentUser) {
    row.hidden = true;
    return;
  }
  const { series } = await loadSeriesInProgress();
  if (mine !== seq) return; // outra atualização começou enquanto esta esperava
  row.hidden = series.length === 0;
  document.getElementById('continue-list').innerHTML = series.slice(0, MAX_CARDS).map(cardHtml).join('');
}

// "Ver tudo": abre a Biblioteca na aba certa
function openLibraryTab(tab) {
  switchMode('library');
  switchTab(tab);
  window.scrollTo({ top: 0 });
}

registerActions({
  click: {
    openLibraryTab: el => openLibraryTab(el.dataset.arg),
  },
});
