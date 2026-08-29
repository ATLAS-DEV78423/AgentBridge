import { describe, it, expect } from 'vitest';
import { MigrationStatus } from '../../../src/core/model/types.js';

describe('Canonical Model', () => {
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
