import { useEffect, useId, useRef, useState } from "react";
import { NO_FOCUS, structures } from "../data/carbohydrates";
import type { Carbohydrate, FocusState } from "../types/carbohydrate";
import { HaworthPreview } from "./HaworthPreview";
import { PolymerSchematic } from "./PolymerSchematic";

export function StructureFormulaPreview({ molecule, focus, onFocus }: {
  molecule: Carbohydrate;
  focus: FocusState;
  onFocus: (next: FocusState) => void;
}) {
  const data = structures[molecule.id];
  const polymer = molecule.representationType === "fragment";
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  useEffect(() => {
    if (expanded && !dialog.current?.open) dialog.current?.showModal();
    else if (!expanded && dialog.current?.open) dialog.current.close();
  }, [expanded]);
  const close = () => {
    // End native modality first; while it is open, the opener is inert.
    dialog.current?.close();
    setExpanded(false);
    opener.current?.focus();
  };
  const select = (next: FocusState) => onFocus(
    focus.carbon === next.carbon && focus.residue === next.residue && focus.bond === next.bond ? NO_FOCUS : next,
  );
  const drawing = (interactive: boolean) => polymer ? <PolymerSchematic
    data={data} compact interactive={interactive}
    selectedResidue={focus.residue} selectedBond={focus.bond}
    onSelectResidue={residue => select({ carbon: null, residue, bond: null })}
    onSelectBond={bond => select({ carbon: null, residue: null, bond })}
  /> : <HaworthPreview id={molecule.id} selected={focus.carbon} selectedResidue={focus.residue}
    selectedBond={focus.bond} interactive={interactive}
    onSelect={(carbon, residue) => select({ carbon, residue: residue ?? null, bond: null })}
    onSelectBond={bond => select({ carbon: null, residue: null, bond })} />;
  const chain = data.glycosidicBonds.find(b => !b.branch)?.notation;
  const branch = data.glycosidicBonds.find(b => b.branch)?.notation;
  const explanation = polymer
    ? `원 하나는 D-glucose 잔기입니다. ${chain} 사슬${branch ? `과 ${branch} 가지(C1–O–C6)를` : "을"} 나타냅니다. 원·선을 누르면 3D에서 강조됩니다.`
    : "C 번호·결합을 누르면 3D에서 강조됩니다. 위·아래는 고리 면 기준이며, axial / equatorial과 다릅니다.";
  const reducing = data.residues.length > 1 && (data.reducingEnds.length
    ? `환원 말단: ${data.reducingEnds.map(id => {
      const r = data.residues.find(r => r.id === id)!;
      return `${r.sugarLabel} ${id}${polymer ? "" : ` · ${r.anomericConfiguration === "alpha" ? "α" : "β"}형`}`;
    }).join(", ")}`
    : "환원 말단 없음 · 두 아노머 탄소가 결합에 참여");
  return <section className={`structure-reference reference-${molecule.category}`} aria-label={`${molecule.name} 2D 구조식`}>
    <div className="reference-heading">
      <h3><span className="section-kicker">2D 구조식</span><span>{polymer ? "반복·가지 개념도" : "Haworth"}</span></h3>
      <button ref={opener} onClick={() => setExpanded(true)} aria-label={`${molecule.name} 2D 구조식 크게 보기`}>크게 보기 ↗</button>
    </div>
    <div className="reference-body">
      <div className="reference-drawing">{drawing(true)}</div>
      <div className="reference-caption">
        {polymer && <p className="reference-linkages"><strong>{chain} 반복</strong>{branch && <span>┄ {branch} 가지 · {data.branchPoints.length}곳</span>}</p>}
        {reducing && <p className="reference-reducing">{reducing}</p>}
        <p>{molecule.category === "disaccharide" ? "번호·결합 선택 → 3D 강조 · 위/아래는 고리 면 기준" : explanation}</p>
        {polymer ? <p>{data.residues.length}개 잔기의 대표 fragment입니다. 전체 길이·실제 가지 빈도를 나타내지 않습니다.</p>
          : <p className="reference-convention">{molecule.id === "2DR" ? "C2는 CH₂입니다. 그 밖의 H는 생략했습니다." : "H는 생략했습니다. 굵은 고리 변은 앞쪽입니다."}</p>}
      </div>
    </div>
    {expanded && <dialog ref={dialog} className="formula-dialog" aria-labelledby={labelId} onCancel={e => { e.preventDefault(); close(); }}>
      <div className="dialog-heading"><h2 id={labelId}>{molecule.name} · 2D 구조식</h2><button onClick={close} aria-label="2D 구조식 닫기" autoFocus>닫기 ×</button></div>
      <p className="formula-dialog-form">{molecule.stereochemicalForm}</p>
      <div className="formula-enlarged" tabIndex={0} role="region" aria-label="확대 구조식. 좁은 화면에서는 좌우로 스크롤할 수 있습니다.">{drawing(false)}</div>
      {data.residues.length > 1 && <p className="formula-pan-hint">좁은 화면에서는 구조식을 좌우로 넘겨 전체를 볼 수 있습니다.</p>}
      <p>{explanation.replace(/.*누르면 3D에서 강조됩니다\. /, "")}</p>
      {reducing && <p>{reducing}</p>}
      <p>{polymer ? "대표 fragment의 연결 관계입니다. 전체 분자의 크기나 실제 가지 빈도를 나타내지 않습니다."
        : "고리의 결합·입체배치를 나타내는 투영식입니다. 실제 고리의 접힘이나 두 고리 사이의 각도를 그대로 재현하지 않습니다. H는 C2가 CH₂인 디옥시리보스 외에는 생략했습니다."}</p>
    </dialog>}
  </section>;
}
