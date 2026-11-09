// Ingresso e compartilhar do título aberto no modal.
// "Gerar ingresso" baixa só a imagem; "Compartilhar" abre as opções: outros apps (com ingresso, texto e link) e amigos do app.
import { tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { buildQrMatrix } from '../domain/qr.js';
import { shareText, titleKind, titleLink } from '../domain/titleShare.js';
import { state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { ph } from '../ui/phosphor.js';
import { formatRuntime } from '../domain/titleFacts.js';
import { formatRating } from '../utils/format.js';
import { refreshFriends } from './friends.js';
import { recordSocial, trackChallenge } from './progress.js';
import { MEDIA_KIND, getYear, getTitle } from '../domain/mediaItem.js';
import { appBase, isTouch } from '../ui/share.js';
import { registerActions } from '../ui/actions.js';
import { whileBusy } from '../ui/busy.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 48;
const PAD = 52;
const STUB = 230;
const HERO = 520;
const HERO_SMALL = 390;
const COLORS = {
  background: '#0d0a14',
  card: '#16111f',
  ink: '#17121f',
  text: '#f4f1fa',
  muted: 'rgba(244, 241, 250, 0.72)',
  line: 'rgba(255, 255, 255, 0.14)',
};
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
const TEXT = "'Hanken Grotesk', system-ui, sans-serif";
const IMG_BASE = IMG_URL.replace(/[^/]+$/, '');
const QR_BOX = 184;
const LOGO = 64;
const SECTION_GAP = 26;
const BODY_LINE = 40;

function loadImage(path, size = 'w500') {
  return new Promise(resolve => {
    if (!path) { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = 'anonymous'; // sem isso, o canvas fica bloqueado para exportar
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // imagem sem CORS ou fora do ar: o ingresso sai sem ela
    // Endereço próprio: a cópia que o navegador já guardou da imagem veio sem CORS e seria recusada
    image.src = `${IMG_BASE}${size}${path}?ingresso=1`;
  });
}

// Preenche a área inteira cortando as sobras; focusY escolhe que altura da imagem fica (0 = topo)
function drawCover(ctx, image, x, y, w, h, focusY = 0.5) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) * focusY, sw, sh, x, y, w, h);
}

// Desfoque que cobre a área; sem filtro no canvas, uma cópia minúscula ampliada faz o efeito
function drawBlurred(ctx, image, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = 'blur(48px)';
  if (ctx.filter === 'blur(48px)') {
    drawCover(ctx, image, x - 120, y - 120, w + 240, h + 240);
  } else {
    ctx.filter = 'none';
    const small = document.createElement('canvas');
    small.width = 24;
    small.height = Math.max(12, Math.round((24 * h) / w));
    drawCover(small.getContext('2d'), image, 0, 0, small.width, small.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, x, y, w, h);
  }
  ctx.restore();
}

// Fundo com a imagem do título desfocada, como na página do título.
function drawAmbient(ctx, image, accent) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (image) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawBlurred(ctx, image, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }
  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, WIDTH);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(13, 10, 20, 0.45)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  // Só o espaço comum quebra: o espaço inseparável (\u00A0) mantém palavras juntas
  (isList ? text : text.split(/[ \t\n]+/)).filter(Boolean).forEach(word => {
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

// Artigos e preposições curtos (A, O, DE, DO...) presos à palavra seguinte: nenhuma linha termina em "ANÉIS: A"
function glueShortWords(text) {
  let glued = text;
  let previous;
  do {
    previous = glued;
    glued = glued.replace(/(^|[\s\u00A0])([^\s\u00A0]{1,2}) (?=\S)/gu, '$1$2\u00A0');
  } while (glued !== previous);
  return glued;
}

// Mesmo número de linhas, mas com larguras parecidas, para o título não ficar com uma linha comprida e outra curta.
// Procura a menor largura que ainda cabe nas mesmas linhas (o título cortado com … fica como está).
function balanceLines(ctx, text, maxWidth, lines) {
  if (lines.length < 2 || lines[lines.length - 1].endsWith('…')) return lines;
  let low = maxWidth / lines.length;
  let high = maxWidth;
  while (high - low > 2) {
    const mid = (low + high) / 2;
    if (wrapLines(ctx, text, mid, Infinity).length <= lines.length) high = mid;
    else low = mid;
  }
  return wrapLines(ctx, text, high, lines.length);
}

// Reduz a fonte até a palavra mais longa caber na largura: quebrar linha não resolve uma palavra só
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${DISPLAY}`;
  const longest = text.split(/[ \t\n]+/).reduce((a, b) => (ctx.measureText(b).width > ctx.measureText(a).width ? b : a), '');
  while (size > 40 && ctx.measureText(longest).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  return size;
}

// Link curto e limpo: quanto menor o texto, mais fácil de ler pela câmera
const titleUrl = (movie, kind) => titleLink(appBase(), kind, movie.id);

// Cartão branco com margem: a câmera precisa de contraste e de uma borda livre em volta
function drawQr(ctx, text, x, y) {
  const matrix = buildQrMatrix(text);
  const quiet = 3;
  const cell = Math.floor(QR_BOX / (matrix.length + quiet * 2));
  const side = cell * (matrix.length + quiet * 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, side, side, 18);
  ctx.fill();
  ctx.fillStyle = '#000000';
  matrix.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell, cell);
  }));
  return side;
}

// Elenco, plataformas e duração: o modal já pediu os mesmos dados, então em geral vêm do cache
export async function titleExtras(movie, kind) {
  const endpoint = kind === 'movie' ? 'movie' : 'tv';
  const detailParams = endpoint === 'movie' ? { append_to_response: 'release_dates' } : {}; // igual ao modal
  const [credits, watch, details] = await Promise.allSettled([
    tmdbGet(`/${endpoint}/${movie.id}/credits`, {}),
    tmdbGet(`/${endpoint}/${movie.id}/watch/providers`, { language: null }),
    tmdbGet(`/${endpoint}/${movie.id}`, detailParams),
  ]);
  const cast = (credits.value?.cast || []).map(a => a.name).filter(Boolean).slice(0, 4);
  const providers = (watch.value?.results?.BR?.flatrate || [])
    .filter(p => p.provider_name)
    .map(p => ({ name: p.provider_name, logo: p.logo_path }));
  const length = endpoint === 'movie'
    ? formatRuntime(details.value?.runtime)
    : String(details.value?.number_of_seasons || '');
  // Imagens de reserva para o topo: os detalhes às vezes trazem o que a lista não trouxe
  const backdrop = movie.backdrop_path || details.value?.backdrop_path || null;
  const poster = movie.poster_path || details.value?.poster_path || null;
  const castPhotos = (credits.value?.cast || []).map(a => a.profile_path).filter(Boolean).slice(0, 4);
  let still = null;
  if (endpoint === 'tv' && !backdrop && !poster) {
    // Série sem imagem nenhuma: uma cena de episódio da 1ª temporada
    const season = await tmdbGet(`/tv/${movie.id}/season/1`, {}).catch(() => null);
    still = (season?.episodes || []).map(e => e.still_path).find(Boolean) || null;
  }
  return { cast, providers, length, backdrop, poster, still, castPhotos };
}

// Ícone do tipo (claquete ou TV) como imagem, para o topo de quem não tem foto nenhuma
function loadKindIcon(kind, color) {
  const svg = ph(kind === 'movie' ? 'film-slate' : 'television', { weight: 'duotone' })
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll('currentColor', color);
  if (!svg) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

// Mosaico de rostos do elenco, lado a lado, para o topo de quem não tem pôster nem cena
function drawCastMosaic(ctx, photos, x, y, w, h) {
  const tile = w / photos.length;
  photos.forEach((photo, i) => drawCover(ctx, photo, x + i * tile, y, Math.ceil(tile), h, 0.15));
}

// Imagens do topo, na ordem: paisagem → pôster inteiro ao lado → cena de episódio → elenco → ícone
async function loadHero(movie, { backdrop, poster, still, castPhotos = [] }) {
  const [wide, tall] = await Promise.all([
    loadImage(backdrop || movie.backdrop_path, 'w1280'),
    loadImage(poster || movie.poster_path),
  ]);
  if (wide) return { mode: 'wide', image: wide, ambient: tall || wide };
  if (tall) return { mode: 'poster', image: tall, ambient: tall };
  const scene = await loadImage(still, 'w780');
  if (scene) return { mode: 'wide', image: scene, ambient: scene };
  const faces = (await Promise.all(castPhotos.map(p => loadImage(p, 'w185')))).filter(Boolean);
  if (faces.length >= 2) return { mode: 'cast', faces, ambient: faces[0] };
  return { mode: 'none' };
}

function drawLabel(ctx, text, x, y, color) {
  ctx.font = `700 20px ${TEXT}`;
  ctx.fillStyle = color;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.fillText(text.toUpperCase(), x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

// Grade TIPO · ANO · NOTA · DURAÇÃO, como os campos de um ingresso de verdade
function drawFacts(ctx, facts, x, y, width, accent) {
  const column = width / facts.length;
  facts.forEach(([label, value], i) => {
    const cx = x + i * column + (i ? 24 : 0);
    if (i) {
      ctx.fillStyle = COLORS.line;
      ctx.fillRect(x + i * column, y, 2, 76);
    }
    drawLabel(ctx, label, cx, y, accent);
    ctx.font = `800 46px ${DISPLAY}`;
    ctx.fillStyle = COLORS.text;
    const [line] = wrapLines(ctx, value, column - 36, 1);
    ctx.fillText(line, cx, y + 30);
  });
  return 76;
}

export async function drawTicket(movie, {
  kind = titleKind(movie, state.type), cast = [], providers = [], length = '', ...images
} = {}) {
  await Promise.all([
    document.fonts.load(`900 90px ${DISPLAY}`),
    document.fonts.load(`800 46px ${DISPLAY}`),
    document.fonts.load(`500 34px ${TEXT}`),
    document.fonts.load(`700 20px ${TEXT}`),
  ]).catch(() => {});

  const accent = (MEDIA_KIND[kind] || MEDIA_KIND.movie).color;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  const [hero, logos, icon] = await Promise.all([
    loadHero(movie, images),
    Promise.all(providers.slice(0, 8).map(p => loadImage(p.logo))),
    loadKindIcon(kind, accent),
  ]);

  drawAmbient(ctx, hero.ambient, accent);

  const w = WIDTH - MARGIN * 2;
  const h = HEIGHT - MARGIN * 2;
  const tearY = MARGIN + h - STUB;
  const left = MARGIN + PAD;
  const width = w - PAD * 2;
  // Sem foto nenhuma, o topo encolhe e o espaço vai para a sinopse
  const heroHeight = hero.mode === 'none' ? HERO_SMALL : HERO;
  const heroBottom = MARGIN + heroHeight;
  const bottom = tearY - 40;
  // Pôster inteiro à direita, sem corte; o título fica na coluna da esquerda
  const posterH = heroHeight - 88;
  const posterW = Math.round(posterH * (2 / 3));
  const titleWidth = hero.mode === 'poster' ? width - posterW - 40 : width;

  drawTicketShape(ctx, MARGIN, MARGIN, w, h, tearY);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Título em até 2 linhas (3 ao lado do pôster), diminuindo a fonte; só um nome enorme passa disso
  ctx.textBaseline = 'top';
  const name = glueShortWords(getTitle(movie).toUpperCase());
  const [preferred, maxLines, minSize] = hero.mode === 'poster' ? [3, 4, 64] : [2, 3, 76];
  let titleSize = fitTitleSize(ctx, name, titleWidth, 112);
  let titleLines = wrapLines(ctx, name, titleWidth, maxLines);
  while (titleLines.length > preferred && titleSize > minSize) {
    titleSize -= 4;
    ctx.font = `900 ${titleSize}px ${DISPLAY}`;
    titleLines = wrapLines(ctx, name, titleWidth, maxLines);
  }
  titleLines = balanceLines(ctx, name, titleWidth, titleLines);
  const titleLine = titleSize * 0.98;
  const titleTop = heroBottom - 20 - titleLines.length * titleLine;
  const pillY = titleTop - 64;

  // Topo: imagem grande que se funde ao cartão, escurecida a partir do selo para o título ler bem
  ctx.save();
  drawTicketShape(ctx, MARGIN, MARGIN, w, h, tearY);
  ctx.clip();
  if (hero.mode === 'wide') {
    drawCover(ctx, hero.image, MARGIN, MARGIN, w, heroHeight, 0.35);
  } else if (hero.mode === 'poster') {
    drawBlurred(ctx, hero.image, MARGIN, MARGIN, w, heroHeight);
    ctx.fillStyle = 'rgba(13, 10, 20, 0.35)';
    ctx.fillRect(MARGIN, MARGIN, w, heroHeight);
  } else if (hero.mode === 'cast') {
    drawCastMosaic(ctx, hero.faces, MARGIN, MARGIN, w, heroHeight);
  } else {
    const tint = ctx.createLinearGradient(0, MARGIN, 0, heroBottom);
    tint.addColorStop(0, `${accent}66`);
    tint.addColorStop(1, `${accent}00`);
    ctx.fillStyle = tint;
    ctx.fillRect(MARGIN, MARGIN, w, heroHeight);
    if (icon) {
      ctx.globalAlpha = 0.22;
      ctx.drawImage(icon, MARGIN + w - PAD - 170, MARGIN + 26, 170, 170);
      ctx.globalAlpha = 1;
    }
  }
  const fade = ctx.createLinearGradient(0, Math.max(MARGIN, pillY - 140), 0, heroBottom);
  fade.addColorStop(0, 'rgba(22, 17, 31, 0)');
  fade.addColorStop(0.5, 'rgba(22, 17, 31, 0.7)');
  fade.addColorStop(1, COLORS.card);
  ctx.fillStyle = fade;
  ctx.fillRect(MARGIN, MARGIN, w, heroHeight + 2);
  if (hero.mode === 'poster') {
    const px = MARGIN + w - PAD - posterW;
    const py = MARGIN + 44;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = COLORS.card;
    ctx.beginPath();
    ctx.roundRect(px, py, posterW, posterH, 18);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, posterW, posterH, 18);
    ctx.clip();
    ctx.drawImage(hero.image, px, py, posterW, posterH);
    ctx.restore();
  }
  ctx.restore();
  drawTicketShape(ctx, MARGIN, MARGIN, w, h, tearY);
  ctx.stroke(); // borda por cima da imagem, contínua de cima a baixo

  ctx.font = `900 ${titleSize}px ${DISPLAY}`;
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  titleLines.forEach((line, i) => ctx.fillText(line, left, titleTop + i * titleLine));
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Selo na cor do tipo: âmbar filme, verde-água série, rosa dorama
  ctx.font = `700 22px ${TEXT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  const kicker = 'HOJE É DIA DE';
  const pillW = ctx.measureText(kicker).width + 44;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(left, pillY, pillW, 46, 23);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(kicker, left + 22, pillY + 12);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // Corpo: grade de dados, sinopse com o espaço que sobrar, elenco e plataformas
  const year = getYear(movie);
  const facts = [
    ['Tipo', MEDIA_KIND[kind].one],
    ['Ano', year],
    ['Nota', movie.vote_average ? formatRating(movie.vote_average) : ''],
    [kind === 'movie' ? 'Duração' : 'Temporadas', length],
  ].filter(([, value]) => value);
  let y = heroBottom + 28;
  if (facts.length) y += drawFacts(ctx, facts, left, y, width, accent) + 34;

  ctx.font = `500 30px ${TEXT}`;
  const castLine = cast.length ? wrapLines(ctx, cast, width - 70, 1)[0] : '';
  const castHeight = castLine ? BODY_LINE : 0;
  const providerHeight = providers.length ? 32 + LOGO : 0;
  const reserved = (castHeight && castHeight + SECTION_GAP) + (providerHeight && providerHeight + SECTION_GAP);

  ctx.font = `400 30px ${TEXT}`;
  ctx.fillStyle = COLORS.muted;
  const synopsisLines = Math.min(6, Math.floor((bottom - y - reserved) / BODY_LINE));
  if (movie.overview && synopsisLines >= 1) {
    const lines = wrapLines(ctx, movie.overview, width, synopsisLines);
    lines.forEach((line, i) => ctx.fillText(line, left, y + i * BODY_LINE));
    y += lines.length * BODY_LINE + SECTION_GAP;
  }

  if (castHeight && y + castHeight <= bottom) {
    ctx.font = `400 30px ${TEXT}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('Com', left, y);
    const offset = ctx.measureText('Com ').width;
    ctx.font = `500 30px ${TEXT}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(castLine, left + offset, y);
    y += castHeight + SECTION_GAP;
  }

  if (providerHeight && y + providerHeight <= bottom) {
    drawLabel(ctx, 'Onde assistir', left, y, accent);
    const rowY = y + 32;
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
      ctx.fillStyle = COLORS.text;
      const [line] = wrapLines(ctx, providers.map(p => p.name), width, 1);
      ctx.fillText(line, left, rowY + (LOGO - 30) / 2);
    }
  }

  // Picote entre o corpo e o canhoto
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.moveTo(MARGIN + 56, tearY);
  ctx.lineTo(MARGIN + w - 56, tearY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Canhoto: marca na cor do tipo e o QR que abre o título
  const qrY = tearY + (STUB - QR_BOX) / 2;
  const qrSide = drawQr(ctx, titleUrl(movie, kind), MARGIN + w - PAD - QR_BOX, qrY);
  ctx.font = `900 76px ${DISPLAY}`;
  ctx.fillStyle = accent;
  ctx.fillText('O QUE ASSISTIR?', left, qrY + 18);
  ctx.font = `500 30px ${TEXT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Aponte a câmera para abrir', left, qrY + qrSide - 52);

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
  const title = getTitle(movie);
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


// Atalho de colar de cada sistema
const PASTE_KEYS = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '') ? 'Cmd+V' : 'Ctrl+V';

function gerarIngresso() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return whileBusy(document.getElementById('btn-ingresso'), async () => {
    try {
      const { blob, name } = await preparedFor(movie);
      download(blob, name);
      showToast('Ingresso baixado!');
    } catch (e) {
      console.error('Erro ao gerar ingresso:', e);
      showToast('Não foi possível gerar o ingresso. Tente de novo.', 'error');
    }
  }, { label: 'Gerando…' });
}

const canShareFiles = file => isTouch() && Boolean(navigator.canShare?.({ files: [file] }));

function compartilhar() {
  const movie = state.currentMovie;
  if (!movie) return;
  const kind = titleKind(movie, state.type);
  document.getElementById('share-subtitle').textContent = `${getTitle(movie)} · ${MEDIA_KIND[kind].one}`;
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
function compartilharApps() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return whileBusy(document.getElementById('btn-share-apps'), async () => {
    try {
      const { text, title, blob, name, file } = await preparedFor(movie);
      if (canShareFiles(file)) {
        try {
          await navigator.share({ files: [file], title: `Hoje é dia de: ${title}`, text });
          recordSocial('ticketsShared');
          trackChallenge('ticket');
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
      trackChallenge('ticket');
    } catch (e) {
      console.error('Erro ao compartilhar:', e);
      showToast('Não foi possível compartilhar. Tente de novo.', 'error');
    }
  }, { label: 'Preparando…' });
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
function compartilharWhatsapp() {
  const movie = state.currentMovie;
  if (!movie) return Promise.resolve();
  return whileBusy(document.getElementById('btn-share-whatsapp'), async () => {
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
    trackChallenge('ticket');
  }, { label: 'Preparando…' });
}

registerActions({
  click: {
    compartilhar,
    compartilharApps,
    compartilharWhatsapp,
    gerarIngresso,
  },
});
