import { useEffect, useRef, useState } from "react";
import { createViewer } from "../lib/molecularViewer";
import type { AtomSpec, GLViewer } from "../lib/molecularViewer";
import type {
  Carbohydrate,
  FocusState,
  ViewerOptions,
} from "../types/carbohydrate";
import { NO_FOCUS, structures } from "../data/carbohydrates";
import { applyAnnotations } from "../lib/annotations";
import { changeViewWithKey } from "../lib/keyboardView";
import { RingChainControls } from "./RingChainControls";
import { isGlucose } from "../lib/ringChain";
import { defaultFramingDistance, isDefaultView } from "../lib/viewerFraming";
import type { FramingGroup, FramingLabel } from "../lib/viewerFraming";
/** Short shape tag: what kind of rings, or that this is only a fragment. */
function formTag(molecule: Carbohydrate) {
  if (molecule.representationType === "fragment") return "대표 fragment";
  const forms = new Set(
    structures[molecule.id].residues.map((r) => r.ringForm),
  );
  if (forms.size > 1) return "pyranose + furanose";
  return forms.has("pyranose") ? "⁴C₁ chair" : "furanose";
}
export function MoleculeViewer({
  molecule,
  options,
  onReady,
  resetToken = 0,
  focus = NO_FOCUS,
  interconversion = false,
  framingGroup,
}: {
  molecule: Carbohydrate;
  options: ViewerOptions;
  onReady?: (viewer: GLViewer | null) => void;
  resetToken?: number;
  focus?: FocusState;
  interconversion?: boolean;
  framingGroup?: FramingGroup;
}) {
  const inTransition = interconversion && isGlucose(molecule.id);
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<GLViewer | null>(null);
  const initial = useRef<number[]>([]);
  const fittedView = useRef<number[]>([]);
  const loadedAtoms = useRef<AtomSpec[]>([]);
  const labels = useRef<FramingLabel[]>([]);
  const framingOptions = useRef({ options, inTransition });
  framingOptions.current = { options, inTransition };
  const loadedId = useRef<string | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const applyDefaultFrame = (center: { x: number; y: number; z: number }, distance: number) => {
    const v = viewer.current;
    if (!v || !fittedView.current.length) return;
    const current = v.getView();
    const untouched = isDefaultView(current, initial.current);
    // Public distance API avoids depending on 3Dmol's internal camera Z.
    const cameraZ = current[3] + v.getPerceivedDistance();
    const next = [...fittedView.current];
    [next[0], next[1], next[2], next[3]] = [-center.x, -center.y, -center.z, cameraZ - distance];
    initial.current = next;
    if (untouched) v.setView([...next]);
  };
  const readFraming = () => {
    const element = host.current;
    if (!element || !element.clientWidth || !element.clientHeight || !fittedView.current.length) return null;
    return {
      atoms: loadedAtoms.current,
      viewport: { width: element.clientWidth, height: element.clientHeight },
      options: framingOptions.current.options,
      labels: labels.current,
    };
  };
  const refreshFraming = () => {
    if (framingGroup?.refresh()) return;
    const v = viewer.current;
    const request = readFraming();
    if (!v || !request) return;
    const { options: display, inTransition: transition } = framingOptions.current;
    const distance = transition
      // Keep the established ring–chain camera: interpolation never refits.
      ? (v.getView()[3] + v.getPerceivedDistance() - fittedView.current[3]) / 1.05
      : defaultFramingDistance(request.atoms, request.viewport, display, request.labels);
    if (distance === null) return; // Hidden comparison pane; wait for resize.
    applyDefaultFrame({ x: -fittedView.current[0], y: -fittedView.current[1], z: -fittedView.current[2] }, distance);
  };
  const refreshFramingRef = useRef(refreshFraming);
  refreshFramingRef.current = refreshFraming;
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
        loadedAtoms.current = atoms;
        labels.current = [];
        fittedView.current = [...v.getView()];
        initial.current = [...v.getView()];
        refreshFramingRef.current();
        v.render();
        viewer.current = v;
        resize = new ResizeObserver(() => {
          v?.resize();
          refreshFramingRef.current();
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
    if (!framingGroup || status !== "ready" || loadedId.current !== molecule.id) return;
    return framingGroup.register(molecule.id, {
      read: () => loadedId.current === molecule.id ? readFraming() : null,
      apply: applyDefaultFrame,
    });
  }, [framingGroup, status, molecule.id]);
  useEffect(() => {
    if (
      !inTransition && status === "ready" &&
      viewer.current &&
      loadedId.current === molecule.id
    ) {
      labels.current = applyAnnotations(viewer.current, molecule, options, focus) ?? [];
      refreshFramingRef.current();
    } else if (inTransition && status === "ready" && loadedId.current === molecule.id) {
      labels.current = [];
      refreshFramingRef.current();
    }
  }, [status, molecule, options, focus, inTransition, framingGroup]);
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
    <section className={`molecule-stage ${inTransition ? "ring-chain-stage" : ""}`} aria-label={`${molecule.name} 3D 구조`}>
      <div className="stage-heading">
        <div>
          <h2>{inTransition ? "D-glucose · 고리 ↔ 사슬" : molecule.name}</h2>
          <p>{inTransition ? "검증된 양 끝 구조 사이의 교육용 전환" : molecule.stereochemicalForm}</p>
        </div>
        <span className="form-tag">{inTransition ? "교육용 3D 보간" : formTag(molecule)}</span>
      </div>
      <div
        ref={host}
        className="canvas-host"
        role="img"
        aria-label={`${inTransition ? "D-glucose의 고리·사슬 전환" : molecule.name}. 드래그로 회전, 휠로 확대. 상세 정보는 오른쪽 패널에서 읽을 수 있습니다.`}
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
          ● C <i>●</i> O {!inTransition && <><b>●</b> H</>}
        </span>
        <button
          className="keyboard-view"
          aria-label={`${inTransition ? "D-glucose 전환" : molecule.name} 키보드 조작. 방향키 회전, 더하기 빼기 확대 축소, 0 초기화`}
          onKeyDown={(e) => {
            if (
              viewer.current &&
              changeViewWithKey(viewer.current, e.key, initial.current)
            )
              e.preventDefault();
          }}
        >
          키보드: 방향키 회전 · + / − 확대
        </button>
        <span>드래그 회전 · 휠 확대</span>
      </div>
      {inTransition && isGlucose(molecule.id) && status === "ready" &&
        loadedId.current === molecule.id && viewer.current && (
        <RingChainControls key={molecule.id} viewer={viewer.current} start={molecule.id}
          options={options} onRestore={() => {
            if (loadedId.current === molecule.id && viewer.current)
              applyAnnotations(viewer.current, molecule, options, focus);
          }} />
      )}
    </section>
  );
}
