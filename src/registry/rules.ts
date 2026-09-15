import { CompatibilityRule } from '../core/compatibility/engine.js';
import { MigrationStatus } from '../core/model/types.js';

/**
 * Project-config support confirmed from each agent's official docs. Codex's
 * model field comes from .codex/config.toml (stored as normalized JSON).
 */
export const AGENT_IDS = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini',
  'codex', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi',
] as const;

/** Per-target: which opaque fields the writer actually maps into its config. */
const OPAQUE_FIELDS: Record<string, string[]> = {
  'claude-code': ['model', 'permissions'],
  'opencode': ['model', 'maxTokens'],
  'kilo': ['model', 'maxTokens'],
  'codex': ['model'],
  // cursor, gemini, copilot, crush, grok, omp, muse-code, pi:
  // no confirmed model-equivalent fields in their project configs.
};

const CAPABILITIES: { capability: string; method: 'copy' | 'rewrite'; status: MigrationStatus }[] = [
  { capability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT },
  { capability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED },
  { capability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED },
];

const RULES: CompatibilityRule[] = AGENT_IDS.flatMap(source =>
  AGENT_IDS
    .filter(target => target !== source)
    .flatMap(target =>
      CAPABILITIES.map(({ capability, method, status }) => ({
        id: `${source}-${capability}-${target}`,
        sourceCapability: capability,
        method,
        status: capability === 'opaque' && !(OPAQUE_FIELDS[target]?.length) 
          ? MigrationStatus.UNSUPPORTED
          : status,
      }))
    )
);

export function getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[] {
  return RULES.filter(r => r.id.startsWith(`${sourceAgent}-`) && r.id.endsWith(`-${targetAgent}`));
}
