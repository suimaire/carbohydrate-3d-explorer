export interface CameraViewer {
  getView(): number[];
  setView(view: number[]): unknown;
  setViewChangeCallback(callback: ((view: number[]) => void) | null): void;
}
/** Guard re-entrant callbacks: setView itself emits a view-change event. */
export function synchronizeViewers(a: CameraViewer, b: CameraViewer) {
  let updating = false;
  const copy = (target: CameraViewer) => (view: number[]) => {
    if (updating) return;
    updating = true;
    try {
      target.setView([...view]);
    } finally {
      updating = false;
    }
  };
  a.setViewChangeCallback(copy(b));
  b.setViewChangeCallback(copy(a));
  copy(b)(a.getView());
  return () => {
    a.setViewChangeCallback(null);
    b.setViewChangeCallback(null);
  };
}
