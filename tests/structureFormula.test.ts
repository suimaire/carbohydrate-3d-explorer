import { expect, it } from "vitest";
import { carbohydrates, structures } from "../src/data/carbohydrates";
import { bondAtCarbon, formulaGeometry, formulaResidue } from "../src/lib/structureFormula";
import { readSdf } from "./sdf";

type Point = { x: number; y: number; z: number };
const sub = (a: Point, b: Point) => [a.x - b.x, a.y - b.y, a.z - b.z];
function volume(c: Point, prev: Point, next: Point, exo: Point) {
  const a = sub(prev, c), b = sub(next, c), d = sub(exo, c);
  return a[0] * (b[1] * d[2] - b[2] * d[1]) + a[1] * (b[2] * d[0] - b[0] * d[2]) + a[2] * (b[0] * d[1] - b[1] * d[0]);
}
const edge = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("-");

for (const m of carbohydrates) {
  it(`${m.id}: every Haworth substituent preserves the shipped 3D handedness, including glycosidic endpoints`, () => {
    const data = structures[m.id], { atoms } = readSdf(m.id);
    for (const r of data.residues) {
      const f = formulaResidue(data, r);
      expect(f.ring).toHaveLength(r.ringForm === "pyranose" ? 6 : 5);
      for (const turned of [false, true]) {
        const geometry = formulaGeometry(f, 0, turned);
        // Lift the Haworth drawing back into a flat ring plane. SVG y points
        // down; a substituent drawn up is above that plane (positive z).
        const flat = (n: string): Point => ({ x: geometry.ring[n].x, y: -geometry.ring[n].y, z: 0 });
        for (const s of f.substituents.filter(s => s.label !== "H")) {
          const i = f.ring.indexOf(s.carbon);
          const prev = f.ring[(i + f.ring.length - 1) % f.ring.length], next = f.ring[(i + 1) % f.ring.length];
          const link = s.label === "OH" && bondAtCarbon(data, r.id, s.carbon);
          const exo = link ? link.bridgingAtom : r.atoms[s.atom];
          expect(exo, `${m.id} ${r.id}:${s.atom}`).toBeDefined();
          const actual = volume(atoms[r.atoms[s.carbon]], atoms[r.atoms[prev]], atoms[r.atoms[next]], atoms[exo]);
          const c = flat(s.carbon);
          const projected = volume(c, flat(prev), flat(next), { ...c, z: -geometry.direction(s.side) });
          expect(Math.abs(actual)).toBeGreaterThan(0.5);
          expect(Math.sign(projected), `${m.id} ${r.id}:${s.carbon}–${s.atom}, turned=${turned}`).toBe(Math.sign(actual));
        }
      }
    }
  });
  if (m.representationType === "molecule") it(`${m.id}: the structural formula's complete heavy-atom graph equals the SDF`, () => {
    const data = structures[m.id], { atoms, bonds } = readSdf(m.id);
    const drawn = new Set<string>();
    for (const r of data.residues) {
      const f = formulaResidue(data, r);
      f.ring.forEach((n, i) => drawn.add(edge(r.atoms[n], r.atoms[f.ring[(i + 1) % f.ring.length]])));
      for (const s of f.substituents) {
        if (s.label === "H" || (s.label === "OH" && bondAtCarbon(data, r.id, s.carbon))) continue;
        drawn.add(edge(r.atoms[s.carbon], r.atoms[s.atom]));
        if (s.label === "CH₂OH") drawn.add(edge(r.atoms[s.atom], r.atoms[s.atom.replace("C", "O")]));
      }
    }
    for (const b of data.glycosidicBonds) {
      drawn.add(edge(b.donorAtom, b.bridgingAtom));
      drawn.add(edge(b.bridgingAtom, b.acceptorAtom));
    }
    const actual = new Set(bonds.filter(([a, b]) => atoms[a].elem !== "H" && atoms[b].elem !== "H").map(([a, b]) => edge(a, b)));
    expect(drawn).toEqual(actual);
  });
}

it("does not silently draw an unknown sugar or a changed ring as glucose", () => {
  const data = structures.BGC, r = data.residues[0];
  expect(() => formulaResidue(data, { ...r, sugar: "unknown" })).toThrow(/Unverified/);
  expect(() => formulaResidue(data, { ...r, ringAtoms: r.ringAtoms.slice(1) })).toThrow(/Unverified/);
});
