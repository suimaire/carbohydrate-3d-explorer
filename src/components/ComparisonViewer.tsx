import { useEffect, useState } from "react";
import { MoleculeViewer } from "./MoleculeViewer";
import { capabilitiesOf, moleculeById } from "../data/carbohydrates";
import { synchronizeViewers } from "../lib/viewSync";
import type { GLViewer } from "../lib/molecularViewer";
import type {
  FocusState,
  MoleculeId,
  ViewerOptions,
} from "../types/carbohydrate";
export type ComparisonKind =
  | "anomer"
  | "epimer"
  | "deoxy"
  | "linkage"
  | "glucan"
  | "branching";
export interface ComparisonPair {
  left: MoleculeId;
  right: MoleculeId;
  label: string;
  intro: string;
  question: string;
  answer: string;
}
export const comparisons: Record<ComparisonKind, ComparisonPair> = {
  anomer: {
    left: "GLC",
    right: "BGC",
    label: "α / β 포도당",
    intro:
      "α형과 β형은 아노머입니다. 같은 고리 원자를 기준으로 맞춘 두 구조를 관찰하세요.",
    question:
      "두 고리의 같은 탄소를 따라가 보세요. 어느 OH의 배치가 달라졌나요?",
    answer:
      "C1만 달라집니다. α형 C1–OH는 axial, β형 C1–OH는 equatorial입니다. 다른 입체중심은 같습니다.",
  },
  epimer: {
    left: "BGC",
    right: "GAL",
    label: "포도당 / 갈락토스",
    intro: "같은 β형끼리 비교합니다. 한 입체중심의 차이를 찾아보세요.",
    question: "탄소 번호를 켜고 두 β형을 비교해 보세요. 어느 위치가 다른가요?",
    answer:
      "C4의 배치만 다른 에피머입니다. β-D-glucose의 C4–OH는 equatorial, β-D-galactose의 C4–OH는 axial입니다.",
  },
  deoxy: {
    left: "BDR",
    right: "2DR",
    label: "리보스 / 디옥시리보스",
    intro:
      "두 분자는 β형 푸라노스입니다. C2의 원자 구성을 비교하세요.",
    question: "H 표시와 OH 강조를 켜세요. C2 주변과 산소 수가 어떻게 다른가요?",
    answer:
      "리보스의 C2–OH가 디옥시리보스에서는 C2–H로 바뀝니다. 고리의 접힘은 서로 다를 수 있으므로 방향 차이와 원자 구성의 차이를 구별하세요.",
  },
  linkage: {
    left: "MAL",
    right: "CBI",
    label: "맥아당 / 셀로비오스 · α / β(1→4)",
    intro:
      "포도당 두 개가 같은 1→4 자리에서 이어진 두 이당류입니다. 다른 것은 결합에 참여한 아노머 탄소의 배치 하나뿐입니다. 두 화면 모두 환원 말단 쪽 고리를 같은 자리에 맞춰 두었습니다.",
    question:
      "같은 두 glucose가 같은 1→4 위치로 연결되었는데, α와 β의 차이는 두 고리의 상대적 방향을 어떻게 바꾸나요?",
    answer:
      "α(1→4)에서는 두 번째 고리가 첫 고리 쪽으로 꺾여 붙고, β(1→4)에서는 반대쪽으로 뻗어 두 고리가 거의 일직선으로 놓입니다. 원자의 종류와 결합 위치는 완전히 같고 C1의 배치만 다릅니다. 이 차이가 반복되면 아밀로스처럼 감기는 사슬과 셀룰로스처럼 펴진 사슬로 갈라집니다. 화면은 각각의 대표 conformer이며, 글리코시드 결합 주위의 회전으로 다른 배치도 가능합니다.",
  },
  glucan: {
    left: "AMYLOSE",
    right: "CELLULOSE",
    label: "아밀로스 / 셀룰로스 · α / β(1→4) 반복",
    intro:
      "둘 다 포도당만으로 이루어진 중합체입니다. 반복되는 글리코시드 결합의 배치만 다릅니다. 양쪽 모두 대표 fragment입니다.",
    question:
      "같은 포도당이 같은 1→4 자리로 이어지는데, α와 β가 반복될 때 사슬의 모양은 어떻게 달라지나요?",
    answer:
      "α(1→4)가 반복되면 방향이 조금씩 꺾여 사슬이 감기고, β(1→4)가 반복되면 이어지는 고리가 번갈아 뒤집히며 거의 곧게 펴집니다. 화면 fragment에서 재어 보면 아밀로스는 residue당 약 57°, 셀룰로스는 약 130° 회전합니다. 다만 α이면 언제나 하나의 고정된 나선, β이면 언제나 완전한 직선이라는 뜻은 아닙니다. 실제 사슬은 용액과 고체에서 여러 형태를 가지며, 셀룰로스가 단단한 섬유를 이루는 것은 펴진 사슬들이 서로 수소 결합으로 나란히 쌓이기 때문입니다.",
  },
  branching: {
    left: "AMYLOPECTIN",
    right: "GLYCOGEN",
    label: "아밀로펙틴 / 글리코젠 · 가지 구조",
    intro:
      "두 고분자 모두 α(1→4) 사슬과 α(1→6) 가지를 씁니다. 결합의 종류가 아니라 가지가 놓이는 방식이 다릅니다. 양쪽 모두 대표 fragment이며 가지 개수는 관찰을 위해 정한 것입니다.",
    question:
      "두 구조에서 α(1→4)와 α(1→6)을 각각 찾아보세요. 결합의 종류와 가지가 배치되는 방식 중 무엇이 다른가요?",
    answer:
      "결합의 종류는 같습니다. 사슬은 α(1→4), 가지는 α(1→6)입니다. 다른 것은 구조 전체에서 가지가 얼마나 자주, 어떤 층으로 나오는가입니다. 글리코젠은 아밀로펙틴보다 가지가 더 자주 나오고 가지 위에서 다시 갈라져, 같은 크기라도 비환원 말단이 더 많습니다. 화면의 두 조각에 보이는 가지 개수(1개와 2개)는 관찰을 위해 정한 값이며 실제 두 고분자의 가지 빈도를 정량적으로 비교한 것이 아닙니다.",
  },
};
export const comparisonCapabilities = (kind: ComparisonKind) => {
  const left = capabilitiesOf(comparisons[kind].left);
  const right = capabilitiesOf(comparisons[kind].right);
  return {
    axial: left.axial && right.axial,
    glycosidic: left.glycosidic && right.glycosidic,
    reducing: left.reducing && right.reducing,
    branch: left.branch && right.branch,
    multiResidue: left.multiResidue && right.multiResidue,
    crowded: left.crowded || right.crowded,
  };
};
export function ComparisonViewer({
  selected,
  compare,
  kind,
  sync,
  options,
  resetToken,
  focus,
}: {
  selected: MoleculeId;
  compare: boolean;
  kind: ComparisonKind;
  sync: boolean;
  options: ViewerOptions;
  resetToken: number;
  focus: FocusState;
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
        focus={focus}
        onReady={setLeft}
      />
      {(wasCompared || compare) && (
        <div className="comparison-right" hidden={!compare}>
          <MoleculeViewer
            molecule={moleculeById(pair.right)}
            options={rightOptions}
            resetToken={resetToken}
            focus={focus}
            onReady={setRight}
          />
        </div>
      )}
    </div>
  );
}
