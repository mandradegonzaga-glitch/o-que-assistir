// Ingresso e compartilhar do título aberto no modal.
// "Gerar ingresso" baixa só a imagem; "Compartilhar" abre as opções: outros apps (com ingresso, texto e link) e amigos do app.
import { tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { buildQrMatrix } from '../domain/qr.js';
import { KIND_LABEL, TICKET_COLORS, shareText, titleKind, titleLink } from '../domain/titleShare.js';
import { state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating } from '../utils/format.js';
import { refreshFriends } from './friends.js';
import { recordSocial } from './progress.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 60;
const PAD = 56;
const STUB = 240;
const COLORS = { background: '#14101f', ink: '#17121f' };
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
const TEXT = "'Hanken Grotesk', system-ui, sans-serif";
const QR_BOX = 190;
const LOGO = 64;
const SECTION_GAP = 30;
const BODY_LINE = 40;

function loadImage(path) {
  return new Promise(resolve => {
    if (!path) { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = 'anonymous'; // sem isso, o canvas fica bloqueado para exportar
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // imagem sem CORS ou fora do ar: o ingresso sai sem ela
    // Endereço próprio: a cópia que o navegador já guardou da imagem veio sem CORS e seria recusada
    image.src = `${IMG_URL}${path}?ingresso=1`;
  });
}

function drawTicketShape(ctx, x, y, w, h, tearY) {
  const r = 36;
  const notch = 34;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, tearY - notch);
  ctx.arc(x + w, tearY, notch, -Math.PI / 2, Math.PI / 2, true);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.lineTo(x, tearY + notch);
  ctx.arc(x, tearY, notch, Math.PI / 2, -Math.PI / 2, true);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Quebra em palavras, ou em itens inteiros quando recebe uma lista (nomes do elenco não se partem)
function wrapLines(ctx, text, maxWidth, maxLines) {
  const isList = Array.isArray(text);
  const sep = isList ? ' · ' : ' ';
  const lines = [];
  let line = '';
  (isList ? text : text.split(/\s+/)).filter(Boolean).forEach(word => {
    const candidate = line ? `${line}${sep}${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  let last = `${cut[maxLines - 1].replace(/[\s,.:;·-]+$/, '')}…`;
  // A linha cheia mais as reticências pode passar da largura: tira palavras até caber
  while (ctx.measureText(last).width > maxWidth && last.includes(' ')) {
    last = `${last.slice(0, last.lastIndexOf(' ')).replace(/[\s,.:;·-]+$/, '')}…`;
  }
  cut[maxLines - 1] = last;
  return cut;
}

// Reduz a fonte até a palavra mais longa caber na largura: quebrar linha não resolve uma palavra só
function fitTitleSize(ctx, text, maxWidth, startSize) {
  const longest = text.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
  let size = startSize;
  ctx.font = `900 ${size}px ${DISPLAY}`;
  while (size > 40 && ctx.measureText(longest).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  return size;
}

// Link curto e limpo: quanto menor o texto, mais fácil de ler pela câmera
const titleUrl = (movie, kind) => titleLink(`${location.origin}${location.pathname}`, kind, movie.id);

// Fundo branco e margem: a câmera precisa de contraste e de uma borda livre em volta
function drawQr(ctx, text, x, y) {
  const matrix = buildQrMatrix(text);
  const quiet = 3;
  const cell = Math.floor(QR_BOX / (matrix.length + quiet * 2));
  const side = cell * (matrix.length + quiet * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, side, side);
  ctx.fillStyle = '#000000';
  matrix.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell, cell);
  }));
  ctx.fillStyle = COLORS.ink;
}

// Elenco e plataformas: o modal já pediu os mesmos dados, então em geral vêm do cache
export async function titleExtras(movie, kind) {
  const endpoint = kind === 'movie' ? 'movie' : 'tv';
  const [credits, watch] = await Promise.allSettled([
    tmdbGet(`/${endpoint}/${movie.id}/credits`, {}),
    tmdbGet(`/${endpoint}/${movie.id}/watch/providers`, { language: null }),
  ]);
  const cast = (credits.value?.cast || []).map(a => a.name).filter(Boolean).slice(0, 4);
  const providers = (watch.value?.results?.BR?.flatrate || [])
    .filter(p => p.provider_name)
    .map(p => ({ name: p.provider_name, logo: p.logo_path }));
  return { cast, providers };
}

function drawLabel(ctx, text, x, y) {
  ctx.font = `700 22px ${TEXT}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.globalAlpha = 1;
}

export async function drawTicket(movie, { kind = titleKind(movie, state.type), cast = [], providers = [] } = {}) {
  await Promise.all([
    document.fonts.load(`900 90px ${DISPLAY}`),
    document.fonts.load(`500 34px ${TEXT}`),
    document.fonts.load(`700 22px ${TEXT}`),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const w = WIDTH - MARGIN * 2;
  const h = HEIGHT - MARGIN * 2;
  const tearY = MARGIN + h - STUB;

  drawTicketShape(ctx, MARGIN, MARGIN, w, h, tearY);
  ctx.fillStyle = TICKET_COLORS[kind] || TICKET_COLORS.movie;
  ctx.fill();

  const left = MARGIN + PAD;
  const width = w - PAD * 2;
  const top = MARGIN + PAD;
  const bottom = tearY - 44;

  const [poster, logos] = await Promise.all([
    loadImage(movie.poster_path),
    Promise.all(providers.slice(0, 8).map(p => loadImage(p.logo))),
  ]);

  // Cabeçalho: pôster à esquerda, título ao lado
  let textX = left;
  let textWidth = width;
  let headerBottom = top;
  if (poster) {
    const posterWidth = 280;
    const posterHeight = 420;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, posterWidth, posterHeight, 18);
    ctx.clip();
    ctx.drawImage(poster, left, top, posterWidth, posterHeight);
    ctx.restore();
    textX = left + posterWidth + 40;
    textWidth = width - posterWidth - 40;
    headerBottom = top + posterHeight;
  }

  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = 'top';
  ctx.font = `500 32px ${TEXT}`;
  ctx.fillText('Hoje é dia de', textX, top + 4);

  const name = (movie.title || movie.name || '').toUpperCase();
  const titleSize = fitTitleSize(ctx, name, textWidth, poster ? 88 : 130);
  const titleLine = titleSize * 1.04;
  ctx.font = `900 ${titleSize}px ${DISPLAY}`;
  const titleLines = wrapLines(ctx, name, textWidth, poster ? 4 : 3);
  titleLines.forEach((line, i) => ctx.fillText(line, textX, top + 56 + i * titleLine));

  const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
  const meta = [KIND_LABEL[kind], year, movie.vote_average ? `Nota ${formatRating(movie.vote_average)}` : ''].filter(Boolean).join(' · ');
  const metaY = top + 56 + titleLines.length * titleLine + 18;
  ctx.font = `500 32px ${TEXT}`;
  ctx.fillText(meta, textX, metaY);

  // Corpo: sinopse com o espaço que sobrar depois de elenco e plataformas
  let y = Math.max(headerBottom, metaY + 40) + SECTION_GAP + 10;

  ctx.font = `500 30px ${TEXT}`;
  const castLines = cast.length ? wrapLines(ctx, cast, width, 2) : [];
  const castHeight = castLines.length ? 32 + castLines.length * BODY_LINE : 0;
  const providerHeight = providers.length ? 34 + LOGO : 0;
  const reserved = (castHeight && castHeight + SECTION_GAP) + (providerHeight && providerHeight + SECTION_GAP);

  ctx.font = `400 30px ${TEXT}`;
  const synopsisLines = Math.min(6, Math.floor((bottom - y - reserved) / BODY_LINE));
  if (movie.overview && synopsisLines >= 1) {
    const lines = wrapLines(ctx, movie.overview, width, synopsisLines);
    lines.forEach((line, i) => ctx.fillText(line, left, y + i * BODY_LINE));
    y += lines.length * BODY_LINE + SECTION_GAP;
  }

  if (castHeight && y + castHeight <= bottom) {
    drawLabel(ctx, 'Elenco', left, y);
    ctx.font = `500 30px ${TEXT}`;
    castLines.forEach((line, i) => ctx.fillText(line, left, y + 32 + i * BODY_LINE));
    y += castHeight + SECTION_GAP;
  }

  if (providerHeight && y + providerHeight <= bottom) {
    drawLabel(ctx, 'Onde assistir', left, y);
    const rowY = y + 34;
    if (logos.length && logos.every(Boolean)) {
      logos.forEach((logo, i) => {
        const x = left + i * (LOGO + 16);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, rowY, LOGO, LOGO, 14);
        ctx.clip();
        ctx.drawImage(logo, x, rowY, LOGO, LOGO);
        ctx.restore();
      });
    } else {
      // Algum logo não pôde entrar no canvas: os nomes ficam no lugar de todos
      ctx.font = `700 30px ${TEXT}`;
      const [line] = wrapLines(ctx, providers.map(p => p.name), width, 1);
      ctx.fillText(line, left, rowY + (LOGO - 30) / 2);
    }
  }

  // Picote entre o corpo e o canhoto
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 5;
  ctx.setLineDash([22, 22]);
  ctx.beginPath();
  ctx.moveTo(MARGIN + 60, tearY);
  ctx.lineTo(MARGIN + w - 60, tearY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `900 76px ${DISPLAY}`;
  ctx.fillText('O QUE ASSISTIR?', left, tearY + 54);
  ctx.font = `500 32px ${TEXT}`;
  ctx.fillText('Aponte a câmera para abrir', left, tearY + 146);

  drawQr(ctx, titleUrl(movie, kind), MARGIN + w - 60 - QR_BOX, tearY + 28);

  return canvas;
}

const toBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'titulo';
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Tudo o que os botões precisam do título aberto: tipo, dados extras, texto e o ingresso pronto
async function prepare(movie) {
  const kind = titleKind(movie, state.type);
  const extras = await titleExtras(movie, kind);
  const title = movie.title || movie.name || '';
  const text = shareText({
    item: movie, kind, url: titleUrl(movie, kind), cast: extras.cast, providers: extras.providers.map(p => p.name),
  });
  const blob = await toBlob(await drawTicket(movie, { kind, ...extras }));
  const name = `ingresso-${slug(title)}.png`;
  return { kind, title, text, blob, name, file: new File([blob], name, { type: 'image/png' }) };
}

// Evita gerar duas vezes o mesmo ingresso entre um botão e outro
let prepared = null;
function preparedFor(movie) {
  if (prepared?.movie !== movie) prepared = { movie, promise: prepare(movie) };
  prepared.promise.catch(() => { if (prepared?.movie === movie) prepared = null; });
  return prepared.promise;
}

// Ocupado sem `disabled`: um botão desabilitado perde o foco do teclado no meio da ação.
// O rótulo vira "Gerando…" e volta ao fim.
async function withBusy(button, task, busyText = 'Preparando…') {
  if (!button || button.getAttribute('aria-disabled') === 'true') return;
  const label = button.querySelector('.btn-label');
  const original = label?.textContent;
  button.setAttribute('aria-disabled', 'true');
  button.setAttribute('aria-busy', 'true');
  if (label) label.textContent = busyText;
  try {
    await task();
  } finally {
    button.removeAttribute('aria-disabled');
    button.removeAttribute('aria-busy');
    if (label && label.textContent === busyText) label.textContent = original;
  }
}

// Atalho de colar de cada sistema
const PASTE_KEYS = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '') ? 'Cmd+V' : 'Ctrl+V';

export function gerarIngresso() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return withBusy(document.getElementById('btn-ingresso'), async () => {
    try {
      const { blob, name } = await preparedFor(movie);
      download(blob, name);
      showToast('Ingresso baixado!');
    } catch (e) {
      console.error('Erro ao gerar ingresso:', e);
      showToast('Não foi possível gerar o ingresso. Tente de novo.', 'error');
    }
  }, 'Gerando…');
}

const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
const canShareFiles = file => isTouch() && Boolean(navigator.canShare?.({ files: [file] }));

export function compartilhar() {
  const movie = state.currentMovie;
  if (!movie) return;
  const kind = titleKind(movie, state.type);
  document.getElementById('share-subtitle').textContent = `${movie.title || movie.name || ''} · ${KIND_LABEL[kind]}`;
  // Celular: o compartilhar do sistema já inclui o WhatsApp, com a imagem. Computador: WhatsApp Web com o texto.
  // Celular sem esse recurso (navegador antigo ou site fora de HTTPS): baixa o ingresso para anexar da galeria.
  const native = canShareFiles(new File([''], 'ingresso.png', { type: 'image/png' }));
  document.getElementById('share-apps-label').textContent = native ? 'WhatsApp e outros apps' : 'Baixar ingresso e copiar texto';
  document.getElementById('share-whatsapp').hidden = native;
  document.getElementById('share-whatsapp-note').textContent = isTouch()
    ? 'O WhatsApp não recebe imagem por link: o ingresso é baixado, e você anexa na conversa pelo clipe.'
    : `O WhatsApp não recebe imagem por link: o ingresso vai copiado, e você cola na conversa com ${PASTE_KEYS}.`;
  document.getElementById('modal-share').style.display = 'flex';
  preparedFor(movie).catch(() => {}); // já vai gerando enquanto a pessoa escolhe
  refreshFriends();
}

// No celular, o compartilhar do sistema leva imagem, texto e link juntos (WhatsApp incluído).
// No computador não há para onde mandar a imagem: baixa o ingresso e copia o texto para colar.
export function compartilharApps() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return withBusy(document.getElementById('btn-share-apps'), async () => {
    try {
      const { text, title, blob, name, file } = await preparedFor(movie);
      if (canShareFiles(file)) {
        try {
          await navigator.share({ files: [file], title: `Hoje é dia de: ${title}`, text });
          recordSocial('ticketsShared');
        } catch (e) {
          if (e.name === 'AbortError') return;
          download(blob, name);
          await copyText(text);
          showToast('Ingresso baixado. Cole o texto na conversa.');
        }
        return;
      }
      download(blob, name);
      const copied = await copyText(text);
      showToast(copied ? 'Ingresso baixado e texto copiado! Cole na conversa.' : 'Ingresso baixado!');
      recordSocial('ticketsShared');
    } catch (e) {
      console.error('Erro ao compartilhar:', e);
      showToast('Não foi possível compartilhar. Tente de novo.', 'error');
    }
  });
}

async function copyImage(blob) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
}

// WhatsApp no computador: o link do WhatsApp só aceita texto, então o ingresso vai para a área de
// transferência e a pessoa cola na conversa. Sem permissão para copiar imagem, baixa o arquivo para anexar.
export function compartilharWhatsapp() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return withBusy(document.getElementById('btn-share-whatsapp'), async () => {
    let ticket;
    try {
      ticket = await preparedFor(movie);
    } catch (e) {
      console.error('Erro ao gerar ingresso:', e);
      showToast('Não foi possível gerar o ingresso. Tente de novo.', 'error');
      return;
    }
    // Copia antes de abrir a aba: com o foco na aba nova, o navegador recusa a cópia
    // No celular não há Ctrl+V: o arquivo baixado é anexado pelo clipe da conversa
    const copied = !isTouch() && await copyImage(ticket.blob);
    if (!copied) download(ticket.blob, ticket.name);
    const win = window.open(`https://wa.me/?text=${encodeURIComponent(ticket.text)}`, '_blank');
    if (win) win.opener = null;
    if (!win) {
      showToast('O navegador bloqueou a janela do WhatsApp. Permita pop-ups para este site e tente de novo.', 'warning');
      return;
    }
    showToast(copied
      ? `Ingresso copiado! Na conversa do WhatsApp, cole com ${PASTE_KEYS}.`
      : 'Ingresso baixado. Anexe a imagem na conversa do WhatsApp pelo clipe.');
    recordSocial('ticketsShared');
  });
}
