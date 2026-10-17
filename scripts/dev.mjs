#!/usr/bin/env node
// Wrapper around `vite dev` that:
//   - drops the `--allowed-hosts` CLI flag (removed in Vite 8)
//   - forces PORT=3000 because Blaxel exports PORT=80 / BL_SERVER_PORT=80
//     into the sandbox, which Nitro's vite plugin reads first and which would
//     otherwise make the dev server bind to 80 instead of the 3000 the
//     platform's entrypoint watchdog waits for.
//
// The matching `server.allowedHosts: true` lives in vite.config.ts so the
// embedded cross-origin preview iframe can hit the server with any Host header.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const viteBin = resolve(here, "..", "node_modules", "vite", "bin", "vite.js");

const args = process.argv.slice(2);
const filtered = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--allowed-hosts" || a === "--allowedHosts") {
    // Drop the flag AND its value (next argument) if it isn't another flag.
    const next = args[i + 1];
    if (next && !next.startsWith("-")) i += 1;
    continue;
  }
  filtered.push(a);
}

const env = { ...process.env };
// Blaxel sets PORT=80 / BL_SERVER_PORT=80 in the sandbox; the entrypoint
// watchdog waits on port 3000, so force the dev server onto 3000.
env.PORT = "3000";
// Keep Blaxel's hint untouched for tooling that wants it; just shadow PORT.
// (We don't strip BL_SERVER_PORT because nothing in this stack reads it.)

const child = spawn(process.execPath, [viteBin, ...filtered], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});