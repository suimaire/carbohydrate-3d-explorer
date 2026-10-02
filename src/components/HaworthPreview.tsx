import { structures } from "../data/carbohydrates";
import { bondAtCarbon, formulaGeometry, formulaResidue } from "../lib/structureFormula";
import type { FormulaPoint } from "../lib/structureFormula";
import type { MoleculeId } from "../types/carbohydrate";

/** The original carbon-mapping preview, generalized to all mono/disaccharides. */
export function HaworthPreview({ id, selected, selectedResidue = null, onSelect,
  selectedBond = null, onSelectBond = () => {}, interactive = true,
}: {
  id: MoleculeId;
  selected: string | null;
  selectedResidue?: string | null;
  onSelect: (carbon: string, residue?: string) => void;
  selectedBond?: string | null;
  onSelectBond?: (bond: string) => void;
  interactive?: boolean;
}) {
  const data = structures[id];
  if (data.residues.length > 2) return null;
  const multi = data.residues.length === 2;
  const formulas = data.residues.map(r => formulaResidue(data, r));
  const geometries = formulas.map((f, i) => formulaGeometry(f, i * 300, multi && f.residue.sugar === "fructose"));
  const label = `${data.residues.map(r => r.form).join(" + ")}. Haworth 투영식${multi ? `, ${data.glycosidicBonds[0].notation} 결합` : ""}.`;
  const description = formulas.map((f, i) => `${multi ? `${f.residue.sugarLabel} ${f.residue.id}: ` : ""}${f.substituents.map(s => {
    const linked = s.label === "OH" && bondAtCarbon(data, f.residue.id, s.carbon);
    return `${s.carbon}의 ${linked ? linked.notation + " 결합" : s.label === "CH₂OH" ? `${s.atom} CH₂OH` : s.label} ${geometries[i].direction(s.side) < 0 ? "위" : "아래"}`;
  }).join(", ")}`).join(". ");
  const carbon = (name: string, residue: string, p: FormulaPoint, tail = false, numberBelow = false) => {
    const active = selected === name && (!multi || selectedResidue === residue);
    const choose = () => multi ? onSelect(name, residue) : onSelect(name);
    return <g key={`${residue}:${name}`} className={`haworth-carbon ${active ? "is-selected" : ""}`}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${multi ? `${residue} · ` : ""}${name} 강조` : undefined}
      aria-pressed={interactive ? active : undefined}
      onClick={interactive ? choose : undefined}
      onKeyDown={interactive ? e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      } : undefined}>
      <rect x={p.x - (tail ? 36 : 15)} y={p.y - 12} width={tail ? 72 : 30} height="24" rx="5"
        fill={active ? "#126354" : "#fff"} stroke={active ? "#126354" : "#bbc9cc"} />
      <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fill={active ? "#fff" : "#264a5c"}>
        {tail ? "CH₂OH" : name}
      </text>
      {tail && <text x={numberBelow ? p.x : p.x + 40} y={p.y + (numberBelow ? 28 : 5)}
        textAnchor={numberBelow ? "middle" : undefined} fontSize="12" fill="#4b5a61">{name}</text>}
    </g>;
  };
  return <svg className={`haworth-formula ${multi ? "two-residues" : ""}`}
    viewBox={`0 0 ${multi ? 620 : 300} 234`} role={interactive ? "group" : "img"} aria-label={label}>
    <title>{label}</title>
    <desc>{description}. 굵은 고리 변은 앞쪽입니다. 위·아래는 고리 면의 양쪽이며 axial·equatorial과 다릅니다. C2가 CH₂인 디옥시리보스 외의 H는 생략합니다.</desc>
    {data.glycosidicBonds.map(b => {
      const aIndex = formulas.findIndex(f => f.residue.id === b.donorResidue);
      const bIndex = formulas.findIndex(f => f.residue.id === b.acceptorResidue);
      const a = geometries[aIndex].ring[b.donorCarbon];
      const bPoint = geometries[bIndex].ring[b.acceptorCarbon];
      const aSide = formulas[aIndex].substituents.find(s => s.carbon === b.donorCarbon && s.label === "OH")!.side;
      const bSide = formulas[bIndex].substituents.find(s => s.carbon === b.acceptorCarbon && s.label === "OH")!.side;
      const ay = a.y + geometries[aIndex].direction(aSide) * 35;
      const by = bPoint.y + geometries[bIndex].direction(bSide) * 35;
      const ox = (a.x + bPoint.x) / 2, oy = (ay + by) / 2;
      const d = `M${a.x} ${a.y} L${a.x + 20} ${ay} L${ox} ${oy} L${bPoint.x - 20} ${by} L${bPoint.x} ${bPoint.y}`;
      const active = selectedBond === b.id;
      const choose = () => onSelectBond(b.id);
      return <g key={b.id} className={`formula-bond ${active ? "is-selected" : ""}`}
        role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `${b.donorResidue}:${b.donorCarbon}–O–${b.acceptorResidue}:${b.acceptorCarbon} · ${b.notation} 결합 강조` : undefined}
        aria-pressed={interactive ? active : undefined}
        onClick={interactive ? choose : undefined}
        onKeyDown={interactive ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } } : undefined}>
        <path d={d} fill="none" stroke="transparent" strokeWidth="18" />
        <path d={d} fill="none" stroke={active ? "#126354" : "#2f5fa8"} strokeWidth={active ? 4 : 2.6} />
        <circle cx={ox} cy={oy} r="12" fill="#fff" />
        <text x={ox} y={oy + 6} textAnchor="middle" fill="#23477e" fontSize="20">O</text>
        <text x={ox} y="224" textAnchor="middle" fill="#23477e" fontSize="17" fontWeight="600">{b.notation}</text>
      </g>;
    })}
    {formulas.map((f, index) => {
      const { ring, direction } = geometries[index];
      const r = f.residue;
      const ringPoints = f.ring.map(n => ring[n]);
      return <g key={r.id} data-residue={r.id}>
        <g aria-hidden="true" fill="none" stroke="#53636a" strokeWidth="2.2" strokeLinejoin="round">
          <polygon points={ringPoints.map(p => `${p.x},${p.y}`).join(" ")} />
          <line x1={ringPoints[1].x} y1={ringPoints[1].y} x2={ringPoints[2].x} y2={ringPoints[2].y} strokeWidth="4.5" />
        </g>
        {f.substituents.map(s => {
          if (s.label === "OH" && bondAtCarbon(data, r.id, s.carbon)) return null;
          const p = ring[s.carbon];
          const dy = direction(s.side);
          const tail = s.label === "CH₂OH";
          const length = tail && s.carbon === "C2" ? (dy < 0 ? 64 : 91) : tail ? 38 : 33;
          const turnedTail = multi && r.sugar === "fructose" && s.atom === "C6";
          const end = { x: p.x + (turnedTail ? 20 : 0), y: p.y + dy * (length + (turnedTail ? 10 : 0)) };
          return <g key={s.atom} data-carbon={s.carbon} data-substituent={s.atom} data-side={s.side}>
            <line aria-hidden="true" x1={p.x} y1={p.y} x2={end.x} y2={end.y} stroke="#6e7c81" strokeWidth="1.7" />
            {tail ? carbon(s.atom, r.id, end, true, turnedTail) : <text aria-hidden="true" x={end.x} y={end.y + (dy < 0 ? -5 : 16)}
              textAnchor="middle" fill={s.label === "H" ? "#53636a" : "#ae3535"} fontSize="17">{s.label}</text>}
          </g>;
        })}
        {f.ring.map(n => n.startsWith("C") ? carbon(n, r.id, ring[n]) :
          <g key={n} aria-hidden="true"><circle cx={ring[n].x} cy={ring[n].y} r="12" fill="#fff" />
            <text x={ring[n].x} y={ring[n].y + 6} textAnchor="middle" fill="#ae3535" fontSize="20">O</text></g>)}
        {multi && <text aria-hidden="true" x={index * 300 + 140} y="224" textAnchor="middle" fontSize="14" fill="#465860">
          {r.sugarLabel} {r.id} · {r.anomericConfiguration === "alpha" ? "α" : "β"}
        </text>}
      </g>;
    })}
  </svg>;
}
