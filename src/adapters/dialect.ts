/**
 * The `type: "local" | "remote"` MCP dialect shared by OpenCode and Kilo:
 * local servers carry an array `command` + `environment`, remote keep
 * url/headers. Both agents document the same shape, so the translation in
 * each direction is written once here instead of twice per adapter.
 */

/** Strip agent-dialect fields so servers flow in the canonical command/args/env + url shape. */
export function canonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

/** Dialect server → canonical command/args/env + url shape the writers consume. */
export function toCanonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  if (server.type === 'local' && Array.isArray(server.command)) {
    const [command, ...args] = server.command as unknown[];
    return {
      ...(typeof command === 'string' ? { command } : {}),
      ...(args.length > 0 ? { args } : {}),
      ...(server.environment && typeof server.environment === 'object' ? { env: server.environment } : {}),
    };
  }
  if (typeof server.url === 'string') {
    return { url: server.url, ...(server.headers ? { headers: server.headers } : {}) };
  }
  return server;
}

/** Canonical command/args/env + url → the dialect's local/remote shape. */
export function fromCanonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  if (typeof server.url === 'string') {
    return {
      type: 'remote',
      url: server.url,
      ...(server.headers && typeof server.headers === 'object' ? { headers: server.headers } : {}),
    };
  }
  return {
    type: 'local',
    command: [
      ...(typeof server.command === 'string' ? [server.command] : []),
      ...(Array.isArray(server.args) ? server.args : []),
    ],
    ...(server.env && typeof server.env === 'object' ? { environment: server.env } : {}),
  };
}
