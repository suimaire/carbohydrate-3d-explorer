import data from "../data/ring-chain.json";
export type GlucoseAnomer = "GLC" | "BGC";
export type Point = [number, number, number];
export type Bond = [number, number, number];
export const atomOrder = data.atomOrder;
export const ringChainData = data;
export const isGlucose = (id: string): id is GlucoseAnomer => id === "GLC" || id === "BGC";
export const anomerName = (id: GlucoseAnomer) => id === "GLC" ? "α-D-glucose" : "β-D-glucose";
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Each half is an illustrative sequence, never physical reaction time. */
export function sampleRingChain(start: GlucoseAnomer, target: GlucoseAnomer | null, progress: number) {
  const p = clamp(progress, 0, target ? 2 : 1);
  const path = p <= 1 ? start : target!;
  const opening = p <= 1 ? p : 2 - p;
  const frame = smooth(opening) * (data.paths[path].length - 1);
  const lo = Math.floor(frame), hi = Math.min(lo + 1, data.paths[path].length - 1);
  const t = frame - lo;
  const coordinates = data.paths[path][lo].map((point, i) =>
    point.map((v, axis) => v + (data.paths[path][hi][i][axis] - v) * t) as Point,
  );
  // Bond-state switching is separate from continuous coordinate interpolation.
  const topology = smooth(opening) < 0.06 ? "ring" : "chain";
  const bonds = (topology === "ring" ? data.endpoints[path].bonds : data.endpoints.OPEN.bonds) as Bond[];
  const phase = p === 0 ? "ring" : p === 1 ? "open" : p === 2 ? "end" : p < 1 ? "opening" : "closing";
  return { coordinates, bonds, topology, phase, path, opening };
}
export function phaseText(start: GlucoseAnomer, target: GlucoseAnomer | null, progress: number) {
  const { phase } = sampleRingChain(start, target, progress);
  if (phase === "open") return "aldehydo-D-glucose · aldehyde";
  if (phase === "opening") return "C1–O5 결합이 열리는 중";
  if (phase === "closing") return "고리가 다시 형성되는 중";
  return `${(phase === "end" ? target : start) === "GLC" ? "α" : "β"}-D-glucopyranose · hemiacetal`;
}
