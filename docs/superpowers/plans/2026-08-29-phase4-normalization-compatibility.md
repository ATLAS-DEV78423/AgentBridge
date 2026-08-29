# Phase 4: Normalization + Compatibility Engine Enhancement

> **For agentic workers:** Use executing-plans to implement this plan task-by-task.

**Goal:** Convert agent-specific scanner output into canonical model and produce explainable per-resource compatibility results with a human-readable migration plan command.

**Architecture:** Normalizer transforms scanner bundles into flat resource lists, a capability registry describes what each agent supports, compatibility rules define how capabilities map, and the plan command ties it all together.

**Tech Stack:** TypeScript, Node.js >= 18, Vitest

**Spec:** `refeernces ,plans and agent.md/agent-migration-user-ready-roadmap.md` (Phase 4)

---

## What Exists Already

- `src/registry/capabilities.ts` + test ✅ (4 tests)
- `src/core/compatibility/engine.ts` + test ✅ (4 tests, basic `evaluateCompatibility`)
- All 3 scanners working (claude, opencode, kilo)
- 43 tests total

## What This Plan Adds

1. **Compatibility Rules** — mapping rules between agent pairs
2. **Normalizer** — converts `AgentBundle` to flat `NormalizedResource[]`
3. **Enhanced Engine** — `evaluateResources()` for batch evaluation
4. **Plan Command** — `agentbridge plan <source> <target> [path]`
5. **Integration Test** — proves scan → normalize → compat pipeline

---

## Task 1: Compatibility Rules

**Files:**
- Create: `src/registry/rules.ts`
- Create: `tests/unit/registry/rules.test.ts`
- Modify: `src/registry/index.ts`

**Interfaces:**
- Consumes: `MigrationStatus` from model
- Produces: `getRules(source, target)` returning `CompatibilityRule[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/registry/rules.test.ts
import { describe, it, expect } from 'vitest';
import { getRules } from '../../../src/registry/rules.js';

describe('Compatibility Rules', () => {
  it('returns rules for claude-to-opencode', () => {
    const rules = getRules('claude-code', 'opencode');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some(r => r.sourceCapability === 'instruction')).toBe(true);
  });

  it('returns empty for unknown target', () => {
    const rules = getRules('claude-code', 'unknown');
    expect(rules).toEqual([]);
  });

  it('rule has required fields', () => {
    const rules = getRules('claude-code', 'opencode');
    const rule = rules[0];
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('sourceCapability');
    expect(rule).toHaveProperty('status');
    expect(rule).toHaveProperty('method');
    expect(rule).toHaveProperty('confidence');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/registry/rules.test.ts`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/registry/rules.ts
import { MigrationStatus } from '../core/model/types.js';

export type CompatibilityRule = {
  id: string;
  sourceCapability: string;
  targetCapability?: string;
  method: 'copy' | 'rewrite' | 'generate' | 'omit';
  status: MigrationStatus;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  warnings: string[];
};

const RULES: Record<string, CompatibilityRule[]> = {
  'claude-code->opencode': [
    {
      id: 'instruction-direct',
      sourceCapability: 'instruction',
      targetCapability: 'instruction',
      method: 'copy',
      status: MigrationStatus.DIRECT,
      confidence: 'high',
      reasons: ['Both agents support markdown instructions'],
      warnings: []
    },
    {
      id: 'skill-adapted',
      sourceCapability: 'skill',
      targetCapability: 'command',
      method: 'rewrite',
      status: MigrationStatus.ADAPTED,
      confidence: 'medium',
      reasons: ['Skills map to commands with format differences'],
      warnings: ['Skill format may need adjustment']
    },
    {
      id: 'mcp-direct',
      sourceCapability: 'mcp',
      targetCapability: 'mcp',
      method: 'copy',
      status: MigrationStatus.DIRECT,
      confidence: 'high',
      reasons: ['MCP configuration is portable'],
      warnings: []
    },
    {
      id: 'hook-unsupported',
      sourceCapability: 'hook',
      targetCapability: undefined,
      method: 'omit',
      status: MigrationStatus.UNSUPPORTED,
      confidence: 'high',
      reasons: ['No equivalent hook system in target'],
      warnings: ['Hooks will not be migrated']
    }
  ],
  'claude-code->kilo': [
    {
      id: 'instruction-direct-kilo',
      sourceCapability: 'instruction',
      targetCapability: 'instruction',
      method: 'copy',
      status: MigrationStatus.DIRECT,
      confidence: 'high',
      reasons: ['Both agents support markdown instructions'],
      warnings: []
    },
    {
      id: 'skill-direct-kilo',
      sourceCapability: 'skill',
      targetCapability: 'skill',
      method: 'copy',
      status: MigrationStatus.DIRECT,
      confidence: 'high',
      reasons: ['Kilo supports Claude skill format'],
      warnings: []
    }
  ]
};

export function getRules(source: string, target: string): CompatibilityRule[] {
  return RULES[`${source}->${target}`] || [];
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Update index.ts**

```typescript
// src/registry/index.ts
export { AgentCapabilities, getCapabilities } from './capabilities.js';
export { CompatibilityRule, getRules } from './rules.js';
```

- [ ] **Step 6: Commit**

```bash
git add src/registry/rules.ts src/registry/index.ts tests/unit/registry/rules.test.ts
git commit -m "feat: add compatibility rules for agent pairs"
```

---

## Task 2: Normalizer

**Files:**
- Create: `src/core/normalize/normalizer.ts`
- Create: `src/core/normalize/index.ts`
- Create: `tests/unit/normalize/normalizer.test.ts`

**Interfaces:**
- Consumes: `AgentBundle` from model
- Produces: `normalizeBundle(bundle)` returning `NormalizedResource[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/normalize/normalizer.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeBundle } from '../../../src/core/normalize/normalizer.js';
import { AgentBundle } from '../../../src/core/model/types.js';

describe('Normalizer', () => {
  it('normalizes a simple bundle', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0',
      metadata: { name: 'test', sourceAgent: { id: 'claude-code', name: 'Claude Code' } },
      instructions: [{
        id: 'inst-1', type: 'instruction', name: 'AGENTS.md', content: '# Test',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc123' }
      }],
      skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [], opaque: []
    };
    const resources = normalizeBundle(bundle);
    expect(resources.length).toBe(1);
    expect(resources[0].capability).toBe('instruction');
  });

  it('marks opaque resources', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0', metadata: { name: 'test' },
      instructions: [], skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [],
      opaque: [{
        id: 'op-1', type: 'opaque', name: 'settings.json', content: '{}',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'settings.json', scope: 'project', originalHash: 'def' }
      }]
    };
    const resources = normalizeBundle(bundle);
    expect(resources[0].capability).toBe('opaque');
  });

  it('preserves provenance', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0', metadata: { name: 'test' },
      instructions: [{
        id: 'inst-1', type: 'instruction', name: 'AGENTS.md', content: '',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
      }],
      skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [], opaque: []
    };
    const resources = normalizeBundle(bundle);
    expect(resources[0].provenance.sourceAgent).toBe('claude-code');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write minimal implementation**
