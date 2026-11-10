// Vídeo removido ou privado no YouTube: a miniatura mqdefault (320x180) volta como a imagem
// cinza padrão de 120x90. É a única pista disponível sem chave da API do YouTube.
const MISSING_WIDTH = 120;

export function youtubeVideoExists(key) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth !== MISSING_WIDTH);
    img.onerror = () => resolve(false);
    img.src = `https://i.ytimg.com/vi/${encodeURIComponent(key)}/mqdefault.jpg`;
  });
}

// O primeiro da lista que ainda existe, ou null
export async function firstAvailableVideo(keys) {
  for (const key of keys) {
    if (await youtubeVideoExists(key)) return key;
  }
  return null;
}
