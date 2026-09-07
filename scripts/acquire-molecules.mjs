import { mkdir, writeFile } from "node:fs/promises";
const ids = ["GLC", "BGC", "GAL", "FRU", "BDR", "2DR"];
await mkdir("public/molecules", { recursive: true });
for (const id of ids) {
  const url = `https://files.rcsb.org/ligands/download/${id}.cif`;
  let text;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw Error(`${r.status}`);
      text = await r.text();
      break;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  if (!text.startsWith(`data_${id}`)) throw Error(`Invalid CCD file ${id}`);
  await writeFile(`public/molecules/${id}.cif`, text);
  console.log(`${id}: saved original CCD CIF`);
}
console.log(
  "Next: run scripts/prepare_molecules.py with numpy + rdkit to regenerate and validate SDF/metadata.",
);
