import { readFileSync } from "node:fs";
import type { MoleculeId } from "../src/types/carbohydrate";
export function readSdf(id: MoleculeId) {
  const text = readFileSync(`public/molecules/${id}.sdf`, "utf8");
  const lines = text.split(/\r?\n/);
  const n = Number(lines[3].slice(0, 3)),
    nb = Number(lines[3].slice(3, 6));
  const atoms = lines
    .slice(4, 4 + n)
    .map((l, i) => ({
      index: i,
      elem: l.slice(31, 34).trim(),
      x: Number(l.slice(0, 10)),
      y: Number(l.slice(10, 20)),
      z: Number(l.slice(20, 30)),
    }));
  const bonds = lines
    .slice(4 + n, 4 + n + nb)
    .map((l) => [
      Number(l.slice(0, 3)) - 1,
      Number(l.slice(3, 6)) - 1,
      Number(l.slice(6, 9)),
    ]);
  return { text, atoms, bonds };
}
