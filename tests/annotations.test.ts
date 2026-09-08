import { describe, it, expect, vi } from "vitest";
import { applyAnnotations } from "../src/lib/annotations";
import {
  capabilitiesOf,
  NO_FOCUS,
  moleculeById,
  defaultOptions,
  structures,
} from "../src/data/carbohydrates";
import type { FocusState, MoleculeId } from "../src/types/carbohydrate";
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
    addCylinder: vi.fn(),
    render: vi.fn(),
  };
}
const run = (
  id: MoleculeId,
  options: Partial<typeof defaultOptions> = {},
  focus: FocusState = NO_FOCUS,
) => {
  const v = mockViewer(id);
  applyAnnotations(
    v as unknown as GLViewer,
    moleculeById(id),
    { ...defaultOptions, ...options },
    focus,
  );
  return { v, labels: v.addLabel.mock.calls.map((c) => c[0] as string) };
};
describe("teaching annotations sent to 3Dmol", () => {
  it("fructose labels C2 as anomeric and does not duplicate its carbon label", () => {
    const { v, labels } = run("FRU", { carbons: true, anomeric: true });
    expect(labels).toEqual(
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
      const { labels } = run(id, { axial: true });
      expect(labels).toHaveLength(5);
      expect(labels.filter((x) => x.endsWith("axial"))).toHaveLength(
        id === "GLC" ? 1 : 0,
      );
    });
  it("axial labels follow the measured ring geometry, so galactose marks C4", () => {
    expect(capabilitiesOf("GAL").axial).toBe(true);
    expect(capabilitiesOf("FRU").axial).toBe(false);
    const { labels } = run("GAL", { axial: true });
    expect(labels.filter((x) => x.endsWith("axial"))).toEqual([
      "C4–OH · axial",
    ]);
  });
  it("OH highlights only hydroxyl atoms; ring oxygen is excluded; H visibility is respected", () => {
    const { v } = run("BGC", { hydroxyl: true });
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
    const { v } = run("BGC", { representation: "spacefill" }, {
      ...NO_FOCUS,
      carbon: "C4",
    });
    expect(v.setStyle.mock.calls[0][1]).toHaveProperty("sphere.scale", 1);
    expect(v.setStyle).toHaveBeenCalledWith(
      { index: structures.BGC.carbons.C4 },
      { sphere: { scale: 1, color: "#087d91" } },
    );
  });
});
describe("multi-residue annotations", () => {
  it("carbon numbers are qualified by residue once there is more than one", () => {
    const { labels } = run("MAL", { carbons: true });
    expect(labels).toEqual(
      expect.arrayContaining(["Glc A · C1", "Glc B · C4"]),
    );
    expect(labels).toHaveLength(12);
  });
  it("lactose names each residue by its own sugar", () => {
    const { labels } = run("LAT", { carbons: true });
    expect(labels).toEqual(
      expect.arrayContaining(["Gal A · C1", "Glc B · C4"]),
    );
  });
  it("the glycosidic toggle marks donor carbon, bridging oxygen and acceptor carbon", () => {
    const { v, labels } = run("MAL", { glycosidic: true });
    const [bond] = structures.MAL.glycosidicBonds;
    expect(v.setStyle).toHaveBeenCalledWith(
      { index: [bond.donorAtom, bond.bridgingAtom, bond.acceptorAtom] },
      expect.anything(),
    );
    expect(v.addCylinder).toHaveBeenCalledTimes(2);
    expect(labels).toEqual(["α(1→4)", "Glc A · C1", "Glc B · C4"]);
  });
  it("branch linkages are dashed and named, chain linkages are solid", () => {
    const { v } = run("AMYLOPECTIN", { glycosidic: true });
    const dashed = v.addCylinder.mock.calls.filter((c) => c[0].dashed);
    const solid = v.addCylinder.mock.calls.filter((c) => !c[0].dashed);
    expect(dashed).toHaveLength(2 * structures.AMYLOPECTIN.branchPoints.length);
    expect(solid).toHaveLength(
      2 *
        (structures.AMYLOPECTIN.glycosidicBonds.length -
          structures.AMYLOPECTIN.branchPoints.length),
    );
    expect(dashed[0][0].color).not.toBe(solid[0][0].color);
  });
  it("a long fragment gets one label per linkage type, and detail only when a bond is picked", () => {
    const summary = run("AMYLOPECTIN", { glycosidic: true }).labels;
    expect(summary).toEqual(["α(1→4)", "Glc A · C1", "Glc B · C4", "α(1→6) · 가지", expect.any(String), expect.any(String)]);
    const branch = structures.AMYLOPECTIN.glycosidicBonds.find((b) => b.branch)!;
    const picked = run("AMYLOPECTIN", { glycosidic: true }, {
      ...NO_FOCUS,
      bond: branch.id,
    }).labels;
    expect(picked).toEqual([
      "α(1→6) · 가지",
      `Glc ${branch.donorResidue} · C1`,
      `Glc ${branch.acceptorResidue} · C6`,
    ]);
  });
  it("carbon numbers on a crowded fragment stay bounded and follow the focus", () => {
    const all = run("GLYCOGEN", { carbons: true }).labels;
    expect(all.length).toBeLessThanOrEqual(30);
    expect(new Set(all.map((l) => l.split(" · ")[0])).size).toBeLessThanOrEqual(
      1 + structures.GLYCOGEN.branchPoints.length,
    );
    const focused = run("GLYCOGEN", { carbons: true }, {
      ...NO_FOCUS,
      residue: "B",
    }).labels;
    expect(focused).toEqual([
      "Glc B · C1",
      "Glc B · C2",
      "Glc B · C3",
      "Glc B · C4",
      "Glc B · C5",
      "Glc B · C6",
      "Glc B",
    ]);
  });
  it("the reducing-end toggle finds the free anomeric OH", () => {
    const { labels } = run("MAL", { reducing: true });
    expect(labels).toEqual(["환원 말단 · Glc B C1–OH"]);
    expect(run("CBI", { reducing: true }).labels).toEqual([
      "환원 말단 · Glc B C1–OH",
    ]);
    expect(run("LAT", { reducing: true }).labels).toEqual([
      "환원 말단 · Glc B C1–OH",
    ]);
  });
  it("sucrose has no reducing end, so both anomeric carbons are shown as used", () => {
    expect(structures.SUC.reducingEnds).toEqual([]);
    expect(run("SUC", { reducing: true }).labels).toEqual([
      "Glc A · C1 — 결합에 참여",
      "Fru B · C2 — 결합에 참여",
    ]);
  });
  it("the branch toggle names each branch point", () => {
    expect(run("AMYLOPECTIN", { branch: true }).labels).toEqual([
      expect.stringContaining("가지 시작"),
    ]);
    expect(run("GLYCOGEN", { branch: true }).labels).toHaveLength(2);
    expect(capabilitiesOf("AMYLOSE").branch).toBe(false);
    expect(run("AMYLOSE", { branch: true }).labels).toEqual([]);
  });
  it("capabilities only offer controls a structure can answer", () => {
    expect(capabilitiesOf("BGC")).toMatchObject({
      axial: true,
      glycosidic: false,
      reducing: false,
      branch: false,
      multiResidue: false,
    });
    expect(capabilitiesOf("MAL")).toMatchObject({
      axial: false,
      glycosidic: true,
      reducing: true,
      branch: false,
      multiResidue: true,
      crowded: false,
    });
    expect(capabilitiesOf("CELLULOSE")).toMatchObject({
      glycosidic: true,
      branch: false,
      crowded: true,
    });
  });
});
