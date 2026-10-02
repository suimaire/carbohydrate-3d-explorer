# 검증 결과 · 2026-09-09 (단당류 부분은 2026-09-07)

## 자동 검사

- Vitest: 7개 파일, **92개 테스트 통과**. (이당류·다당류 추가 전 기준선은 6개 파일 28개 테스트였고,
  기존 테스트는 새 데이터 모델에 맞게 일반화했을 뿐 축소하지 않았습니다.)
- TypeScript: `npm run typecheck` 통과, 오류 0건.
- `npm run build`: 성공. 정적 JS/CSS/14종 SDF 및 오프라인 service worker 생성.
- `node scripts/check-build.mjs`: 상대경로, metadata에 등록된 14종 SDF 존재, 오프라인 필수 파일
  목록, 참조 conformer가 precache에 섞이지 않았는지 검사 통과.
- RDKit 2026.03.6: 단당류 6종 + 이당류 4종의 모든 입체중심을 3D 좌표에서 판정하여 CCD 표기와
  일치 확인. 정렬 후 SDF round-trip에서도 일치. 다당류 fragment 4종은 잔기별 고리 입체중심의
  부호 있는 부피와 아노머 배치를 템플릿과 대조, 직렬화 후 재확인.
- 실제 3Dmol 2.5.5 SDF 파서: 14종의 원자 순서, 명시적 H, 좌표, 원자가/결합수 유지 확인.

## 테스트가 확인한 동작

| 영역        | 확인 내용                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------- |
| 데이터      | MoleculeId 유일성, 구조 파일 존재, 분류 유효성, 파일 SHA-256, 분자식, 원자가, 고리 수와 결합 수 관계 |
| 잔기        | 잔기 원자 대응의 완전성·중복 없음, 고리가 실제 결합 그래프에서 닫힌 순환인지, 아노머 탄소의 두 O 이웃 |
| 입체화학    | C1 anomer, C4 epimer, C2 deoxy, ⁴C₁ 기하, glucose 고리 정렬, 잔기별 α/β                             |
| 글리코시드  | 공여/다리/수용 원자가 실제 결합과 일치, 다리 산소가 고리 밖 O이며 두 탄소와만 결합, 표기와 배치 일치 |
| 이당류      | MAL α(1→4), CBI β(1→4), LAT β(1→4) Gal→Glc, SUC glucose C1 ↔ fructose C2 및 환원 말단 없음          |
| 다당류      | 결합 구성(아밀로스 α1→4 ×9, 셀룰로스 β1→4 ×7, 아밀로펙틴 α1→6 ≥1, 글리코젠 α1→6 ≥2), 가지 지점 일치 |
| fragment    | 조립 기록 존재, junction 길이·각이 정상 범위, 인접하지 않은 잔기 최소 거리 > 2.6 Å                   |
| 주석        | fructose C2, α/β 치환기 라벨, OH/고리 O 구별, H 숨김, 공간채움, Haworth 선택                        |
| 다중 잔기   | 잔기별 탄소 라벨(`Glc A · C1`), 결합 종류별 대표 라벨 1개, 선택 시 상세 라벨, 가지=점선, 라벨 상한   |
| 환원 말단   | 이당류 3종의 자유 아노머 OH 표시, 설탕은 "결합에 참여" 표시                                          |
| 표시 기능   | 구조가 답할 수 있는 컨트롤만 노출(단당류에 결합 버튼 없음, 이당류에 axial 없음 등)                   |
| 개념도      | fragment 자체 위상 렌더링, 잔기·결합 클릭/키보드, 잔기 3개 미만이면 렌더링 안 함                     |
| 비교        | 6개 비교쌍, 양방향 카메라 전달, 순환 호출 방지, OFF 후 연결 해제, 다당류 쌍에서 개념도 2개           |
| 로드        | 정적 경로, 초기 회전 OFF, 정리, 실패/재시도, 전환 시 WebGL 뷰어 재사용, 오래된 응답 무시             |
| 앱 통합     | 사이드바 선택 → 컨트롤 변화, 결합 선택 → 강조 자동 ON, 다당류 선택 시 H 기본 OFF(재선택 가능)        |
| 수업 UI     | 해설 기본 숨김/펼침/접기, Haworth click/keyboard, 사이드바 개수 계산                                 |

## 브라우저 확인 (2026-09-09)

`npm run build` 후 `vite preview`(127.0.0.1)에서 실제 WebGL 렌더링을 확인했습니다.

- β-D-glucose 초기 화면, 회전(드래그), 사이드바 3개 분류와 개수 표시.
- Maltose: 두 고리 렌더링, [글리코시드 결합] → 파란 관 + `α(1→4)` / `Glc A · C1` / `Glc B · C4`,
  [환원 말단] → 초록 `환원 말단 · Glc B C1–OH`.
- Sucrose: 두 아노머 탄소가 모두 `결합에 참여`로 표시되고 환원 말단 라벨이 나오지 않음.
- Amylopectin: 12 residue 렌더링, 사슬 결합(파란 실선)과 가지 결합(보라 점선) 구별, 결합 목록
  11개, 개념도에서 backbone 8 + 가지 4가 위층으로 배치됨.
- 비교 모드: 맥아당/셀로비오스가 환원 말단 고리를 같은 자리에 맞추고 두 번째 고리 방향만
  다르게 보임. 아밀로스/셀룰로스에서 감기는 사슬과 펴진 사슬 차이 확인. 아밀로펙틴/글리코젠
  양쪽 3D + 개념도 2개. 카메라 동기화 동작.
- 375×812 모바일 폭에서 사이드바가 가로 스크롤로 바뀌고 분류 구분선이 유지됨.

## 검증의 한계

3Dmol 파서 테스트는 실제 라이브러리를 사용합니다. 렌더러 수명주기/주석 테스트는 mock을, 수업
UI 테스트는 jsdom을 사용합니다. 위 브라우저 확인은 데스크톱 폭과 모바일 에뮬레이션에서
수행했으며, 실기기의 마우스/터치 제스처, 200% 화면 확대, 프로젝터·태블릿에서의 라벨 겹침은
여전히 실기기 검증이 남아 있습니다.

**오프라인 설치는 이번에도 실제 브라우저에서 확인하지 못했습니다.** 사용한 내장 브라우저가
service worker 등록을 차단합니다(스크립트는 HTTP 200으로 내려오고 secure context이지만
`register()`가 "An unknown error occurred when fetching the script"로 실패). 오프라인 파일
목록과 경로는 `scripts/check-build.mjs`로 정적 검사했습니다. 실제 설치·업데이트·연결 차단
동작은 배포 후 일반 브라우저에서 확인이 필요합니다. 이 코드 경로(`OfflineStatus.tsx`,
`generate-offline.mjs`)는 이번 작업에서 로직을 바꾸지 않았습니다.

WebMCP는 미지원 브라우저에서 조용히 생략합니다. 이 환경에는 실제 WebMCP 도구 실행을 검증할 수
있는 연결이 없어 해당 계약의 실환경 실행은 확인하지 않았습니다.

빌드 중 3Dmol의 callback 문자열 평가 기능에서 direct-eval 경고 1건이 발생합니다. 앱은 해당
문자열 callback 기능을 호출하지 않으며 빌드는 성공합니다.

과학적으로 검증하지 **못한** 것: 용액 중 아노머/conformer 분포, 글리코시드 결합 주위 회전의
에너지, 다당류의 실제 사슬 길이·가지 빈도·고차 구조. 이들은 화면과 문서에서 모두 "대표
conformer / 대표 fragment"로 명시합니다. CCD `CBI`/`LAT`의 idealized 좌표에 결합 그래프상
5 결합 떨어진 O5···O3 비결합 접촉이 2.13 Å로 측정된다는 점도 그대로 기록했습니다(일반적인
O···O 거리 기준값과의 비교는 근거를 댈 수 없어 문서에서 제외했습니다).

## 수업 전 실기기 점검 제안

1. β 포도당이 정상 렌더링되고 회전·확대·초기화가 되는지 확인합니다.
2. α/β 비교와 회전 동기화 ON/OFF를 양쪽에서 확인합니다.
3. 맥아당에서 [글리코시드 결합]·[환원 말단] 라벨이 프로젝터에서 읽히는지 확인합니다.
4. 글리코젠(가장 큰 구조, 339원자)에서 회전과 자동 회전이 매끄러운지 확인합니다.
5. 14종을 전환하고 표시 옵션이 구조에 따라 바뀌는지 확인합니다.
6. 태블릿 두 손가락 확대와 화면 회전을 확인합니다.
7. 배포본의 '오프라인 사용 준비 완료' 후 연결을 끊고 새로고침 및 14종 전환을 확인합니다.

## 2026-09-29 · D-glucose 고리–사슬 전환 추가

- 사전 상태: main, 미커밋 변경 없음. 수정 전 92개 테스트 / 타입 검사 / 빌드 통과.
- 최종 `npm test`: **10개 파일, 113개 테스트 통과** (기존 92개 + 신규 21개).
- `npm run typecheck`: 통과.
- `npm run build`: 통과. 기존 3Dmol 내부 direct-eval 경고만 유지.
- `node scripts/check-build.mjs`: 통과. 기존 14종 SDF와 18개 필수 리소스 캐시.
- numpy + RDKit 준비 스크립트: 보존한 PubChem 3D 원본의 분자식, 무고리 그래프,
  C2 R/C3 S/C4 R/C5 R, C1 carbonyl의 평면성 검사 통과.
- 신규 테스트: 명시적 atom mapping, source hash/강체 정렬, 12원자 identity,
  양 endpoint와 네 α/β 경로, bond order, finite/충돌/결합길이/입체배치/연속성,
  고리 C1 사면체와 사슬 C1 평면성, 실제 3Dmol 단일 frame/동일 원자 객체,
  카메라 비변경, RAF 취소/늦은 callback, 모드 종료/분자 변경/비교/unmount,
  H 설정 복원, reduced-motion 및 수동 장면 이동.
- 기존 MoleculeViewer 테스트의 spin assertion만 effect 완료를 기다리도록
  `waitFor`로 감쌌다. 원래 assertion은 그대로이며 테스트를 삭제하거나 완화하지 않았다.

실제 로컬 Edge / WebGL (headless, SwiftShader)에서 다음을 확인했다:
α 진입, 재생 중 drag/wheel, pause/resume, 사슬형 도착 후 정지, α/β 각각 closure,
β 진입, 키보드 slider, reset, mode exit, 분자 변경, 비교 모드 진입.
브라우저 page error 0건. 390×844 모바일 에뮬레이션 가로 overflow 0px,
reduced-motion에서 재생 비활성화와 수동 장면 이동 확인.

jsdom/파서 테스트만으로 WebGL 표시를 증명하지 않는다. 별도 브라우저 화면을 확인했지만
실제 태블릿 터치·GPU 드라이버·프로젝터 가독성·여러 각도의 라벨 겹침은 실기기 점검이
남는다. 탄소 번호를 모두 켜면 일부 시점에서 라벨이 겹칠 수 있다.
새 데이터의 출처·허용 오차·교육용 보간의 한계는
[RING_CHAIN_INTERCONVERSION.md](RING_CHAIN_INTERCONVERSION.md)에 기록했다.

오프라인 실브라우저 추가 검사: 일반 정적 HTTP 서버에서 배포본을 최초 캐시한 뒤
브라우저 네트워크를 차단하고 새로고침했다. 앱 재시작, α glucose 로드 및 사슬형
전환 모두 통과했으며 PubChem/RCSB 런타임 요청은 0건이었다.
2026-09-09의 오프라인 미확인 기록은 당시 환경의 기록이며 이번 검증과 구분한다.

환경별 차이: 기본 Vite preview에서는 `Vary: Origin` 응답 헤더가 있었고,
18개 리소스가 CacheStorage에 있어도 연결 차단 후 JS/CSS 요청이 실패했다.
동일한 dist를 Origin별 Vary가 없는 일반 정적 서버에서 제공하면 통과했다.
기존 service worker와 생성 스크립트는 수정하지 않았다. 배포 서버의 헤더를 포함한
실제 서비스 환경에서 설치·업데이트·연결 차단을 다시 확인하는 것이 좋다.

## 2026-10-03 · 2D 구조식 참조 UI

### 배치 조사와 결정

수정 전 공개 페이지와 로컬 앱을 1600×1000, 1366×768, 1024×900, 768×1024,
390×844에서 확인했다. 큰 화면은 선택기 / 3D / 설명의 3열이며 보기 설정은 아래쪽에
있었다. 기존 Haworth는 GLC/BGC/GAL에서 설명 패널의 학습 질문 아래에, 다당류 개념도도
설명 아래에 있어 3D와 동시에 읽기 어려웠다. 1024/768px에서는 긴 선택기 때문에 3D
영역까지 약 1833px로 늘어나는 현상도 확인했다.

검토한 후보는 canvas 모서리 카드, 설명 패널 상단, 3D 옆 별도 열, 3D 바로 아래 영역이다.
canvas 카드는 회전·라벨 영역과 경쟁하고, 설명 패널은 좁은 화면에서 멀어지며, 별도 열은
비교 화면의 관찰 폭을 줄인다. 따라서 **각 3D pane 바로 아래, canvas 바깥의 참조 영역**을
선택했다. 분자 이름 → 3D → 2D 순서이며, 확대 창에서 세부 표기를 읽을 수 있다.

| 화면 | 적용한 배치 |
| --- | --- |
| 1600 / 1366px | 기존 3열 유지. 참조 영역 높이 282px, 넓은 단당류 영역은 그림·설명을 나란히 표시 |
| 1024px | 왼쪽 선택기 유지, 설명은 아래. 선택기 길이가 3D 높이를 늘리지 않도록 제한 |
| 768px | 선택기를 가로로 배치해 관찰 폭 확보. 비교는 두 pane을 나란히 유지 |
| 390px | 3D → 해당 2D 순서. 비교 pane은 세로로 쌓음. 확대된 이당류·다당류는 창 안에서 가로 스크롤 |

분자식 `.formula`, 보기 설정, 질문, 출처는 유지했다. 참조 영역은 SVG와 텍스트로만 구성하며
새 런타임 API, CDN, 이미지, 패키지 의존성을 추가하지 않았다. 고리·사슬 전환 중에는 고정
Haworth를 숨기고 일반 모드로 돌아오면 복원한다. 초기 3D 확대율은 짧아진 canvas에서
공간채움 모형과 라벨의 여백을 확보하도록 조정했다.

### 분자 표현과 과학 검사

- 단당류 6종: 실제 데이터의 α/β, pyranose/furanose, D 배치, OH, CH₂OH와 탄소 번호를 표시.
  FRU는 β-D-fructofuranose, BDR/2DR은 β-D-ribofuranose 계열이다. 2DR의 C2는 H 두 개로 표시한다.
- 이당류 4종: 두 잔기와 하나의 공유 결합 산소를 표시한다. 연결된 자리에는 자유 OH를 그리지
  않는다. MAL α(1→4), CBI/LAT β(1→4), SUC **α(1→2)β**를 유지한다.
- SUC의 과당을 포도당 쪽으로 돌려 그릴 때 x 방향과 고리 면 위/아래를 함께 뒤집는다.
  좌우만 반사해 반대 입체배치를 만들지 않는지 signed-volume 검사로 확인했다.
- MAL의 자유 환원 말단은 현재 대표 구조에서 α, CBI/LAT는 β이다. SUC는 환원 말단이 없다.
  이에 따라 “맥아당·셀로비오스는 한 아노머 탄소만 다르다”는 기존 설명도 정확히 고쳤다.
- 다당류 4종: 기존 PolymerSchematic의 실제 fragment 위상을 재사용한다. 반복 결합,
  α(1→6) 가지(C1–O–C6), 가지 지점, 환원 말단을 표시한다. 전체 크기·실제 가지 빈도를
  뜻하지 않는다는 설명을 함께 제공한다.
- `tests/structureFormula.test.ts`는 모든 14종의 각 잔기에 대해, 실제 SDF 좌표에서 계산한
  부호 있는 부피와 Haworth를 평면에서 복원한 입체배치를 대조한다. 정상 방향과 뒤집어 배치한
  방향을 모두 검사한다. 단당류·이당류 10종은 그림의 전체 무거운 원자 연결 그래프를 SDF와
  대조한다. 기존 데이터 검사와 합쳐 고리 크기, 연결, 번호, 아노머, 환원 말단, 가지를 확인한다.
- 위/아래는 고리 면 기준이며 axial/equatorial과 다르다. Haworth는 실제 고리 접힘이나 두 고리
  사이의 각도를 그대로 재현하는 그림이 아니다.

### 코드 및 테스트

| 파일 | 변경 |
| --- | --- |
| `src/components/StructureFormulaPreview.tsx` | 분자별 참조, 확대 dialog, focus 연결, 환원 말단·fragment 설명 |
| `src/lib/structureFormula.ts` | 고리·치환기 모델, 연결 자리 판정, 입체배치를 보존하는 투영 좌표 |
| `src/components/HaworthPreview.tsx` | 기존 컴포넌트를 단당류·이당류 전체로 일반화; 잔기별 탄소·결합 선택 |
| `src/components/PolymerSchematic.tsx` | compact/읽기 전용 지원, 결합 선택의 실제 키보드 포커스 영역 개선 |
| `src/components/ComparisonViewer.tsx`, `src/App.tsx` | pane별 참조 및 분자별 focus 분리, 비교 설명 수정 |
| `src/components/MoleculeInfo.tsx` | 중복 Haworth·다당류 그림 제거, 기존 분자식 유지 |
| `src/components/MoleculeViewer.tsx`, `src/styles/app.css` | 3D 여백, 참조·확대 창과 반응형 배치 |
| `src/data/carbohydrates.ts` | 셀로비오스 비교 설명 정확성 수정 |
| `tests/structureFormula.test.ts`, `tests/structureFormulaUI.test.tsx` | 독립적인 연결·입체 검사, 14종 렌더링, 키보드·확대·접근성 |
| `tests/app.test.tsx`, `tests/annotations.test.ts`, `tests/ringChainUI.test.tsx` | focus 범위·잔기별 3D 대응·전환 모드의 참조 숨김/복원 |
| `README.md`, `docs/VALIDATION.md`, `docs/structure-formula-screenshots/`, `docs/structure-formula-ui-validation.json` | 사용·검증 기록과 화면 증거 |

수정 전 **10개 파일 / 113개 테스트**를 실행해 통과했다. 최종 **12개 파일 / 159개 테스트**로,
신규 46개(입체·연결 25, 참조 UI 18, 앱 통합 2, 주석 1)가 추가되었다. 기존 검사는 유지했고
고리·사슬 검사에는 참조 숨김/복원 assertion을 추가했다.

| 최종 명령 | 결과 |
| --- | --- |
| `npm test` | 159 / 159 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 성공, 18개 필수 리소스의 offline cache 생성 |
| `node scripts/check-build.mjs` | 14종 SDF, 배포 경로, 오프라인 목록 검사 통과 |
| `git diff --check` | 통과 |

기존 3Dmol 내부 direct-eval 경고 1건은 유지된다. 패키지나 lockfile 변경은 없다.

### 실제 브라우저 확인과 캡처

Codex 내장 Chromium/WebGL에서 다섯 viewport 각각에 대해 다음 10개 화면을 순회했다.
일반 BGC, FRU, MAL, SUC, AMYLOPECTIN, CELLULOSE / 비교 anomer, linkage, glucan /
고리·사슬 전환의 사슬형. 총 50개 조합을 캡처하고 실제 DOM 경계를 검사했다.
추가로 BDR/2DR 및 확대 창을 직접 확인했다.

- 페이지 가로 overflow 없음. 참조와 canvas의 영역 겹침 없음. SVG와 설명의 영역 겹침 없음.
  캡처 시 3D 로드/오류 메시지 없음. 일반 참조 1개, 비교 2개, 전환 중 0개.
- 분자 전환 시 잔기·그림·설명이 함께 바뀌고 이전 비교 그림이 남지 않는다. 3D 로드를 기다리는
  동안에도 참조 영역은 유지된다. 오른쪽 설명에 중복 도식이 없어 본문 길이가 줄었다.
- 마우스 drag, wheel 확대/축소, 초기화, 자동 회전, 공-막대/공간채움, H, 탄소 번호, OH,
  아노머 탄소, axial/equatorial, 글리코시드·환원 말단·가지 강조를 실제 화면에서 확인했다.
- α/β 비교에서 왼쪽→오른쪽과 오른쪽→왼쪽 회전 동기화, OFF에서 독립 회전을 확인했다.
- 2D C1 Enter/Space 선택·해제, SUC의 Fru B C2 대응, 결합 Enter, 다당류 잔기/가지 결합
  선택을 확인했다. 확대 창 Escape 후 원래 버튼으로 포커스가 돌아오는 것도 확인했다.
- 사슬형 도착 시 α/β 구분 없음, α와 β 각각으로 닫기, 일반 모드 복귀를 확인했다.
  reduced-motion 동작은 기존 자동 검사로 확인하며 실기기 설정 변경은 하지 않았다.

원본 캡처: [structure-formula-screenshots](structure-formula-screenshots/).
이름 규칙: `before-{width}.jpg`, `after-{width}-{molecule-or-mode}.jpg`.
측정값: [structure-formula-ui-validation.json](structure-formula-ui-validation.json).
viewport 캡처는 3D와 2D가 함께 보이는 스크롤 위치에서 저장했으며 모바일 비교의 두 번째
pane은 아래로 스크롤해 보는 구성이다.

| 예시 | 수정 전 | 수정 후 |
| --- | --- | --- |
| 넓은 화면 | [1600](structure-formula-screenshots/before-1600.jpg) | [BGC](structure-formula-screenshots/after-1600-BGC.jpg), [α/β 비교](structure-formula-screenshots/after-1600-compare-anomer.jpg) |
| 노트북 | [1366](structure-formula-screenshots/before-1366.jpg) | [SUC](structure-formula-screenshots/after-1366-SUC.jpg) |
| 태블릿 | [1024](structure-formula-screenshots/before-1024.jpg), [768](structure-formula-screenshots/before-768.jpg) | [1024 SUC](structure-formula-screenshots/after-1024-SUC.jpg), [768 결합 비교](structure-formula-screenshots/after-768-compare-linkage.jpg) |
| 모바일 | [390](structure-formula-screenshots/before-390.jpg) | [BGC](structure-formula-screenshots/after-390-BGC.jpg), [SUC](structure-formula-screenshots/after-390-SUC.jpg) |

### 오프라인 확인

최초 저장 뒤 일반 정적 HTTP 서버(127.0.0.1:4187, Origin별 Vary 없음)를 실제로 중단했다.
별도 HTTP 요청 실패를 확인한 상태에서 브라우저를 새로고침하고 14종 모두 전환했다.
각 3D/2D가 로드되며 로드 오류가 없었다. 마지막 여백·키보드 수정 후 빌드도 다시 저장하고,
화면의 script 경로가 `index-CaGSceYB.js`로 바뀐 것을 확인한 다음 서버를 다시 중단했다.
최종 배포본 재시작, SUC, AMYLOPECTIN, BGC 및 사슬형 전환도 통과했다.
이는 앱 원본 서버를 사용할 수 없는 상황의 검증이며, 운영 배포 서버의 헤더·브라우저별
캐시 보존 정책 전체를 검증한 것은 아니다.

### 남은 한계

실기기 터치 회전·pinch, 프로젝터, 여러 GPU/브라우저에서의 검증은 남아 있다. canvas의
기존 `touch-action: none`과 3Dmol 이벤트 처리는 유지했고 참조를 그 영역 밖에 배치했다.
여러 3D 라벨을 동시에 켜면 일부 시점에서 겹칠 수 있다. 작은 화면의 이당류 세부 표기는
확대 창에서 읽을 수 있다. Haworth는 투영, 다당류는 대표 fragment의 연결도이며 실제
conformation/평형·고분자 전체 크기를 재현하지 않는다. commit/push/배포는 수행하지 않았다.
