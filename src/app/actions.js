// Delegação de eventos: o HTML declara data-action / data-input / data-change / data-enter
// e um único listener no document chama o handler. Funciona também para o que é desenhado depois.
import { debounce } from '../utils/debounce.js';
import { checkPasswordStrength, esqueceuSenha, loginAsGuest, loginUser, logout, registerUser, switchLoginTab } from './auth.js';
import { adicionarBlacklist, limparBlacklist, removerBlacklist } from './blacklist.js';
import { buscarDireto, buscarPessoa, limparPessoa, mostrarTop10, selectPerson, sortearFilme } from './discover.js';
import { desmarcarTemporadaAtual, desmarcarTodosEpisodios, marcarTemporadaAtual, marcarTodosEpisodios, onSeasonChange, toggleEpisode } from './episodes.js';
import { removeLibItem } from './library.js';
import { nextOnboarding } from './onboarding.js';
import { abrirPerfil, alterarSenha, deletarConta, salvarPerfil } from './profile.js';
import { addCurrentToRoulette, addRoletaItem, girarRoleta, limparRoleta, removeRoletaItem } from './roulette.js';
import { abrirDoHistorico, abrirHistoricoSorteios, limparHistoricoSorteios, navigateSorteio } from './sorteioHistory.js';
import { abrirEpisodios, carregarDetalhes, compartilhar, fecharModal, marcarVistoAtual, toggleSalvarAtual } from './titleModal.js';
import { dismissInstall, installPWA } from './pwa.js';
import { undoLast } from '../ui/feedback.js';
import { clearInput, scrollToTop, selecionarTipo, switchMode, switchTab } from '../ui/navigation.js';

const num = el => Number(el.dataset.arg);

const clickActions = {
  abrirDoHistorico: el => abrirDoHistorico(num(el)),
  abrirEpisodios: el => abrirEpisodios(Number(el.dataset.id), el.dataset.media),
  abrirHistoricoSorteios,
  abrirPerfil,
  addCurrentToRoulette,
  addRoletaItem,
  adicionarBlacklist,
  alterarSenha,
  buscarDireto,
  carregarDetalhes: el => carregarDetalhes(Number(el.dataset.id), el.dataset.media),
  clearInput: el => clearInput(el.dataset.arg),
  closeModal: el => { document.getElementById(el.dataset.arg).style.display = 'none'; },
  compartilhar,
  deletarConta,
  desmarcarTemporadaAtual,
  desmarcarTodosEpisodios,
  dismissInstall,
  esqueceuSenha,
  fecharModal,
  focusSearch: () => document.getElementById('direct-search').focus(),
  girarRoleta,
  installPWA,
  limparBlacklist,
  limparHistoricoSorteios,
  limparPessoa,
  limparRoleta,
  loginAsGuest,
  loginUser,
  logout,
  marcarTemporadaAtual,
  marcarTodosEpisodios,
  marcarVistoAtual,
  mostrarTop10,
  navigateSorteio: el => navigateSorteio(num(el)),
  nextOnboarding,
  registerUser,
  removeLibItem: el => removeLibItem(el.dataset.key, Number(el.dataset.id), el),
  removeRoletaItem: el => removeRoletaItem(num(el)),
  removerBlacklist: el => removerBlacklist(num(el), el),
  salvarPerfil,
  scrollToTop,
  selecionarTipo: el => selecionarTipo(el.dataset.arg),
  selectPerson: el => selectPerson(Number(el.dataset.id), el.dataset.name),
  sortearFilme,
  switchLoginTab: el => switchLoginTab(el.dataset.arg),
  switchMode: el => switchMode(el.dataset.arg),
  switchTab: el => switchTab(el.dataset.arg),
  switchTabAndTop: el => {
    switchTab(el.dataset.arg);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  },
  toggleSalvarAtual,
  undoLast,
};

// Um único debounce: criar um novo a cada tecla não atrasava nada e disparava uma busca por letra
const buscarPessoaDebounced = debounce(buscarPessoa, 300);

const inputActions = {
  buscarPessoa: el => buscarPessoaDebounced(el.value),
  checkPasswordStrength: el => checkPasswordStrength(el.value),
};

const changeActions = {
  onSeasonChange: el => onSeasonChange(el.value),
  toggleEpisode: el => toggleEpisode(Number(el.dataset.series), Number(el.dataset.season), Number(el.dataset.episode), el.checked),
};

const enterActions = { addRoletaItem, buscarDireto };

export function initActions() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    clickActions[el.dataset.action]?.(el, e);
  });

  document.addEventListener('input', (e) => {
    inputActions[e.target.dataset?.input]?.(e.target);
  });

  document.addEventListener('change', (e) => {
    changeActions[e.target.dataset?.change]?.(e.target);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const enter = enterActions[e.target.dataset?.enter];
    if (enter) { enter(); return; }
    // Sugestões de ator são role="option": Enter equivale ao clique
    if (e.target.matches?.('[role="option"][data-action]')) e.target.click();
  });
}
