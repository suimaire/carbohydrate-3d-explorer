import type { GLViewer, AtomSpec, AtomStyleSpec } from "./molecularViewer";
import type { Carbohydrate, ViewerOptions } from "../types/carbohydrate";
import { structures, isGlucose } from "../data/carbohydrates";
export function applyAnnotations(
  v: GLViewer,
  m: Carbohydrate,
  o: ViewerOptions,
  focus: string | null,
) {
  const data = structures[m.id];
  const atoms = v.getModel().selectedAtoms({});
  const colors = {
    prop: "elem",
    map: { C: 0x626b75, O: 0xd93835, H: 0xd9dfe5 },
  };
  const style = (color?: string): AtomStyleSpec =>
    o.representation === "spacefill"
      ? {
          sphere: {
            scale: 1,
            ...(color ? { color } : { colorscheme: colors }),
          },
        }
      : {
          stick: {
            radius: 0.13,
            ...(color ? { color } : { colorscheme: colors }),
          },
          sphere: {
            scale: 0.28,
            ...(color ? { color } : { colorscheme: colors }),
          },
        };
  v.removeAllLabels();
  v.removeAllShapes();
  v.setStyle({}, style());
  if (!o.hydrogen) v.setStyle({ elem: "H" }, {});
  if (o.hydroxyl) {
    v.setStyle({ index: data.hydroxylAtoms }, style("#bd2674"));
    if (!o.hydrogen) v.setStyle({ elem: "H", index: data.hydroxylAtoms }, {});
  }
  const label = (
    text: string,
    atom: AtomSpec,
    color = "#233d56",
    offset = 0.55,
  ) => {
    const position = {
      x: atom.x! + offset,
      y: atom.y! + offset,
      z: atom.z! + 0.35,
    };
    v.addLabel(text, {
      position,
      fontSize: 15,
      fontColor: color,
      backgroundColor: "#ffffff",
      backgroundOpacity: 0.92,
      borderColor: color,
      borderThickness: 0.5,
      inFront: true,
    });
    v.addLine({
      start: { x: atom.x!, y: atom.y!, z: atom.z! },
      end: position,
      color,
      linewidth: 1,
    });
  };
  if (o.carbons)
    for (const [name, index] of Object.entries(data.carbons)) {
      if (o.anomeric && index === data.anomericAtom) continue;
      label(name, atoms[index]);
    }
  if (o.anomeric) {
    v.setStyle({ index: data.anomericAtom }, style("#c07800"));
    label(
      `${m.id === "FRU" ? "C2" : "C1"} — anomeric carbon`,
      atoms[data.anomericAtom],
      "#8d5700",
      0.8,
    );
  }
  if (focus) {
    const a = data.atoms.find((a) => a.name === focus);
    if (a) {
      v.setStyle({ index: a.index }, style("#087d91"));
      if (!o.carbons) label(focus, atoms[a.index], "#087d91");
    }
  }
  if (o.axial && isGlucose(m.id))
    for (const [carbon, sub] of [
      ["C1", "O1"],
      ["C2", "O2"],
      ["C3", "O3"],
      ["C4", "O4"],
      ["C5", "C6"],
    ]) {
      const atom = atoms[data.atoms.find((a) => a.name === sub)!.index];
      const axial = m.id === "GLC" && carbon === "C1";
      label(
        `${carbon}–${sub === "C6" ? "CH₂OH" : "OH"} · ${axial ? "axial" : "equatorial"}`,
        atom,
        axial ? "#9b4d00" : "#166b58",
        carbon === "C2" || carbon === "C3" ? -0.8 : 0.65,
      );
    }
  v.render();
}
