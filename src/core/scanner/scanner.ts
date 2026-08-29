import { AgentBundle, Provenance } from '../model/types.js';
import { hashFile } from '../filesystem/hashing.js';

export type DetectionResult = {
  detected: boolean;
  agent?: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
};

export type ScanContext = {
  root: string;
};

export interface AgentAdapter {
  id: string;
  detect(ctx: ScanContext): Promise<DetectionResult>;
  scanProject(ctx: ScanContext): Promise<AgentBundle>;
}

export async function createResource(
  type: string,
  name: string,
  filePath: string,
  root: string,
  content?: string,
  metadata?: Record<string, unknown>
) {
  const relativePath = filePath.replace(root, '').replace(/^[/\\]/, '');
  const hash = await hashFile(filePath);
  
  return {
    id: `${type}-${relativePath}`,
    type,
    name,
    content,
    metadata,
    provenance: {
      sourceAgent: 'unknown',
      sourcePath: relativePath,
      scope: 'project' as const,
      originalHash: hash
    }
  };
}
