import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentAdapter, DetectionResult, createResource } from '../core/scanner/scanner.js';
import { AgentBundle, ResourceBase } from '../core/model/types.js';
import { TargetFile, WriteFn } from '../core/writers.js';

/** Agent-specific instruction filenames that must not leak into other targets. */
const FOREIGN_INSTRUCTIONS: Record<string, string> = { 'GEMINI.md': 'AGENTS.md', 'MUSE_CODE.md': 'AGENTS.md', '.github/copilot-instructions.md': 'AGENTS.md' };

/** Where an instruction file belongs in a generic target; agent-specific names normalize to AGENTS.md. */
export function instructionsTarget(name: string): string {
  return FOREIGN_INSTRUCTIONS[name] ?? name;
}

/** Strip agent-dialect fields so servers flow in the canonical command/args/env + url shape. */
function canonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

export type SimpleAgentSpec = {
  id: string;
  marker: string | string[];        // file/dir(s) whose existence means "detected"; the first is the config path
  mcpKey: string | null;            // top-level config key; null = no project MCP config
  instructionFile: string | null;   // instructions file this agent reads; null = none confirmed
};

/**
 * Builds a detector + scanner for a JSON-config coding agent whose MCP
 * shape is mcpServers-compatible ({command, args, env} or {url, headers}).
 * The scanner normalizes servers into the canonical shape so every
 * existing writer consumes them unchanged, and stores the opaque config
 * parse-normalized so writers' later JSON.parse always works.
 */
export function makeJsonAgent(spec: SimpleAgentSpec): AgentAdapter {
  const { id, mcpKey, instructionFile } = spec;
  const markers = Array.isArray(spec.marker) ? spec.marker : [spec.marker];

  async function detect(ctx: { root: string }): Promise<DetectionResult> {
    for (const rel of markers) {
      try {
        await fs.access(path.join(ctx.root, rel));
        return { detected: true, agent: id };
      } catch { /* try next marker */ }
    }
    return { detected: false };
  }

  async function scanProject(ctx: { root: string }): Promise<AgentBundle> {
    const bundle: AgentBundle = { sourceAgent: id, instructions: [], mcpServers: [], opaque: [] };

    if (instructionFile) {
      const p = path.join(ctx.root, instructionFile);
      try {
        const content = await fs.readFile(p, 'utf-8');
        bundle.instructions.push(createResource('instructions', instructionFile, p, ctx.root, content));
      } catch { /* absent */ }
    }

    if (!mcpKey) return bundle;

    const configPath = path.join(ctx.root, markers[0]);
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw) as Record<string, Record<string, unknown>>;
      bundle.opaque.push(createResource('opaque', markers[0], configPath, ctx.root, JSON.stringify(config)));
      const servers = config[mcpKey];
      if (servers && typeof servers === 'object') {
        for (const [name, server] of Object.entries(servers as Record<string, unknown>)) {
          if (server && typeof server === 'object') {
            bundle.mcpServers.push(createResource('mcpServers', name, configPath, ctx.root, JSON.stringify(canonicalServer(server as Record<string, unknown>))));
          }
        }
      }
    } catch { /* absent or unparseable — nothing extractable */ }

    return bundle;
  }

  return { id, detect, scanProject };
}

/**
 * Builds a writer that emits the agent's marker config with servers under
 * its own key. Incoming servers are canonical (command/args/env, url);
 * any incoming transport tag is stripped and, for url-based servers,
 * replaced with `remoteType` when the agent's docs require an explicit one.
 */
export function makeJsonWriter(spec: {
  marker: string;
  mcpKey: string | null;
  instructionFile: string | null;
  remoteType?: string;
  stdioType?: string; // set when the agent's schema requires an explicit transport tag on stdio servers (e.g. crush)
}): WriteFn {
  return (resources: ResourceBase[]): TargetFile[] => {
    const files: TargetFile[] = [];
    const servers: Record<string, unknown> = {};
    const instructions: Map<string, string> = new Map();

    for (const r of resources) {
      if (r.type === 'instructions' && r.content && spec.instructionFile) {
        instructions.set(spec.instructionFile, r.content);
      } else if (r.type === 'mcpServers' && r.content && spec.mcpKey) {
        try {
          const server = canonicalServer(JSON.parse(r.content) as Record<string, unknown>);
          if (typeof server.url === 'string' && spec.remoteType) {
            servers[r.name] = { type: spec.remoteType, ...server };
          } else if (spec.stdioType && typeof server.url !== 'string') {
            servers[r.name] = { type: spec.stdioType, ...server };
          } else {
            servers[r.name] = server;
          }
        } catch { /* invalid JSON, skip */ }
      }
      // Opaque configs intentionally unmapped: no model-equivalent fields confirmed.
    }

    for (const [p, content] of instructions) {
      files.push({ path: p, content, action: 'create' });
    }
    if (Object.keys(servers).length > 0) {
      files.push({ path: spec.marker, content: JSON.stringify({ [spec.mcpKey!]: servers }, null, 2), action: 'create' });
    }
    return files;
  };
}

export const copilotAdapter = makeJsonAgent({ id: 'copilot', marker: '.copilot/mcp-config.json', mcpKey: 'mcpServers', instructionFile: '.github/copilot-instructions.md' });
export const writeCopilotFiles = makeJsonWriter({ marker: '.copilot/mcp-config.json', mcpKey: 'mcpServers', instructionFile: '.github/copilot-instructions.md' });

export const crushAdapter = makeJsonAgent({ id: 'crush', marker: '.crush.json', mcpKey: 'mcp', instructionFile: 'AGENTS.md' });
export const writeCrushFiles = makeJsonWriter({ marker: '.crush.json', mcpKey: 'mcp', instructionFile: 'AGENTS.md', remoteType: 'http', stdioType: 'stdio' });

export const grokAdapter = makeJsonAgent({ id: 'grok', marker: '.mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md' });
export const writeGrokFiles = makeJsonWriter({ marker: '.mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md' });

// Gemini CLI's schema is exactly the factory defaults: transport inferred from
// shape (explicit type stripped), GEMINI.md instructions, mcpServers key.
export const writeGeminiFiles = makeJsonWriter({ marker: '.gemini/settings.json', mcpKey: 'mcpServers', instructionFile: 'GEMINI.md' });

// Cursor requires type: "stdio" on command-based servers (cursor.com/docs);
// remote url entries pass through, which is the factory's remote default.
export const writeCursorFiles = makeJsonWriter({ marker: '.cursor/mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md', stdioType: 'stdio' });

export const ompAdapter = makeJsonAgent({ id: 'omp', marker: '.pi/mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md' });
export const writeOmpFiles = makeJsonWriter({ marker: '.pi/mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md' });

export const museCodeAdapter = makeJsonAgent({ id: 'muse-code', marker: 'MUSE_CODE.md', mcpKey: null, instructionFile: 'MUSE_CODE.md' });
export const writeMuseCodeFiles = makeJsonWriter({ marker: 'MUSE_CODE.md', mcpKey: null, instructionFile: 'MUSE_CODE.md' });

// Vanilla Pi reads AGENTS.md (pi.dev docs) but documents no project-scoped
// MCP config; `.pi/` is the oh-my-pi (omp) config dir, so a bare `.pi`
// directory is Pi's presence marker without claiming omp's config format.
export const piAdapter = makeJsonAgent({ id: 'pi', marker: '.pi', mcpKey: null, instructionFile: 'AGENTS.md' });
export const writePiFiles = makeJsonWriter({ marker: '.pi', mcpKey: null, instructionFile: 'AGENTS.md' });

// Cline reads workspace rules from `.clinerules/` or `.cline/rules/` and from
// the cross-tool AGENTS.md (docs.cline.bot/customization/cline-rules), either
// of which marks the project as Cline's. Its MCP settings are user-level
// (`~/.cline/data/settings/cline_mcp_settings.json`, CLI: `~/.cline/mcp.json`)
// with no documented project-scoped equivalent, so only instructions migrate.
export const clineAdapter = makeJsonAgent({ id: 'cline', marker: ['.clinerules', '.cline'], mcpKey: null, instructionFile: 'AGENTS.md' });
export const writeClineFiles = makeJsonWriter({ marker: '.clinerules', mcpKey: null, instructionFile: 'AGENTS.md' });
