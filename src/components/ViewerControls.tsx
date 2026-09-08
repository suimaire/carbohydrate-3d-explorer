import type {
  MoleculeCapabilities,
  ViewerOptions,
} from "../types/carbohydrate";
type BooleanOption = Exclude<keyof ViewerOptions, "representation">;
export function ViewerControls({
  options,
  onChange,
  onReset,
  capabilities,
}: {
  options: ViewerOptions;
  onChange: (o: ViewerOptions) => void;
  onReset: () => void;
  capabilities: MoleculeCapabilities;
}) {
  const toggle = (key: BooleanOption) =>
    onChange({ ...options, [key]: !options[key] });
  // Only the controls the current structure can actually answer are offered.
  const structural: [BooleanOption, string, boolean][] = [
    ["glycosidic", "글리코시드 결합", capabilities.glycosidic],
    ["reducing", "환원 말단", capabilities.reducing],
    ["branch", "가지 결합", capabilities.branch],
    ["axial", "axial / equatorial", capabilities.axial],
  ];
  return (
    <div className="viewer-controls" aria-label="3D 보기 설정">
      <div className="control-group">
        <span>모형</span>
        <button
          aria-pressed={options.representation === "ball-stick"}
          onClick={() => onChange({ ...options, representation: "ball-stick" })}
        >
          공-막대
        </button>
        <button
          aria-pressed={options.representation === "spacefill"}
          onClick={() => onChange({ ...options, representation: "spacefill" })}
        >
          공간채움
        </button>
      </div>
      <div className="control-group">
        <span>표시</span>
        {(
          [
            ["hydrogen", "H 표시"],
            ["carbons", "탄소 번호"],
            ["hydroxyl", "OH 강조"],
            ["anomeric", "아노머 탄소"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={options[key]}
            onClick={() => toggle(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="control-group">
        <span>구조</span>
        {structural
          .filter(([, , available]) => available)
          .map(([key, label]) => (
            <button
              key={key}
              aria-pressed={options[key]}
              onClick={() => toggle(key)}
            >
              {label}
            </button>
          ))}
      </div>
      <div className="control-group">
        <span>조작</span>
        <button onClick={onReset}>↺ 초기화</button>
        <button
          aria-pressed={options.spinning}
          onClick={() => toggle("spinning")}
        >
          자동 회전 {options.spinning ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
