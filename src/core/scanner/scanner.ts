import { AgentBundle } from '../model/types.js';

export type DetectionResult = {
  detected: boolean;
};

export interface AgentAdapter {
  id: string;
  detect(ctx: { root: string }): Promise<DetectionResult>;
  scanProject(ctx: { root: string }): Promise<AgentBundle>;
}
