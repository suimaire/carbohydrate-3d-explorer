import { useEffect, useRef, useState } from "react";
import { createViewer } from "../lib/molecularViewer";
import type { GLViewer } from "../lib/molecularViewer";
import type { Carbohydrate, ViewerOptions } from "../types/carbohydrate";
import { structures } from "../data/carbohydrates";
import { applyAnnotations } from "../lib/annotations";
import { changeViewWithKey } from "../lib/keyboardView";
export function MoleculeViewer({
  molecule,
  options,
  onReady,
  resetToken = 0,
  focusCarbon = null,
}: {
  molecule: Carbohydrate;
  options: ViewerOptions;
  onReady?: (viewer: GLViewer | null) => void;
  resetToken?: number;
  focusCarbon?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<GLViewer | null>(null);
  const initial = useRef<number[]>([]);
  const loadedId = useRef<string | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let resize: ResizeObserver | undefined;
    let v: GLViewer | undefined;
    setStatus("loading");
    async function load() {
      try {
        const r = await fetch(
          `${import.meta.env.BASE_URL}${molecule.structureFile}`,
          { signal: controller.signal },
        );
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        const sdf = await r.text();
        if (disposed || !host.current) return;
        v =
          viewer.current ??
          createViewer(host.current, {
            backgroundColor: "#ffffff",
            antialias: true,
          });
        viewer.current = v;
        v.clear();
        v.setView([0, 0, 0, -50, 0, 0, 0, 1]);
        const model = v.addModel(sdf, "sdf");
        const atoms = model.selectedAtoms({});
        if (atoms.length !== structures[molecule.id].atoms.length)
          throw Error("구조의 원자 수가 일치하지 않습니다.");
        v.setStyle({}, { stick: { radius: 0.13 }, sphere: { scale: 0.27 } });
        v.zoomTo();
        v.zoom(0.88);
        initial.current = [...v.getView()];
        v.render();
        viewer.current = v;
        resize = new ResizeObserver(() => {
          v?.resize();
        });
        resize.observe(host.current);
        loadedId.current = molecule.id;
        setStatus("ready");
        readyRef.current?.(v);
      } catch (e) {
        if (disposed) return;
        console.error(e);
        v?.clear();
        setStatus("error");
      }
    }
    void load();
    return () => {
      disposed = true;
      controller.abort();
      loadedId.current = null;
      resize?.disconnect();
      readyRef.current?.(null);
      if (v) {
        v.spin(false);
        v.setViewChangeCallback(null);
        v.clear();
      }
    };
  }, [molecule.id, molecule.structureFile, attempt]);
  useEffect(() => {
    if (
      status === "ready" &&
      viewer.current &&
      loadedId.current === molecule.id
    )
      applyAnnotations(viewer.current, molecule, options, focusCarbon);
  }, [status, molecule, options, focusCarbon]);
  useEffect(() => {
    const v = viewer.current;
    if (status === "ready" && v) {
      v.spin(false);
      v.setView([...initial.current]);
      v.render();
    }
  }, [resetToken, status]);
  useEffect(() => {
    const v = viewer.current;
    if (status === "ready" && v) v.spin(options.spinning ? "y" : false, 0.6);
    return () => {
      v?.spin(false);
    };
  }, [status, options.spinning]);
  return (
    <section className="molecule-stage" aria-label={`${molecule.name} 3D 구조`}>
      <div className="stage-heading">
        <div>
          <h2>{molecule.name}</h2>
          <p>{molecule.stereochemicalForm}</p>
        </div>
        <span className="form-tag">
          {molecule.ringForm.startsWith("피라노스") ? "⁴C₁ chair" : "furanose"}
        </span>
      </div>
      <div
        ref={host}
        className="canvas-host"
        role="img"
        aria-label={`${molecule.name}. 드래그로 회전, 휠로 확대. 상세 정보는 오른쪽 패널에서 읽을 수 있습니다.`}
      />
      {status === "loading" && (
        <div className="viewer-message" role="status">
          3D 구조를 불러오는 중…
        </div>
      )}
      {status === "error" && (
        <div className="viewer-message error" role="alert">
          <strong>3D 구조를 불러오지 못했습니다.</strong>
          <p>파일 연결과 브라우저의 WebGL 지원을 확인해 주세요.</p>
          <button onClick={() => setAttempt((a) => a + 1)}>
            다시 불러오기
          </button>
        </div>
      )}
      <div className="stage-footer">
        <span>
          ● C <i>●</i> O <b>●</b> H
        </span>
        <button
          className="keyboard-view"
          aria-label={`${molecule.name} 키보드 조작. 방향키 회전, 더하기 빼기 확대 축소, 0 초기화`}
          onKeyDown={(e) => {
            if (
              viewer.current &&
              changeViewWithKey(viewer.current, e.key, initial.current)
            )
              e.preventDefault();
          }}
        >
          ⌨ 방향키 · + / −
        </button>
        <span>드래그 회전 · 휠 확대</span>
      </div>
    </section>
  );
}
