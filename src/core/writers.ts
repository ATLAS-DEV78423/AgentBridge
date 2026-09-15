import { ResourceBase } from './model/types.js';

export type TargetFile = {
  path: string;
  content: string;
  action: 'create';
};

export type WriteFn = (resources: ResourceBase[]) => TargetFile[];

const writers: Record<string, WriteFn> = {};

export function registerWriter(target: string, writeFn: WriteFn): void {
  if (target in writers) throw new Error(`Writer already registered for: ${target}`);
  writers[target] = writeFn;
}

export function getWriter(target: string): WriteFn | undefined {
  return writers[target];
}

export function hasWriter(target: string): boolean {
  return target in writers;
}

/**
 * Probe whether `target`'s registered writer actually emits a file for
 * `resource`. Plan/diff statuses derive from this, so they can never drift
 * from real migration behavior — the writer is the single source of truth.
 * Emission under a different filename (GEMINI.md → AGENTS.md) still counts:
 * normalization is support, not rejection.
 */
export function writerSupports(target: string, resource: ResourceBase): boolean {
  const writeFn = writers[target];
  if (!writeFn) return false;
  try {
    return writeFn([resource]).length > 0;
  } catch {
    return false;
  }
}
