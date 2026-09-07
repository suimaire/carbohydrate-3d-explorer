# Carbohydrate 3D Explorer

한국 고등학교 1–2학년 수업용 탄수화물 입체구조 탐색기. React + TypeScript + Vite + 3Dmol.js. 백엔드 및 런타임 외부 구조 API 없음.

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

- 6종 단당류, 회전·확대·이동, 키보드 조작, 초기화, 자동 회전
- 공-막대/공간채움, H, 탄소 번호, OH, 아노머 탄소 강조
- α/β 포도당의 ⁴C₁ chair에 한정한 axial/equatorial 표시
- α/β, β-glucose/β-galactose, ribose/deoxyribose 비교; 양방향 카메라 동기화
- 한국어 질문과 접힌 해설, 포도당·갈락토스 Haworth–3D 탄소 연결
- 반응형, 키보드 포커스, reduced-motion 환경에서 기본 자동 회전 OFF
- 파일 로드 오류와 재시도; 오래된 로드 취소; 기존 뷰어 재사용

## 오프라인

모든 분자 SDF와 렌더링 라이브러리, 글꼴 대체 목록을 로컬에 포함합니다. 외부 CDN/API/웹폰트를 호출하지 않습니다. 배포본은 HTTPS 또는 localhost에서 첫 로드 후 앱과 6종 구조를 service worker로 저장합니다. 하단의 **오프라인 사용 준비 완료**를 확인한 다음 수업에 사용하세요. 첫 접속·최초 설치에는 연결이 필요하며, 브라우저가 저장 공간을 삭제하면 다시 접속해야 합니다. 출처 링크는 인터넷이 필요합니다. 개발 서버에서는 service worker를 등록하지 않습니다.

## GitHub Pages

`vite.config.ts`의 `base: './'`와 `import.meta.env.BASE_URL`을 사용하므로 `/repository-name/`에서도 JS/CSS/SDF/service worker 경로가 상대적으로 해석됩니다. `npm run build` 후 **dist 폴더 내용**을 Pages에 배포하세요. 별도 서버 라우팅은 없습니다. 이 저장소에는 GitHub 원격이나 자동 배포 workflow를 임의로 설정하지 않습니다. `.openai/hosting.json`은 선택적인 Sites 배포 메타데이터이며 Pages 실행에는 필요하지 않습니다.

## 분자 데이터 및 검증

상세: [SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md), [검사 결과 JSON](docs/structure-validation.json).

| 화면             | CCD | 표시 형태                |
| ---------------- | --- | ------------------------ |
| α-D-glucose      | GLC | α-D-glucopyranose, ⁴C₁   |
| β-D-glucose      | BGC | β-D-glucopyranose, ⁴C₁   |
| D-galactose      | GAL | β-D-galactopyranose, ⁴C₁ |
| D-fructose       | FRU | β-D-fructofuranose       |
| D-ribose         | BDR | β-D-ribofuranose         |
| 2-deoxy-D-ribose | 2DR | 2-deoxy-β-D-ribofuranose |

원본 CIF는 `public/molecules/`에 보존합니다. 생성 SDF, 원자 대응표, 출처 URL, 다운로드 날짜, SHA-256을 함께 관리합니다. RDKit으로 3D 좌표의 R/S를 독립적으로 계산하여 CCD 표기와 비교했고, 정렬·SDF 직렬화 후에도 다시 검사했습니다.

재취득은 일반 빌드와 분리됩니다:

```sh
npm run data:acquire
python -m pip install numpy rdkit
python scripts/prepare_molecules.py
npm test
```

검증 스크립트는 구조의 강체 회전·이동만 수행합니다. 분자를 추측 생성하거나 입체중심을 바꾸지 않습니다. RDKit/numpy는 개발 단계에서만 필요합니다.

## 주요 구조

- `src/data/carbohydrates.ts`: 분자별 한국어 내용과 typed 데이터
- `src/data/structure-metadata.json`: 실제 SDF 원자 순서와 생화학적 번호 대응
- `src/components/`: 뷰어, 선택기, 비교, 설명, 질문, Haworth, 도움말
- `src/lib/annotations.ts`, `viewSync.ts`: 구조 표시와 카메라 동기화
- `src/types/carbohydrate.ts`: 분류, 출처, 일반 atom/substituent/glycosidic annotation 확장 지점
- `scripts/`: 데이터 취득·검증, 배포본 오프라인 목록 생성
- `tests/`: 데이터·기하·동기화·표시·비동기 로드·수업 UI 자동 검사

## 검증 범위와 TODO

- 자동 검사와 TypeScript, production build를 수행했습니다. 결과는 `docs/VALIDATION.md`에 기록합니다.
- WebGL 실제 화면, 실기기 마우스/터치, 프로젝터와 태블릿의 라벨 겹침 여부는 수동 확인이 남아 있습니다. 테스트에서 뷰어 수명주기는 3Dmol mock으로 검증하며 GPU 렌더링 성공을 의미하지 않습니다.
- 자유 단당류의 ideal conformer입니다. 용액 평형, 에너지 계산, 고리 뒤집힘, furanose의 전체 pseudorotation 및 RNA/DNA 내 실제 pucker를 재현하지 않습니다.
- α/β를 axial/equatorial과 동일시하지 않습니다. 라벨은 해당 ⁴C₁ chair에 한정됩니다.
- Haworth는 GLC/BGC/GAL만 지원합니다. 나머지 5원자 고리의 2D 연계는 추후 확장입니다.
- 이당류·다당류 및 글리코시드 결합 강조 UI는 후속 범위입니다. 일반 주석 데이터 구조를 준비했습니다.
- WebMCP 분자 선택 도구는 지원 브라우저에서만 등록됩니다. 실제 WebMCP 실행 환경에서의 검증은 미실시입니다.
- 3Dmol 2.5.5 내부의 미사용 callback 문자열 평가 경로 때문에 빌드에서 direct-eval 경고 1건이 발생합니다. 앱은 문자열 callback이나 사용자 입력 실행을 사용하지 않습니다.

## 라이선스 / 출처

3Dmol.js는 BSD-3-Clause 라이선스입니다. 배포의 `THIRD_PARTY_NOTICES.txt`를 참조하세요. 분자 정보는 wwPDB Chemical Component Dictionary / RCSB PDB에서 제공하며 원본 데이터와 출처를 함께 보존합니다.
