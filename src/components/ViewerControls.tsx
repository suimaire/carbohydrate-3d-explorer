import type { ViewerOptions } from "../types/carbohydrate";
export function ViewerControls({
  options,
  onChange,
  onReset,
  allowAxial = true,
}: {
  options: ViewerOptions;
  onChange: (o: ViewerOptions) => void;
  onReset: () => void;
  allowAxial?: boolean;
}) {
  const toggle = (key: keyof ViewerOptions) =>
    onChange({ ...options, [key]: !options[key] });
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
        <button
          disabled={!allowAxial}
          title={!allowAxial ? "포도당의 ⁴C₁ chair에서 사용합니다." : undefined}
          aria-pressed={options.axial && allowAxial}
          onClick={() => toggle("axial")}
        >
          axial / equatorial
        </button>
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
