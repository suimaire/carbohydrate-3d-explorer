import { describe, expect, it } from "vitest";
import { carbohydrates, defaultOptions } from "../src/data/carbohydrates";
import { createFramingGroup, defaultFramingDistance, framingCenter } from "../src/lib/viewerFraming";
import type { FramingLabel } from "../src/lib/viewerFraming";
import { comparisons } from "../src/data/comparisons";
import { readSdf } from "./sdf";

const viewports = [
  { width: 919, height: 308 }, { width: 562, height: 270 },
  { width: 375, height: 270 }, { width: 275, height: 450 },
  { width: 562, height: 385 }, { width: 445, height: 298 }, { width: 375, height: 358 },
];
const modes = [defaultOptions, { ...defaultOptions, hydrogen: true },
  { ...defaultOptions, representation: "spacefill" as const, hydrogen: true }];
const directions = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

describe("default molecular framing", () => {
  for (const molecule of carbohydrates) it(`${molecule.id}: fits rotated atom surfaces in narrow and wide canvases`, () => {
    const { atoms } = readSdf(molecule.id);
    const center = ["x", "y", "z"].map((key) =>
      atoms.reduce((sum, a) => sum + a[key as "x" | "y" | "z"], 0) / atoms.length);
    for (const viewport of viewports) for (const options of modes) {
      const distance = defaultFramingDistance(atoms, viewport, options)!;
      expect(Number.isFinite(distance)).toBe(true);
      for (const atom of atoms.filter((a) => options.hydrogen || a.elem !== "H")) {
        const radius = ({ C: 1.7, O: 1.52, H: 1.2 }[atom.elem] ?? 1.7) *
          (options.representation === "spacefill" ? 1 : .28);
        for (const [dx, dy, dz] of directions) for (const angle of [0, .7, 1.5, 2.8]) {
          const x = atom.x - center[0] + radius * dx;
          const y = atom.y - center[1] + radius * dy;
          const z = atom.z - center[2] + radius * dz;
          const rx = Math.cos(angle) * x - Math.sin(angle) * z;
          const ry = Math.cos(angle) * y - Math.sin(angle) * (Math.sin(angle) * x + Math.cos(angle) * z);
          const rz = Math.sin(angle) * y + Math.cos(angle) * (Math.sin(angle) * x + Math.cos(angle) * z);
          const pixelsPerAngstrom = viewport.height / (2 * Math.tan(Math.PI / 18) * (distance - rz));
          expect(Math.abs(rx * pixelsPerAngstrom)).toBeLessThan(viewport.width / 2);
          expect(Math.abs(ry * pixelsPerAngstrom)).toBeLessThan(viewport.height / 2);
        }
      }
    }
  });

  it("removes the library's small-molecule floor without applying a sugar zoom to polymers", () => {
    const oldSugarDistance = 5 / Math.tan(Math.PI / 18) / 1.05;
    const glucose = defaultFramingDistance(readSdf("BGC").atoms, viewports[1], defaultOptions)!;
    const alpha = defaultFramingDistance(readSdf("GLC").atoms, viewports[1], defaultOptions)!;
    expect(oldSugarDistance / glucose).toBeGreaterThan(1.15);
    expect(oldSugarDistance / glucose).toBeLessThan(1.25);
    expect(Math.abs(glucose / alpha - 1)).toBeLessThan(.01);
    const polymer = defaultFramingDistance(readSdf("AMYLOSE").atoms, viewports[1], defaultOptions)!;
    expect(polymer).toBeGreaterThan(glucose * 4);
  });

  it("accounts for label pixels and representation radii", () => {
    const atoms = readSdf("BGC").atoms;
    const viewport = viewports[2];
    const plain = defaultFramingDistance(atoms, viewport, defaultOptions)!;
    const labelled = defaultFramingDistance(atoms, viewport, defaultOptions, [{
      canvas: { width: 208, height: 29 },
      stylespec: { position: { x: 3, y: 2, z: 1 }, alignment: "center" },
    }])!;
    expect(labelled).toBeGreaterThan(plain);
    expect(defaultFramingDistance(atoms, viewport, modes[2])!).toBeGreaterThan(plain);
  });

  it("defers hidden canvases and rejects absent or invalid coordinates", () => {
    expect(defaultFramingDistance(readSdf("BGC").atoms, { width: 0, height: 300 }, defaultOptions)).toBeNull();
    expect(defaultFramingDistance([], viewports[0], defaultOptions)).toBeNull();
    expect(defaultFramingDistance([{ x: NaN, y: 1, z: 2 }], viewports[0], defaultOptions)).toBeNull();
  });

  it("fits synchronized pairs around a shared center, including the offset MAL/CBI conformers", () => {
    for (const { left, right } of Object.values(comparisons)) {
      for (const options of modes) {
        const atoms = [readSdf(left).atoms, readSdf(right).atoms];
        const group = createFramingGroup([left, right]);
        const frames: { center: { x: number; y: number; z: number }; distance: number }[] = [];
        [left, right].forEach((id, i) => group.register(id, {
          read: () => ({ atoms: atoms[i], viewport: viewports[1], options, labels: [] }),
          apply: (center, distance) => { frames[i] = { center, distance }; },
        }));
        expect(frames[0]).toEqual(frames[1]);
        expect(frames[0].center).toEqual(framingCenter(atoms.flat()));
        for (const atom of atoms.flat().filter((a) => options.hydrogen || a.elem !== "H")) {
          const center = frames[0].center;
          const radius = Math.hypot(atom.x - center.x, atom.y - center.y, atom.z - center.z) +
            ({ C: 1.7, O: 1.52, H: 1.2 }[atom.elem] ?? 1.7) *
              (options.representation === "spacefill" ? 1 : .28);
          const projectedRadius = radius / Math.sqrt(frames[0].distance ** 2 - radius ** 2) /
            Math.tan(Math.PI / 18) * viewports[1].height / 2;
          expect(projectedRadius).toBeLessThan(viewports[1].height / 2);
        }
      }
    }
  });

  it("waits for the current pair and gives both panes room for either pane's labels", () => {
    const group = createFramingGroup(["MAL", "CBI"]);
    let labels: FramingLabel[] = [];
    const frames: number[] = [];
    const left = {
      read: () => ({ atoms: readSdf("MAL").atoms, viewport: viewports[2], options: defaultOptions, labels: [] }),
      apply: (_center: unknown, distance: number) => { frames[0] = distance; },
    };
    group.register("MAL", left);
    group.register("BGC", left); // A stale ready callback is not part of this pair.
    expect(group.refresh()).toBe(false);
    expect(frames).toEqual([]);
    const removeRight = group.register("CBI", {
      read: () => ({ atoms: readSdf("CBI").atoms, viewport: viewports[2], options: defaultOptions, labels }),
      apply: (_center, distance) => { frames[1] = distance; },
    });
    const initial = frames[0];
    labels = [{ canvas: { width: 230, height: 29 },
      stylespec: { position: { x: 3, y: 2, z: 1 }, alignment: "center" } }];
    group.refresh();
    expect(frames[0]).toEqual(frames[1]);
    expect(frames[0]).toBeGreaterThan(initial);
    removeRight();
    expect(group.refresh()).toBe(false);
  });
});
