import { it, expect } from "vitest";
import { synchronizeViewers } from "../src/lib/viewSync";
class FakeViewer {
  view = [0, 0, 0, -50, 0, 0, 0, 1];
  callback: ((v: number[]) => void) | null = null;
  calls = 0;
  getView() {
    return [...this.view];
  }
  setView(v: number[]) {
    this.view = [...v];
    this.calls++;
    if (this.calls > 20) throw Error("Recursive synchronization");
    this.callback?.(v);
  }
  setViewChangeCallback(cb: ((v: number[]) => void) | null) {
    this.callback = cb;
  }
}
it("synchronizes rotation/zoom/pan in both directions without recursion, and disconnects", () => {
  const a = new FakeViewer(),
    b = new FakeViewer();
  const disconnect = synchronizeViewers(a, b);
  const left = [1, 2, 3, -40, 0.1, 0.2, 0.3, 0.9];
  a.setView(left);
  expect(b.view).toEqual(left);
  const right = [3, 1, 2, -80, 0.3, 0.1, 0.2, 0.8];
  b.setView(right);
  expect(a.view).toEqual(right);
  disconnect();
  a.setView(left);
  expect(b.view).toEqual(right);
  expect(a.callback).toBe(null);
  expect(b.callback).toBe(null);
});
