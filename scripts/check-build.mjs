import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const html = await readFile("dist/index.html", "utf8");
const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
assert(
  paths.every((p) => p.startsWith("./")),
  "Entry assets must use relative paths",
);
for (const path of paths) {
  await readFile(`dist/${path.slice(2)}`);
  assert(
    new URL(path, "https://example.org/lesson/").pathname.startsWith(
      "/lesson/",
    ),
  );
}
const sw = await readFile("dist/sw.js", "utf8");
for (const id of ["GLC", "BGC", "GAL", "FRU", "BDR", "2DR"]) {
  assert(sw.includes(`./molecules/${id}.sdf`));
  await readFile(`dist/molecules/${id}.sdf`);
}
for (const asset of await readdir("dist/assets"))
  assert(sw.includes(`./assets/${asset}`));
assert(sw.includes("./index.html"));
console.log(
  "Production check passed: relative entry paths, six static SDF files, complete offline manifest.",
);
