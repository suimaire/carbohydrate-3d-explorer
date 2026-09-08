import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { carbohydrates, structures } from "../src/data/carbohydrates";
import type { MoleculeId } from "../src/types/carbohydrate";
import { readSdf } from "./sdf";
const neighboursOf = (bonds: number[][], i: number) =>
  bonds.filter((b) => b[0] === i || b[1] === i).map((b) => (b[0] === i ? b[1] : b[0]));
/** Atoms that lie on a cycle, found from the bond graph alone. */
function ringAtomsOf(count: number, bonds: number[][]) {
  const inRing = new Set<number>();
  for (const [u, v] of bonds) {
    // The bond closes a cycle when its two ends stay connected without it.
    const rest = bonds.filter((b) => !(b[0] === u && b[1] === v));
    const seen = new Set([u]);
    const stack = [u];
    while (stack.length) {
      const at = stack.pop()!;
      for (const n of neighboursOf(rest, at))
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
    }
    if (seen.has(v)) {
      inRing.add(u);
      inRing.add(v);
    }
  }
  void count;
  return inRing;
}
type Point = { x: number; y: number; z: number };
const distance = (p: Point, q: Point) =>
  Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
const bondAngle = (p: Point, q: Point, r: Point) => {
  const a = [p.x - q.x, p.y - q.y, p.z - q.z];
  const b = [r.x - q.x, r.y - q.y, r.z - q.z];
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const la = Math.hypot(...a);
  const lb = Math.hypot(...b);
  return (Math.acos(dot / la / lb) * 180) / Math.PI;
};
/** Free anomeric carbons read off the bond graph, with no metadata involved. */
function freeAnomericCarbons(
  atoms: { index: number; elem: string }[],
  bonds: number[][],
) {
  const ring = ringAtomsOf(atoms.length, bonds);
  const free: number[] = [];
  for (const a of atoms) {
    if (a.elem !== "C" || !ring.has(a.index)) continue;
    const oxygens = neighboursOf(bonds, a.index).filter(
      (i) => atoms[i].elem === "O",
    );
    if (oxygens.length !== 2 || !oxygens.some((o) => ring.has(o))) continue;
    const exocyclic = oxygens.find((o) => !ring.has(o));
    if (exocyclic === undefined) continue;
    if (neighboursOf(bonds, exocyclic).some((i) => atoms[i].elem === "H"))
      free.push(a.index);
  }
  return free;
}
describe("shipped scientific data", () => {
  it("every molecule id is unique and has a structure file and metadata", () => {
    const ids = carbohydrates.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(Object.keys(structures))).toEqual(new Set(ids));
    for (const m of carbohydrates) {
      expect(m.structureFile).toBe(`molecules/${m.id}.sdf`);
      expect(existsSync(`public/${m.structureFile}`)).toBe(true);
      expect([
        "monosaccharide",
        "disaccharide",
        "polysaccharide",
      ]).toContain(m.category);
      expect(["molecule", "fragment"]).toContain(m.representationType);
      expect(m.group.length).toBeGreaterThan(0);
      expect(m.observationQuestions.length).toBeGreaterThan(0);
      expect(m.answer.length).toBeGreaterThan(0);
      expect(m.notes.length).toBeGreaterThan(0);
    }
  });
  for (const m of carbohydrates) {
    it(`${m.id}: provenance, connectivity, numbering and OH groups`, () => {
      const data = structures[m.id];
      const { text, atoms, bonds } = readSdf(m.id);
      expect(createHash("sha256").update(text).digest("hex")).toBe(
        data.sdfSHA256,
      );
      if (data.sourceSHA256)
        expect(
          createHash("sha256")
            .update(readFileSync(`public/molecules/${m.id}.cif`))
            .digest("hex"),
        ).toBe(data.sourceSHA256);
      expect(atoms.length).toBe(data.atoms.length);
      // One ring per residue: bonds = atoms - 1 + rings.
      expect(bonds.length).toBe(atoms.length - 1 + data.residues.length);
      atoms.forEach((a, i) => {
        expect(a.elem).toBe(data.atoms[i].element);
        expect(neighboursOf(bonds, i).length).toBe(
          a.elem === "C" ? 4 : a.elem === "O" ? 2 : 1,
        );
        expect([a.x, a.y, a.z].every(Number.isFinite)).toBe(true);
      });
      const counts = Object.fromEntries(
        ["C", "H", "O"].map((e) => [
          e,
          atoms.filter((a) => a.elem === e).length,
        ]),
      );
      const n = data.residues.length;
      if (m.category === "polysaccharide")
        // (C6H10O5)n + H2O for a glucan of n residues.
        expect(counts).toEqual({ C: 6 * n, H: 10 * n + 2, O: 5 * n + 1 });
      else if (m.category === "disaccharide")
        expect(counts).toEqual({ C: 12, H: 22, O: 11 });
      else
        expect(counts).toEqual(
          m.id === "2DR"
            ? { C: 5, H: 10, O: 4 }
            : m.id === "BDR"
              ? { C: 5, H: 10, O: 5 }
              : { C: 6, H: 12, O: 6 },
        );
      // Every carbon label resolves to a carbon; multi-residue keys are prefixed.
      for (const [name, index] of Object.entries(data.carbons)) {
        expect(atoms[index].elem).toBe("C");
        const [residueId, carbon] = n > 1 ? name.split(":") : [null, name];
        expect(data.atoms[index].name).toBe(carbon);
        if (residueId) expect(data.atoms[index].residue).toBe(residueId);
      }
      expect(Object.keys(data.carbons)).toHaveLength(counts.C);
      const hydroxyl = atoms
        .filter(
          (a) =>
            a.elem === "O" &&
            neighboursOf(bonds, a.index).some((i) => atoms[i].elem === "H"),
        )
        .flatMap((a) => [
          a.index,
          ...neighboursOf(bonds, a.index).filter((i) => atoms[i].elem === "H"),
        ]);
      expect([...data.hydroxylAtoms].sort((a, b) => a - b)).toEqual(
        hydroxyl.sort((a, b) => a - b),
      );
    });
    it(`${m.id}: residue metadata matches the atoms in the file`, () => {
      const data = structures[m.id];
      const { atoms, bonds } = readSdf(m.id);
      expect(data.residues.length).toBeGreaterThan(0);
      expect(data.residues.map((r) => r.residueIndex)).toEqual(
        data.residues.map((_, i) => i + 1),
      );
      expect(new Set(data.residues.map((r) => r.id)).size).toBe(
        data.residues.length,
      );
      const seen = new Set<number>();
      for (const residue of data.residues) {
        for (const [name, index] of Object.entries(residue.atoms)) {
          expect(data.atoms[index].name).toBe(name);
          if (data.residues.length > 1)
            expect(data.atoms[index].residue).toBe(residue.id);
          expect(seen.has(index)).toBe(false);
          seen.add(index);
        }
        expect(residue.ringAtoms).toHaveLength(
          residue.ringForm === "pyranose" ? 6 : 5,
        );
        // The ring atoms really form a closed cycle in the bond network.
        residue.ringAtoms.forEach((atom, i) => {
          const next = residue.ringAtoms[(i + 1) % residue.ringAtoms.length];
          expect(neighboursOf(bonds, atom)).toContain(next);
        });
        expect(residue.anomericAtom).toBe(
          residue.atoms[residue.anomericCarbon],
        );
        expect(atoms[residue.anomericAtom].elem).toBe("C");
        expect(
          neighboursOf(bonds, residue.anomericAtom).filter(
            (i) => atoms[i].elem === "O",
          ),
        ).toHaveLength(2);
        expect(["alpha", "beta"]).toContain(residue.anomericConfiguration);
      }
      expect(seen.size).toBe(atoms.length);
      expect(data.reducingEnds).toEqual(
        data.residues.filter((r) => r.freeAnomeric).map((r) => r.id),
      );
      // ...and the flag itself has to match a free anomeric OH in the real file.
      expect(
        data.residues
          .filter((r) => r.freeAnomeric)
          .map((r) => r.anomericAtom)
          .sort((a, b) => a - b),
      ).toEqual(freeAnomericCarbons(atoms, bonds).sort((a, b) => a - b));
    });
  }
  it("alpha/beta are C1 anomers, galactose is the C4 epimer", () => {
    const a = structures.GLC.validation.CIP_from_3D!,
      b = structures.BGC.validation.CIP_from_3D!,
      g = structures.GAL.validation.CIP_from_3D!;
    expect(Object.keys(a).filter((k) => a[k] !== b[k])).toEqual(["C1"]);
    expect(Object.keys(g).filter((k) => g[k] !== b[k])).toEqual(["C4"]);
  });
  it("aligned glucose rings superpose without hiding the C1 OH difference", () => {
    const a = readSdf("GLC").atoms,
      b = readSdf("BGC").atoms;
    const pa = structures.GLC.ringAtoms.map((i) => a[i]),
      pb = structures.BGC.ringAtoms.map((i) => b[i]);
    const dist = (p: (typeof a)[0], q: (typeof a)[0]) =>
      Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    expect(
      Math.sqrt(pa.reduce((s, p, i) => s + dist(p, pb[i]) ** 2, 0) / 6),
    ).toBeLessThan(0.015);
    expect(
      dist(
        a[structures.GLC.atoms.find((a) => a.name === "O1")!.index],
        b[structures.BGC.atoms.find((a) => a.name === "O1")!.index],
      ),
    ).toBeGreaterThan(1);
  });
  it("chair geometry agrees with the labels", () => {
    expect(structures.GLC.validation.axialNormalCosines!.C1).toBeGreaterThan(
      0.85,
    );
    Object.values(structures.BGC.validation.axialNormalCosines!).forEach((v) =>
      expect(v).toBeLessThan(0.65),
    );
    expect(structures.GLC.validation.chairHeights!.C1).toBeLessThan(-0.2);
    expect(structures.GLC.validation.chairHeights!.C4).toBeGreaterThan(0.2);
  });
  it("deoxy C2 lacks O2 and has two hydrogen neighbors", () => {
    const { atoms, bonds } = readSdf("2DR");
    const c = structures["2DR"].carbons.C2;
    expect(
      neighboursOf(bonds, c)
        .map((i) => atoms[i].elem)
        .sort(),
    ).toEqual(["C", "C", "H", "H"]);
    expect(structures["2DR"].atoms.some((a) => a.name === "O2")).toBe(false);
  });
});
const MULTI = carbohydrates
  .filter((m) => structures[m.id].residues.length > 1)
  .map((m) => m.id);
describe("glycosidic linkages", () => {
  for (const id of MULTI)
    it(`${id}: every declared linkage exists in the bond network`, () => {
      const data = structures[id];
      const { atoms, bonds } = readSdf(id);
      const ringAtoms = new Set(data.residues.flatMap((r) => r.ringAtoms));
      expect(data.glycosidicBonds.length).toBe(data.residues.length - 1);
      for (const bond of data.glycosidicBonds) {
        const donor = data.residues.find((r) => r.id === bond.donorResidue)!;
        const acceptor = data.residues.find(
          (r) => r.id === bond.acceptorResidue,
        )!;
        expect(donor).toBeTruthy();
        expect(acceptor).toBeTruthy();
        // The donor always contributes its anomeric carbon.
        expect(bond.donorAtom).toBe(donor.anomericAtom);
        expect(bond.donorCarbon).toBe(donor.anomericCarbon);
        expect(bond.acceptorAtom).toBe(acceptor.atoms[bond.acceptorCarbon]);
        // The bridging oxygen is a non-ring oxygen bonded to exactly those two.
        expect(atoms[bond.bridgingAtom].elem).toBe("O");
        expect(ringAtoms.has(bond.bridgingAtom)).toBe(false);
        expect(neighboursOf(bonds, bond.bridgingAtom).sort()).toEqual(
          [bond.donorAtom, bond.acceptorAtom].sort(),
        );
        expect(bond.configuration).toBe(donor.anomericConfiguration);
        expect(bond.notation).toContain(
          bond.configuration === "alpha" ? "α" : "β",
        );
        expect(bond.notation).toContain(
          `${bond.donorCarbon.slice(1)}→${bond.acceptorCarbon.slice(1)}`,
        );
        expect(bond.branch).toBe(bond.acceptorCarbon === "C6");
      }
      // The linkage graph connects every residue exactly once.
      expect(new Set(data.glycosidicBonds.map((b) => b.donorResidue)).size).toBe(
        data.residues.length - 1,
      );
    });
  it("the four disaccharides carry the linkage each one is named for", () => {
    const expected: Record<string, [string, string, string, string[]]> = {
      MAL: ["alpha", "C1", "C4", ["B"]],
      CBI: ["beta", "C1", "C4", ["B"]],
      LAT: ["beta", "C1", "C4", ["B"]],
      SUC: ["alpha", "C1", "C2", []],
    };
    for (const [id, [config, donor, acceptor, reducing]] of Object.entries(
      expected,
    )) {
      const data = structures[id as MoleculeId];
      const [bond] = data.glycosidicBonds;
      expect(bond.configuration).toBe(config);
      expect(bond.donorCarbon).toBe(donor);
      expect(bond.acceptorCarbon).toBe(acceptor);
      expect(data.reducingEnds).toEqual(reducing);
    }
    // Maltose and cellobiose differ only in the anomeric configuration.
    expect(structures.MAL.residues.map((r) => r.sugar)).toEqual(
      structures.CBI.residues.map((r) => r.sugar),
    );
    expect(structures.LAT.residues.map((r) => r.sugar)).toEqual([
      "galactose",
      "glucose",
    ]);
    expect(structures.SUC.residues.map((r) => r.ringForm)).toEqual([
      "pyranose",
      "furanose",
    ]);
    // Sucrose spends both anomeric carbons on the linkage.
    expect(structures.SUC.residues.every((r) => !r.freeAnomeric)).toBe(true);
    expect(structures.SUC.glycosidicBonds[0].notation).toBe("α(1→2)β");
  });
  it("polysaccharide fragments carry the linkage inventory they claim", () => {
    const inventory = (id: MoleculeId) =>
      structures[id].glycosidicBonds.reduce<Record<string, number>>(
        (acc, b) => ({ ...acc, [b.notation]: (acc[b.notation] ?? 0) + 1 }),
        {},
      );
    expect(inventory("AMYLOSE")).toEqual({ "α(1→4)": 9 });
    expect(inventory("CELLULOSE")).toEqual({ "β(1→4)": 7 });
    expect(inventory("AMYLOPECTIN")["α(1→4)"]).toBeGreaterThan(0);
    expect(inventory("AMYLOPECTIN")["α(1→6)"]).toBeGreaterThanOrEqual(1);
    expect(inventory("GLYCOGEN")["α(1→4)"]).toBeGreaterThan(0);
    expect(inventory("GLYCOGEN")["α(1→6)"]).toBeGreaterThanOrEqual(2);
    expect(
      structures.AMYLOSE.residues.every(
        (r) => r.anomericConfiguration === "alpha",
      ),
    ).toBe(true);
    expect(
      structures.CELLULOSE.residues.every(
        (r) => r.anomericConfiguration === "beta",
      ),
    ).toBe(true);
    for (const id of ["AMYLOSE", "AMYLOPECTIN", "GLYCOGEN", "CELLULOSE"] as const)
      expect(structures[id].reducingEnds).toHaveLength(1);
  });
  it("branch points agree with the glycosidic connectivity", () => {
    for (const id of MULTI) {
      const data = structures[id];
      const branches = data.glycosidicBonds.filter((b) => b.branch);
      expect(data.branchPoints).toHaveLength(branches.length);
      for (const point of data.branchPoints) {
        const bond = data.glycosidicBonds.find((b) => b.id === point.bond)!;
        expect(bond.branch).toBe(true);
        expect(bond.acceptorResidue).toBe(point.residue);
        expect(bond.acceptorCarbon).toBe(point.carbon);
        expect(point.carbon).toBe("C6");
      }
    }
    expect(structures.AMYLOSE.branchPoints).toHaveLength(0);
    expect(structures.CELLULOSE.branchPoints).toHaveLength(0);
    expect(structures.AMYLOPECTIN.branchPoints).toHaveLength(1);
    expect(structures.GLYCOGEN.branchPoints).toHaveLength(2);
  });
  it("built fragments record how they were made and reproduce their reference", () => {
    for (const id of ["AMYLOSE", "AMYLOPECTIN", "GLYCOGEN", "CELLULOSE"] as const) {
      const data = structures[id];
      expect(data.coordinateKind).toContain("representative fragment");
      expect(data.builder?.linkageReferences.length).toBeGreaterThan(0);
      expect(data.builder?.script).toBe("scripts/glycans.py");
      const { atoms } = readSdf(id);
      for (const bond of data.glycosidicBonds) {
        // Measured here from the file, not read out of the generator's report.
        const donor = distance(atoms[bond.donorAtom], atoms[bond.bridgingAtom]);
        const acceptor = distance(
          atoms[bond.bridgingAtom],
          atoms[bond.acceptorAtom],
        );
        const angle = bondAngle(
          atoms[bond.donorAtom],
          atoms[bond.bridgingAtom],
          atoms[bond.acceptorAtom],
        );
        for (const length of [donor, acceptor]) {
          expect(length).toBeGreaterThan(1.36);
          expect(length).toBeLessThan(1.48);
        }
        expect(angle).toBeGreaterThan(105);
        expect(angle).toBeLessThan(125);
        expect(bond.geometry.bond).toBeCloseTo(donor, 2);
        expect(bond.geometry.angle).toBeCloseTo(angle, 1);
      }
      // No severe overlap between residues that are not directly linked.
      const linked = new Set(
        data.glycosidicBonds.map((b) =>
          [b.donorResidue, b.acceptorResidue].sort().join(""),
        ),
      );
      const byResidue = new Map<string, number[]>();
      for (const atom of data.atoms)
        if (atom.element !== "H")
          byResidue.set(atom.residue!, [
            ...(byResidue.get(atom.residue!) ?? []),
            atom.index,
          ]);
      const ids = [...byResidue.keys()];
      let closest = Infinity;
      for (let i = 0; i < ids.length; i += 1)
        for (let j = i + 1; j < ids.length; j += 1) {
          if (linked.has([ids[i], ids[j]].sort().join(""))) continue;
          for (const a of byResidue.get(ids[i])!)
            for (const b of byResidue.get(ids[j])!)
              closest = Math.min(closest, distance(atoms[a], atoms[b]));
        }
      expect(closest).toBeGreaterThan(2.6);
    }
  });
});
