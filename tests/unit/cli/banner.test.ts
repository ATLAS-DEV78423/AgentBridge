import { describe, it, expect, vi } from 'vitest';
import { printBanner } from '../../../src/cli/banner.js';

/**
 * figlet's ANSI Shadow rendering of "AGENT-BRIDGE", the art printBanner must
 * reproduce. Generated from the font rather than copied out of banner.ts, so a
 * mangled banner fails here — the art silently reverted to the pre-rename
 * version once already, which no other test noticed. Runs of spaces are
 * normalized away; the glyph shapes are what this pins.
 */
const ART = [
  " █████╗ ██████╗ ███████╗███╗ ██╗████████╗ ██████╗ ██████╗ ██╗██████╗ ██████╗ ███████╗",
  "██╔══██╗██╔════╝ ██╔════╝████╗ ██║╚══██╔══╝ ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝",
  "███████║██║ ███╗█████╗ ██╔██╗ ██║ ██║█████╗██████╔╝██████╔╝██║██║ ██║██║ ███╗█████╗",
  "██╔══██║██║ ██║██╔══╝ ██║╚██╗██║ ██║╚════╝██╔══██╗██╔══██╗██║██║ ██║██║ ██║██╔══╝",
  "██║ ██║╚██████╔╝███████╗██║ ╚████║ ██║ ██████╔╝██║ ██║██║██████╔╝╚██████╔╝███████╗",
  "╚═╝ ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═══╝ ╚═╝ ╚═════╝ ╚═╝ ╚═╝╚═╝╚═════╝ ╚═════╝ ╚══════╝",
].join('\n');

const normalize = (art: string): string =>
  art.split('\n').map(line => line.replace(/ +/g, ' ').trimEnd()).join('\n');

describe('CLI banner', () => {
  it('prints the AGENT-BRIDGE art', () => {
    const printed: string[] = [];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation((line: string) => { printed.push(line); });
    printBanner();
    consoleSpy.mockRestore();

    expect(normalize(printed.join('\n').replace(/^\n/, ''))).toBe(ART);
  });
});
