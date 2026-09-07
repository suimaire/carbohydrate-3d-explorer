import type { MoleculeId } from "../types/carbohydrate";
export function HaworthPreview({
  id,
  selected,
  onSelect,
}: {
  id: MoleculeId;
  selected: string | null;
  onSelect: (carbon: string) => void;
}) {
  if (!["GLC", "BGC", "GAL"].includes(id)) return null;
  const points = [
    { n: "C1", x: 246, y: 120, up: id !== "GLC" },
    { n: "C2", x: 205, y: 172, up: false },
    { n: "C3", x: 95, y: 172, up: true },
    { n: "C4", x: 48, y: 120, up: id === "GAL" },
    { n: "C5", x: 95, y: 70, up: true },
  ];
  return (
    <section className="haworth">
      <h3>
        2D와 연결하기 <span>Haworth</span>
      </h3>
      <svg
        viewBox="0 0 300 248"
        role="group"
        aria-label="Haworth 투영식. 탄소 번호를 선택하면 3D에서 강조됩니다."
      >
        <path
          d="M246 120 L205 172 L95 172 L48 120 L95 70 L195 70"
          fill="none"
          stroke="#53636a"
          strokeWidth="2.5"
        />
        <path d="M209 78 L246 120" stroke="#53636a" strokeWidth="2.5" />
        <path d="M205 172 L95 172" stroke="#53636a" strokeWidth="5" />
        <text x="199" y="76" fill="#c63835" textAnchor="middle">
          O
        </text>
        {points.map(({ n, x, y, up }) => (
          <g key={n}>
            <line
              x1={x}
              y1={y}
              x2={x}
              y2={y + (up ? -36 : 35)}
              stroke="#6e7c81"
              strokeWidth="1.8"
            />
            <text
              x={x}
              y={y + (up ? -44 : 53)}
              textAnchor="middle"
              fill="#ae3535"
              fontSize="14"
            >
              {n === "C5" ? "CH₂OH" : "OH"}
            </text>
            <g
              role="button"
              aria-label={`${n} 강조`}
              aria-pressed={selected === n}
              tabIndex={0}
              onClick={() => onSelect(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(n);
                }
              }}
              className="haworth-carbon"
            >
              <circle
                cx={x}
                cy={y}
                r="15"
                fill={selected === n ? "#126354" : "#fff"}
                stroke={selected === n ? "#126354" : "#b2c2c9"}
              />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill={selected === n ? "white" : "#264a5c"}
                fontSize="13"
              >
                {n}
              </text>
            </g>
          </g>
        ))}
      </svg>
      <p>
        번호를 누르면 3D의 탄소가 강조됩니다. H는 생략했습니다. 이 그림의
        위/아래는 고리 면을 기준으로 하며, 3D 화면의 위/아래와는 다릅니다.
      </p>
    </section>
  );
}
