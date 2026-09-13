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
import { PolymerSchematic } from "./components/PolymerSchematic";
import { HelpDialog } from "./components/HelpDialog";
import { registerExplorerTool } from "./lib/webmcp";
import { OfflineStatus } from "./components/OfflineStatus";
import { ViewerControls } from "./components/ViewerControls";
import {
  capabilitiesOf,
  defaultOptions,
  moleculeById,
  NO_FOCUS,
  structures,
} from "./data/carbohydrates";
import type { FocusState, MoleculeId } from "./types/carbohydrate";
export default function App() {
  const [id, setId] = useState<MoleculeId>("BGC");
  const [options, setOptions] = useState(defaultOptions);
  const [reset, setReset] = useState(0);
  const [compare, setCompare] = useState(false);
  const [kind, setKind] = useState<ComparisonKind>("anomer");
  const [sync, setSync] = useState(true);
  const [help, setHelp] = useState(false);
  const [focus, setFocus] = useState<FocusState>(NO_FOCUS);
  const m = moleculeById(id);
  const capabilities = useMemo(
    () => (compare ? comparisonCapabilities(kind) : capabilitiesOf(id)),
    [compare, kind, id],
  );
  const select = useCallback((next: MoleculeId) => {
    setId(next);
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
    setCompare((c) => !c);
    setKind("anomer");
    setSync(true);
    setOptions((o) => ({ ...o, spinning: false }));
    setFocus(NO_FOCUS);
    setReset((r) => r + 1);
  };
  const focusCarbon = (name: string) =>
    setFocus((f) => ({ ...f, carbon: f.carbon === name ? null : name }));
  const focusResidue = (residue: string) =>
    setFocus((f) =>
      f.residue === residue
        ? NO_FOCUS
        : { carbon: null, residue, bond: null },
    );
  const focusBond = (bond: string) => {
    setFocus((f) =>
      f.bond === bond ? NO_FOCUS : { carbon: null, residue: null, bond },
    );
    setOptions((o) => ({ ...o, glycosidic: true }));
  };
  const pair = comparisons[kind];
  const comparingPolymers =
    moleculeById(pair.left).category === "polysaccharide" &&
    moleculeById(pair.right).category === "polysaccharide";
  return (
    <>
      <a className="skip-link" href="#viewer-controls">
        보기 설정으로 이동
      </a>
      <header>
        <div className="brand-mark" aria-hidden="true">
          C₆
        </div>
        <div>
          <h1>
            Carbohydrate <span>3D Explorer</span>
          </h1>
          <p>탄수화물 구조 탐색기</p>
        </div>
        <div className="header-actions">
          <button
            className="compare-button"
            aria-pressed={compare}
            onClick={toggleCompare}
          >
            ◫ {compare ? "단일 보기" : "비교 모드"}
          </button>
          <button onClick={() => setHelp(true)}>도움말</button>
        </div>
      </header>
      <main className={`workspace ${compare ? "comparison-layout" : ""}`}>
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
                회전 동기화 {sync ? "ON" : "OFF"}
              </button>
            </div>
          )}
          <ComparisonViewer
            selected={id}
            compare={compare}
            kind={kind}
            sync={sync}
            options={options}
            resetToken={reset}
            focus={focus}
          />
          {options.axial && capabilities.axial && (
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
          {options.hydroxyl && (
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
            <div className="section-kicker">COMPARE &amp; OBSERVE</div>
            <h2>차이를 찾아보세요</h2>
            <p>{pair.intro}</p>
            <ObservationQuestions
              key={kind}
              questions={[pair.question]}
              answer={pair.answer}
            />
            {comparingPolymers && (
              <div className="schematic-pair">
                {[pair.left, pair.right].map((side) => (
                  <div key={side}>
                    <h4>{moleculeById(side).koreanName}</h4>
                    <PolymerSchematic
                      data={structures[side]}
                      selectedResidue={focus.residue}
                      onSelectResidue={focusResidue}
                      selectedBond={focus.bond}
                      onSelectBond={focusBond}
                    />
                  </div>
                ))}
              </div>
            )}
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
        ) : (
          <MoleculeInfo
            molecule={m}
            anomeric={options.anomeric}
            focus={focus}
            onFocusCarbon={focusCarbon}
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
        />
      </div>
      <footer className="page-footer">
        <span>Carbohydrate 3D Explorer</span>
        <OfflineStatus />
        <span>데이터: wwPDB CCD · PubChem</span>
        {/* 조회수: index.html 이 로드하는 포털 공통 모듈이 채움 */}
        <span data-page-views="" hidden />
      </footer>
      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </>
  );
}
