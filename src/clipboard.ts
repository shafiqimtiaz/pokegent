import { execSync } from 'child_process';
import os from 'os';

export function copyToClipboard(text: string): boolean {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      execSync('pbcopy', { input: Buffer.from(text) });
      return true;
    } else if (platform === 'linux') {
      for (const cmd of ['xsel --clipboard --input', 'xclip -selection clipboard', 'wl-copy']) {
        try {
          execSync(cmd, { input: Buffer.from(text) });
          return true;
        } catch {
          // try next
        }
      }
      return false;
    } else if (platform === 'win32') {
      execSync('clip', { input: Buffer.from(text) });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
