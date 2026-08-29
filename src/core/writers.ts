import { ResourceBase } from './model/types.js';

export type TargetFile = {
  path: string;
  content: string;
  action: 'create' | 'skip';
};

export type WriteFn = (resources: ResourceBase[]) => TargetFile[];

const writers: Record<string, WriteFn> = {};

export function registerWriter(target: string, writeFn: WriteFn): void {
  writers[target] = writeFn;
}

export function getWriter(target: string): WriteFn | undefined {
  return writers[target];
}
