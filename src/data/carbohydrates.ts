import type {
  Carbohydrate,
  CarbohydrateCategory,
  FocusState,
  MoleculeCapabilities,
  MoleculeId,
  StructureData,
  StructureResidue,
  ViewerOptions,
} from "../types/carbohydrate";
import metadata from "./structure-metadata.json";
export const structures = metadata as unknown as Record<
  MoleculeId,
  StructureData
>;
const CATEGORY_LABEL: Record<CarbohydrateCategory, string> = {
  monosaccharide: "단당류",
  disaccharide: "이당류",
  polysaccharide: "다당류",
};
const categoryOrder: CarbohydrateCategory[] = [
  "monosaccharide",
  "disaccharide",
  "polysaccharide",
];
type Content = Omit<
  Carbohydrate,
  | "id"
  | "structureFile"
  | "sourceIdentifier"
  | "commonName"
  | "categoryLabel"
  | "annotations"
  | "category"
  | "representationType"
  | "source"
  | "linkageSummary"
> &
  Partial<Pick<Carbohydrate, "linkageSummary" | "source">>;
const make = (
  id: MoleculeId,
  category: CarbohydrateCategory,
  source: string,
  x: Content,
): Carbohydrate => ({
  id,
  category,
  categoryLabel: CATEGORY_LABEL[category],
  representationType: id in FRAGMENTS ? "fragment" : "molecule",
  structureFile: `molecules/${id}.sdf`,
  sourceIdentifier: id,
  commonName: x.name,
  linkageSummary: "",
  annotations: [],
  source,
  ...x,
});
const FRAGMENTS: Partial<Record<MoleculeId, true>> = {
  AMYLOSE: true,
  AMYLOPECTIN: true,
  GLYCOGEN: true,
  CELLULOSE: true,
};
const CCD = "wwPDB Chemical Component Dictionary · RCSB PDB";
const BUILT =
  "wwPDB CCD 잔기 + PubChem 참조 conformer로 조립한 대표 fragment";
const MONOSACCHARIDE_NOTE =
  "wwPDB CCD가 제공하는 idealized 좌표를 사용한 자유 단당류의 대표 구조입니다. 여기서 ideal은 사전이 화학 정보로부터 계산해 만든 이상화 좌표라는 뜻이며, 실험적으로 측정된 conformation이 아닙니다. 용액에는 다른 아노머와 고리 형태도 존재할 수 있습니다.";
const DISACCHARIDE_NOTE =
  "wwPDB CCD의 이당류 성분에서 가져온 idealized 좌표입니다. 사전이 화학 정보로부터 계산해 만든 좌표이며 실험적으로 측정된 conformation이 아닙니다. 결합 위치와 각 입체중심은 고정되어 있지만, 두 고리가 이루는 상대적 각도는 대표 conformer 하나일 뿐이며 용액에서는 글리코시드 결합 주위로 회전할 수 있습니다.";
const FRAGMENT_NOTE =
  "실제 다당류는 수백~수만 개의 단위로 이루어진 거대분자입니다. 화면의 구조는 결합 방식과 사슬 구조를 관찰하기 위한 대표 fragment이며, 전체 길이·하나의 고정된 생체 구조·고차 구조를 재현하지 않습니다. 각 잔기는 검증된 CCD 단당류이고 모든 글리코시드 결합의 기하는 공개된 참조 이당류 구조에서 측정한 값입니다.";
export const carbohydrates: Carbohydrate[] = [
  make("GLC", "monosaccharide", CCD, {
    name: "α-D-glucose",
    koreanName: "α형 포도당",
    canonicalName: "alpha-D-glucopyranose",
    formula: "C₆H₁₂O₆",
    group: "포도당",
    stereochemicalForm: "α-D-glucopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    notes: MONOSACCHARIDE_NOTE,
    description:
      "α와 β는 아노머 탄소의 입체배치를 구별하는 이름입니다. C1의 OH와 C5에 붙은 CH₂OH의 상대적 방향을 비교해 보세요.",
    observationQuestions: [
      "다른 OH와 비교했을 때 C1–OH의 공간적 배치에는 어떤 특징이 있나요?",
      "β형과 비교하면 어느 부분이 달라지나요?",
    ],
    answer:
      "α형에서는 C1–OH와 C5–CH₂OH가 고리의 반대쪽(trans)입니다. 이 ⁴C₁ 의자형에서 C1–OH는 axial이고, C2·C3·C4의 OH와 C5의 CH₂OH는 equatorial입니다.",
  }),
  make("BGC", "monosaccharide", CCD, {
    name: "β-D-glucose",
    koreanName: "β형 포도당",
    canonicalName: "beta-D-glucopyranose",
    formula: "C₆H₁₂O₆",
    group: "포도당",
    stereochemicalForm: "β-D-glucopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    notes: MONOSACCHARIDE_NOTE,
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
  make("GAL", "monosaccharide", CCD, {
    name: "D-galactose",
    koreanName: "갈락토스",
    canonicalName: "beta-D-galactopyranose",
    formula: "C₆H₁₂O₆",
    group: "다른 6탄당",
    stereochemicalForm: "β-D-galactopyranose",
    ringForm: "피라노스 · 6원자 고리",
    conformation: "⁴C₁ chair · 의자형",
    notes: MONOSACCHARIDE_NOTE,
    description:
      "여기서는 β-D-갈락토피라노스를 관찰합니다. 포도당과 분자식이 같아도 입체배치가 다를 수 있습니다.",
    observationQuestions: [
      "β-D-glucose와 비교했을 때 어느 탄소의 OH 배치가 다른가요?",
    ],
    answer:
      "D-galactose와 D-glucose는 C4의 입체배치가 다른 epimer(에피머)입니다. 같은 β형끼리 비교하면 차이가 명확합니다. 이 의자형의 갈락토스 C4–OH는 axial입니다.",
  }),
  make("FRU", "monosaccharide", CCD, {
    name: "D-fructose",
    koreanName: "과당",
    canonicalName: "beta-D-fructofuranose",
    formula: "C₆H₁₂O₆",
    group: "다른 6탄당",
    stereochemicalForm: "β-D-fructofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    notes: MONOSACCHARIDE_NOTE,
    description:
      "이 화면은 β-D-프럭토푸라노스입니다. 6개의 탄소 중 고리에 포함되는 탄소와 고리 밖 탄소를 구별해 보세요.",
    observationQuestions: [
      "glucose와 비교했을 때 아노머 탄소의 번호가 다른 이유는 무엇일까요?",
      "고리 안의 원자 수와 전체 탄소 수는 같은가요?",
    ],
    answer:
      "과당은 열린 사슬의 C2가 케톤의 carbonyl carbon입니다. 이 C2가 고리화 후 아노머 탄소가 됩니다. 이 푸라노스 고리는 C2·C3·C4·C5·O5로 이루어집니다. 과당에는 피라노스 형태도 있습니다.",
  }),
  make("BDR", "monosaccharide", CCD, {
    name: "D-ribose",
    koreanName: "리보스",
    canonicalName: "beta-D-ribofuranose",
    formula: "C₅H₁₀O₅",
    group: "5탄당",
    stereochemicalForm: "β-D-ribofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    notes: MONOSACCHARIDE_NOTE,
    description:
      "여기서는 β-D-리보푸라노스를 관찰합니다. RNA의 당 부분과 연결해서 C2 주변을 살펴보세요.",
    observationQuestions: [
      "2-deoxy-D-ribose와 비교할 때 어느 탄소에서 차이가 나나요?",
      "이 차이는 RNA와 DNA의 이름에 어떻게 연결되나요?",
    ],
    answer:
      "리보스 C2에는 OH가 있지만 2-deoxyribose의 같은 자리에는 H가 있습니다. RNA에는 리보스, DNA에는 2-디옥시리보스가 들어갑니다. 화면은 자유 당이며 핵산에서는 C1′이 염기와, 당이 인산과 결합합니다.",
  }),
  make("2DR", "monosaccharide", CCD, {
    name: "2-deoxy-D-ribose",
    koreanName: "2-디옥시리보스",
    canonicalName: "2-deoxy-beta-D-erythro-pentofuranose",
    formula: "C₅H₁₀O₄",
    group: "5탄당",
    stereochemicalForm: "2-deoxy-β-D-ribofuranose",
    ringForm: "푸라노스 · 5원자 고리",
    conformation: "비평면 5원자 고리 · 대표 conformer",
    notes: MONOSACCHARIDE_NOTE,
    description:
      "β형의 2-디옥시-D-리보푸라노스입니다. deoxy는 같은 자리의 OH가 H로 바뀌어 산소가 하나 줄었음을 뜻합니다.",
    observationQuestions: [
      "리보스와 비교해 C2에 붙은 원자들을 찾아보세요.",
      "분자식에서 산소 수와 수소 수는 각각 어떻게 달라지나요?",
    ],
    answer:
      "C2의 OH가 H로 바뀌어 C2는 CH₂가 됩니다. 분자식은 C₅H₁₀O₅에서 C₅H₁₀O₄로 바뀌므로 산소만 하나 줄고 전체 수소 수는 같습니다. DNA의 이름에서 D는 deoxyribo와 연결됩니다.",
  }),
  make("MAL", "disaccharide", CCD, {
    name: "Maltose",
    koreanName: "맥아당",
    canonicalName: "4-O-alpha-D-glucopyranosyl-alpha-D-glucopyranose",
    formula: "C₁₂H₂₂O₁₁",
    group: "포도당 + 포도당",
    stereochemicalForm: "α-D-Glcp-(1→4)-α-D-Glcp",
    ringForm: "피라노스 2개 · 6원자 고리",
    conformation: "두 고리 모두 ⁴C₁ chair · 대표 conformer",
    linkageSummary: "α-D-Glcp-(1→4)-D-Glcp · Glc(a1-4)Glc",
    notes: `${DISACCHARIDE_NOTE} 화면 구조에서는 환원 말단이 α형으로 고정되어 있습니다.`,
    description:
      "포도당 두 분자가 한쪽의 C1과 다른 쪽의 C4 사이에서 산소 하나를 공유하며 이어져 있습니다. 이 연결이 글리코시드 결합입니다. 녹말을 분해하면 얻어집니다.",
    observationQuestions: [
      "두 포도당은 각각 몇 번 탄소끼리 연결되어 있나요?",
      "결합에 참여한 첫 번째 포도당의 C1은 α인가요, β인가요?",
      "두 번째 포도당의 아노머 탄소는 결합에 참여하고 있나요?",
    ],
    answer:
      "Glc A의 C1과 Glc B의 C4가 산소 하나를 사이에 두고 이어집니다. A의 C1은 α 배치이므로 α(1→4) 결합입니다. B의 C1에는 OH가 그대로 남아 결합에 쓰이지 않았으므로 맥아당은 환원당입니다. 화면 구조는 B의 아노머 탄소가 α인 형태이고, 수용액에서는 이 자리가 α와 β 사이를 오갈 수 있습니다.",
  }),
  make("CBI", "disaccharide", CCD, {
    name: "Cellobiose",
    koreanName: "셀로비오스",
    canonicalName: "4-O-beta-D-glucopyranosyl-beta-D-glucopyranose",
    formula: "C₁₂H₂₂O₁₁",
    group: "포도당 + 포도당",
    stereochemicalForm: "β-D-Glcp-(1→4)-β-D-Glcp",
    ringForm: "피라노스 2개 · 6원자 고리",
    conformation: "두 고리 모두 ⁴C₁ chair · 대표 conformer",
    linkageSummary: "β-D-Glcp-(1→4)-D-Glcp · Glc(b1-4)Glc",
    notes: `${DISACCHARIDE_NOTE} 화면 구조에서는 환원 말단이 β형으로 고정되어 있습니다.`,
    description:
      "맥아당과 구성 원자도, 연결된 탄소 번호도 같습니다. 다른 것은 결합에 참여한 아노머 탄소의 배치 하나뿐입니다. 셀룰로스를 분해하면 얻어집니다.",
    observationQuestions: [
      "맥아당과 구성 원소, 결합 위치가 같은데 무엇이 다른가요?",
      "α와 β의 차이는 두 고리의 상대적 방향을 어떻게 바꾸나요?",
      "이 이당류에도 환원 말단이 있나요?",
    ],
    answer:
      "연결된 자리는 둘 다 C1–O–C4이고, 다른 것은 결합에 참여한 아노머 탄소의 배치입니다. 맥아당은 α, 셀로비오스는 β입니다. 그 결과 두 고리의 상대적 방향이 달라져, β 결합이 반복되면 사슬이 길게 펴지기 쉽고 α 결합이 반복되면 사슬이 감기기 쉽습니다. 셀로비오스에서도 두 번째 포도당의 C1–OH가 남아 있으므로 환원당입니다.",
  }),
  make("LAT", "disaccharide", CCD, {
    name: "Lactose",
    koreanName: "젖당",
    canonicalName: "4-O-beta-D-galactopyranosyl-beta-D-glucopyranose",
    formula: "C₁₂H₂₂O₁₁",
    group: "다른 조합",
    stereochemicalForm: "β-D-Galp-(1→4)-β-D-Glcp",
    ringForm: "피라노스 2개 · 6원자 고리",
    conformation: "두 고리 모두 ⁴C₁ chair · 대표 conformer",
    linkageSummary: "β-D-Galp-(1→4)-D-Glcp · Gal(b1-4)Glc",
    notes: `${DISACCHARIDE_NOTE} 화면 구조에서는 환원 말단이 β형으로 고정되어 있습니다.`,
    description:
      "갈락토스와 포도당이 β(1→4)로 이어져 있습니다. 두 고리는 분자식이 같지만 C4의 입체배치가 서로 다릅니다. 포유류의 젖에 들어 있습니다.",
    observationQuestions: [
      "두 residue는 같은 단당류인가요?",
      "어느 residue의 어느 탄소들이 글리코시드 결합을 이루고 있나요?",
      "환원 말단은 어느 쪽인가요?",
    ],
    answer:
      "Gal A는 갈락토스, Glc B는 포도당입니다. 갈락토스의 C1과 포도당의 C4가 β(1→4)로 이어집니다. 포도당 쪽 C1–OH가 남아 있으므로 그쪽이 환원 말단입니다. 갈락토스와 포도당은 C4에서만 배치가 다른 에피머이므로 두 고리의 C4–OH 방향을 비교해 보세요.",
  }),
  make("SUC", "disaccharide", CCD, {
    name: "Sucrose",
    koreanName: "설탕 · 자당",
    canonicalName: "alpha-D-glucopyranosyl-(1↔2)-beta-D-fructofuranoside",
    formula: "C₁₂H₂₂O₁₁",
    group: "다른 조합",
    stereochemicalForm: "α-D-Glcp-(1→2)-β-D-Fruf",
    ringForm: "피라노스 1개 + 푸라노스 1개",
    conformation: "6원자 고리 ⁴C₁ + 5원자 고리 · 대표 conformer",
    linkageSummary: "α-D-Glcp-(1→2)-β-D-Fruf · Glc(a1-2b)Fruf",
    notes: `${DISACCHARIDE_NOTE} 두 아노머 탄소가 모두 결합에 참여하므로 환원 말단이 없고, 수용액에서 아노머가 바뀌는 변화도 일어나지 않습니다.`,
    description:
      "포도당의 C1과 과당의 C2가 서로의 아노머 탄소끼리 이어져 있습니다. 두 아노머 탄소가 모두 결합에 쓰였다는 점이 다른 이당류와 다릅니다.",
    observationQuestions: [
      "포도당과 과당에서 아노머 탄소는 각각 몇 번 탄소인가요?",
      "두 아노머 탄소가 모두 결합에 참여하면 어떤 결과가 생길까요?",
      "왜 설탕에는 환원 말단이 없을까요?",
    ],
    answer:
      "포도당의 아노머 탄소는 C1, 과당의 아노머 탄소는 C2입니다. 설탕에서는 이 두 탄소가 하나의 산소를 사이에 두고 직접 이어져 있어 자유로운 아노머 OH가 하나도 남지 않습니다. 그래서 설탕은 비환원당이고, 수용액에서 열린 사슬로 바뀌는 변화도 일어나지 않습니다. 표기할 때 포도당 쪽 α만 적으면 과당 쪽 β 정보가 사라지므로 α-D-Glcp-(1→2)-β-D-Fruf처럼 두 배치를 함께 적습니다.",
  }),
  make("AMYLOSE", "polysaccharide", BUILT, {
    name: "Amylose",
    koreanName: "아밀로스",
    canonicalName: "α(1→4)-D-glucan · 10 residue 대표 fragment",
    formula: "(C₆H₁₀O₅)ₙ",
    group: "녹말",
    stereochemicalForm: "α-D-Glcp-(1→4) 반복",
    ringForm: "피라노스 10개",
    conformation: "대표 fragment · 하나의 고정된 생체 구조가 아님",
    linkageSummary: "α-D-Glcp-(1→4)-α-D-Glcp × 9",
    notes: `${FRAGMENT_NOTE} 아밀로스는 가지가 거의 없는(essentially linear) 사슬로 다루지만, 가지가 전혀 없다고 단정하지는 않습니다.`,
    description:
      "녹말을 이루는 두 성분 중 하나입니다. 포도당이 α(1→4)로 계속 이어지고 가지는 거의 없습니다. 화면은 이 결합을 아홉 번 반복해 만든 대표 조각입니다.",
    observationQuestions: [
      "반복되는 결합은 어느 탄소와 어느 탄소 사이인가요?",
      "α(1→4)가 반복되면 사슬은 어떤 공간 배치를 보이나요?",
      "이 조각에서 환원 말단은 몇 개인가요?",
    ],
    answer:
      "모든 결합이 앞 residue의 C1과 다음 residue의 C4를 잇는 α(1→4)입니다. α 결합에서는 이어지는 고리의 방향이 조금씩 꺾이므로 사슬이 곧게 뻗지 않고 감깁니다. 이 조각에서는 residue 하나당 약 57°씩 돌아가 한 바퀴에 약 6개가 들어가는 나선이 됩니다. 다만 실제 아밀로스가 언제나 이 하나의 나선으로 고정되는 것은 아닙니다. 용액에서, 요오드와 결합할 때, 녹말 알갱이 안에서 서로 다른 형태를 가질 수 있습니다. 사슬 하나에 환원 말단은 하나뿐입니다.",
  }),
  make("AMYLOPECTIN", "polysaccharide", BUILT, {
    name: "Amylopectin",
    koreanName: "아밀로펙틴",
    canonicalName: "α(1→4)/α(1→6)-D-glucan · 12 residue 대표 fragment",
    formula: "(C₆H₁₀O₅)ₙ",
    group: "녹말",
    stereochemicalForm: "α-D-Glcp-(1→4) 사슬 + α-D-Glcp-(1→6) 가지",
    ringForm: "피라노스 12개",
    conformation: "대표 fragment · 가지 하나를 포함",
    linkageSummary: "α(1→4) × 10 + α(1→6) × 1",
    notes: `${FRAGMENT_NOTE} 이 조각의 가지 개수와 위치는 α(1→6) 결합을 관찰하기 위해 정한 것이며, 실제 아밀로펙틴의 평균 가지 빈도를 정량적으로 재현하지 않습니다.`,
    description:
      "녹말의 다른 성분입니다. α(1→4)로 이어진 사슬 중간에서 α(1→6) 결합이 새 사슬을 시작합니다. 녹말은 아밀로스와 아밀로펙틴이 함께 들어 있는 물질이지 하나의 고정된 분자가 아닙니다.",
    observationQuestions: [
      "α(1→4) 결합과 α(1→6) 결합을 각각 찾아보세요.",
      "가지가 시작되는 residue는 어느 것인가요?",
      "가지가 하나 생기면 사슬의 끝은 몇 개가 되나요?",
    ],
    answer:
      "대부분의 결합은 C1과 C4를 잇는 α(1→4)입니다. 가지는 어느 residue의 C6에 다른 사슬의 C1이 붙는 α(1→6) 결합에서 시작합니다. C6은 고리 밖 CH₂ 자리이므로 가지는 고리 바깥으로 뻗어 나갑니다. 가지가 하나 생기면 비환원 말단이 하나 늘어나고, 환원 말단은 분자 전체에 여전히 하나뿐입니다.",
  }),
  make("GLYCOGEN", "polysaccharide", BUILT, {
    name: "Glycogen",
    koreanName: "글리코젠",
    canonicalName: "α(1→4)/α(1→6)-D-glucan · 16 residue 대표 fragment",
    formula: "(C₆H₁₀O₅)ₙ",
    group: "저장 다당류",
    stereochemicalForm: "α-D-Glcp-(1→4) 사슬 + α-D-Glcp-(1→6) 가지 2곳",
    ringForm: "피라노스 16개",
    conformation: "대표 fragment · 가지 위의 가지를 포함",
    linkageSummary: "α(1→4) × 13 + α(1→6) × 2",
    notes: `${FRAGMENT_NOTE} 이 조각의 가지 개수와 간격은 가지 구조를 관찰하기 위해 정한 것이며, 실제 글리코젠의 가지 빈도를 정량적으로 재현하지 않습니다.`,
    description:
      "동물이 포도당을 저장하는 다당류입니다. 아밀로펙틴과 같은 α(1→4)와 α(1→6) 결합을 쓰지만 가지가 더 자주 나오고, 가지 위에서 다시 갈라지기도 합니다.",
    observationQuestions: [
      "사슬(backbone)과 가지가 시작되는 자리를 구분해 보세요.",
      "가지 위에서 다시 갈라지는 곳을 찾을 수 있나요?",
      "가지가 많은 구조가 포도당 저장과 사슬 끝의 개수에 어떤 영향을 줄지 추론해 보세요.",
    ],
    answer:
      "결합의 종류는 아밀로펙틴과 같습니다. 사슬은 α(1→4), 가지는 α(1→6)입니다. 이 조각에는 가지가 두 곳 있고 그중 하나는 다른 가지 위에서 다시 갈라집니다. 가지가 많을수록 비환원 말단이 많아지고, 말단에서 작용하는 효소가 동시에 붙을 수 있는 자리도 늘어납니다. 환원 말단은 분자 전체에 하나뿐입니다. 실제 글리코젠은 대략 8~12개 residue마다 가지가 하나 생긴다고 알려져 있지만, 화면 조각의 간격은 그 값을 재현한 것이 아닙니다.",
  }),
  make("CELLULOSE", "polysaccharide", BUILT, {
    name: "Cellulose",
    koreanName: "셀룰로스",
    canonicalName: "β(1→4)-D-glucan · 8 residue 대표 fragment",
    formula: "(C₆H₁₀O₅)ₙ",
    group: "구조 다당류",
    stereochemicalForm: "β-D-Glcp-(1→4) 반복",
    ringForm: "피라노스 8개",
    conformation: "대표 fragment · 이 모델에서 관찰되는 펴진 사슬",
    linkageSummary: "β-D-Glcp-(1→4)-β-D-Glcp × 7",
    notes: `${FRAGMENT_NOTE} 셀룰로스의 기계적 성질은 결합 하나가 아니라 사슬 사이의 수소 결합과 미세섬유 수준의 배열까지 함께 보아야 설명됩니다.`,
    description:
      "식물 세포벽의 구조를 만드는 다당류입니다. 아밀로스와 같은 포도당으로 이루어지지만 결합이 β(1→4)입니다.",
    observationQuestions: [
      "아밀로스와 셀룰로스는 모두 포도당 중합체인데 어떤 글리코시드 배치가 다른가요?",
      "β(1→4)가 반복된 이 조각은 α(1→4) 조각과 공간적으로 어떻게 다른가요?",
      "이웃한 residue의 고리는 서로 어떤 방향으로 놓여 있나요?",
    ],
    answer:
      "차이는 아노머 탄소의 배치 하나입니다. 아밀로스는 α(1→4), 셀룰로스는 β(1→4)입니다. β 결합에서는 이어지는 고리가 약 180°에 가깝게 뒤집히며 놓여, 이 조각에서는 residue 하나당 약 130° 회전과 약 4.9 Å 전진으로 거의 곧게 펴진 리본이 됩니다. 곧게 펴진 사슬은 서로 나란히 놓여 사슬 사이 수소 결합을 많이 만들 수 있습니다. 다만 셀룰로스의 강도는 이 결합 하나만으로 설명되지 않고, 사슬 사이 상호작용과 더 높은 차원의 배열까지 함께 보아야 합니다.",
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
  glycosidic: false,
  reducing: false,
  branch: false,
  spinning: false,
};
/** Ring substituent that carries the axial/equatorial label, per carbon. */
const AXIAL_SUBSTITUENT: Record<string, string> = {
  C1: "O1",
  C2: "O2",
  C3: "O3",
  C4: "O4",
  C5: "C6",
};
/** Cosine between the ring normal and the C–substituent bond; 1 is axial. */
const AXIAL_THRESHOLD = 0.85;
export function axialLabels(id: MoleculeId) {
  const cosines = structures[id].validation.axialNormalCosines;
  if (!cosines) return [];
  return Object.entries(cosines).map(([carbon, cosine]) => ({
    carbon,
    substituent: AXIAL_SUBSTITUENT[carbon],
    axial: cosine > AXIAL_THRESHOLD,
  }));
}
export function capabilitiesOf(id: MoleculeId): MoleculeCapabilities {
  const data = structures[id];
  return {
    axial: axialLabels(id).length > 0,
    glycosidic: data.glycosidicBonds.length > 0,
    // Sucrose has no reducing end at all, which is exactly what makes the
    // control worth showing there.
    reducing: data.residues.length > 1,
    branch: data.branchPoints.length > 0,
    multiResidue: data.residues.length > 1,
    crowded: data.residues.length > 2,
  };
}
/** "Glc A" — enough to tell one residue's C1 from another's. */
export const residueLabel = (r: StructureResidue) =>
  `${r.sugarLabel} ${r.id}`;
export const atomLabel = (
  residues: StructureResidue[],
  residueId: string | undefined,
  atomName: string,
) => {
  if (!residueId || residues.length < 2) return atomName;
  const residue = residues.find((r) => r.id === residueId);
  return residue ? `${residueLabel(residue)} · ${atomName}` : atomName;
};
export interface SidebarGroup {
  name: string;
  molecules: Carbohydrate[];
}
export interface SidebarSection {
  category: CarbohydrateCategory;
  label: string;
  count: number;
  groups: SidebarGroup[];
}
/** Sidebar structure, counts included, derived from the shipped data only. */
export function sidebarSections(
  list: Carbohydrate[] = carbohydrates,
): SidebarSection[] {
  const sections: SidebarSection[] = [];
  for (const category of categoryOrder) {
    const members = list.filter((m) => m.category === category);
    if (!members.length) continue;
    const groups: SidebarGroup[] = [];
    for (const molecule of members) {
      const existing = groups.find((g) => g.name === molecule.group);
      if (existing) existing.molecules.push(molecule);
      else groups.push({ name: molecule.group, molecules: [molecule] });
    }
    sections.push({
      category,
      label: CATEGORY_LABEL[category],
      count: members.length,
      groups,
    });
  }
  return sections;
}
export const moleculeIds = carbohydrates.map((m) => m.id);
export const NO_FOCUS: FocusState = { carbon: null, residue: null, bond: null };
