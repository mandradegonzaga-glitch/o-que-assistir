// Listas personalizadas. A cópia em memória (session.user.lists) e o armazenamento (este aparelho,
// para o convidado; o Supabase, para a conta) mudam juntos, e só depois que a gravação deu certo.
// Quem cria, renomeia, apaga ou mexe nos títulos passa por aqui; a tela decide o que avisar.
// Não avisa 'library:changed': a ação da pessoa avisa uma vez, no fim.
import {
    supabaseAddListItem, supabaseAddListItems, supabaseCreateList, supabaseDeleteList, supabaseGetLists,
    supabaseRemoveListItem, supabaseReorderList, supabaseUpdateList,
} from '../api/supabase.js';
import { MAX_ITEMS, MAX_LISTS, buildLists, hasItem, normalizeGuestLists, withItem, withoutItem } from '../domain/userLists.js';
import { isGuest, session } from '../state/appState.js';
import { saveGuestLists } from './guestLibrary.js';

let unavailable = false; // a conta não conseguiu ler as listas (ou o SQL ainda não foi rodado)

export const allLists = () => session.user?.lists || [];
export const findList = id => allLists().find(l => l.id === id);
export const listsUnavailable = () => unavailable;
export const canCreateList = () => allLists().length < MAX_LISTS;

const OK = { success: true };
const newGuestId = () => (crypto.randomUUID ? crypto.randomUUID() : `g${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

function setLists(next) {
    session.user.lists = next;
    if (isGuest()) saveGuestLists(next);
}

// Muda só a cópia local (e o aparelho, para o convidado): ordem em andamento, link de compartilhar
export function changeList(listId, changes) {
    setLists(allLists().map(l => (l.id === listId ? { ...l, ...changes } : l)));
}

export async function loadAccountLists() {
    const result = await supabaseGetLists(session.currentUserId);
    unavailable = !result.success;
    session.user.lists = result.success ? buildLists(result.lists, result.items) : [];
}

export function loadGuestLists(saved) {
    unavailable = false;
    session.user.lists = normalizeGuestLists(saved);
}

// { success, id } ou { success: false, duplicate?, limit? }
export async function createList({ name, emoji }) {
    if (!canCreateList()) return { success: false, limit: true };
    const result = isGuest() ? { success: true, id: newGuestId() } : await supabaseCreateList(session.currentUserId, { name, emoji });
    if (result.success) setLists([...allLists(), { id: result.id, name, emoji, items: [] }]);
    return result;
}

export async function renameList(listId, { name, emoji }) {
    const result = isGuest() ? OK : await supabaseUpdateList(listId, { name, emoji });
    if (result.success) changeList(listId, { name, emoji });
    return result;
}

export async function deleteList(listId) {
    const result = isGuest() ? OK : await supabaseDeleteList(listId);
    if (result.success) setLists(allLists().filter(l => l.id !== listId));
    return result;
}

// Põe ou tira um título. { success } ou { success: false, full? }
export async function setTitleInList(listId, item, include) {
    const list = findList(listId);
    if (!list) return { success: false };
    if (include === hasItem(list, item.id)) return OK;
    if (include && list.items.length >= MAX_ITEMS) return { success: false, full: true };
    const result = isGuest() ? OK
        : include ? await supabaseAddListItem(session.currentUserId, listId, item)
        : await supabaseRemoveListItem(listId, item.id);
    if (result.success) {
        setLists(allLists().map(l => (l.id !== listId ? l : include ? withItem(l, item) : withoutItem(l, item.id))));
    }
    return result;
}

// Vários títulos de uma vez (coleção copiada); os que já estavam ficam como estão, até o limite da lista
export async function addTitlesToList(listId, items) {
    const list = findList(listId);
    if (!list) return { success: false, added: [] };
    const added = items.filter(i => !hasItem(list, i.id)).slice(0, Math.max(0, MAX_ITEMS - list.items.length));
    if (added.length === 0) return { success: true, added };
    const result = isGuest() ? OK : await supabaseAddListItems(session.currentUserId, listId, added);
    if (!result.success) return { success: false, added: [] };
    changeList(listId, { items: [...findList(listId).items, ...added] });
    return { success: true, added };
}

// Grava a ordem que está na cópia local (o convidado já gravou em changeList)
export async function saveListOrder(listId) {
    const list = findList(listId);
    if (!list || isGuest()) return OK;
    return supabaseReorderList(listId, list.items.map(i => i.id));
}
