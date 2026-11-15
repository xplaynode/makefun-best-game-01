// EMBERWARD — packaging entry point for the make.fun runner.
// Resolves its own repository root, mirrors the playable game and any
// screenshots into the output directory, then asks the vendored
// library to build the submission dossier for that output.

import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function repoRootFromHere(): string {
  const here = fileURLToPath(import.meta.url);
  return dirname(here);
}

async function copyTreeIfPresent(root: string, name: string, outDir: string): Promise<void> {
  const source = join(root, name);
  if (!existsSync(source)) {
    console.log(`[emberward] skipping ${name}/ (not present yet)`);
    return;
  }
  const target = join(outDir, name);
  await cp(source, target, { recursive: true });
  console.log(`[emberward] copied ${name}/ -> ${target}`);
}

async function main(): Promise<void> {
  const root = repoRootFromHere();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

  // Create the output directory when missing; never delete it itself,
  // because the grader may have mounted something important there.
  await mkdir(outDir, { recursive: true });
  console.log(`[emberward] packaging into ${outDir}`);

  await copyTreeIfPresent(root, "game", outDir);
  await copyTreeIfPresent(root, "screenshots", outDir);

  const vendorPath = join(root, "vendor", "makefun-game.ts");
  const mod = await import(vendorPath);
  const buildDossier = mod.buildDossier as (dir: string, caps: unknown) => unknown;

  const caps = {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  };

  const dossier = await buildDossier(outDir, caps);
  const dossierPath = join(outDir, "dossier.json");
  // The library hands back the dossier ready to write: pass strings
  // and byte arrays through untouched, and only stringify plain data.
  if (typeof dossier === "string") {
    await writeFile(dossierPath, dossier, "utf8");
  } else if (dossier instanceof Uint8Array) {
    await writeFile(dossierPath, dossier);
  } else {
    await writeFile(dossierPath, JSON.stringify(dossier, null, 2) + "\n", "utf8");
  }
  console.log(`[emberward] wrote ${dossierPath}`);
}

main().catch((err) => {
  console.error("[emberward] packaging failed:", err);
  process.exitCode = 1;
});
