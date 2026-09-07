import { carbohydrates } from "../data/carbohydrates";
import type { MoleculeId } from "../types/carbohydrate";
export function MoleculeSidebar({
  selected,
  onSelect,
}: {
  selected: MoleculeId;
  onSelect: (id: MoleculeId) => void;
}) {
  return (
    <nav className="sidebar" aria-label="분자 선택">
      <div className="section-kicker">MOLECULE LIBRARY</div>
      <h2>
        단당류 <span>06</span>
      </h2>
      {["포도당", "다른 6탄당", "5탄당"].map((group) => (
        <div className="molecule-group" key={group}>
          <h3>{group}</h3>
          {carbohydrates
            .filter((m) => m.group === group)
            .map((m) => (
              <button
                key={m.id}
                aria-pressed={selected === m.id}
                className={`molecule-choice ${selected === m.id ? "selected" : ""}`}
                onClick={() => onSelect(m.id)}
              >
                <span>{m.name}</span>
                <small>{m.koreanName}</small>
              </button>
            ))}
        </div>
      ))}
      <p className="library-note">
        하나의 분자에서 시작해
        <br />
        입체배치의 차이를 관찰하세요.
      </p>
    </nav>
  );
}
