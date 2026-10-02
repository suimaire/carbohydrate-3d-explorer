import type { AtomSpec } from "./molecularViewer";
import type { ViewerOptions } from "../types/carbohydrate";

type Point = { x: number; y: number; z: number };
interface FramingRequest {
  atoms: AtomSpec[];
  viewport: { width: number; height: number };
  options: Pick<ViewerOptions, "representation" | "hydrogen">;
  labels: FramingLabel[];
}
export interface FramingLabel {
  canvas: { width: number; height: number };
  stylespec: { position?: Point; alignment?: string };
}

// Match 3Dmol's perspective camera and its C/O/H space-filling radii.
// zoomTo() retains a 5 Å radius floor even for small sugars. We retain its
// center and clipping slab, but replace that floor with the rendered bounds.
const HALF_FOV = (20 * Math.PI) / 360;
const VDW_RADIUS: Record<string, number> = { C: 1.7, O: 1.52, H: 1.2 };
const EDGE_PADDING = 4;

export function framingCenter(atoms: AtomSpec[]): Point | null {
  const valid = atoms.filter((a) =>
    Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z),
  );
  if (!valid.length) return null;
  return valid.reduce<Point>((sum, a) => ({
    x: sum.x + a.x! / valid.length,
    y: sum.y + a.y! / valid.length,
    z: sum.z + a.z! / valid.length,
  }), { x: 0, y: 0, z: 0 });
}

/** Fit the full rotational envelope, including H/spacefill and label pixels. */
export function defaultFramingDistance(
  atoms: AtomSpec[],
  viewport: { width: number; height: number },
  options: Pick<ViewerOptions, "representation" | "hydrogen">,
  labels: FramingLabel[] = [],
): number | null {
  if (viewport.width <= 2 * EDGE_PADDING || viewport.height <= 2 * EDGE_PADDING)
    return null;
  const valid = atoms.filter((a) =>
    Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z),
  );
  if (!valid.length) return null;
  // 3Dmol zoomTo centers on the centroid of all atoms, including hidden H.
  const center = framingCenter(valid)!;
  const radiusOf = (p: Point) => Math.hypot(
    p.x - center.x, p.y - center.y, p.z - center.z,
  );
  const scale = options.representation === "spacefill" ? 1 : 0.28;
  const radius = Math.max(0, ...valid
    .filter((a) => options.hydrogen || a.elem !== "H")
    .map((a) => radiusOf(a as Point) + (VDW_RADIUS[a.elem!] ?? 1.7) * scale));
  if (!radius) return null;

  // A perspective sphere is bounded by tangent rays: distance = r / sin(a).
  // The horizontal field of view follows the actual canvas aspect ratio.
  const fitRadius = (r: number, reserveX = 0, reserveY = 0) => {
    const horizontal = Math.max(1, viewport.width / 2 - EDGE_PADDING - reserveX);
    const vertical = Math.max(1, viewport.height / 2 - EDGE_PADDING - reserveY);
    const slope = Math.tan(HALF_FOV) * Math.min(horizontal, vertical) /
      (viewport.height / 2);
    return r / Math.sin(Math.atan(slope));
  };
  let distance = fitRadius(radius);
  for (const label of labels) {
    const position = label.stylespec.position;
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) continue;
    const alignment = label.stylespec.alignment ?? "topLeft";
    const centeredX = alignment === "center" || alignment.endsWith("Center");
    const centeredY = alignment === "center" || alignment.startsWith("center");
    distance = Math.max(distance, fitRadius(
      radiusOf(position),
      label.canvas.width / (centeredX ? 2 : 1),
      label.canvas.height / (centeredY ? 2 : 1),
    ));
  }
  return distance;
}

/** Do not replace a student's rotation/pan/zoom when display options change. */
export function isDefaultView(view: number[], initial: number[]) {
  return view.length === initial.length &&
    view.every((value, i) => Math.abs(value - initial[i]) < 1e-6);
}

interface FramingParticipant {
  read(): FramingRequest | null;
  apply(center: Point, distance: number): void;
}

/** Full camera synchronization needs one safe frame for BOTH structures. */
export function createFramingGroup(expectedIds: string[]) {
  const participants = new Map<string, FramingParticipant>();
  const refresh = () => {
    if (expectedIds.some((id) => !participants.has(id))) return false;
    const members = expectedIds.map((id) => participants.get(id)!);
    const requests = members.map((member) => member.read());
    if (requests.some((request) => !request)) return false;
    const ready = requests as FramingRequest[];
    const atoms = ready.flatMap((request) => request.atoms);
    const labels = ready.flatMap((request) => request.labels);
    const center = framingCenter(atoms);
    const distances = ready.map((request) => defaultFramingDistance(
      atoms, request.viewport, request.options, labels,
    ));
    if (!center || distances.some((distance) => distance === null)) return false;
    const distance = Math.max(...distances as number[]);
    // Each participant updates its reset view even after a manual camera move.
    // Only an untouched default moves; the existing synchronizer handles peers.
    members.forEach((member) => member.apply(center, distance));
    return true;
  };
  return {
    refresh,
    register(id: string, participant: FramingParticipant) {
      if (!expectedIds.includes(id)) return () => {};
      participants.set(id, participant);
      refresh();
      return () => { if (participants.get(id) === participant) participants.delete(id); };
    },
  };
}
export type FramingGroup = ReturnType<typeof createFramingGroup>;
