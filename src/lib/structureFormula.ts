import type { StructureData, StructureResidue } from "../types/carbohydrate";

export type FormulaSide = "up" | "down";
export interface FormulaSubstituent {
  carbon: string;
  atom: string;
  label: "OH" | "CH₂OH" | "H";
  side: FormulaSide;
}
export interface FormulaResidue {
  residue: StructureResidue;
  ring: string[];
  substituents: FormulaSubstituent[];
}

/** Standard Haworth orientation: ring oxygen at the back, anomeric C at right.
 * These are configurations (sides of the ring), never axial/equatorial values.
 * All shipped forms are D sugars. Tests independently check every side and
 * heavy-atom edge against the actual SDF coordinates/connectivity.
 */
export function formulaResidue(data: StructureData, residue: StructureResidue): FormulaResidue {
  const substituents: FormulaSubstituent[] = [];
  const add = (carbon: string, atom: string, label: FormulaSubstituent["label"], side: FormulaSide) =>
    substituents.push({ carbon, atom, label, side });
  const oh = (n: number, side: FormulaSide) => add(`C${n}`, `O${n}`, "OH", side);
  const anomerSide = residue.anomericConfiguration === "alpha" ? "down" : "up";
  switch (residue.sugar) {
    case "glucose":
    case "galactose":
      oh(1, anomerSide);
      oh(2, "down");
      oh(3, "up");
      oh(4, residue.sugar === "galactose" ? "up" : "down");
      add("C5", "C6", "CH₂OH", "up");
      break;
    case "fructose":
      oh(2, anomerSide);
      add("C2", "C1", "CH₂OH", anomerSide === "up" ? "down" : "up");
      oh(3, "up");
      oh(4, "down");
      add("C5", "C6", "CH₂OH", "up");
      break;
    case "ribose":
    case "2-deoxyribose":
      oh(1, anomerSide);
      if (residue.sugar === "ribose") oh(2, "down");
      else {
        // C2 is CH2, not a stereocentre; show both H explicitly.
        add("C2", "H2", "H", "down");
        add("C2", "H22C", "H", "up");
      }
      oh(3, "down");
      add("C4", "C5", "CH₂OH", "up");
      break;
    default:
      throw new Error(`Unverified Haworth sugar: ${residue.sugar}`);
  }
  const ring = residue.ringAtoms.map(i => data.atoms[i].name);
  const expected = residue.sugar === "fructose" ? "C2,C3,C4,C5,O5"
    : residue.sugar === "ribose" || residue.sugar === "2-deoxyribose" ? "C1,C2,C3,C4,O4"
    : "C1,C2,C3,C4,C5,O5";
  if (ring.join(",") !== expected) throw new Error(`Unverified Haworth ring: ${residue.form}`);
  return { residue, ring, substituents };
}

/** An OH at a linkage endpoint is replaced by the shared bridging oxygen. */
export function bondAtCarbon(data: StructureData, residue: string, carbon: string) {
  return data.glycosidicBonds.find(b =>
    (b.donorResidue === residue && b.donorCarbon === carbon) ||
    (b.acceptorResidue === residue && b.acceptorCarbon === carbon));
}

export interface FormulaPoint { x: number; y: number }
const PYRANOSE: FormulaPoint[] = [
  { x: 226, y: 108 }, { x: 181, y: 154 }, { x: 91, y: 154 },
  { x: 46, y: 108 }, { x: 91, y: 62 }, { x: 181, y: 62 },
];
const FURANOSE: FormulaPoint[] = [
  { x: 224, y: 91 }, { x: 191, y: 154 }, { x: 83, y: 154 },
  { x: 50, y: 91 }, { x: 137, y: 55 },
];

export function formulaGeometry(formula: FormulaResidue, offset = 0, turned = false) {
  const points = formula.ring.length === 6 ? PYRANOSE : FURANOSE;
  // Sucrose's fructose faces glucose. A proper half-turn reverses BOTH x and
  // ring-normal directions. Reflecting x alone would depict the wrong sugar.
  const position = (p: FormulaPoint) => ({ x: offset + (turned ? 280 - p.x : p.x), y: p.y });
  const ring = Object.fromEntries(formula.ring.map((n, i) => [n, position(points[i])])) as Record<string, FormulaPoint>;
  const direction = (side: FormulaSide) => (side === "up" ? -1 : 1) * (turned ? -1 : 1);
  return { ring, direction };
}
