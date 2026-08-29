import { describe, it, expect } from 'vitest';
import { validateBundle, createBundle } from '../../../src/core/model/schema.js';
import { MigrationStatus } from '../../../src/core/model/types.js';

describe('Canonical Model', () => {
  describe('createBundle', () => {
    it('creates a valid minimal bundle', () => {
      const bundle = createBundle('test-project');
      expect(bundle.schemaVersion).toBe('1.0.0');
      expect(bundle.metadata.name).toBe('test-project');
      expect(bundle.instructions).toEqual([]);
      expect(bundle.skills).toEqual([]);
      expect(bundle.mcpServers).toEqual([]);
    });
  });

  describe('validateBundle', () => {
    it('accepts a valid minimal bundle', () => {
      const bundle = createBundle('test');
      const result = validateBundle(bundle);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects missing schemaVersion', () => {
      const bundle = createBundle('test');
      delete (bundle as any).schemaVersion;
      const result = validateBundle(bundle);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('schemaVersion'))).toBe(true);
    });

    it('rejects unknown migration status', () => {
      const bundle = createBundle('test');
      bundle.instructions.push({
        id: 'test-1',
        type: 'instruction' as any,
        name: 'test.md',
        content: '# Test',
        provenance: {
          sourceAgent: 'claude-code',
          sourcePath: '/test.md',
          scope: 'project',
          originalHash: 'abc123'
        },
        compatibility: {
          resourceId: 'test-1',
          sourceCapability: 'instruction',
          status: 'INVALID_STATUS' as any,
          method: 'copy',
          confidence: 'high',
          reasons: [],
          warnings: [],
          requiresApproval: false
        }
      });
      const result = validateBundle(bundle);
      expect(result.valid).toBe(false);
    });
  });

  describe('MigrationStatus', () => {
    it('contains all required statuses', () => {
      const statuses = Object.values(MigrationStatus);
      expect(statuses).toContain('EXACT');
      expect(statuses).toContain('DIRECT');
      expect(statuses).toContain('ADAPTED');
      expect(statuses).toContain('PARTIAL');
      expect(statuses).toContain('UNSUPPORTED');
      expect(statuses).toContain('SKIPPED');
      expect(statuses).toContain('BLOCKED');
    });
  });
});
