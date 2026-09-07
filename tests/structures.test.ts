import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { carbohydrates, structures } from "../src/data/carbohydrates";
import { readSdf } from "./sdf";
describe("shipped scientific data", () => {
  for (const m of carbohydrates) {
    it(`${m.id}: provenance, formula, connectivity, numbering and OH groups`, () => {
      const data = structures[m.id];
      const { text, atoms, bonds } = readSdf(m.id);
      expect(createHash("sha256").update(text).digest("hex")).toBe(
        data.sdfSHA256,
      );
      expect(
        createHash("sha256")
          .update(readFileSync(`public/molecules/${m.id}.cif`))
          .digest("hex"),
      ).toBe(data.sourceSHA256);
      expect(atoms.length).toBe(data.atoms.length);
      expect(bonds.length).toBe(atoms.length);
      const counts = Object.fromEntries(
        ["C", "H", "O"].map((e) => [
          e,
          atoms.filter((a) => a.elem === e).length,
        ]),
      );
      expect(counts).toEqual(
        m.id === "2DR"
          ? { C: 5, H: 10, O: 4 }
          : m.id === "BDR"
            ? { C: 5, H: 10, O: 5 }
            : { C: 6, H: 12, O: 6 },
      );
      const neighbors = (i: number) =>
        bonds
          .filter((b) => b[0] === i || b[1] === i)
          .map((b) => (b[0] === i ? b[1] : b[0]));
      atoms.forEach((a, i) => {
        expect(a.elem).toBe(data.atoms[i].element);
        expect(neighbors(i).length).toBe(
          a.elem === "C" ? 4 : a.elem === "O" ? 2 : 1,
        );
        expect([a.x, a.y, a.z].every(Number.isFinite)).toBe(true);
      });
      for (const [name, index] of Object.entries(data.carbons)) {
        expect(data.atoms[index].name).toBe(name);
        expect(atoms[index].elem).toBe("C");
      }
      expect(Object.keys(data.carbons).sort()).toEqual(
        Array.from({ length: counts.C }, (_, i) => `C${i + 1}`),
      );
      expect(data.atoms[data.anomericAtom].name).toBe(
        m.id === "FRU" ? "C2" : "C1",
      );
      expect(
        neighbors(data.anomericAtom).filter((i) => atoms[i].elem === "O"),
      ).toHaveLength(2);
      const hydroxyl = atoms
        .filter(
          (a) =>
            a.elem === "O" &&
            neighbors(a.index).some((i) => atoms[i].elem === "H"),
        )
        .flatMap((a) => [
          a.index,
          ...neighbors(a.index).filter((i) => atoms[i].elem === "H"),
        ]);
      expect([...data.hydroxylAtoms].sort((a, b) => a - b)).toEqual(
        hydroxyl.sort((a, b) => a - b),
      );
      expect(data.validation.CIP_matches_CCD).toBe(true);
    });
  }
  it("alpha/beta are C1 anomers, galactose is the C4 epimer", () => {
    const a = structures.GLC.validation.CIP_from_3D,
      b = structures.BGC.validation.CIP_from_3D,
      g = structures.GAL.validation.CIP_from_3D;
    expect(
      Object.keys(a).filter(
        (k) => a[k as keyof typeof a] !== b[k as keyof typeof b],
      ),
    ).toEqual(["C1"]);
    expect(
      Object.keys(g).filter(
        (k) => g[k as keyof typeof g] !== b[k as keyof typeof b],
      ),
    ).toEqual(["C4"]);
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
    expect(structures.GLC.validation.axialNormalCosines.C1).toBeGreaterThan(
      0.85,
    );
    Object.values(structures.BGC.validation.axialNormalCosines).forEach((v) =>
      expect(v).toBeLessThan(0.65),
    );
    expect(structures.GLC.validation.chairHeights.C1).toBeLessThan(-0.2);
    expect(structures.GLC.validation.chairHeights.C4).toBeGreaterThan(0.2);
  });
  it("deoxy C2 lacks O2 and has two hydrogen neighbors", () => {
    const { atoms, bonds } = readSdf("2DR");
    const c = structures["2DR"].carbons.C2;
    const ns = bonds
      .filter((b) => b[0] === c || b[1] === c)
      .map((b) => atoms[b[0] === c ? b[1] : b[0]].elem);
    expect(ns.sort()).toEqual(["C", "C", "H", "H"]);
    expect(structures["2DR"].atoms.some((a) => a.name === "O2")).toBe(false);
  });
});
