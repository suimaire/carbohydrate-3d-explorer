import { useEffect, useMemo, useState } from "react";
import { MoleculeViewer } from "./MoleculeViewer";
import { moleculeById, NO_FOCUS } from "../data/carbohydrates";
import { comparisons } from "../data/comparisons";
import type { ComparisonKind } from "../data/comparisons";
import { StructureFormulaPreview } from "./StructureFormulaPreview";
import { synchronizeViewers } from "../lib/viewSync";
import { createFramingGroup } from "../lib/viewerFraming";
import type { GLViewer } from "../lib/molecularViewer";
import type {
  FocusState,
  MoleculeId,
  ViewerOptions,
} from "../types/carbohydrate";
export function ComparisonViewer({
  selected,
  compare,
  kind,
  sync,
  options,
  resetToken,
  focus,
  focusMolecule = null,
  onFormulaFocus = () => {},
  interconversion = false,
}: {
  selected: MoleculeId;
  compare: boolean;
  kind: ComparisonKind;
  sync: boolean;
  options: ViewerOptions;
  resetToken: number;
  focus: FocusState;
  focusMolecule?: MoleculeId | null;
  onFormulaFocus?: (id: MoleculeId, focus: FocusState) => void;
  interconversion?: boolean;
}) {
  const [left, setLeft] = useState<GLViewer | null>(null);
  const [right, setRight] = useState<GLViewer | null>(null);
  const [wasCompared, setWasCompared] = useState(compare);
  const pair = comparisons[kind];
  const framingGroup = useMemo(() => compare && sync
    ? createFramingGroup([pair.left, pair.right]) : undefined,
  [compare, sync, pair.left, pair.right]);
  useEffect(() => {
    if (compare) setWasCompared(true);
  }, [compare]);
  useEffect(() => {
    if (!compare || !sync || !left || !right) return;
    return synchronizeViewers(left, right);
  }, [compare, sync, left, right, kind, resetToken]);
  useEffect(() => {
    left?.resize();
    right?.resize();
  }, [compare, left, right]);
  const rightOptions = {
    ...options,
    spinning: compare && options.spinning && !sync,
  };
  const leftId = compare ? pair.left : selected;
  const leftFocus = !compare || focusMolecule === leftId ? focus : NO_FOCUS;
  const rightFocus = focusMolecule === pair.right ? focus : NO_FOCUS;
  return (
    <div className={`viewer-pair ${compare ? "comparing" : ""}`}>
      <div className="viewer-pane">
      <MoleculeViewer
        molecule={moleculeById(leftId)}
        options={options}
        resetToken={resetToken}
        focus={leftFocus}
        onReady={setLeft}
        interconversion={!compare && interconversion}
        framingGroup={framingGroup}
      />
      {!interconversion && <StructureFormulaPreview key={leftId} molecule={moleculeById(leftId)}
        focus={leftFocus} onFocus={next => onFormulaFocus(leftId, next)} />}
      </div>
      {(wasCompared || compare) && (
        <div className="comparison-right viewer-pane" hidden={!compare}>
          <MoleculeViewer
            molecule={moleculeById(pair.right)}
            options={rightOptions}
            resetToken={resetToken}
            focus={rightFocus}
            onReady={setRight}
            framingGroup={framingGroup}
          />
          {compare && <StructureFormulaPreview key={pair.right} molecule={moleculeById(pair.right)}
            focus={rightFocus} onFocus={next => onFormulaFocus(pair.right, next)} />}
        </div>
      )}
    </div>
  );
}
