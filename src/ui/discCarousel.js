// Carrossel em disco (efeito do clleancode, repasse da etapa 2): numa fileira com rolagem de lado,
// o item que está no ponto de destaque fica grande e inteiro, e os vizinhos menores e mais apagados,
// mudando junto com a rolagem. O destaque caminha com a rolagem (no começo, o 1º; no fim, o último),
// e soltar a rolagem encaixa o item mais perto dele. Usado no "Parecidos" e no "Elenco" da página do
// título. As contas moram em src/domain/disc.js; aqui só a medida e o desenho.
// Com "reduzir movimento", a fileira fica como uma fileira comum.
import { discFocus, discPose, discSnap } from '../domain/disc.js';
import { prefersReducedMotion } from './motion.js';

function measure(list) {
  const items = [...list.children];
  if (!items.length) return null;
  const box = list.getBoundingClientRect();
  const itemWidth = items[0].offsetWidth;
  const view = { viewWidth: list.clientWidth, itemWidth, maxScroll: list.scrollWidth - list.clientWidth };
  const focus = box.left + discFocus({ ...view, scrollLeft: list.scrollLeft });
  const step = itemWidth + parseFloat(getComputedStyle(list).columnGap || 0);
  // centro de cada item em px desde o começo do conteúdo (a escala não muda o centro)
  const centers = items.map(item => { const r = item.getBoundingClientRect(); return r.left + r.width / 2; });
  return { items, box, view, focus, step, centers };
}

function draw(list) {
  if (prefersReducedMotion()) return;
  const m = measure(list);
  if (!m) return;
  // Fileira que cabe inteira não tem para onde rolar: o disco não teria como trazer os outros ao
  // destaque, então todos ficam inteiros (achado do usuário com um elenco de 3 pessoas)
  const fits = m.view.maxScroll < 1;
  m.items.forEach((item, i) => {
    const pose = discPose(fits ? 0 : (m.centers[i] - m.focus) / m.step);
    item.style.transform = `scale(${pose.scale})`;
    item.style.opacity = String(pose.opacity);
    item.style.zIndex = String(pose.z);
  });
}

// Soltou a rolagem: o item mais perto do destaque vai exatamente para ele
function snap(list) {
  const m = measure(list);
  if (!m) return;
  const nearest = m.centers.reduce((best, c, i) => (Math.abs(c - m.focus) < Math.abs(m.centers[best] - m.focus) ? i : best), 0);
  const target = discSnap(m.centers[nearest] - m.box.left + list.scrollLeft, m.view);
  if (Math.abs(target - list.scrollLeft) > 1) {
    list.scrollTo({ left: target, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  }
}

// Liga uma vez por fileira; cada rolagem pede um desenho no próximo quadro (no máximo um por quadro)
export function bindDisc(list) {
  if (!list || list.dataset.disc) return;
  list.dataset.disc = '';
  let frame = 0;
  list.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; draw(list); });
  }, { passive: true });
  list.addEventListener('scrollend', () => snap(list));
}

// Conteúdo novo: volta ao começo (o 1º em destaque) e desenha
export function resetDisc(list) {
  list.scrollLeft = 0;
  draw(list);
}
