import fs from 'node:fs/promises';
import path from 'node:path';
import { adapters } from '../adapters/registry.js';
import { AgentBundle, MigrationStatus, ResourceBase } from './model/types.js';
import { createTransaction, applyTransaction, TransactionOperation } from './transaction/transaction.js';
import { getWriter, writerSupports } from './writers.js';
import { parseJsonc } from './jsonc.js';
import { parseToml, serializeToml } from './toml.js';
import { doctor } from './doctor.js';

/** Flatten AgentBundle's typed arrays into a single ResourceBase[] with type set from section name. */
export function flattenBundle(bundle: AgentBundle): ResourceBase[] {
  const resources: ResourceBase[] = [];
  for (const section of ['instructions', 'mcpServers', 'opaque'] as const) {
    for (const resource of bundle[section]) {
      resources.push({ ...resource, type: section === 'opaque' ? resource.type : section });
    }
  }
  return resources;
}

/**
 * Deep-merge two JSON objects (incoming values win on conflict, arrays
 * replace wholesale). Used when a migration overwrites an existing
 * target config, so user-added keys survive instead of being clobbered.
 */
export function deepMergeJson(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const current = result[key];
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      current && typeof current === 'object' && !Array.isArray(current)
    ) {
      result[key] = deepMergeJson(current as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Parse a config file by extension (TOML / JSONC / JSON); null if not a parseable object. */
function readDoc(p: string, raw: string): Record<string, unknown> | null {
  try {
    if (p.endsWith('.toml')) {
      return parseToml(raw);
    }
    if (p.endsWith('.jsonc')) {
      const v = parseJsonc(raw);
      return isPlainObject(v) ? v : null;
    }
    const v = JSON.parse(raw);
    return isPlainObject(v) ? v : null;
  } catch {
    // .json files from real users often carry comments / trailing commas
    // (JSONC is a strict JSON superset) — fall back before giving up.
    try {
      const v = parseJsonc(raw);
      return isPlainObject(v) ? v : null;
    } catch {
      return null;
    }
  }
}

/** Serialize a merged doc back to its file's format. */
function writeDoc(p: string, doc: Record<string, unknown>): string {
  return p.endsWith('.toml') ? serializeToml(doc) : JSON.stringify(doc, null, 2);
}

export type PlanResult = {
  resource: ResourceBase;
  status: MigrationStatus;
  method: 'copy' | 'rewrite';
};

/**
 * Statuses come from the target's real writer via writerSupports — what plan
 * reports is by construction what migration would do.
 */
export function planMigration(source: string, target: string, resources: ResourceBase[]): PlanResult[] {
  return resources.map(resource => {
    const supported = writerSupports(target, resource);
    return {
      resource,
      status: !supported
        ? MigrationStatus.UNSUPPORTED
        : resource.type === 'instructions' ? MigrationStatus.DIRECT : MigrationStatus.ADAPTED,
      method: resource.type === 'instructions' ? 'copy' : 'rewrite',
    };
  });
}

export async function migratePipeline(
  source: string,
  target: string,
  projectPath: string,
  dryRun = false
): Promise<{ txId: string | null; fileCount: number }> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) throw new Error(`Unknown source agent: ${source}. Supported: ${Object.keys(adapters).join(', ')}`);

  const writeFn = getWriter(target);
  if (!writeFn) throw new Error(`Unknown target agent: ${target}. Supported: ${Object.keys(adapters).join(', ')}`);

  try {
    await fs.access(projectPath);
  } catch {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = flattenBundle(bundle);
  const plan = planMigration(source, target, resources);
  const supported = plan.filter(p => p.status !== 'UNSUPPORTED');

  // Surface config problems instead of silently migrating whatever parsed:
  // a corrupt source file would otherwise drop its MCP servers with no word.
  const reports = await doctor(projectPath);
  const configErrors = reports
    .flatMap(r => r.problems)
    .filter(p => p.severity === 'error');
  if (configErrors.length > 0) {
    console.log(`  ⚠ ${configErrors.length} config problem(s) found — run "agent-migrate doctor" for details:`);
    for (const p of configErrors.slice(0, 3)) {
      console.log(`    - ${p.file}${p.line !== undefined ? `:${p.line}` : ''}: ${p.message}`);
    }
    if (configErrors.length > 3) console.log(`    - …and ${configErrors.length - 3} more`);
  }

  console.log(`\nMigrating: ${source} → ${target}`);
  console.log(`  Supported: ${supported.length} resources`);
  if (plan.length > supported.length) console.log(`  Unsupported: ${plan.length - supported.length} resources`);

  const targetFiles = writeFn(resources);
  const ops: TransactionOperation[] = [];
  for (const f of targetFiles) {
    let content = f.content;
    const fullPath = path.join(projectPath, f.path);
    // Merge into existing configs (JSON, JSONC, or TOML — by extension) so
    // user-added keys survive; markdown and unparseable files replace as before.
    try {
      const existingRaw = await fs.readFile(fullPath, 'utf-8');
      const existing = readDoc(f.path, existingRaw);
      const incoming = readDoc(f.path, content);
      if (existing && incoming) {
        content = writeDoc(f.path, deepMergeJson(existing, incoming));
      }
    } catch { /* no existing file — write as-is */ }
    ops.push({ type: 'create' as const, targetPath: f.path, content });
  }

  if (ops.length === 0) {
    console.log('\nNo files to write.');
    return { txId: null, fileCount: 0 };
  }

  if (dryRun) {
    console.log(`\nDry run: ${source} → ${target}`);
    console.log(`Would create ${ops.length} files:\n`);
    for (const op of ops) {
      console.log(`  + ${op.targetPath}`);
    }
    console.log('\nNo files written.');
    return { txId: null, fileCount: ops.length };
  }

  const tx = createTransaction(ops);
  await applyTransaction(tx, projectPath);

  console.log(`\nApplied ${ops.length} files.`);
  console.log(`Backup: .agentbridge/backups/${tx.id}`);
  console.log(`\nRollback: agent-migrate rollback ${projectPath} ${tx.id}`);
  console.log('\nMigration complete.');

  return { txId: tx.id, fileCount: ops.length };
}
