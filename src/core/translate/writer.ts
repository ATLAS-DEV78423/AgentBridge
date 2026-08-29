import { NormalizedResource } from '../normalize/normalizer.js';

export type TargetFile = {
  path: string;
  content: string;
  action: 'create' | 'update' | 'skip';
};

export interface TargetWriter {
  id: string;
  write(resources: NormalizedResource[], targetRoot: string): TargetFile[];
}
