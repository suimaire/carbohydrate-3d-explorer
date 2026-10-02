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
import { createFramingGroup } from "../src/lib/viewerFraming";
import { synchronizeViewers } from "../src/lib/viewSync";
const mocks = vi.hoisted(() => ({ create: vi.fn(), annotate: vi.fn() }));
vi.mock("../src/lib/molecularViewer", () => ({ createViewer: mocks.create }));
vi.mock("../src/lib/annotations", () => ({ applyAnnotations: mocks.annotate }));
let currentAtoms = readSdf("BGC").atoms;
let resizeViewer = () => {};
function viewerMock() {
  let view = [0, 0, 0, -50, 0, 0, 0, 1];
  let onChange: ((view: number[]) => void) | null = null;
  return {
    clear: vi.fn(),
    setView: vi.fn((v) => {
      view = v;
      onChange?.(v);
    }),
    getView: () => view,
    getPerceivedDistance: () => 150 - view[3],
    addModel: vi.fn(() => ({ selectedAtoms: () => currentAtoms })),
    setStyle: vi.fn(),
    zoomTo: vi.fn(() => { view = [0, 0, 0, 150 - 5 / Math.tan(Math.PI / 18), 0, 0, 0, 1]; }),
    zoom: vi.fn((factor) => { view = [...view]; view[3] = 150 - (150 - view[3]) / factor; }),
    render: vi.fn(),
    resize: vi.fn(),
    spin: vi.fn(),
    setViewChangeCallback: vi.fn((callback) => { onChange = callback; }),
  };
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) { resizeViewer = callback; }
      observe() {}
      disconnect() {}
    },
  );
  currentAtoms = readSdf("BGC").atoms;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(562);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(270);
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
  await waitFor(() => expect(v.spin).toHaveBeenCalledWith(false, 0.6));
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

it("restores the fitted default with both Reset View and the keyboard", async () => {
  const r = render(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  const v = mocks.create.mock.results[0].value;
  const initial = [...v.getView()];
  v.setView([1, 2, 3, 80, 0.2, 0, 0, 0.98]);
  r.rerender(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} resetToken={1} />);
  expect(v.getView()).toEqual(initial);
  v.zoom(1.4);
  fireEvent.keyDown(screen.getByRole("button", { name: /키보드 조작/ }), { key: "0" });
  expect(v.getView()).toEqual(initial);
});

it("fits H and spacefill at the untouched default, preserves a manual view, and resets safely", async () => {
  const r = render(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  const v = mocks.create.mock.results[0].value;
  const ballDistance = v.getPerceivedDistance();
  const full = { ...defaultOptions, hydrogen: true, representation: "spacefill" as const };
  r.rerender(<MoleculeViewer molecule={moleculeById("BGC")} options={full} />);
  expect(v.getPerceivedDistance()).toBeGreaterThan(ballDistance);
  const safeSpacefill = [...v.getView()];
  const manual = [1, 2, 3, 80, 0.2, 0, 0, 0.98];
  v.setView(manual);
  r.rerender(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />);
  expect(v.getView()).toEqual(manual);
  r.rerender(<MoleculeViewer molecule={moleculeById("BGC")} options={full} resetToken={1} />);
  expect(v.getView()).toEqual(safeSpacefill);
});

it("updates default framing for a narrower canvas while preserving a manual camera", async () => {
  const r = render(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} />);
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  const v = mocks.create.mock.results[0].value;
  const wideDistance = v.getPerceivedDistance();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(190);
  resizeViewer();
  expect(v.getPerceivedDistance()).toBeGreaterThan(wideDistance);
  const narrow = [...v.getView()];
  const manual = [1, 2, 3, 80, 0.2, 0, 0, 0.98];
  v.setView(manual);
  resizeViewer();
  expect(v.getView()).toEqual(manual);
  r.rerender(<MoleculeViewer molecule={moleculeById("BGC")} options={defaultOptions} resetToken={1} />);
  expect(v.getView()).toEqual(narrow);
});

it("shares safe comparison defaults while preserving synchronized manual rotation and reset", async () => {
  const group = createFramingGroup(["MAL", "CBI"]);
  currentAtoms = readSdf("MAL").atoms;
  const pair = (right: boolean, hydrogen = false, resetToken = 0) => <>
    <MoleculeViewer molecule={moleculeById("MAL")} options={{ ...defaultOptions, hydrogen }}
      framingGroup={group} resetToken={resetToken} />
    {right && <MoleculeViewer molecule={moleculeById("CBI")} options={{ ...defaultOptions, hydrogen }}
      framingGroup={group} resetToken={resetToken} />}
  </>;
  const r = render(pair(false));
  await waitFor(() => expect(mocks.annotate).toHaveBeenCalled());
  currentAtoms = readSdf("CBI").atoms;
  r.rerender(pair(true));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
  const [left, right] = mocks.create.mock.results.map((result) => result.value);
  await waitFor(() => expect(left.getView()).toEqual(right.getView()));
  const disconnect = synchronizeViewers(left, right);
  const initial = [...left.getView()];
  const manual = [...initial]; manual[4] = .2; manual[7] = .98;
  left.setView(manual);
  r.rerender(pair(true, true));
  expect(left.getView()).toEqual(manual);
  expect(right.getView()).toEqual(manual);
  r.rerender(pair(true, true, 1));
  expect(left.getView()).toEqual(right.getView());
  expect(left.getView()[3]).toBeLessThan(initial[3]);
  expect(left.getView().slice(4)).toEqual([0, 0, 0, 1]);
  disconnect();
});
