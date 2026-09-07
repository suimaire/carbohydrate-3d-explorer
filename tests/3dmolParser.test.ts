// @vitest-environment jsdom
import { it, expect } from "vitest";
import { GLModel } from "3dmol/build/3Dmol.es6.js";
import { carbohydrates, structures } from "../src/data/carbohydrates";
import { readSdf } from "./sdf";
for (const m of carbohydrates)
  it(`actual 3Dmol SDF parser preserves ${m.id} atom order and explicit hydrogens`, () => {
    const model = new GLModel(0);
    const sdf = readSdf(m.id);
    model.addMolData(sdf.text, "sdf", {});
    const atoms = model.selectedAtoms({});
    expect(atoms).toHaveLength(structures[m.id].atoms.length);
    for (const [i, atom] of atoms.entries()) {
      expect(atom.elem).toBe(structures[m.id].atoms[i].element);
      expect(atom.index).toBe(i);
      expect(atom.x).toBeCloseTo(sdf.atoms[i].x, 4);
      expect(atom.bonds?.length).toBe(
        atom.elem === "C" ? 4 : atom.elem === "O" ? 2 : 1,
      );
    }
  });
