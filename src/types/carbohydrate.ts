export type MoleculeId =
  | "GLC"
  | "BGC"
  | "GAL"
  | "FRU"
  | "BDR"
  | "2DR"
  | "MAL"
  | "CBI"
  | "LAT"
  | "SUC"
  | "AMYLOSE"
  | "AMYLOPECTIN"
  | "GLYCOGEN"
  | "CELLULOSE";
export type CarbohydrateCategory =
  | "monosaccharide"
  | "disaccharide"
  | "polysaccharide";
/** A whole molecule, or a representative piece of a much larger macromolecule. */
export type RepresentationType = "molecule" | "fragment";
export type AnomericConfiguration = "alpha" | "beta";
export interface AtomReference {
  moleculeId?: MoleculeId;
  atomName: string;
  residueId?: string;
}
export interface Annotation {
  id: string;
  kind: "atom" | "substituent" | "glycosidic";
  atoms: AtomReference[];
  label: string;
  color?: string;
}
/** One sugar unit inside a structure. Monosaccharides have exactly one. */
export interface StructureResidue {
  id: string;
  residueIndex: number;
  sugar: string;
  sugarLabel: string;
  koreanSugar: string;
  ringForm: "pyranose" | "furanose";
  form: string;
  anomericCarbon: string;
  anomericConfiguration: AnomericConfiguration;
  anomericAtom: number;
  ringAtoms: number[];
  carbons: Record<string, number>;
  atoms: Record<string, number>;
  /** True when the anomeric OH is free, i.e. this residue is a reducing end. */
  freeAnomeric: boolean;
}
export interface GlycosidicBond {
  id: string;
  donorResidue: string;
  donorCarbon: string;
  acceptorResidue: string;
  acceptorCarbon: string;
  /** Atom indices in the shipped structure file. */
  donorAtom: number;
  acceptorAtom: number;
  bridgingAtom: number;
  configuration: AnomericConfiguration;
  notation: string;
  branch: boolean;
  geometry: { bond: number; angle: number; phi: number; psi: number };
}
export interface BranchPoint {
  residue: string;
  carbon: string;
  bond: string;
}
export interface StructureAtom {
  name: string;
  element: string;
  index: number;
  residue?: string;
}
export interface StructureValidation {
  CIP_from_3D?: Record<string, string>;
  CIP_matches_CCD?: boolean;
  ringSize?: number;
  axialNormalCosines?: Record<string, number>;
  chair?: string;
  chairHeights?: Record<string, number>;
  [key: string]: unknown;
}
export interface StructureData {
  atoms: StructureAtom[];
  /** Unique label to atom index. Multi-residue structures use "A:C1" keys. */
  carbons: Record<string, number>;
  ringAtoms: number[];
  hydroxylAtoms: number[];
  anomericAtom: number;
  residues: StructureResidue[];
  glycosidicBonds: GlycosidicBond[];
  reducingEnds: string[];
  branchPoints: BranchPoint[];
  sourceUrl: string;
  downloadUrl: string | null;
  retrieved: string;
  sourceSHA256: string | null;
  sdfSHA256: string;
  coordinateKind: string;
  builder?: {
    script: string;
    residueTemplate: string;
    linkageReferences: string[];
    hydrogenRelaxation: string;
    rdkitVersion: string;
  };
  validation: StructureValidation;
}
export interface Carbohydrate {
  id: MoleculeId;
  name: string;
  koreanName: string;
  canonicalName: string;
  commonName: string;
  formula: string;
  category: CarbohydrateCategory;
  categoryLabel: string;
  group: string;
  representationType: RepresentationType;
  structureFile: string;
  stereochemicalForm: string;
  ringForm: string;
  conformation: string;
  /** Written glycan notation, e.g. α-D-Glcp-(1→4)-α-D-Glcp. Empty for monomers. */
  linkageSummary: string;
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
  glycosidic: boolean;
  reducing: boolean;
  branch: boolean;
  spinning: boolean;
}
/** Which teaching controls a structure can actually support. */
export interface MoleculeCapabilities {
  axial: boolean;
  glycosidic: boolean;
  reducing: boolean;
  branch: boolean;
  multiResidue: boolean;
  /** Above this many residues, labels are limited to the residues in focus. */
  crowded: boolean;
}
export interface FocusState {
  carbon: string | null;
  residue: string | null;
  bond: string | null;
}
