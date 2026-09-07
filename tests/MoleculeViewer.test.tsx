// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { MoleculeViewer } from "../src/components/MoleculeViewer";
import { moleculeById, defaultOptions } from "../src/data/carbohydrates";
import { readSdf } from "./sdf";
const mocks = vi.hoisted(() => ({ create: vi.fn(), annotate: vi.fn() }));
vi.mock("../src/lib/molecularViewer", () => ({ createViewer: mocks.create }));
vi.mock("../src/lib/annotations", () => ({ applyAnnotations: mocks.annotate }));
let currentAtoms = readSdf("BGC").atoms;
function viewerMock() {
  let view = [0, 0, 0, -50, 0, 0, 0, 1];
  return {
    clear: vi.fn(),
    setView: vi.fn((v) => {
      view = v;
    }),
    getView: () => view,
    addModel: vi.fn(() => ({ selectedAtoms: () => currentAtoms })),
    setStyle: vi.fn(),
    zoomTo: vi.fn(),
    zoom: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    spin: vi.fn(),
    setViewChangeCallback: vi.fn(),
  };
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  currentAtoms = readSdf("BGC").atoms;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => readSdf("BGC").text }),
  );
  mocks.create.mockReset().mockImplementation(viewerMock);
  mocks.annotate.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("loads static data, defaults to stopped rotation, and clears on unmount", async () => {
  const onReady = vi.fn();
  const r = render(
    <MoleculeViewer
      molecule={moleculeById("BGC")}
      options={defaultOptions}
      onReady={onReady}
    />,
  );
  await waitFor(() =>
    expect(onReady).toHaveBeenCalledWith(
      expect.objectContaining({ addModel: expect.any(Function) }),
    ),
  );
  expect(fetch).toHaveBeenCalledWith("/molecules/BGC.sdf", expect.anything());
  const v = mocks.create.mock.results[0].value;
  expect(v.spin).toHaveBeenCalledWith(false, 0.6);
  r.unmount();
  expect(onReady).toHaveBeenLastCalledWith(null);
  expect(v.clear).toHaveBeenCalled();
});
it("shows a visible error and retries a failed file", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status: 404,
  } as Response);
  render(
    <MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />,
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
});
it("reuses WebGL viewer when switching molecules and waits for the new data before annotating", async () => {
  const r = render(
    <MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />,
  );
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  mocks.annotate.mockClear();
  currentAtoms = readSdf("BDR").atoms;
  let finish!: (r: Response) => void;
  vi.mocked(fetch).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  r.rerender(
    <MoleculeViewer molecule={moleculeById("BDR")} options={defaultOptions} />,
  );
  expect(mocks.annotate).not.toHaveBeenCalled();
  finish({ ok: true, text: async () => readSdf("BDR").text } as Response);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.annotate.mock.calls[0][1].id).toBe("BDR");
});
it("ignores a stale load after rapid molecule selection", async () => {
  let finish!: (r: Response) => void;
  vi.mocked(fetch).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const r = render(
    <MoleculeViewer molecule={moleculeById("GLC")} options={defaultOptions} />,
  );
  r.rerender(
    <MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />,
  );
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  finish({ ok: true, text: async () => readSdf("GLC").text } as Response);
  await Promise.resolve();
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
