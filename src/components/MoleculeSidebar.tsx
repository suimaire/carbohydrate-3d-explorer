import { sidebarSections } from "../data/carbohydrates";
import type { MoleculeId } from "../types/carbohydrate";
const pad = (n: number) => String(n).padStart(2, "0");
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
      {sidebarSections().map((section) => (
        <section className="molecule-category" key={section.category}>
          <h2>
            {section.label} <span>{pad(section.count)}</span>
          </h2>
          {section.groups.map((group) => (
            <div className="molecule-group" key={group.name}>
              <h3>{group.name}</h3>
              {group.molecules.map((m) => (
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
        </section>
      ))}
      <p className="library-note">
        단당류에서 시작해 글리코시드 결합을 따라
        <br />
        이당류와 다당류로 이어 보세요.
      </p>
    </nav>
  );
}
