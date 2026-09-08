// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import App from "../src/App";
import { moleculeIds, structures } from "../src/data/carbohydrates";
import type { MoleculeId, ViewerOptions } from "../src/types/carbohydrate";
import { readSdf } from "./sdf";
const mocks = vi.hoisted(() => ({ create: vi.fn(), annotate: vi.fn() }));
vi.mock("../src/lib/molecularViewer", () => ({ createViewer: mocks.create }));
vi.mock("../src/lib/annotations", () => ({ applyAnnotations: mocks.annotate }));
function viewerMock() {
  let view = [0, 0, 0, -50, 0, 0, 0, 1];
  return {
    clear: vi.fn(),
    setView: vi.fn((v) => {
      view = v;
    }),
    getView: () => view,
    // Two viewers load at once in comparison mode, so the atoms have to come
    // from the text each one was actually given.
    addModel: vi.fn((text: string) => ({
      selectedAtoms: () => atomsFor(text),
    })),
    setStyle: vi.fn(),
    zoomTo: vi.fn(),
    zoom: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    spin: vi.fn(),
    setViewChangeCallback: vi.fn(),
  };
}
const files = moleculeIds.map((id) => ({ id, ...readSdf(id) }));
const atomsFor = (text: string) =>
  files.find((f) => f.text === text)!.atoms;
const lastCall = () => mocks.annotate.mock.calls.at(-1)!;
const lastOptions = () => lastCall()[2] as ViewerOptions;
const lastMolecule = () => lastCall()[1].id as MoleculeId;
beforeEach(() => {
  // jsdom ships <dialog> without its methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const id = url.split("/").pop()!.replace(".sdf", "") as MoleculeId;
      return { ok: true, text: async () => readSdf(id).text } as Response;
    }),
  );
  mocks.create.mockReset().mockImplementation(viewerMock);
  mocks.annotate.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const pick = async (name: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name }));
  await waitFor(() =>
    expect(mocks.annotate).toHaveBeenCalled(),
  );
};
it("opens on a monosaccharide with the original controls and no linkage controls", async () => {
  render(<App />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  expect(lastMolecule()).toBe("BGC");
  expect(screen.getByRole("button", { name: "axial / equatorial" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "글리코시드 결합" })).toBeNull();
  expect(screen.queryByRole("button", { name: "환원 말단" })).toBeNull();
  for (const label of ["H 표시", "탄소 번호", "OH 강조", "아노머 탄소"])
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
});
it("selecting a disaccharide offers the linkage controls and lists its residues", async () => {
  render(<App />);
  await pick(/Maltose/);
  await waitFor(() => expect(lastMolecule()).toBe("MAL"));
  expect(screen.getByRole("button", { name: "글리코시드 결합" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "환원 말단" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "axial / equatorial" })).toBeNull();
  expect(screen.getAllByText("α-D-Glcp-(1→4)-α-D-Glcp").length).toBeGreaterThan(
    0,
  );
  expect(screen.getByRole("button", { name: /Glc A/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Glc B/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "글리코시드 결합" }));
  await waitFor(() => expect(lastOptions().glycosidic).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "환원 말단" }));
  await waitFor(() => expect(lastOptions().reducing).toBe(true));
});
it("picking a linkage chip focuses that bond and turns the highlight on", async () => {
  render(<App />);
  await pick(/Amylopectin/);
  await waitFor(() => expect(lastMolecule()).toBe("AMYLOPECTIN"));
  const branch = structures.AMYLOPECTIN.glycosidicBonds.find((b) => b.branch)!;
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`${branch.donorResidue}:C1 → ${branch.acceptorResidue}:C6`),
    }),
  );
  await waitFor(() => expect(lastOptions().glycosidic).toBe(true));
  expect(lastCall()[3]).toEqual({
    carbon: null,
    residue: null,
    bond: branch.id,
  });
  expect(screen.getByRole("button", { name: "가지 결합" })).toBeTruthy();
});
it("a polysaccharide keeps hydrogens off by default but the toggle still works", async () => {
  render(<App />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "H 표시" }));
  await waitFor(() => expect(lastOptions().hydrogen).toBe(true));
  await pick(/Glycogen/);
  await waitFor(() => expect(lastMolecule()).toBe("GLYCOGEN"));
  expect(lastOptions().hydrogen).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "H 표시" }));
  await waitFor(() => expect(lastOptions().hydrogen).toBe(true));
});
it("comparison mode offers the new pairs and loads both sides", async () => {
  render(<App />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /비교 모드/ }));
  const select = screen.getByRole("combobox");
  expect(
    [...select.querySelectorAll("option")].map((o) => o.getAttribute("value")),
  ).toEqual(["anomer", "epimer", "deoxy", "linkage", "glucan", "branching"]);
  fireEvent.change(select, { target: { value: "linkage" } });
  await waitFor(() => {
    const ids = mocks.annotate.mock.calls.map((c) => c[1].id);
    expect(ids).toContain("MAL");
    expect(ids).toContain("CBI");
  });
  expect(screen.getByRole("button", { name: /회전 동기화/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: "글리코시드 결합" })).toBeTruthy();
  fireEvent.change(select, { target: { value: "branching" } });
  await waitFor(() => {
    const ids = mocks.annotate.mock.calls.map((c) => c[1].id);
    expect(ids).toContain("AMYLOPECTIN");
    expect(ids).toContain("GLYCOGEN");
  });
  // Both polymer schematics are offered next to the atomic comparison.
  expect(screen.getAllByRole("group")).toHaveLength(2);
});
