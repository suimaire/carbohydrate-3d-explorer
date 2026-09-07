import { describe, it, expect, vi } from "vitest";
import { applyAnnotations } from "../src/lib/annotations";
import {
  moleculeById,
  defaultOptions,
  structures,
} from "../src/data/carbohydrates";
import type { MoleculeId } from "../src/types/carbohydrate";
import type { GLViewer } from "3dmol";
import { readSdf } from "./sdf";
function mockViewer(id: MoleculeId) {
  return {
    getModel: () => ({ selectedAtoms: () => readSdf(id).atoms }),
    setStyle: vi.fn(),
    removeAllLabels: vi.fn(),
    removeAllShapes: vi.fn(),
    addLabel: vi.fn(),
    addLine: vi.fn(),
    render: vi.fn(),
  };
}
describe("teaching annotations sent to 3Dmol", () => {
  it("fructose labels C2 as anomeric and does not duplicate its carbon label", () => {
    const v = mockViewer("FRU");
    applyAnnotations(
      v as unknown as GLViewer,
      moleculeById("FRU"),
      { ...defaultOptions, carbons: true, anomeric: true },
      null,
    );
    expect(v.addLabel.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        "C1",
        "C2 — anomeric carbon",
        "C3",
        "C4",
        "C5",
        "C6",
      ]),
    );
    expect(v.addLabel).toHaveBeenCalledTimes(6);
  });
  for (const id of ["GLC", "BGC"] as const)
    it(`${id} axial/equatorial labels`, () => {
      const v = mockViewer(id);
      applyAnnotations(
        v as unknown as GLViewer,
        moleculeById(id),
        { ...defaultOptions, axial: true },
        null,
      );
      const labels = v.addLabel.mock.calls.map((c) => c[0] as string);
      expect(labels).toHaveLength(5);
      expect(labels.filter((x) => x.endsWith("axial"))).toHaveLength(
        id === "GLC" ? 1 : 0,
      );
    });
  it("OH highlights only hydroxyl atoms; ring oxygen is excluded; H visibility is respected", () => {
    const v = mockViewer("BGC");
    applyAnnotations(
      v as unknown as GLViewer,
      moleculeById("BGC"),
      { ...defaultOptions, hydroxyl: true },
      null,
    );
    expect(v.setStyle).toHaveBeenCalledWith(
      { index: structures.BGC.hydroxylAtoms },
      expect.anything(),
    );
    expect(structures.BGC.hydroxylAtoms).not.toContain(
      structures.BGC.atoms.find((a) => a.name === "O5")!.index,
    );
    expect(v.setStyle).toHaveBeenCalledWith(
      { elem: "H", index: structures.BGC.hydroxylAtoms },
      {},
    );
  });
  it("spacefill and Haworth carbon selection use the corresponding atom", () => {
    const v = mockViewer("BGC");
    applyAnnotations(
      v as unknown as GLViewer,
      moleculeById("BGC"),
      { ...defaultOptions, representation: "spacefill" },
      "C4",
    );
    expect(v.setStyle.mock.calls[0][1]).toHaveProperty("sphere.scale", 1);
    expect(v.setStyle).toHaveBeenCalledWith(
      { index: structures.BGC.carbons.C4 },
      { sphere: { scale: 1, color: "#087d91" } },
    );
  });
});
