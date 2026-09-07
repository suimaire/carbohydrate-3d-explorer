import type { Carbohydrate } from "../types/carbohydrate";
import { structures } from "../data/carbohydrates";
import { ObservationQuestions } from "./ObservationQuestions";
import { HaworthPreview } from "./HaworthPreview";
export function MoleculeInfo({
  molecule: m,
  anomeric,
  focusCarbon,
  onFocus,
}: {
  molecule: Carbohydrate;
  anomeric: boolean;
  focusCarbon: string | null;
  onFocus: (n: string) => void;
}) {
  return (
    <aside className="info">
      <div className="section-kicker">STRUCTURE NOTES</div>
      <h2>{m.koreanName}</h2>
      <p className="formula">{m.formula}</p>
      <dl className="molecule-facts">
        <dt>지금 보는 구조</dt>
        <dd>{m.stereochemicalForm}</dd>
        <dt>고리 형태</dt>
        <dd>{m.ringForm}</dd>
        <dt>입체형태</dt>
        <dd>{m.conformation}</dd>
      </dl>
      <p>{m.description}</p>
      {anomeric && (
        <p className="concept-note">
          <strong>{m.id === "FRU" ? "C2" : "C1"} · 아노머 탄소</strong>
          <br />
          고리가 형성되기 전, 열린 사슬에서 carbonyl carbon이었던 탄소입니다.
        </p>
      )}
      <ObservationQuestions
        key={m.id}
        questions={m.observationQuestions}
        answer={m.answer}
      />
      <HaworthPreview id={m.id} selected={focusCarbon} onSelect={onFocus} />
      <details className="provenance">
        <summary>구조 출처와 읽는 법</summary>
        <p>{m.notes}</p>
        <p>
          출처:{" "}
          <a href={structures[m.id].sourceUrl} target="_blank" rel="noreferrer">
            RCSB PDB · {m.id}
          </a>
          <br />
          원본 ideal 좌표 · 2026-09-07 저장
          <br />
          3D에서 계산한 R/S 배치와 CCD 표기 대조 완료.
        </p>
        <p>
          탄소 번호는 생화학적 번호입니다. 체계적 IUPAC 이름의 고리 번호나
          파일의 원자 순번과 다를 수 있습니다.
        </p>
        <a href={`${import.meta.env.BASE_URL}${m.structureFile}`} download>
          SDF 구조 파일
        </a>
      </details>
    </aside>
  );
}
