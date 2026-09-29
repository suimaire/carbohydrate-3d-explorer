// Development only. Never called by the browser or by the production build.
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const downloadUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/107526/SDF?record_type=3d";
const response = await fetch(downloadUrl);
if (!response.ok) throw Error(`PubChem HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (!bytes.toString().startsWith("107526\n") || !bytes.includes(Buffer.from("3D")))
  throw Error("Unexpected PubChem record");
const directory = "public/molecules/references";
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/aldehydo-D-glucose-PubChem-CID107526.sdf`, bytes);
await writeFile(`${directory}/aldehydo-D-glucose-source.json`, JSON.stringify({
  sourceIdentifier: "PubChem CID 107526",
  sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/107526",
  downloadUrl,
  retrieved: new Date().toISOString(),
  sourceSHA256: createHash("sha256").update(bytes).digest("hex"),
  coordinateKind: "PubChem computed 3D conformer; not an experimental reaction trajectory",
}, null, 2) + "\n");
console.log("Saved original CID 107526 3D SDF and acquisition provenance.");
