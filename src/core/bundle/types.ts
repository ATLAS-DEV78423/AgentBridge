import { AgentBundle } from '../model/types.js';

export const BUNDLE_SCHEMA_VERSION = '1.0.0';

export type BundleManifest = {
  schemaVersion: string;
  createdAt: string;
  sourceAgent?: string;
  sourceRoot?: string;
  checksum: string;
  resourceCount: number;
};

export type Bundle = {
  manifest: BundleManifest;
  bundle: AgentBundle;
};

export type BundleExportOptions = {
  redactSecrets?: boolean;
};
