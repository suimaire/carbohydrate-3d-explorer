import type {
  Carbohydrate,
  MoleculeId,
  ViewerOptions,
} from "../types/carbohydrate";
import metadata from "./structure-metadata.json";
export const structures = metadata;
const base = {
  category: "monosaccharide" as const,
  source: "wwPDB Chemical Component Dictionary · RCSB PDB",
  notes:
    "공개 사전의 ideal 좌표를 사용한 자유 단당류의 대표 구조입니다. 용액에는 다른 아노머와 고리 형태도 존재할 수 있습니다.",
  annotations: [],
};
const make = (
  id: MoleculeId,
  x: Omit<
    Carbohydrate,
    | keyof typeof base
    | "id"
    | "structureFile"
    | "sourceIdentifier"
    | "commonName"
  >,
): Carbohydrate => ({
  ...base,
  id,
  structureFile: `molecules/${id}.sdf`,
  sourceIdentifier: id,
  commonName: x.name,
  ...x,
});
export const carbohydrates: Carbohydrate[] = [
  make("GLC", {
    name: "α-D-glucose",
    koreanName: "α형 포도당",
    canonicalName: "alpha-D-glucopyranose",
    formula: "C₆H₁₂O₆",
    group: "포도당",
    stereochemicalForm: "α-D-glucopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    description:
      "α와 β는 아노머 탄소의 입체배치를 구별하는 이름입니다. C1의 OH와 C5에 붙은 CH₂OH의 상대적 방향을 비교해 보세요.",
    observationQuestions: [
      "다른 OH와 비교했을 때 C1–OH의 공간적 배치에는 어떤 특징이 있나요?",
      "β형과 비교하면 어느 부분이 달라지나요?",
    ],
    answer:
      "α형에서는 C1–OH와 C5–CH₂OH가 고리의 반대쪽(trans)입니다. 이 ⁴C₁ 의자형에서 C1–OH는 axial이고, C2·C3·C4의 OH와 C5의 CH₂OH는 equatorial입니다.",
  }),
  make("BGC", {
    name: "β-D-glucose",
    koreanName: "β형 포도당",
    canonicalName: "beta-D-glucopyranose",
    formula: "C₆H₁₂O₆",
    group: "포도당",
    stereochemicalForm: "β-D-glucopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    description:
      "6원자 고리는 평면이 아니라 접힌 의자형입니다. 분자를 돌려 고리의 높낮이와 치환기의 방향을 살펴보세요.",
    observationQuestions: [
      "C1을 찾아보세요. C1에 붙은 OH는 고리의 어느 방향을 향하고 있을까요?",
      "α형과 비교했을 때 어느 치환기의 배치가 달라졌나요?",
      "왜 이 구조가 상대적으로 안정할지 추측해 보세요.",
    ],
    answer:
      "β형에서는 C1–OH와 C5–CH₂OH가 고리의 같은 쪽(cis)입니다. 대표적인 ⁴C₁ 의자형에서 주요 치환기가 모두 equatorial이라 axial 치환기 사이의 입체적 혼잡을 줄일 수 있습니다.",
  }),
  make("GAL", {
    name: "D-galactose",
    koreanName: "갈락토스",
    canonicalName: "beta-D-galactopyranose",
    formula: "C₆H₁₂O₆",
    group: "다른 6탄당",
    stereochemicalForm: "β-D-galactopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    description:
      "여기서는 β-D-갈락토피라노스를 관찰합니다. 포도당과 분자식이 같아도 입체배치가 다를 수 있습니다.",
    observationQuestions: [
      "β-D-glucose와 비교했을 때 어느 탄소의 OH 배치가 다른가요?",
    ],
    answer:
      "D-galactose와 D-glucose는 C4의 입체배치가 다른 epimer(에피머)입니다. 같은 β형끼리 비교하면 차이가 명확합니다. 이 의자형의 갈락토스 C4–OH는 axial입니다.",
  }),
  make("FRU", {
    name: "D-fructose",
    koreanName: "과당",
    canonicalName: "beta-D-fructofuranose",
    formula: "C₆H₁₂O₆",
    group: "다른 6탄당",
    stereochemicalForm: "β-D-fructofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    description:
      "이 화면은 β-D-프럭토푸라노스입니다. 6개의 탄소 중 고리에 포함되는 탄소와 고리 밖 탄소를 구별해 보세요.",
    observationQuestions: [
      "glucose와 비교했을 때 아노머 탄소의 번호가 다른 이유는 무엇일까요?",
      "고리 안의 원자 수와 전체 탄소 수는 같은가요?",
    ],
    answer:
      "과당은 열린 사슬의 C2가 케톤의 carbonyl carbon입니다. 이 C2가 고리화 후 아노머 탄소가 됩니다. 이 푸라노스 고리는 C2·C3·C4·C5·O5로 이루어집니다. 과당에는 피라노스 형태도 있습니다.",
  }),
  make("BDR", {
    name: "D-ribose",
    koreanName: "리보스",
    canonicalName: "beta-D-ribofuranose",
    formula: "C₅H₁₀O₅",
    group: "5탄당",
    stereochemicalForm: "β-D-ribofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    description:
      "여기서는 β-D-리보푸라노스를 관찰합니다. RNA의 당 부분과 연결해서 C2 주변을 살펴보세요.",
    observationQuestions: [
      "2-deoxy-D-ribose와 비교할 때 어느 탄소에서 차이가 나나요?",
      "이 차이는 RNA와 DNA의 이름에 어떻게 연결되나요?",
    ],
    answer:
      "리보스 C2에는 OH가 있지만 2-deoxyribose의 같은 자리에는 H가 있습니다. RNA에는 리보스, DNA에는 2-디옥시리보스가 들어갑니다. 화면은 자유 당이며 핵산에서는 C1′이 염기와, 당이 인산과 결합합니다.",
  }),
  make("2DR", {
    name: "2-deoxy-D-ribose",
    koreanName: "2-디옥시리보스",
    canonicalName: "2-deoxy-beta-D-erythro-pentofuranose",
    formula: "C₅H₁₀O₄",
    group: "5탄당",
    stereochemicalForm: "2-deoxy-β-D-ribofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    description:
      "β형의 2-디옥시-D-리보푸라노스입니다. deoxy는 같은 자리의 OH가 H로 바뀌어 산소가 하나 줄었음을 뜻합니다.",
    observationQuestions: [
      "리보스와 비교해 C2에 붙은 원자들을 찾아보세요.",
      "분자식에서 산소 수와 수소 수는 각각 어떻게 달라지나요?",
    ],
    answer:
      "C2의 OH가 H로 바뀌어 C2는 CH₂가 됩니다. 분자식은 C₅H₁₀O₅에서 C₅H₁₀O₄로 바뀌므로 산소만 하나 줄고 전체 수소 수는 같습니다. DNA의 이름에서 D는 deoxyribo와 연결됩니다.",
  }),
];
export const moleculeById = (id: MoleculeId) =>
  carbohydrates.find((m) => m.id === id)!;
export const defaultOptions: ViewerOptions = {
  representation: "ball-stick",
  hydrogen: false,
  carbons: false,
  hydroxyl: false,
  anomeric: false,
  axial: false,
  spinning: false,
};
export const isGlucose = (id: MoleculeId) => id === "GLC" || id === "BGC";
