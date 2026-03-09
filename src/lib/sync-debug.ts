type SyncDebugPayload = Record<string, unknown>;

function isDevelopmentMode(): boolean {
  return Boolean(import.meta.env?.DEV);
}

export function logSyncDebug(
  scope: string,
  event: string,
  payload?: SyncDebugPayload,
): void {
  if (!isDevelopmentMode()) {
    return;
  }

  const prefix = `[litd:sync:${scope}] ${event}`;
  if (payload && Object.keys(payload).length > 0) {
    console.info(prefix, payload);
    return;
  }

  console.info(prefix);
}
