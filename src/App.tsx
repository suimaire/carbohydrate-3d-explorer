import { useCallback, useEffect, useMemo, useState } from "react";
import { MoleculeSidebar } from "./components/MoleculeSidebar";
import { MoleculeInfo } from "./components/MoleculeInfo";
import {
  ComparisonViewer,
  comparisonCapabilities,
  comparisons,
} from "./components/ComparisonViewer";
import type { ComparisonKind } from "./components/ComparisonViewer";
import { ObservationQuestions } from "./components/ObservationQuestions";
import { HelpDialog } from "./components/HelpDialog";
import { registerExplorerTool } from "./lib/webmcp";
import { OfflineStatus } from "./components/OfflineStatus";
import { ViewerControls } from "./components/ViewerControls";
import {
  capabilitiesOf,
  defaultOptions,
  moleculeById,
  NO_FOCUS,
} from "./data/carbohydrates";
import type { FocusState, MoleculeId } from "./types/carbohydrate";
import { isGlucose } from "./lib/ringChain";
export default function App() {
  const [id, setId] = useState<MoleculeId>("BGC");
  const [options, setOptions] = useState(defaultOptions);
  const [reset, setReset] = useState(0);
  const [compare, setCompare] = useState(false);
  const [interconversion, setInterconversion] = useState(false);
  const [kind, setKind] = useState<ComparisonKind>("anomer");
  const [sync, setSync] = useState(true);
  const [help, setHelp] = useState(false);
  const [focus, setFocus] = useState<FocusState>(NO_FOCUS);
  const [focusMolecule, setFocusMolecule] = useState<MoleculeId | null>(null);
  const m = moleculeById(id);
  const capabilities = useMemo(
    () => (compare ? comparisonCapabilities(kind) : capabilitiesOf(id)),
    [compare, kind, id],
  );
  const select = useCallback((next: MoleculeId) => {
    setId(next);
    setInterconversion(false);
    setCompare(false);
    setFocus(NO_FOCUS);
    setOptions((o) => ({
      ...o,
      axial: false,
      glycosidic: false,
      reducing: false,
      branch: false,
      spinning: false,
      // A polysaccharide fragment is busy enough without every hydrogen; the
      // toggle stays available.
      hydrogen:
        moleculeById(next).category === "polysaccharide" ? false : o.hydrogen,
    }));
  }, []);
  useEffect(() => registerExplorerTool(select), [select]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (query.matches) setOptions((o) => ({ ...o, spinning: false }));
    };
    stop();
    query.addEventListener("change", stop);
    return () => query.removeEventListener("change", stop);
  }, []);
  const resetView = () => {
    setOptions((o) => ({ ...o, spinning: false }));
    setReset((r) => r + 1);
    setFocus(NO_FOCUS);
  };
  const toggleCompare = () => {
    setInterconversion(false);
    setCompare((c) => !c);
    setKind("anomer");
    setSync(true);
    setOptions((o) => ({ ...o, spinning: false }));
    setFocus(NO_FOCUS);
    setReset((r) => r + 1);
  };
  const focusResidue = (residue: string) => {
    setFocusMolecule(id);
    setFocus((f) =>
      f.residue === residue
        ? NO_FOCUS
        : { carbon: null, residue, bond: null },
    );
  };
  const focusBond = (bond: string) => {
    setFocusMolecule(id);
    setFocus((f) =>
      f.bond === bond ? NO_FOCUS : { carbon: null, residue: null, bond },
    );
    setOptions((o) => ({ ...o, glycosidic: true }));
  };
  const focusFormula = (moleculeId: MoleculeId, next: FocusState) => {
    setFocusMolecule(moleculeId);
    setFocus(next);
    if (next.bond) setOptions(o => ({ ...o, glycosidic: true }));
  };
  const pair = comparisons[kind];
  return (
    <>
      <a className="skip-link" href="#viewer-controls">
        보기 설정으로 이동
      </a>
      <header>
        <div>
          <nav className="breadcrumb" aria-label="현재 위치">
            <a href="https://suimaire.github.io/">수업 포털</a>
            <span aria-hidden="true">›</span>
            <a href="https://suimaire.github.io/#molecular">분자 · 생화학 탐구</a>
          </nav>
          <h1>탄수화물 3D 구조 탐색기</h1>
          <p>포도당에서 셀룰로스까지, 탄수화물의 입체 구조를 직접 돌려 보고 비교합니다.</p>
        </div>
        <div className="header-actions">
          <button
            className="compare-button"
            aria-pressed={compare}
            onClick={toggleCompare}
          >
            {compare ? "비교 모드 끝내기" : "비교 모드"}
          </button>
          <button onClick={() => setHelp(true)}>도움말</button>
        </div>
      </header>
      <main className={`workspace ${compare ? "comparison-layout" : ""} ${interconversion ? "ring-chain-layout" : ""}`}>
        <MoleculeSidebar selected={id} onSelect={select} />
        <div className="viewer-area">
          {compare && (
            <div className="compare-toolbar">
              <label>
                비교 대상{" "}
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as ComparisonKind);
                    setFocus(NO_FOCUS);
                    setOptions((o) => ({
                      ...o,
                      axial: false,
                      glycosidic: false,
                      reducing: false,
                      branch: false,
                      spinning: false,
                    }));
                    setReset((r) => r + 1);
                  }}
                >
                  {Object.entries(comparisons).map(([key, entry]) => (
                    <option value={key} key={key}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <button aria-pressed={sync} onClick={() => setSync((s) => !s)}>
                회전 동기화 {sync ? "켜짐" : "꺼짐"}
              </button>
            </div>
          )}
          {!compare && isGlucose(id) && (
            <div className="ring-chain-entry">
              <button aria-pressed={interconversion} onClick={() => {
                setInterconversion(active => !active);
                setOptions(o => ({ ...o, spinning: false }));
                setFocus(NO_FOCUS);
              }}>{interconversion ? "일반 구조 보기로" : "고리 ↔ 사슬 전환"}</button>
              <span>α · 사슬형 · β의 연결을 관찰하세요</span>
            </div>
          )}
          <ComparisonViewer
            selected={id}
            interconversion={interconversion}
            compare={compare}
            kind={kind}
            sync={sync}
            options={options}
            resetToken={reset}
            focus={focus}
            focusMolecule={focusMolecule}
            onFormulaFocus={focusFormula}
          />
          {!interconversion && options.axial && capabilities.axial && (
            <div className="axis-note">
              <strong>axial / equatorial ≠ up / down</strong>
              <span>
                현재 ⁴C₁ 의자형에서의 배치입니다. 고리의 어느 쪽인지를 나타내는
                위/아래와 구별하세요.
              </span>
            </div>
          )}
          {options.glycosidic && capabilities.glycosidic && (
            <div className="axis-note linkage-note">
              <strong>글리코시드 결합</strong>
              <span>
                파란 실선 관은 사슬을 잇는 결합, 보라 점선 관은 가지를 만드는
                결합입니다. 각 결합에는 표기가 함께 붙습니다.
              </span>
            </div>
          )}
          {!interconversion && options.hydroxyl && (
            <p className="highlight-note">
              분홍색: OH의 산소
              {options.hydrogen
                ? "와 수소"
                : " · H 표시를 켜면 수소도 보입니다."}
            </p>
          )}
        </div>
        {compare ? (
          <aside className="info comparison-info">
            <div className="section-kicker">비교 관찰</div>
            <h2>차이를 찾아보세요</h2>
            <p>{pair.intro}</p>
            <ObservationQuestions
              key={kind}
              questions={[pair.question]}
              answer={pair.answer}
            />
            <div className="concept-note">
              <strong>비교할 때 기억하세요</strong>
              <p>
                분자를 회전해도 입체배치는 바뀌지 않습니다. 화면에서 위로
                보인다는 이유만으로 axial이라고 부르지 않습니다.
              </p>
            </div>
            <p className="small-note">
              3D 구조는 각각의 대표 conformer이거나 대표 fragment입니다.
              수용액의 구조 변화나 고분자 전체의 크기를 재현한 장면은 아닙니다.
            </p>
          </aside>
        ) : interconversion ? (
          <aside className="info">
            <div className="section-kicker">고리 ↔ 사슬</div>
            <h2>고리가 열리면?</h2>
            <p>C1–O5 결합이 열리고 C1–O1이 이중 결합인 사슬형으로 바뀝니다.</p>
            <p>C1은 고리형의 사면체 모양에서 사슬형의 평면 삼각형 모양으로 바뀝니다.</p>
            <p>사슬형에는 α/β 구분이 없습니다. 사슬형에 도착하면 어느 형태로 고리를 닫을지 선택하세요.</p>
            <p className="small-note">탄소 번호와 핵심 원자 추적으로 같은 원자를 따라가 보세요. 일반 구조 보기로 돌아가면 기존 표시 설정이 복원됩니다.</p>
            <p className="small-note">양 끝 구조는 검증된 대표 구조이며, 중간 장면은 교육용 보간입니다. 실제 반응 경로나 전이상태를 나타내지 않습니다.</p>
          </aside>
        ) : (
          <MoleculeInfo
            molecule={m}
            anomeric={options.anomeric}
            focus={focus}
            onFocusResidue={focusResidue}
            onFocusBond={focusBond}
          />
        )}
      </main>
      <div id="viewer-controls">
        <ViewerControls
          options={options}
          onChange={setOptions}
          onReset={resetView}
          capabilities={capabilities}
          interconversion={interconversion}
        />
      </div>
      <footer className="page-footer">
        <span>탄수화물 3D 구조 탐색기</span>
        <OfflineStatus />
        <span>구조 데이터: wwPDB CCD · PubChem</span>
        <span className="page-footer__brand">HAFS Biology Lab · CH Park</span>
        {/* 조회수: index.html 이 로드하는 포털 공통 모듈이 채움 */}
        <span data-page-views="" hidden />
      </footer>
      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </>
  );
}
