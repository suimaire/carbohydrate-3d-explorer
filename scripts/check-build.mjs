import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const BASE = "/carbohydrate-3d-explorer/";
const metadata = JSON.parse(
  await readFile("src/data/structure-metadata.json", "utf8"),
);
const ids = Object.keys(metadata);
assert(ids.length >= 14, "every shipped structure must be listed");
const html = await readFile("dist/index.html", "utf8");
const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
assert(paths.length > 0, "Entry HTML must reference built assets");
for (const path of paths) {
  assert(
    path.startsWith(BASE),
    `Entry asset must live under ${BASE}, got ${path}`,
  );
  await readFile(`dist/${path.slice(BASE.length)}`);
}
const sw = await readFile("dist/sw.js", "utf8");
for (const id of ids) {
  assert(sw.includes(`./molecules/${id}.sdf`), `${id} missing from sw.js`);
  await readFile(`dist/molecules/${id}.sdf`);
}
for (const asset of await readdir("dist/assets"))
  assert(sw.includes(`./assets/${asset}`));
assert(sw.includes("./index.html"));
// Reference conformers are build-time inputs only and must not be precached.
assert(
  !sw.includes("/references/"),
  "builder reference structures do not belong in the offline cache",
);
console.log(
  `Production check passed: entry assets under ${BASE}, ${ids.length} static SDF files, complete offline manifest.`,
);
