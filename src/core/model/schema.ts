import { AgentBundle, MigrationStatus } from './types.js';

const VALID_STATUSES = new Set(Object.values(MigrationStatus));
const SCHEMA_VERSION = '1.0.0';

export function createBundle(name: string): AgentBundle {
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      name,
      createdAt: new Date().toISOString()
    },
    instructions: [],
    skills: [],
    commands: [],
    agents: [],
    mcpServers: [],
    permissions: [],
    hooks: [],
    opaque: []
  };
}

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateBundle(bundle: unknown): ValidationResult {
  const errors: string[] = [];
  const b = bundle as Record<string, unknown>;

  if (!b || typeof b !== 'object') {
    return { valid: false, errors: ['Bundle must be an object'] };
  }

  if (typeof b.schemaVersion !== 'string') {
    errors.push('schemaVersion is required and must be a string');
  }

  if (!b.metadata || typeof b.metadata !== 'object') {
    errors.push('metadata is required');
  } else {
    const meta = b.metadata as Record<string, unknown>;
    if (typeof meta.name !== 'string') {
      errors.push('metadata.name is required');
    }
  }

  const resourceArrays = [
    'instructions', 'skills', 'commands', 'agents',
    'mcpServers', 'permissions', 'hooks', 'opaque'
  ];

  for (const key of resourceArrays) {
    if (!Array.isArray(b[key])) {
      errors.push(`${key} must be an array`);
    }
  }

  // Validate resources have valid compatibility status
  for (const key of resourceArrays) {
    if (Array.isArray(b[key])) {
      for (const resource of b[key] as Record<string, unknown>[]) {
        if (resource.compatibility) {
          const compat = resource.compatibility as Record<string, unknown>;
          if (compat.status && !VALID_STATUSES.has(compat.status as MigrationStatus)) {
            errors.push(`Invalid compatibility status: ${compat.status}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
