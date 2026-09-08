import type { GLViewer, AtomSpec, AtomStyleSpec } from "./molecularViewer";
import type {
  Carbohydrate,
  FocusState,
  GlycosidicBond,
  StructureResidue,
  ViewerOptions,
} from "../types/carbohydrate";
import {
  atomLabel,
  axialLabels,
  capabilitiesOf,
  NO_FOCUS,
  residueLabel,
  structures,
} from "../data/carbohydrates";
const COLOR = {
  base: { prop: "elem", map: { C: 0x626b75, O: 0xd93835, H: 0xd9dfe5 } },
  hydroxyl: "#bd2674",
  anomeric: "#c07800",
  anomericText: "#8d5700",
  focus: "#087d91",
  chain: "#2f5fa8",
  branch: "#7b3f9d",
  reducing: "#1b7f3b",
  axial: "#9b4d00",
  equatorial: "#166b58",
  text: "#233d56",
};
/** Labels are the first thing that makes a large fragment unreadable. */
const LABEL_BUDGET = 30;
function residuesInFocus(
  residues: StructureResidue[],
  bonds: GlycosidicBond[],
  branchResidues: string[],
  reducingEnds: string[],
  focus: FocusState,
  crowded: boolean,
): Set<string> {
  if (!crowded) return new Set(residues.map((r) => r.id));
  if (focus.bond) {
    const bond = bonds.find((b) => b.id === focus.bond);
    if (bond) return new Set([bond.donorResidue, bond.acceptorResidue]);
  }
  if (focus.residue) return new Set([focus.residue]);
  const fallback = [...reducingEnds, ...branchResidues];
  return new Set(fallback.length ? fallback : [residues[0].id]);
}
export function applyAnnotations(
  v: GLViewer,
  m: Carbohydrate,
  o: ViewerOptions,
  focus: FocusState = NO_FOCUS,
) {
  const data = structures[m.id];
  const can = capabilitiesOf(m.id);
  const atoms = v.getModel().selectedAtoms({});
  const residueById = new Map(data.residues.map((r) => [r.id, r]));
  const style = (color?: string): AtomStyleSpec =>
    o.representation === "spacefill"
      ? {
          sphere: {
            scale: 1,
            ...(color ? { color } : { colorscheme: COLOR.base }),
          },
        }
      : {
          stick: {
            radius: 0.13,
            ...(color ? { color } : { colorscheme: COLOR.base }),
          },
          sphere: {
            scale: 0.28,
            ...(color ? { color } : { colorscheme: COLOR.base }),
          },
        };
  v.removeAllLabels();
  v.removeAllShapes();
  v.setStyle({}, style());
  if (!o.hydrogen) v.setStyle({ elem: "H" }, {});
  if (o.hydroxyl) {
    v.setStyle({ index: data.hydroxylAtoms }, style(COLOR.hydroxyl));
    if (!o.hydrogen) v.setStyle({ elem: "H", index: data.hydroxylAtoms }, {});
  }
  let placed = 0;
  const label = (
    text: string,
    atom: AtomSpec,
    color = COLOR.text,
    offset = 0.55,
  ) => {
    if (placed >= LABEL_BUDGET) return;
    placed += 1;
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
  const anomericAtoms = data.residues.map((r) => r.anomericAtom);
  const visible = residuesInFocus(
    data.residues,
    data.glycosidicBonds,
    data.branchPoints.map((b) => b.residue),
    data.reducingEnds,
    focus,
    can.crowded,
  );
  if (o.carbons)
    for (const residue of data.residues) {
      if (!visible.has(residue.id)) continue;
      for (const [name, index] of Object.entries(residue.carbons)) {
        if (o.anomeric && index === residue.anomericAtom) continue;
        label(atomLabel(data.residues, residue.id, name), atoms[index]);
      }
    }
  if (o.anomeric) {
    v.setStyle({ index: anomericAtoms }, style(COLOR.anomeric));
    for (const residue of data.residues) {
      if (can.crowded && !visible.has(residue.id)) continue;
      const name = atomLabel(
        data.residues,
        residue.id,
        residue.anomericCarbon,
      );
      label(
        can.multiResidue ? `${name} — anomeric` : `${name} — anomeric carbon`,
        atoms[residue.anomericAtom],
        COLOR.anomericText,
        0.8,
      );
    }
  }
  if (o.glycosidic && can.glycosidic) {
    const tube = (a: AtomSpec, b: AtomSpec, color: string, dashed: boolean) =>
      v.addCylinder({
        start: { x: a.x!, y: a.y!, z: a.z! },
        end: { x: b.x!, y: b.y!, z: b.z! },
        radius: 0.24,
        color,
        opacity: 0.55,
        dashed,
        fromCap: 1,
        toCap: 1,
      });
    // One representative label per linkage type keeps a long chain readable;
    // picking a bond swaps to the full donor / bridge / acceptor breakdown.
    const detailed = focus.bond
      ? data.glycosidicBonds.filter((b) => b.id === focus.bond)
      : data.glycosidicBonds.filter(
          (b, i) =>
            data.glycosidicBonds.findIndex(
              (other) => other.notation === b.notation,
            ) === i,
        );
    for (const bond of data.glycosidicBonds) {
      const color = bond.branch ? COLOR.branch : COLOR.chain;
      v.setStyle(
        { index: [bond.donorAtom, bond.bridgingAtom, bond.acceptorAtom] },
        style(color),
      );
      tube(atoms[bond.donorAtom], atoms[bond.bridgingAtom], color, bond.branch);
      tube(
        atoms[bond.bridgingAtom],
        atoms[bond.acceptorAtom],
        color,
        bond.branch,
      );
    }
    for (const bond of detailed) {
      const color = bond.branch ? COLOR.branch : COLOR.chain;
      const donor = residueById.get(bond.donorResidue);
      const acceptor = residueById.get(bond.acceptorResidue);
      label(
        `${bond.notation}${bond.branch ? " · 가지" : ""}`,
        atoms[bond.bridgingAtom],
        color,
        0.95,
      );
      if (donor)
        label(
          `${residueLabel(donor)} · ${bond.donorCarbon}`,
          atoms[bond.donorAtom],
          color,
          -0.8,
        );
      if (acceptor)
        label(
          `${residueLabel(acceptor)} · ${bond.acceptorCarbon}`,
          atoms[bond.acceptorAtom],
          color,
          0.6,
        );
    }
  }
  if (o.reducing && can.reducing) {
    if (data.reducingEnds.length) {
      for (const id of data.reducingEnds) {
        const residue = residueById.get(id);
        if (!residue) continue;
        const oxygen = residue.atoms[
          residue.anomericCarbon === "C1" ? "O1" : "O2"
        ];
        const marked = [residue.anomericAtom, oxygen].filter(
          (i) => i !== undefined,
        );
        v.setStyle({ index: marked }, style(COLOR.reducing));
        label(
          `환원 말단 · ${residueLabel(residue)} ${residue.anomericCarbon}–OH`,
          atoms[residue.anomericAtom],
          COLOR.reducing,
          0.9,
        );
      }
    } else {
      // Sucrose: both anomeric carbons are spent on the linkage.
      v.setStyle({ index: anomericAtoms }, style(COLOR.anomeric));
      for (const residue of data.residues)
        label(
          `${residueLabel(residue)} · ${residue.anomericCarbon} — 결합에 참여`,
          atoms[residue.anomericAtom],
          COLOR.anomericText,
          0.9,
        );
    }
  }
  if (o.branch && can.branch)
    for (const point of data.branchPoints) {
      const residue = residueById.get(point.residue);
      const bond = data.glycosidicBonds.find((b) => b.id === point.bond);
      if (!residue || !bond) continue;
      v.setStyle(
        { index: [bond.acceptorAtom, bond.bridgingAtom, bond.donorAtom] },
        style(COLOR.branch),
      );
      label(
        `가지 시작 · ${residueLabel(residue)} ${point.carbon} · ${bond.notation}`,
        atoms[bond.acceptorAtom],
        COLOR.branch,
        0.9,
      );
    }
  if (focus.carbon) {
    const residue =
      (focus.residue && residueById.get(focus.residue)) || data.residues[0];
    const index = residue?.atoms[focus.carbon];
    if (index !== undefined) {
      v.setStyle({ index }, style(COLOR.focus));
      if (!o.carbons)
        label(
          atomLabel(data.residues, residue.id, focus.carbon),
          atoms[index],
          COLOR.focus,
        );
    }
  } else if (focus.residue) {
    const residue = residueById.get(focus.residue);
    if (residue) {
      v.setStyle({ index: residue.ringAtoms }, style(COLOR.focus));
      label(residueLabel(residue), atoms[residue.anomericAtom], COLOR.focus, 0.9);
    }
  }
  if (o.axial && can.axial) {
    const [residue] = data.residues;
    for (const { carbon, substituent, axial } of axialLabels(m.id)) {
      const index = residue.atoms[substituent];
      if (index === undefined) continue;
      label(
        `${carbon}–${substituent === "C6" ? "CH₂OH" : "OH"} · ${axial ? "axial" : "equatorial"}`,
        atoms[index],
        axial ? COLOR.axial : COLOR.equatorial,
        carbon === "C2" || carbon === "C3" ? -0.8 : 0.65,
      );
    }
  }
  v.render();
}
