export type MoleculeId = "GLC" | "BGC" | "GAL" | "FRU" | "BDR" | "2DR";
export interface AtomReference {
  moleculeId?: MoleculeId;
  atomName: string;
}
export interface Annotation {
  id: string;
  kind: "atom" | "substituent" | "glycosidic";
  atoms: AtomReference[];
  label: string;
  color?: string;
}
export interface Carbohydrate {
  id: MoleculeId;
  name: string;
  koreanName: string;
  canonicalName: string;
  commonName: string;
  formula: string;
  category: "monosaccharide" | "disaccharide" | "polysaccharide";
  group: string;
  structureFile: string;
  stereochemicalForm: string;
  ringForm: string;
  conformation: string;
  source: string;
  sourceIdentifier: string;
  notes: string;
  description: string;
  observationQuestions: string[];
  answer: string;
  annotations: Annotation[];
}
export interface ViewerOptions {
  representation: "ball-stick" | "spacefill";
  hydrogen: boolean;
  carbons: boolean;
  hydroxyl: boolean;
  anomeric: boolean;
  axial: boolean;
  spinning: boolean;
}
