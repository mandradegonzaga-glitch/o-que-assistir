// Imagem do cartão "Seu gosto" para compartilhar: o mesmo ingresso do perfil (cantos recortados para
// dentro, fio interno, título sob um arco), em 1080x1350, como o ingresso do título.
import { DISPLAY, TEXT, drawCover, fitTitleSize, loadImage, wrapLines } from '../ui/canvasImage.js';
import { themeColor } from '../ui/themeColor.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 60;
const CORNER = 56;
const INSET = 24;
const POSTER_MAX_H = 330;
const FOOTER_SPACE = 110; // nome do app no pé do ingresso

// Retângulo com os quatro cantos recortados para dentro (um quarto de círculo em cada canto)
function ticketPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w, y + h, r, -Math.PI / 2, Math.PI, true);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x, y + h, r, 0, -Math.PI / 2, true);
  ctx.lineTo(x, y + r);
  ctx.arc(x, y, r, Math.PI / 2, 0, true);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function centered(ctx, text, y) {
  ctx.textAlign = 'center';
  ctx.fillText(text, WIDTH / 2, y);
}

// Pílulas centradas, quebrando linha quando não cabem; acesas = cheias
function drawPills(ctx, pills, top, maxWidth, colors) {
  ctx.font = `700 30px ${TEXT}`;
  const padX = 26;
  const height = 58;
  const gap = 14;
  const rows = [[]];
  let rowWidth = 0;
  pills.forEach(pill => {
    const w = ctx.measureText(pill.name).width + padX * 2;
    if (rowWidth + w > maxWidth && rows.at(-1).length) {
      rows.push([]);
      rowWidth = 0;
    }
    rows.at(-1).push({ ...pill, w });
    rowWidth += w + gap;
  });
  rows.forEach((row, r) => {
    const total = row.reduce((sum, p) => sum + p.w, 0) + gap * (row.length - 1);
    let x = (WIDTH - total) / 2;
    const y = top + r * (height + gap);
    row.forEach(pill => {
      roundRect(ctx, x, y, pill.w, height, height / 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.ink;
      if (pill.lit) {
        ctx.fillStyle = colors.ink;
        ctx.fill();
      }
      ctx.stroke();
      ctx.fillStyle = pill.lit ? colors.paper : colors.ink;
      ctx.textAlign = 'center';
      ctx.fillText(pill.name, x + pill.w / 2, y + height / 2 + 11);
      x += pill.w + gap;
    });
  });
  return top + rows.length * (height + gap);
}

export async function drawTasteCard(card, matches) {
  await Promise.all([
    document.fonts.load(`900 90px ${DISPLAY}`),
    document.fonts.load(`700 30px ${TEXT}`),
  ]).catch(() => {});
  const colors = {
    background: themeColor('--bg-deep'),
    paper: themeColor('--accent-primary'),
    ink: themeColor('--accent-on'),
  };
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const posters = await Promise.all(matches.map(m => loadImage(m.poster_path, 'w342')));

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const x = MARGIN;
  const y = MARGIN;
  const w = WIDTH - MARGIN * 2;
  const h = HEIGHT - MARGIN * 2;
  ticketPath(ctx, x, y, w, h, CORNER);
  ctx.fillStyle = colors.paper;
  ctx.fill();
  ticketPath(ctx, x + INSET, y + INSET, w - INSET * 2, h - INSET * 2, CORNER - 8);
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors.ink;
  ctx.stroke();

  // Título entre dois fios, com o arco apoiado no de cima
  const topLine = 230;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, topLine, 80, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  const title = card.title.toUpperCase();
  const size = fitTitleSize(ctx, title, w - 200, 92);
  ctx.font = `900 ${size}px ${DISPLAY}`;
  const lines = wrapLines(ctx, title, w - 200, 2);
  const firstBaseline = topLine + 24 + size * 0.8;
  lines.forEach((line, i) => centered(ctx, line, firstBaseline + i * size * 0.95));
  const titleBottom = firstBaseline + (lines.length - 1) * size * 0.95 + 34;
  [topLine, titleBottom].forEach(lineY => {
    ctx.beginPath();
    ctx.moveTo(x + 150, lineY);
    ctx.lineTo(x + w - 150, lineY);
    ctx.stroke();
  });

  // Três dados grandes
  const column = (w - INSET * 2) / 3;
  card.stats.forEach((stat, i) => {
    const cx = x + INSET + column * i + column / 2;
    ctx.textAlign = 'center';
    ctx.font = `700 26px ${TEXT}`;
    ctx.fillText(stat.label.toUpperCase(), cx, titleBottom + 80);
    ctx.font = `900 ${stat.value.length > 9 ? 50 : 64}px ${DISPLAY}`;
    ctx.fillText(stat.value, cx, titleBottom + 150);
  });

  ctx.font = `900 40px ${DISPLAY}`;
  centered(ctx, 'GÊNEROS', titleBottom + 250);
  const pillsBottom = drawPills(ctx, card.pills, titleBottom + 280, w - 160, colors);

  if (posters.some(Boolean)) {
    ctx.font = `900 40px ${DISPLAY}`;
    centered(ctx, 'COMBINA COM', pillsBottom + 60);
    const shown = posters.filter(Boolean);
    const gap = 28;
    // Os pôsteres encolhem para caber acima do nome do app (título em 2 linhas, gêneros em 3)
    const posterTop = pillsBottom + 90;
    const posterH = Math.min(POSTER_MAX_H, y + h - FOOTER_SPACE - posterTop);
    const posterW = posterH * 2 / 3;
    let px = (WIDTH - (shown.length * posterW + (shown.length - 1) * gap)) / 2;
    shown.forEach(image => {
      ctx.save();
      roundRect(ctx, px, posterTop, posterW, posterH, 18);
      ctx.clip();
      drawCover(ctx, image, px, posterTop, posterW, posterH);
      ctx.restore();
      px += posterW + gap;
    });
  }

  ctx.font = `800 34px ${DISPLAY}`;
  centered(ctx, 'O QUE ASSISTIR?', y + h - INSET - 34);
  return canvas;
}
