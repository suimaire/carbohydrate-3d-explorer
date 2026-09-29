import type { GLViewer } from "./molecularViewer";
import type { ViewerOptions } from "../types/carbohydrate";
import { atomOrder, sampleRingChain } from "./ringChain";
import type { GlucoseAnomer } from "./ringChain";
import { COLOR, atomLabelStyle } from "./annotations";

/** One GLModel, one local frame, twelve stable AtomSpec objects throughout. */
export function createRingChainRenderer(v: GLViewer, start: GlucoseAnomer) {
  const original = v.getModel();
  original.hide();
  v.removeAllLabels();
  v.removeAllShapes();
  const model = v.addModel();
  const first = sampleRingChain(start, null, 0);
  model.addAtoms(atomOrder.map((name, index) => ({
    index, serial: index, atom: name, elem: name[0],
    x: first.coordinates[index][0], y: first.coordinates[index][1], z: first.coordinates[index][2],
    bonds: [], bondOrder: [],
  })));
  const atoms = model.selectedAtoms({});
  model.addFrame(atoms);
  let disposed = false;
  let topology = "";
  let representation = "";
  const labels = new Map<number, ReturnType<GLViewer["addLabel"]>>();
  return {
    update(progress: number, target: GlucoseAnomer | null, options: ViewerOptions, tracking: boolean) {
      if (disposed) return;
      const state = sampleRingChain(start, target, progress);
      atoms.forEach((a, i) => { [a.x, a.y, a.z] = state.coordinates[i]; });
      if (state.topology !== topology) {
        for (const a of atoms) { a.bonds = []; a.bondOrder = []; }
        for (const [a, b, order] of state.bonds) {
          atoms[a].bonds!.push(b); atoms[a].bondOrder!.push(order);
          atoms[b].bonds!.push(a); atoms[b].bondOrder!.push(order);
        }
        topology = state.topology;
      }
      if (representation !== options.representation) {
        model.setStyle({}, options.representation === "spacefill"
          ? { sphere: { scale: 1, colorscheme: COLOR.base } }
          : { stick: { radius: 0.13, colorscheme: COLOR.base }, sphere: { scale: 0.28, colorscheme: COLOR.base } });
        representation = options.representation;
      }
      // 2.5.5 local setFrame mutates synchronously inside a resolved Promise.
      // The public API invalidates model geometry without changing the camera.
      void model.setFrame(0);
      const wanted = new Set<number>([
        ...(options.carbons ? [0, 1, 2, 3, 4, 5] : []),
        ...(tracking ? [0, 6, 10] : []),
      ]);
      for (const [i, label] of labels) {
        if (!wanted.has(i)) { v.removeLabel(label); labels.delete(i); }
      }
      for (const i of wanted) {
        const style = atomLabelStyle(atoms[i], COLOR.text, i === 0 ? -0.65 : 0.65);
        if (tracking && (i === 0 || i === 6 || i === 10)) style.backgroundOpacity = 0.65;
        const existing = labels.get(i);
        if (existing) v.setLabelStyle(existing, style);
        else labels.set(i, v.addLabel(atomOrder[i], style));
      }
      v.render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const label of labels.values()) v.removeLabel(label);
      labels.clear();
      v.removeModel(model);
      original.show();
    },
  };
}
