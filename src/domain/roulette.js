// A primeira fatia começa no topo (sob o ponteiro) e as seguintes vêm em sentido horário.
// Girar R graus leva o ângulo θ para θ + R, então o centro da fatia para no topo com R = 360·voltas − centro.
export function computeSpinRotation(winnerIndex, itemCount, spins) {
  const sliceAngle = 360 / itemCount;
  const center = (winnerIndex + 0.5) * sliceAngle;
  return Math.trunc(spins) * 360 - center;
}

// Índice da fatia sob o ponteiro depois de girar `rotation` graus
export function sliceAtPointer(rotation, itemCount) {
  const sliceAngle = 360 / itemCount;
  const angleAtPointer = ((-rotation % 360) + 360) % 360;
  return Math.floor(angleAtPointer / sliceAngle);
}
