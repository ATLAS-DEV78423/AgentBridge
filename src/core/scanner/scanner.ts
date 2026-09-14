import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../model/types.js';

export type DetectionResult = {
  detected: boolean;
  agent?: string;
};

export interface AgentAdapter {
  id: string;
  detect(ctx: { root: string }): Promise<DetectionResult>;
  scanProject(ctx: { root: string }): Promise<AgentBundle>;
}

export function createResource(
  type: string,
  name: string,
  filePath: string,
  root: string,
  content?: string,
) {
  const relativePath = path.relative(root, filePath);
  return {
    id: `${type}-${relativePath}`,
    type,
    name,
    content,
  };
}
