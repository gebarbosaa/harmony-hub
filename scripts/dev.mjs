#!/usr/bin/env node
// Wrapper around `vite dev` that drops the `--allowed-hosts` CLI flag.
//
// Why this exists: Vite <=7 exposed `--allowed-hosts` as a dev-server CLI flag,
// but Vite 8 removed it (the option now lives in `server.allowedHosts` config).
// Our platform's restart command still appends `--allowed-hosts all`, which makes
// Vite 8's `cac` CLI throw `Unknown option --allowed-hosts` before the server
// ever starts, so the preview never comes up.
//
// We strip that flag (and its value) here, set `server.allowedHosts` via
// vite.config.ts to `true` (allow any host) so the embedded preview works, and
// forward everything else to vite unchanged.

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

const child = spawn(process.execPath, [viteBin, ...filtered], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});