import type { GlycosidicBond, StructureData } from "../types/carbohydrate";
const STEP = 46;
const ROW = 56;
const PAD = 22;
const R = 13;
interface Node {
  id: string;
  x: number;
  row: number;
}
/** Lay the fragment out as chains: one row per run of non-branch linkages. */
function layout(data: StructureData) {
  const next = new Map<string, string>();
  const branchOf = new Map<string, GlycosidicBond>();
  for (const bond of data.glycosidicBonds) {
    if (bond.branch) branchOf.set(bond.donorResidue, bond);
    else next.set(bond.donorResidue, bond.acceptorResidue);
  }
  const isAcceptor = new Set(
    data.glycosidicBonds.filter((b) => !b.branch).map((b) => b.acceptorResidue),
  );
  const chains: string[][] = [];
  for (const residue of data.residues) {
    if (isAcceptor.has(residue.id)) continue;
    const chain = [residue.id];
    for (let at = next.get(residue.id); at; at = next.get(at)) chain.push(at);
    chains.push(chain);
  }
  const nodes = new Map<string, Node>();
  const main =
    chains.find((c) => c.some((id) => data.reducingEnds.includes(id))) ??
    chains[0];
  const place = (chain: string[], lastX: number, row: number) => {
    chain.forEach((id, i) =>
      nodes.set(id, { id, x: lastX - (chain.length - 1 - i), row }),
    );
    for (const other of chains) {
      if (other === chain) continue;
      const bond = branchOf.get(other[other.length - 1]);
      if (!bond || !chain.includes(bond.acceptorResidue)) continue;
      place(other, nodes.get(bond.acceptorResidue)!.x, row + 1);
    }
  };
  place(main, main.length - 1, 0);
  const shift = Math.min(...[...nodes.values()].map((n) => n.x));
  for (const node of nodes.values()) node.x -= shift;
  const rows = Math.max(...[...nodes.values()].map((n) => n.row)) + 1;
  const width = Math.max(...[...nodes.values()].map((n) => n.x)) + 1;
  return { nodes, rows, width };
}
const cx = (n: Node) => PAD + n.x * STEP + R;
const cy = (n: Node, rows: number) => PAD + (rows - 1 - n.row) * ROW + R;
export function PolymerSchematic({
  data,
  selectedResidue,
  onSelectResidue,
  selectedBond,
  onSelectBond,
}: {
  data: StructureData;
  selectedResidue: string | null;
  onSelectResidue: (id: string) => void;
  selectedBond: string | null;
  onSelectBond: (id: string) => void;
}) {
  if (data.residues.length < 3) return null;
  const { nodes, rows, width } = layout(data);
  const w = PAD * 2 + (width - 1) * STEP + R * 2;
  const h = PAD * 2 + (rows - 1) * ROW + R * 2;
  const chainNotation =
    data.glycosidicBonds.find((b) => !b.branch)?.notation ?? "";
  const branchNotation = data.glycosidicBonds.find((b) => b.branch)?.notation;
  return (
    <section className="schematic">
      <h3>
        결합 구조 한눈에 보기 <span>{data.residues.length} residue</span>
      </h3>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="group"
        aria-label={`대표 fragment의 결합 구조 개념도. 포도당 단위 ${data.residues.length}개, ${chainNotation} 사슬${branchNotation ? `, ${branchNotation} 가지 ${data.branchPoints.length}곳` : ""}.`}
      >
        {data.glycosidicBonds.map((bond) => {
          const a = nodes.get(bond.donorResidue);
          const b = nodes.get(bond.acceptorResidue);
          if (!a || !b) return null;
          const active = selectedBond === bond.id;
          return (
            <g key={bond.id} className="schematic-link">
              <line
                x1={cx(a)}
                y1={cy(a, rows)}
                x2={cx(b)}
                y2={cy(b, rows)}
                stroke={
                  active ? "#0d5f52" : bond.branch ? "#7b3f9d" : "#5b6a72"
                }
                strokeWidth={active ? 4 : 2.4}
                strokeDasharray={bond.branch ? "5 4" : undefined}
              />
              <line
                x1={cx(a)}
                y1={cy(a, rows)}
                x2={cx(b)}
                y2={cy(b, rows)}
                stroke="transparent"
                strokeWidth="14"
                role="button"
                tabIndex={0}
                aria-label={`${bond.donorResidue}에서 ${bond.acceptorResidue}로 가는 ${bond.notation} 결합 강조`}
                aria-pressed={active}
                onClick={() => onSelectBond(bond.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectBond(bond.id);
                  }
                }}
              />
            </g>
          );
        })}
        {data.residues.map((residue) => {
          const node = nodes.get(residue.id);
          if (!node) return null;
          const reducing = data.reducingEnds.includes(residue.id);
          const branchPoint = data.branchPoints.some(
            (b) => b.residue === residue.id,
          );
          const active = selectedResidue === residue.id;
          return (
            <g
              key={residue.id}
              className="schematic-node"
              role="button"
              tabIndex={0}
              aria-label={`${residue.sugarLabel} ${residue.id} 강조`}
              aria-pressed={active}
              onClick={() => onSelectResidue(residue.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectResidue(residue.id);
                }
              }}
            >
              <circle
                cx={cx(node)}
                cy={cy(node, rows)}
                r={R}
                fill={active ? "#126354" : branchPoint ? "#efe7f6" : "#fff"}
                stroke={
                  active ? "#126354" : branchPoint ? "#7b3f9d" : "#b2c2c9"
                }
                strokeWidth={branchPoint ? 2.2 : 1.4}
              />
              <text
                x={cx(node)}
                y={cy(node, rows) + 4}
                textAnchor="middle"
                fontSize="12"
                fill={active ? "#fff" : "#264a5c"}
              >
                {residue.id}
              </text>
              {reducing && (
                <text
                  x={cx(node)}
                  y={cy(node, rows) + R + 13}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#1b7f3b"
                >
                  환원
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="schematic-legend">
        <li>
          <i className="chain" /> {chainNotation} 사슬
        </li>
        {branchNotation && (
          <li>
            <i className="branch" /> {branchNotation} 가지 ·{" "}
            {data.branchPoints.length}곳
          </li>
        )}
        <li>
          <i className="reducing" /> 환원 말단 {data.reducingEnds.length}개
        </li>
      </ul>
      <p>
        위 그림은 화면에 표시된 대표 fragment의 결합 구조를 나타낸 개념도입니다.
        전체 분자의 정확한 크기나 실제 가지 빈도를 나타내는 것이 아닙니다. 원을
        누르면 3D에서 해당 residue가, 선을 누르면 해당 글리코시드 결합이
        강조됩니다.
      </p>
    </section>
  );
}
