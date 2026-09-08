import type { Carbohydrate, FocusState } from "../types/carbohydrate";
import { residueLabel, structures } from "../data/carbohydrates";
import { ObservationQuestions } from "./ObservationQuestions";
import { HaworthPreview } from "./HaworthPreview";
import { PolymerSchematic } from "./PolymerSchematic";
export function MoleculeInfo({
  molecule: m,
  anomeric,
  focus,
  onFocusCarbon,
  onFocusResidue,
  onFocusBond,
}: {
  molecule: Carbohydrate;
  anomeric: boolean;
  focus: FocusState;
  onFocusCarbon: (n: string) => void;
  onFocusResidue: (id: string) => void;
  onFocusBond: (id: string) => void;
}) {
  const data = structures[m.id];
  const multi = data.residues.length > 1;
  const fragment = m.representationType === "fragment";
  const linkageCounts = data.glycosidicBonds.reduce<Record<string, number>>(
    (acc, b) => ({ ...acc, [b.notation]: (acc[b.notation] ?? 0) + 1 }),
    {},
  );
  return (
    <aside className="info">
      <div className="section-kicker">STRUCTURE NOTES</div>
      <h2>{m.koreanName}</h2>
      <p className="formula">{m.formula}</p>
      {fragment && (
        <p className="fragment-tag">
          대표 fragment · {data.residues.length} residue · 전체 고분자가 아닙니다
        </p>
      )}
      <dl className="molecule-facts">
        <dt>지금 보는 구조</dt>
        <dd>{m.stereochemicalForm}</dd>
        {m.linkageSummary && (
          <>
            <dt>결합 표기</dt>
            <dd>{m.linkageSummary}</dd>
          </>
        )}
        <dt>고리 형태</dt>
        <dd>{m.ringForm}</dd>
        <dt>입체형태</dt>
        <dd>{m.conformation}</dd>
      </dl>
      <p>{m.description}</p>
      {anomeric && (
        <p className="concept-note">
          <strong>
            {[...new Set(data.residues.map((r) => r.anomericCarbon))].join(
              " · ",
            )}{" "}
            · 아노머 탄소
          </strong>
          <br />
          고리가 형성되기 전, 열린 사슬에서 carbonyl carbon이었던 탄소입니다.
        </p>
      )}
      {multi && (
        <section className="residue-list">
          <h3>
            잔기 <span>{data.residues.length}</span>
          </h3>
          <div className="chips">
            {data.residues.map((r) => (
              <button
                key={r.id}
                className={`chip ${focus.residue === r.id ? "selected" : ""}`}
                aria-pressed={focus.residue === r.id}
                onClick={() => onFocusResidue(r.id)}
              >
                {residueLabel(r)}
                <small>{r.form}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {data.glycosidicBonds.length > 0 && (
        <section className="linkage-list">
          <h3>
            글리코시드 결합{" "}
            <span>
              {Object.entries(linkageCounts)
                .map(([n, c]) => (c > 1 ? `${n} × ${c}` : n))
                .join(" · ")}
            </span>
          </h3>
          <div className="chips">
            {data.glycosidicBonds.map((b) => (
              <button
                key={b.id}
                className={`chip linkage ${b.branch ? "branch" : ""} ${focus.bond === b.id ? "selected" : ""}`}
                aria-pressed={focus.bond === b.id}
                onClick={() => onFocusBond(b.id)}
              >
                {b.donorResidue}:{b.donorCarbon} → {b.acceptorResidue}:
                {b.acceptorCarbon}
                <small>
                  {b.notation}
                  {b.branch ? " · 가지" : ""}
                </small>
              </button>
            ))}
          </div>
          <p className="small-note">
            결합을 고르면 3D에서 공여 아노머 탄소, 글리코시드 산소, 받는 탄소가
            차례로 표시됩니다.
          </p>
        </section>
      )}
      <ObservationQuestions
        key={m.id}
        questions={m.observationQuestions}
        answer={m.answer}
      />
      {m.category === "polysaccharide" && (
        <PolymerSchematic
          data={data}
          selectedResidue={focus.residue}
          onSelectResidue={onFocusResidue}
          selectedBond={focus.bond}
          onSelectBond={onFocusBond}
        />
      )}
      <HaworthPreview
        id={m.id}
        selected={focus.carbon}
        onSelect={onFocusCarbon}
      />
      <details className="provenance">
        <summary>구조 출처와 읽는 법</summary>
        <p>{m.notes}</p>
        {fragment ? (
          <p>
            잔기 템플릿:{" "}
            <a href={data.sourceUrl} target="_blank" rel="noreferrer">
              RCSB PDB · {data.builder?.residueTemplate}
            </a>
            <br />
            글리코시드 결합 기하 참조: {data.builder?.linkageReferences.join(", ")}
            <br />
            조립: {data.builder?.script} · 수소 위치만 {data.builder?.hydrogenRelaxation}
            <br />
            모든 잔기의 입체배치와 결합 연결을 3D 좌표에서 재계산해 대조했습니다.
          </p>
        ) : (
          <p>
            출처:{" "}
            <a href={data.sourceUrl} target="_blank" rel="noreferrer">
              RCSB PDB · {m.id}
            </a>
            <br />
            사전이 제공하는 idealized 좌표 · {data.retrieved} 저장
            <br />
            (화학 정보로부터 계산된 이상화 좌표이며 실험 측정 구조가 아닙니다.)
            <br />
            3D에서 계산한 R/S 배치와 CCD 표기 대조 완료.
          </p>
        )}
        <p>
          탄소 번호는 생화학적 번호입니다. 체계적 IUPAC 이름의 고리 번호나
          파일의 원자 순번과 다를 수 있습니다.
          {multi &&
            " 잔기가 여럿일 때는 Glc A · C1처럼 잔기 이름을 함께 적습니다."}
        </p>
        <a href={`${import.meta.env.BASE_URL}${m.structureFile}`} download>
          SDF 구조 파일
        </a>
      </details>
    </aside>
  );
}
