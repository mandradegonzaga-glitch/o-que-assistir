// Imagens para compartilhar, desenhadas num canvas: o ingresso do título (src/app/ticket.js) e o
// cartão "Seu gosto" (src/app/tasteCardImage.js). Fontes do app, imagens do TMDB com CORS,
// quebra de linha e o arquivo final (baixar ou mandar pelo compartilhar do sistema).
import { IMG_URL } from '../config/constants.js';
import { isTouch } from './share.js';

export const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
export const TEXT = "'Hanken Grotesk', system-ui, sans-serif";
const IMG_BASE = IMG_URL.replace(/[^/]+$/, '');

export function loadImage(path, size = 'w500') {
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
export function drawCover(ctx, image, x, y, w, h, focusY = 0.5) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) * focusY, sw, sh, x, y, w, h);
}

// Quebra em palavras, ou em itens inteiros quando recebe uma lista (nomes do elenco não se partem)
export function wrapLines(ctx, text, maxWidth, maxLines) {
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

// Reduz a fonte até a palavra mais longa caber na largura: quebrar linha não resolve uma palavra só
export function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${DISPLAY}`;
  const longest = text.split(/[ \t\n]+/).reduce((a, b) => (ctx.measureText(b).width > ctx.measureText(a).width ? b : a), '');
  while (size > 40 && ctx.measureText(longest).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  return size;
}

export const toBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

export function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'titulo';
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const canShareFiles = file => isTouch() && Boolean(navigator.canShare?.({ files: [file] }));
