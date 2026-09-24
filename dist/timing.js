// Preserve elapsed time on slow frames without taking large collision/physics steps.
// After an extreme stall, limit catch-up so a held key cannot teleport the player.
export const MAX_FRAME_SECONDS = .25;
export function advanceSimulation(seconds, step) {
  const duration = Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, MAX_FRAME_SECONDS)) : 0;
  if (!duration) return 0;
  const count = Math.max(1, Math.ceil(duration * 60 - 1e-9));
  // Render-driven actions (automatic fire) run only on the final step.
  const dt = duration / count;
  for (let i = 0; i < count; i++) step(dt, i === count - 1);
  return duration;
}
