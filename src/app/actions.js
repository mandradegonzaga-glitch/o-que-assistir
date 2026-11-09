// Delegação de eventos: o HTML declara data-action / data-input / data-change / data-enter
// e um único listener no document chama o handler. Funciona também para o que é desenhado depois.
import { debounce } from '../utils/debounce.js';
import { checkPasswordStrength, esqueceuSenha, loginAsGuest, loginUser, logout, registerUser, switchLoginTab } from './auth.js';
import { adicionarBlacklist, limparBlacklist, removerBlacklist } from './blacklist.js';
import { buscarDireto, buscarPessoa, limparPessoa, mostrarLancamentos, mostrarTop10, selectPerson, sortearFilme, sortearOutro, surpreendaMe, fecharResultados } from './discover.js';
import { matchCodeJoin, matchSendToFriend, matchContinue, matchDraw, matchEmailInvite, matchInvite, matchJoin, matchLive, matchLiveJoin, matchLiveSend, matchRestart, matchSendAnswer, matchSendInvite, matchStart, matchVote } from './match.js';
import { filterProviders, onProviderChange, toggleMyProvider } from './myProviders.js';
import { compartilhar, compartilharApps, compartilharWhatsapp, gerarIngresso } from './ticket.js';
import { syncUrl } from './urlSync.js';
import { desmarcarTemporadaAtual, desmarcarTodosEpisodios, marcarAteAqui, marcarTemporadaAtual, onSeasonChange, toggleEpisode } from './episodes.js';
import { friendAccept, friendAdd, friendInvite, friendMatchCurrent, friendOpen, friendRemove, friendSendTitle, friendShareDelete, friendShareOpen, friendUnfriendCurrent, matchInboxDelete, matchInboxOpen, openFriends, toggleShareWithFriends } from './friends.js';
import { removeLibItem } from './library.js';
import { reactTitle } from './reactions.js';
import { copySharedList, shareUserList, stopSharingUserList } from './listShare.js';
import { closeUserList, copyCollection, createFromTemplate, deleteUserList, moveUserListItem, openCollection, toggleListReorder, useListTemplate, openListEditor, openSaveToList, openUserList, pickListEmoji, removeFromUserList, saveListEditor, toggleTitleInList } from './userLists.js';
import { blindReveal, sessaoEscuras } from './blindSession.js';
import { abrirBatalha, battleChoose, battleOpenChampion, battleSynopsis, battleUndo } from './battle.js';
import { openHelp } from './help.js';
import { toggleDeviceNotify } from './notifications.js';
import { matchHistoryRemove, matchHistorySave } from './matchHistory.js';
import { nextOnboarding } from './onboarding.js';
import { abrirPerfil, alterarSenha, deletarConta, salvarPerfil } from './profile.js';
import { addCurrentToRoulette, addRoletaItem, girarRoleta, goToRoulette, limparRoleta, removeRoletaItem } from './roulette.js';
import { abrirDoHistorico, abrirHistoricoSorteios, limparHistoricoSorteios, navigateSorteio } from './sorteioHistory.js';
import { closeModalWithAnimation } from '../ui/modals.js';
import { abrirEpisodios, carregarDetalhes, goTitleSection, marcarVistoAtual, toggleSalvarAtual } from './titleModal.js';
import { openLibraryTab } from './homeRows.js';
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
  goToRoulette,
  addRoletaItem,
  adicionarBlacklist,
  alterarSenha,
  buscarDireto,
  carregarDetalhes: el => carregarDetalhes(Number(el.dataset.id), el.dataset.media),
  goTitleSection: el => goTitleSection(el.dataset.arg),
  clearInput: el => clearInput(el.dataset.arg),
  closeModal: el => closeModalWithAnimation(document.getElementById(el.dataset.arg)),
  compartilhar,
  compartilharApps,
  compartilharWhatsapp,
  gerarIngresso,
  deletarConta,
  desmarcarTemporadaAtual,
  desmarcarTodosEpisodios,
  dismissInstall,
  esqueceuSenha,
  fecharModal: () => closeModalWithAnimation(document.getElementById('modal-resultado')),
  friendAccept: el => friendAccept(el.dataset.arg),
  friendAdd,
  friendRemove: el => friendRemove(el.dataset.arg),
  friendSendMatch: el => matchSendToFriend(el.dataset.arg),
  friendSendTitle,
  friendShareDelete: el => friendShareDelete(el.dataset.arg),
  friendShareOpen: el => friendShareOpen(el.dataset.arg),
  friendInvite,
  openFriends,
  friendMatchCurrent,
  friendOpen: el => friendOpen(el.dataset.arg),
  reactTitle: el => reactTitle(el.dataset.arg),
  friendUnfriendCurrent,
  matchInboxDelete: el => matchInboxDelete(el.dataset.arg),
  matchInboxOpen,
  focusSearch: () => document.getElementById('direct-search').focus(),
  girarRoleta,
  installPWA,
  matchContinue,
  matchDraw,
  matchEmailInvite,
  matchInvite,
  matchJoin,
  matchCodeJoin,
  matchHistoryRemove: el => matchHistoryRemove(el.dataset.arg),
  matchHistorySave: el => matchHistorySave(el.dataset.arg),
  matchLive,
  matchLiveJoin,
  matchLiveSend,
  matchSendAnswer,
  matchSendInvite,
  matchNo: () => matchVote(false),
  matchRestart,
  matchStart,
  matchYes: () => matchVote(true),
  limparBlacklist,
  limparHistoricoSorteios,
  limparPessoa,
  limparRoleta,
  loginAsGuest,
  loginUser,
  logout,
  marcarTemporadaAtual,
  marcarAteAqui: el => marcarAteAqui(Number(el.dataset.season), Number(el.dataset.episode)),
  marcarVistoAtual,
  mostrarTop10,
  mostrarLancamentos,
  surpreendaMe,
  sessaoEscuras,
  blindReveal,
  abrirBatalha,
  battleOpenChampion,
  battleChoose: el => battleChoose(el.dataset.arg),
  battleSynopsis: el => battleSynopsis(el.dataset.arg),
  battleUndo,
  openHelp: el => openHelp(el.dataset.arg),
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
  sortearOutro,
  switchLoginTab: el => switchLoginTab(el.dataset.arg),
  switchMode: el => switchMode(el.dataset.arg),
  openLibraryTab: el => openLibraryTab(el.dataset.arg),
  fecharResultados,
  switchTab: el => switchTab(el.dataset.arg),
  switchTabAndTop: el => {
    switchTab(el.dataset.arg);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  },
  toggleSalvarAtual,
  undoLast,
  openSaveToList,
  openListEditor: el => openListEditor(el.dataset.arg),
  saveListEditor,
  pickListEmoji: el => pickListEmoji(el.dataset.arg),
  openUserList: el => openUserList(el.dataset.arg),
  closeUserList,
  deleteUserList,
  openCollection: el => openCollection(el.dataset.arg),
  toggleListReorder,
  moveUserListItem: el => moveUserListItem(Number(el.dataset.id), Number(el.dataset.arg)),
  shareUserList,
  stopSharingUserList,
  copySharedList,
  copyCollection,
  createFromTemplate: el => createFromTemplate(el.dataset.arg),
  useListTemplate: el => useListTemplate(el.dataset.arg),
  removeFromUserList: el => removeFromUserList(Number(el.dataset.id), el),
};

// Um único debounce: criar um novo a cada tecla não atrasava nada e disparava uma busca por letra
const buscarPessoaDebounced = debounce(buscarPessoa, 300);

const inputActions = {
  filterProviders,
  buscarPessoa: el => buscarPessoaDebounced(el.value),
  checkPasswordStrength: el => checkPasswordStrength(el.value),
};

// Gênero e clima são alternativos: escolher um limpa o outro
function clearOther(otherId) {
  return el => {
    if (!el.value) return;
    document.getElementById(otherId).value = '';
    syncUrl();
  };
}

const changeActions = {
  clearMood: clearOther('input-mood'),
  clearGenre: clearOther('input-genero'),
  onProviderChange,
  toggleMyProvider,
  onSeasonChange: el => onSeasonChange(el.value),
  toggleShareWithFriends,
  toggleDeviceNotify,
  toggleTitleInList,
  toggleEpisode: el => toggleEpisode(Number(el.dataset.series), Number(el.dataset.season), Number(el.dataset.episode), el.checked),
};

const enterActions = { addRoletaItem, buscarDireto, friendAdd, matchCodeJoin, matchLiveJoin, saveListEditor };

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
    if (enter) {
      // Sem isso, se a ação mover o foco para um botão (ex.: o cartão da lista recém-criada), o mesmo Enter o aciona
      e.preventDefault();
      enter();
      return;
    }
    // Sugestões de ator são role="option": Enter equivale ao clique
    if (e.target.matches?.('[role="option"][data-action]')) e.target.click();
  });
}
