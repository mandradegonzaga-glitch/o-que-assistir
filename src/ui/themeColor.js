// Cor de um token do :root (src/styles/style.css) para quem desenha em canvas, que não lê CSS.
// Só para tokens com valor simples (hex); os montados com color-mix voltam como texto.
export function themeColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
