import { useEffect, useRef, useState } from "react";
import type { GLViewer } from "../lib/molecularViewer";
import type { ViewerOptions } from "../types/carbohydrate";
import { anomerName, clamp, phaseText } from "../lib/ringChain";
import type { GlucoseAnomer } from "../lib/ringChain";
import { createRingChainRenderer } from "../lib/ringChainRenderer";

export function RingChainControls({ viewer, start, options, onRestore }: {
  viewer: GLViewer; start: GlucoseAnomer; options: ViewerOptions; onRestore: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState<GlucoseAnomer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [tracking, setTracking] = useState(true);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const progressRef = useRef(0);
  const renderer = useRef<ReturnType<typeof createRingChainRenderer> | null>(null);
  const restore = useRef(onRestore);
  restore.current = onRestore;
  const seek = (p: number) => { progressRef.current = p; setProgress(p); };
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReduced(query.matches); if (query.matches) setPlaying(false); };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const instance = createRingChainRenderer(viewer, start);
    renderer.current = instance;
    return () => { instance.dispose(); renderer.current = null; restore.current(); };
  }, [viewer, start]);
  useEffect(() => {
    renderer.current?.update(progress, target, options, tracking);
  }, [progress, target, options, tracking, viewer, start]);
  useEffect(() => {
    if (!playing || reduced) return;
    let disposed = false;
    let raf = 0;
    let last: number | null = null;
    // Always pause at the aldehyde, even when scrubbing back on a chosen path.
    const limit = progressRef.current < 1 ? 1 : target ? 2 : 1;
    const tick = (time: number) => {
      if (disposed) return;
      if (last === null) last = time;
      const delta = Math.max(0, time - last); last = time;
      const next = Math.min(limit, progressRef.current + delta / 6000);
      seek(next);
      if (next >= limit) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { disposed = true; cancelAnimationFrame(raf); };
  }, [playing, reduced, target]);
  const jump = (p: number) => { setPlaying(false); seek(clamp(p, 0, target ? 2 : 1)); };
  const reset = () => { setPlaying(false); setTarget(null); seek(0); };
  const atOpen = progress === 1;
  const phase = phaseText(start, target, progress);
  return (
    <div className="ring-chain-controls" aria-label="고리 사슬 전환 조작">
      <div className="ring-chain-heading">
        <strong>고리 ↔ 사슬 전환</strong>
        <button aria-pressed={tracking} onClick={() => setTracking(t => !t)}>핵심 원자 추적</button>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true">{phase}</p>
      {atOpen && <p className="small-note">C1은 평면 삼각형(trigonal-planar)인 카보닐 탄소입니다. 이 상태에서는 α/β 구분이 없습니다.</p>}
      <label className="timeline-label">
        구조 전환 진행
        <input type="range" min={0} max={2} step={0.002} value={progress}
          aria-label="구조 전환 진행" aria-valuetext={phase}
          onChange={e => jump(Number(e.target.value))} />
      </label>
      <div className="ring-chain-steps" aria-label="장면 이동">
        <button onClick={() => jump(0)}>고리형</button>
        <button onClick={() => jump(.5)}>고리 열림</button>
        <button onClick={() => jump(1)}>사슬형</button>
        <button disabled={!target} onClick={() => jump(1.5)}>고리 닫힘</button>
        <button disabled={!target} onClick={() => jump(2)}>닫힌 고리</button>
      </div>
      <div className="ring-chain-actions">
        <button disabled={reduced || progress === 2 || (atOpen && !target)}
          onClick={() => setPlaying(p => !p)}>{playing ? "일시정지" : "재생"}</button>
        <button onClick={reset}>처음으로</button>
        <span className="small-note">{reduced ? "동작 줄이기 설정: 슬라이더와 장면 버튼으로 관찰하세요." : "진행률은 반응 시간이나 평형 조성 비율이 아닙니다."}</span>
      </div>
      {atOpen && <fieldset className="closure-choice">
        <legend>어느 형태로 고리를 닫을까요?</legend>
        {(["GLC", "BGC"] as const).map(id => <button key={id}
          aria-pressed={target === id}
          onClick={() => { setTarget(id); setPlaying(!reduced); }}>
          {anomerName(id)}
        </button>)}
      </fieldset>}
      {target && !atOpen && <p className="small-note">닫힘 목표: {anomerName(target)} · 사슬형 장면에서 다시 선택할 수 있습니다.</p>}
      {tracking && <p className="small-note">C1: 아노머 탄소 → 카보닐 탄소 · O1: 아노머 OH의 산소 → 카보닐 산소 · O5: 고리 산소 → C5–OH의 산소</p>}
      <p className="small-note">수소 원자의 이동 경로는 이 개념적 구조 전환 애니메이션에서 표시하지 않습니다.</p>
      <details className="ring-chain-science">
        <summary>이 장면을 해석할 때</summary>
        <p>고리형·사슬형 양 끝 구조는 검증된 구조입니다. 중간 장면은 구조 변화를 이해하기 위한 교육용 보간이며, 양자화학 계산으로 얻은 반응좌표나 전이상태를 나타내지 않습니다.</p>
        <p>실제 수용액 반응 경로나 속도, 분자 동역학 시뮬레이션이 아닙니다. 결합 표시는 정해진 장면에서 바뀝니다.</p>
        <p>고리형: CCD GLC / BGC · 사슬형: <a href="https://pubchem.ncbi.nlm.nih.gov/compound/107526" target="_blank" rel="noreferrer">PubChem CID 107526</a></p>
      </details>
    </div>
  );
}
