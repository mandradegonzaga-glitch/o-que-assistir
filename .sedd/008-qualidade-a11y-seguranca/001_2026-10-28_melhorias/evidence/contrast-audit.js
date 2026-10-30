// Auditoria de contraste WCAG 2.2 AA para textos visíveis (rodar no console da página).
// Cor do texto: color com alfa × opacidade acumulada dos ancestrais, composta sobre o fundo efetivo.
// Fundo efetivo: composição dos background-color dos ancestrais (gradientes/imagens são ignorados → marcado "aprox").
(() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

  const bgOf = el => {
    const layers = []; let approx = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') approx = true;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) layers.push(c);
      if (c && c.a === 1) break;
    }
    let base = { r: 5, g: 5, b: 5, a: 1 }; // --bg-primary
    for (const l of layers.reverse()) base = over(l, base);
    return { color: base, approx };
  };
  const opacityOf = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };

  const seen = new Set(); const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: t => t.textContent.trim() ? 1 : 3 });
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!el || seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"], .sr-only, svg')) continue;
    if (el.offsetParent === null && cs.position !== 'fixed') continue;
    const fg0 = parse(cs.color); if (!fg0) continue;
    const { color: bg, approx } = bgOf(el);
    const fg = over({ ...fg0, a: fg0.a * opacityOf(el) }, bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) out.push({ texto: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), seletor: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), contraste: +cr.toFixed(2), minimo: need, fonte: size + 'px', aprox: approx });
  }
  return out.sort((a, b) => a.contraste - b.contraste);
})()
