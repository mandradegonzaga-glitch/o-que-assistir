// QR code como matriz de módulos; desenhar é com quem chama. Só para textos ASCII (URLs já codificadas).
import qrcode from '../vendor/qrcode.js';

export function buildQrMatrix(text) {
  const qr = qrcode(0, 'M'); // versão automática; nível M aguenta sujeira e compressão de imagem
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
}
