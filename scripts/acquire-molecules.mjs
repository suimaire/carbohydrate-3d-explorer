// Development-only download of the published structures this project ships.
// Nothing here runs at build time or in the browser: the deployed app never
// contacts RCSB, PubChem or any other service.
import { mkdir, writeFile } from "node:fs/promises";

const ccd = [
  // free monosaccharides
  "GLC",
  "BGC",
  "GAL",
  "FRU",
  "BDR",
  "2DR",
  // disaccharides, taken whole from the CCD
  "MAL",
  "CBI",
  "LAT",
  "SUC",
];
// Reference conformers for the glycosidic geometry of the polysaccharide
// fragments. They are inputs to the builder only; none of them is shipped as a
// molecule the app can display.
const pubchem = [
  { cid: 439186, name: "maltose-PubChem-CID439186.sdf" },
  { cid: 439178, name: "cellobiose-PubChem-CID439178.sdf" },
  { cid: 439193, name: "isomaltose-PubChem-CID439193.sdf" },
];

async function get(url, check) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw Error(`${r.status}`);
      const text = await r.text();
      check(text);
      return text;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
}

await mkdir("public/molecules/references", { recursive: true });
for (const id of ccd) {
  const text = await get(
    `https://files.rcsb.org/ligands/download/${id}.cif`,
    (t) => {
      if (!t.startsWith(`data_${id}`)) throw Error(`Invalid CCD file ${id}`);
    },
  );
  await writeFile(`public/molecules/${id}.cif`, text);
  console.log(`${id}: saved original CCD CIF`);
}
for (const { cid, name } of pubchem) {
  const text = await get(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`,
    (t) => {
      if (!t.startsWith(String(cid))) throw Error(`Invalid PubChem SDF ${cid}`);
    },
  );
  await writeFile(`public/molecules/references/${name}`, text);
  console.log(`CID ${cid}: saved original PubChem 3D conformer`);
}
console.log(
  "Next: run scripts/prepare_molecules.py with numpy + rdkit to regenerate and validate SDF/metadata.",
);
