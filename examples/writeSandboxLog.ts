/** Minimal surface used by sandbox event logs. Phaser-free so tests can import it. */
export interface SandboxLogTarget {
  readonly active: boolean;
  setText(value: string): unknown;
}

/**
 * Updates a BitmapText log only when it still belongs to the current Scene generation.
 * `log !== null` is not enough: shutdown destroys the Game Object before create() nulls the field.
 */
export function writeSandboxLog(
  log: SandboxLogTarget | null,
  currentGeneration: number,
  targetGeneration: number,
  message: string,
): void {
  if (log === null || currentGeneration !== targetGeneration || !log.active) {
    return;
  }
  log.setText(message);
}
