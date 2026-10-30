// Ingresso compartilhável: imagem do título escolhido, gerada no próprio aparelho.
import { IMG_URL } from '../config/constants.js';
import { buildQrMatrix } from '../domain/qr.js';
import { state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating } from '../utils/format.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 70;
const COLORS = { background: '#14101f', ticket: '#ffc94d', ink: '#17121f' };
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
const TEXT = "'Hanken Grotesk', system-ui, sans-serif";
const QR_BOX = 190;

function loadPoster(path) {
  return new Promise(resolve => {
    if (!path) { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = 'anonymous'; // sem isso, o canvas fica bloqueado para exportar
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // sem pôster, o ingresso sai só com o texto
    // Endereço próprio: a cópia que o navegador já guardou do pôster veio sem CORS e seria recusada
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

function wrapLines(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  text.split(/\s+/).forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  cut[maxLines - 1] = `${cut[maxLines - 1].replace(/[\s,.:;-]+$/, '')}…`;
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
function titleUrl(movie) {
  const type = ['movie', 'tv', 'dorama'].includes(movie.media_type) ? movie.media_type : state.type;
  return `${location.origin}${location.pathname}?titulo=${type}-${movie.id}`;
}

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

export async function drawTicket(movie) {
  await Promise.all([
    document.fonts.load(`900 90px ${DISPLAY}`),
    document.fonts.load(`500 34px ${TEXT}`),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const w = WIDTH - MARGIN * 2;
  const h = HEIGHT - MARGIN * 2;
  const tearY = MARGIN + h - 240;

  drawTicketShape(ctx, MARGIN, MARGIN, w, h, tearY);
  ctx.fillStyle = COLORS.ticket;
  ctx.fill();

  const inner = MARGIN + 60;
  const innerWidth = w - 120;
  const poster = await loadPoster(movie.poster_path);
  let textX = inner;
  let textWidth = innerWidth;

  if (poster) {
    const posterHeight = 600;
    const posterWidth = posterHeight * (2 / 3);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(inner, MARGIN + 60, posterWidth, posterHeight, 18);
    ctx.clip();
    ctx.drawImage(poster, inner, MARGIN + 60, posterWidth, posterHeight);
    ctx.restore();
    textX = inner + posterWidth + 44;
    textWidth = innerWidth - posterWidth - 44;
  }

  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = 'top';
  ctx.font = `500 34px ${TEXT}`;
  ctx.fillText('Hoje é dia de', textX, MARGIN + 66);

  const name = (movie.title || movie.name || '').toUpperCase();
  const titleSize = fitTitleSize(ctx, name, textWidth, poster ? 92 : 150);
  const lineHeight = titleSize * 1.04;
  ctx.font = `900 ${titleSize}px ${DISPLAY}`;
  const lines = wrapLines(ctx, name, textWidth, 5);
  lines.forEach((line, i) => ctx.fillText(line, textX, MARGIN + 126 + i * lineHeight));

  const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
  const meta = [year, movie.vote_average ? `Nota ${formatRating(movie.vote_average)}` : ''].filter(Boolean).join(' · ');
  ctx.font = `500 34px ${TEXT}`;
  ctx.fillText(meta, textX, MARGIN + 150 + lines.length * lineHeight);

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
  ctx.fillText('O QUE ASSISTIR?', inner, tearY + 54);
  ctx.font = `500 32px ${TEXT}`;
  ctx.fillText('Aponte a câmera para abrir', inner, tearY + 146);

  drawQr(ctx, titleUrl(movie), MARGIN + w - 60 - QR_BOX, tearY + 28);

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

function shareText(movie) {
  const title = movie.title || movie.name || '';
  return `Hoje é dia de: ${title}\nNota ${formatRating(movie.vote_average)}\n\nVeja em: ${location.href}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Um gesto só: ingresso, texto e link do título juntos
export async function compartilhar() {
  const movie = state.currentMovie;
  const btn = document.getElementById('btn-compartilhar');
  if (!movie || btn.disabled) return;
  btn.disabled = true;

  try {
    const text = shareText(movie);
    const title = movie.title || movie.name || '';
    const name = `ingresso-${slug(title)}.png`;
    const blob = await toBlob(await drawTicket(movie));
    const file = new File([blob], name, { type: 'image/png' });

    // No celular abre o compartilhar do sistema; no computador não há para onde enviar a imagem
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Hoje é dia de: ${title}`, text });
      } catch (e) {
        if (e.name !== 'AbortError') {
          download(blob, name);
          await copyText(text);
          showToast('Ingresso baixado. Cole o texto na conversa.');
        }
      }
      return;
    }

    download(blob, name);
    const copied = await copyText(text);
    showToast(copied ? 'Ingresso baixado e link copiado!' : 'Ingresso baixado!');
  } catch (e) {
    console.error('Erro ao compartilhar:', e);
    showToast('Não foi possível gerar o ingresso. Tente de novo.', 'error');
  } finally {
    btn.disabled = false;
  }
}
