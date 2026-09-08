# Carbohydrate 3D Explorer

한국 고등학교 1–2학년 수업용 탄수화물 입체구조 탐색기. React + TypeScript + Vite + 3Dmol.js. 백엔드 및 런타임 외부 구조 API 없음.

단당류의 입체구조 → 글리코시드 결합 → 이당류 → 결합의 반복 → 다당류 → 가지와 사슬 모양의
순서로 이어지도록 구성했습니다.

## 실행

Node.js 22.12 이상(또는 Vite 8이 지원하는 최신 LTS)이 필요합니다. 이 폴더에서:

```sh
npm ci
npm run dev
```

터미널에 표시된 로컬 주소를 엽니다. 첫 설치 후에는 인터넷 없이 로컬 실행할 수 있습니다.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`dist/`가 완전한 정적 배포본입니다. `index.html` 더블클릭(file://) 대신 HTTP 정적 서버로 제공해야 합니다. 웹페이지에는 백엔드 서비스가 없습니다.

## 수업 기능

- 14종 구조: 단당류 6, 이당류 4, 다당류 대표 fragment 4
- 회전·확대·이동, 키보드 조작, 초기화, 자동 회전
- 공-막대/공간채움, H, 탄소 번호, OH, 아노머 탄소
- 잔기가 여럿인 구조에서는 탄소 번호를 `Glc A · C1`처럼 잔기와 함께 표시
- **글리코시드 결합**: 공여 아노머 탄소 → 글리코시드 산소 → 받는 탄소를 색과 관으로 강조.
  사슬 결합은 실선, 가지 결합은 점선 + 별도 표기로 구별(색에만 의존하지 않음)
- **환원 말단**: 자유 아노머 OH를 표시. 설탕처럼 없는 경우에는 두 아노머 탄소가 모두
  결합에 쓰였음을 표시
- **가지 결합**: 아밀로펙틴·글리코젠에서 α(1→6) 가지가 시작되는 잔기를 표시
- 다당류에서는 결합 구조 개념도(SVG)를 함께 제공. 원과 선을 누르면 3D가 강조됨
- 표시 옵션은 구조가 실제로 답할 수 있는 것만 노출(데이터 기반)
- α/β, β-glucose/β-galactose, ribose/deoxyribose, **맥아당/셀로비오스**,
  **아밀로스/셀룰로스**, **아밀로펙틴/글리코젠** 비교; 양방향 카메라 동기화
- ⁴C₁ chair가 검증된 구조에 한정한 axial/equatorial 표시
- 한국어 질문과 접힌 해설, 포도당·갈락토스 Haworth–3D 탄소 연결
- 반응형, 키보드 포커스, reduced-motion 환경에서 기본 자동 회전 OFF
- 파일 로드 오류와 재시도; 오래된 로드 취소; 기존 뷰어 재사용; 다당류 선택 시 H 표시 기본 OFF

## 다루는 구조

| 분류   | 화면                             | 구조 종류                        |
| ------ | -------------------------------- | -------------------------------- |
| 단당류 | α-D-glucose, β-D-glucose         | 자유 단당류 (CCD idealized 좌표) |
|        | D-galactose, D-fructose          |                                  |
|        | D-ribose, 2-deoxy-D-ribose       |                                  |
| 이당류 | Maltose · 맥아당 α(1→4)          | CCD 이당류 성분 (idealized 좌표) |
|        | Cellobiose · 셀로비오스 β(1→4)   |                                  |
|        | Lactose · 젖당 β(1→4)            |                                  |
|        | Sucrose · 설탕 α(1→2)β           |                                  |
| 다당류 | Amylose · 아밀로스               | **대표 fragment** (조립)         |
|        | Amylopectin · 아밀로펙틴         |                                  |
|        | Glycogen · 글리코젠              |                                  |
|        | Cellulose · 셀룰로스             |                                  |

> **다당류 모델을 읽는 법.** 화면의 다당류는 전체 고분자의 정확한 크기나 하나의 고정된 생체
> conformation을 재현한 것이 아닙니다. **글리코시드 결합과 사슬·가지 구조를 학습하기 위한
> representative fragment**입니다. 결합의 종류·위치·α/β 배치는 정확하지만, 사슬 길이와 가지
> 개수는 관찰을 위해 정한 값이며 실제 고분자의 평균 가지 빈도를 나타내지 않습니다.
> 자세한 내용은 [POLYSACCHARIDE_MODELING.md](docs/POLYSACCHARIDE_MODELING.md).

녹말은 아밀로스와 아밀로펙틴을 함께 포함하는 물질이므로 `STARCH`라는 단일 분자로 만들지
않고 두 성분을 각각 보여줍니다.

## 오프라인

모든 분자 SDF와 렌더링 라이브러리, 글꼴 대체 목록을 로컬에 포함합니다. 외부 CDN/API/웹폰트를 호출하지 않습니다. 배포본은 HTTPS 또는 localhost에서 첫 로드 후 앱과 14종 구조를 service worker로 저장합니다. 하단의 **오프라인 사용 준비 완료**를 확인한 다음 수업에 사용하세요. 첫 접속·최초 설치에는 연결이 필요하며, 브라우저가 저장 공간을 삭제하면 다시 접속해야 합니다. 출처 링크는 인터넷이 필요합니다. 개발 서버에서는 service worker를 등록하지 않습니다.

## GitHub Pages

`vite.config.ts`의 `base: '/carbohydrate-3d-explorer/'`와 `import.meta.env.BASE_URL`을 사용하므로 JS/CSS/SDF/service worker 경로가 모두 `https://suimaire.github.io/carbohydrate-3d-explorer/` 하위를 가리킵니다. `.github/workflows/deploy.yml`이 main/master push 시 `npm run build` 후 `dist`를 Pages에 배포합니다 (저장소 Settings → Pages → Source를 GitHub Actions로 설정해야 합니다). 별도 서버 라우팅은 없습니다. 이 저장소의 git remote나 branch 설정은 변경하지 않았습니다. `.openai/hosting.json`은 선택적인 Sites 배포 메타데이터이며 Pages 실행에는 필요하지 않습니다.

## 분자 데이터 및 검증

상세: [SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md),
[POLYSACCHARIDE_MODELING.md](docs/POLYSACCHARIDE_MODELING.md),
[검사 결과 JSON](docs/structure-validation.json).

| 화면             | 출처                        | 표시 형태                        |
| ---------------- | --------------------------- | -------------------------------- |
| α-D-glucose      | CCD `GLC`                   | α-D-glucopyranose, ⁴C₁           |
| β-D-glucose      | CCD `BGC`                   | β-D-glucopyranose, ⁴C₁           |
| D-galactose      | CCD `GAL`                   | β-D-galactopyranose, ⁴C₁         |
| D-fructose       | CCD `FRU`                   | β-D-fructofuranose               |
| D-ribose         | CCD `BDR`                   | β-D-ribofuranose                 |
| 2-deoxy-D-ribose | CCD `2DR`                   | 2-deoxy-β-D-ribofuranose         |
| Maltose          | CCD `MAL` (PubChem 439186)  | α-D-Glcp-(1→4)-α-D-Glcp          |
| Cellobiose       | CCD `CBI` (PubChem 439178)  | β-D-Glcp-(1→4)-β-D-Glcp          |
| Lactose          | CCD `LAT` (PubChem 440995)  | β-D-Galp-(1→4)-β-D-Glcp          |
| Sucrose          | CCD `SUC` (PubChem 5988)    | α-D-Glcp-(1→2)-β-D-Fruf          |
| Amylose          | CCD `GLC` 잔기 + PubChem 참조 | α(1→4) 10 residue fragment      |
| Amylopectin      | CCD `GLC` 잔기 + PubChem 참조 | α(1→4)+α(1→6) 12 residue fragment |
| Glycogen         | CCD `GLC` 잔기 + PubChem 참조 | α(1→4)+α(1→6) 16 residue fragment |
| Cellulose        | CCD `BGC` 잔기 + PubChem 참조 | β(1→4) 8 residue fragment       |

CCD의 좌표는 사전이 화합물의 화학적 기술로부터 **계산해 만든 idealized coordinates**입니다.
실험적으로 측정된 conformation이 아니며, 이 프로젝트는 CCD를 화학적 동정과 입체배치의
출처로 사용하고 그 좌표를 실제 생체 conformation으로 해석하지 않습니다.

원본 CIF와 참조 conformer는 `public/molecules/`에 보존합니다. 생성 SDF, 잔기별 원자 대응표,
출처 URL, 다운로드 날짜, SHA-256을 함께 관리합니다. RDKit으로 3D 좌표에서 R/S를 독립적으로
계산해 CCD 표기와 대조했고, α/β는 CIP 문자 대신 **아노머 탄소에서 계산한 부호 있는 부피**로
판정합니다(글리코시드 결합이 생기면 CIP 우선순위가 바뀌기 때문). 정렬·SDF 직렬화 후에도
다시 검사합니다.

다당류 fragment의 모든 글리코시드 junction은 공개된 참조 이당류 conformer에서 **측정한**
결합 길이·각·이면각을 그대로 재현하며, 눈대중으로 정한 값은 없습니다. 조립 후 잔기의
입체배치, 결합 연결, junction 기하, 겹침을 독립적으로 검사합니다.

재취득은 일반 빌드와 분리됩니다:

```sh
npm run data:acquire
python -m pip install --target .pydeps numpy rdkit
python scripts/prepare_molecules.py
npm test
```

검증 스크립트는 공개 구조의 강체 회전·이동만 수행합니다. 단당류·이당류는 좌표를 전혀 만들지
않습니다. 다당류 fragment는 검증된 잔기를 강체로 배치해 조립하며, 수소 위치만 무거운 원자를
고정한 채 MMFF94s로 이완합니다(무거운 원자 이동 ≤ 0.0003 Å). RDKit/numpy는 개발 단계에서만
필요합니다.

## 주요 구조

- `src/data/carbohydrates.ts`: 분자별 한국어 내용, 분류·그룹, 표시 기능(capability) 계산
- `src/data/structure-metadata.json`: 실제 SDF 원자 순서, 잔기별 원자 대응, 글리코시드 결합,
  환원 말단, 가지 지점, 출처와 검증 결과
- `src/types/carbohydrate.ts`: 잔기·글리코시드 결합·가지·표시 기능의 typed 모델
- `src/components/`: 뷰어, 선택기, 비교, 설명, 질문, Haworth, 결합 구조 개념도, 도움말
- `src/lib/annotations.ts`, `viewSync.ts`: 구조 표시와 카메라 동기화
- `scripts/glycans.py`: 이당류 검증과 다당류 fragment 조립
- `scripts/`: 데이터 취득·검증, 배포본 오프라인 목록 생성
- `tests/`: 데이터·기하·글리코시드 결합·동기화·표시·비동기 로드·수업 UI 자동 검사

## 검증 범위와 TODO

- 자동 검사와 TypeScript, production build를 수행했습니다. 결과는 `docs/VALIDATION.md`에 기록합니다.
- WebGL 실제 화면, 실기기 마우스/터치, 프로젝터와 태블릿의 라벨 겹침 여부는 수동 확인이 남아 있습니다. 테스트에서 뷰어 수명주기는 3Dmol mock으로 검증하며 GPU 렌더링 성공을 의미하지 않습니다.
- 단당류·이당류는 자유 분자의 idealized 대표 conformer입니다. 용액 평형, 에너지 계산, 고리 뒤집힘,
  글리코시드 결합 주위의 회전, furanose의 전체 pseudorotation을 재현하지 않습니다.
- 다당류는 대표 fragment입니다. 실제 길이·가지 빈도·고차 구조를 재현하지 않습니다.
  아밀로스는 "가지가 거의 없다"로 다루며 "가지가 전혀 없다"로 단정하지 않습니다.
- α/β를 axial/equatorial과 동일시하지 않습니다. 라벨은 검증된 ⁴C₁ chair에 한정됩니다.
- 설탕의 결합은 α(1→2)로만 적지 않고 과당 쪽 β까지 함께 표기합니다.
- Haworth는 GLC/BGC/GAL만 지원합니다. 나머지 고리의 2D 연계는 추후 확장입니다.
- WebMCP 분자 선택 도구는 지원 브라우저에서만 등록됩니다. 실제 WebMCP 실행 환경에서의 검증은 미실시입니다.
- 3Dmol 2.5.5 내부의 미사용 callback 문자열 평가 경로 때문에 빌드에서 direct-eval 경고 1건이 발생합니다. 앱은 문자열 callback이나 사용자 입력 실행을 사용하지 않습니다.

## 라이선스 / 출처

3Dmol.js는 BSD-3-Clause 라이선스입니다. 배포의 `THIRD_PARTY_NOTICES.txt`를 참조하세요. 분자 정보는 wwPDB Chemical Component Dictionary / RCSB PDB와 PubChem에서 제공하며 원본 데이터와 출처를 함께 보존합니다.
