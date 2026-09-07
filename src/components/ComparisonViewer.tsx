import { useEffect, useState } from "react";
import { MoleculeViewer } from "./MoleculeViewer";
import { moleculeById } from "../data/carbohydrates";
import { synchronizeViewers } from "../lib/viewSync";
import type { GLViewer } from "../lib/molecularViewer";
import type { MoleculeId, ViewerOptions } from "../types/carbohydrate";
export type ComparisonKind = "anomer" | "epimer" | "deoxy";
export const comparisons: Record<
  ComparisonKind,
  {
    left: MoleculeId;
    right: MoleculeId;
    label: string;
    question: string;
    answer: string;
  }
> = {
  anomer: {
    left: "GLC",
    right: "BGC",
    label: "α / β 포도당",
    question:
      "두 고리의 같은 탄소를 따라가 보세요. 어느 OH의 배치가 달라졌나요?",
    answer:
      "C1만 달라집니다. α형 C1–OH는 axial, β형 C1–OH는 equatorial입니다. 다른 입체중심은 같습니다.",
  },
  epimer: {
    left: "BGC",
    right: "GAL",
    label: "포도당 / 갈락토스",
    question: "탄소 번호를 켜고 두 β형을 비교해 보세요. 어느 위치가 다른가요?",
    answer:
      "C4의 배치만 다른 에피머입니다. β-D-glucose의 C4–OH는 equatorial, β-D-galactose의 C4–OH는 axial입니다.",
  },
  deoxy: {
    left: "BDR",
    right: "2DR",
    label: "리보스 / 디옥시리보스",
    question: "H 표시와 OH 강조를 켜세요. C2 주변과 산소 수가 어떻게 다른가요?",
    answer:
      "리보스의 C2–OH가 디옥시리보스에서는 C2–H로 바뀝니다. 고리의 접힘은 서로 다를 수 있으므로 방향 차이와 원자 구성의 차이를 구별하세요.",
  },
};
export function ComparisonViewer({
  selected,
  compare,
  kind,
  sync,
  options,
  resetToken,
  focusCarbon,
}: {
  selected: MoleculeId;
  compare: boolean;
  kind: ComparisonKind;
  sync: boolean;
  options: ViewerOptions;
  resetToken: number;
  focusCarbon: string | null;
}) {
  const [left, setLeft] = useState<GLViewer | null>(null);
  const [right, setRight] = useState<GLViewer | null>(null);
  const [wasCompared, setWasCompared] = useState(compare);
  const pair = comparisons[kind];
  useEffect(() => {
    if (compare) setWasCompared(true);
  }, [compare]);
  useEffect(() => {
    if (!compare || !sync || !left || !right) return;
    return synchronizeViewers(left, right);
  }, [compare, sync, left, right, kind, resetToken]);
  useEffect(() => {
    left?.resize();
    right?.resize();
  }, [compare, left, right]);
  const rightOptions = {
    ...options,
    spinning: compare && options.spinning && !sync,
  };
  return (
    <div className={`viewer-pair ${compare ? "comparing" : ""}`}>
      <MoleculeViewer
        molecule={moleculeById(compare ? pair.left : selected)}
        options={options}
        resetToken={resetToken}
        focusCarbon={focusCarbon}
        onReady={setLeft}
      />
      {(wasCompared || compare) && (
        <div className="comparison-right" hidden={!compare}>
          <MoleculeViewer
            molecule={moleculeById(pair.right)}
            options={rightOptions}
            resetToken={resetToken}
            focusCarbon={focusCarbon}
            onReady={setRight}
          />
        </div>
      )}
    </div>
  );
}
