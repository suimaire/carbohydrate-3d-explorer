# D-glucose 고리–사슬 전환 · 2026-09-29

## 범위와 과학적 의미

α-D-glucose(CCD GLC)와 β-D-glucose(CCD BGC)의 단일 보기에서만 제공한다.
14종 일반 구조와 기존 원본·SDF·metadata는 변경하지 않았다. 분자 라이브러리에
15번째 구조를 추가하지 않고 전환 모드의 끝 구조로 aldehydo-D-glucose를 사용한다.

고리형·사슬형 양 끝 구조는 검증된 대표 구조이다. 중간 장면은 구조 변화를
이해하기 위한 **교육용 보간**이며, 실제 수용액 반응 경로/속도, 전이상태,
분자 동역학 시뮬레이션 또는 양자화학 반응좌표가 아니다. 진행률과 재생 시간은
α/β/사슬형의 평형 조성이나 시간 비율을 뜻하지 않는다.

## 출처와 재현

- 고리형: 기존 `public/molecules/GLC.sdf`, `BGC.sdf`의 좌표를 그대로 사용.
  원본은 각각 [CCD GLC](https://www.rcsb.org/ligand/GLC),
  [CCD BGC](https://www.rcsb.org/ligand/BGC)의 ideal coordinates.
- 사슬형: [PubChem CID 107526](https://pubchem.ncbi.nlm.nih.gov/compound/107526),
  (2R,3S,4R,5R)-2,3,4,5,6-pentahydroxyhexanal / aldehydo-D-glucose.
- 정확한 다운로드 주소:
  `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/107526/SDF?record_type=3d`
- 취득: **2026-09-29T02:05:12.132Z**.
- 원본 바이트 SHA-256:
  `a2ca186d462d2762fa36429b6f3c1f8e0dfe63b1e5487d74916c98df82897e94`.
- 원본: `public/molecules/references/aldehydo-D-glucose-PubChem-CID107526.sdf`.
  식별자·URL·시각·해시는 같은 디렉터리의 `aldehydo-D-glucose-source.json`에 보존.
- PubChem 좌표 역시 계산된 대표 conformer이며 실험 반응 구조가 아니다.
  고리형은 기존 좌표와 정확히 일치하고, 사슬형에는 반사를 금지한 강체 Kabsch
  정렬만 적용한다. 원본 사슬형의 모든 원자쌍 거리를 독립 테스트로 대조한다.
- 브라우저와 빌드는 외부 구조 API를 호출하지 않는다. 전환 좌표와 metadata는
  `src/data/ring-chain.json`에 포함되어 기존 service worker의 JS 캐시와 함께 저장된다.

개발 단계에서만 다음을 실행한다. 첫 명령은 **원본을 다시 다운로드하여 교체**하므로
기존 보존본을 재현할 때는 실행하지 않는다.

```sh
npm run data:acquire:ring-chain
python scripts/prepare_ring_chain.py
```

두 번째 명령은 기존 준비 스크립트와 같이 numpy와 RDKit이 필요하다.
기존 `.pydeps`도 검색하며, 네트워크·좌표 임베딩·에너지 최소화 없이 보존본만 읽는다.
나머지 14종 준비 스크립트는 실행하거나 수정하지 않았다.
검증 수치는 [ring-chain-validation.json](ring-chain-validation.json)에 기록한다.

## 명시적 원자 대응

정규화 순서는 `C1,C2,C3,C4,C5,C6,O1,O2,O3,O4,O5,O6`.
렌더링 중 index 0–11과 이 생화학적 identity는 변하지 않는다.

| 이름 | CCD GLC/BGC SDF index (0-based) | PubChem 원본 SDF index (0-based) |
| --- | --- | --- |
| C1 | 0 | 11 |
| C2 | 1 | 9 |
| C3 | 2 | 7 |
| C4 | 3 | 6 |
| C5 | 4 | 8 |
| C6 | 5 | 10 |
| O1 | 6 | 5 |
| O2 | 7 | 3 |
| O3 | 8 | 1 |
| O4 | 9 | 0 |
| O5 | 10 | 2 |
| O6 | 11 | 4 |

CCD mapping은 기존 metadata의 이름에서 읽는다. PubChem mapping은 유일한
C=O 탄소에서 시작하여 탄소 사슬을 따라 번호를 부여하고 각 탄소의 산소를
찾아 생성한다. 인덱스가 우연히 같다고 가정하지 않는다. 실제 매핑, 정규화된
결합 그래프, 좌표와 출처는 각 endpoint에 저장한다.

RDKit에서 원본 stereo tag를 지우고 3D 좌표로 다시 판정한 사슬형 CIP는
C2 R / C3 S / C4 R / C5 R이며 C1은 비키랄이다. 고리형 C4의 CIP 문자 S와
차이가 나는 것은 고리화에 따른 우선순위 변화이므로 반전으로 판정하지 않는다.
경로에서는 이름으로 고정한 이웃 (이전 C, 다음 C, 해당 O)의 부호 있는 부피를
검사하여 실제 입체배치 반전 여부를 확인한다.

## 중간 장면 생성과 검사

1. 탄소 골격을 결합 길이·결합각·비틀림각으로 분해한다.
2. C1의 카보닐 방향 변화를 먼저 시작하고, 골격 비틀림을 펼치고, 산소 치환기
   방향을 조정하여 원본 사슬형에 도달한다. 반대 재생은 같은 경로를 거꾸로 따른다.
3. C2–C5의 산소는 일관된 부호의 반공간을 따라 움직인다. 각 단계는 smoothstep으로
   시작·정지하며, 중간 구조의 전체 방향은 reflection 없는 강체 정렬로 정한다.
4. α/β 각각 **121개 keyframe**을 저장한다. 브라우저에서는 인접 keyframe 사이만
   보간하며, 각 반경로에 ease-in/ease-out을 적용한다. 멀리 떨어진 두 endpoint를
   한 번에 Cartesian 선형 보간하는 방식이 아니다.
5. 각 경로의 인접 keyframe 구간을 11개씩 표본화한 **1,320개 장면**을 검사한다.
   별도의 Vitest는 α→α, α→β, β→α, β→β 네 경로를 각 2,001개 진행 위치에서 검사한다.

검사 기준: 모든 좌표 finite, 영구 연결 길이 1.15–1.65 Å, 심각한 비결합 충돌
기준 >1.25 Å, C2–C5 부호 유지와 절대 부피 >0.7 Å³, 인접 장면 변위 제한,
원본 endpoint 오차 <0.000001 Å. C1/O5는 결합이 끊어지고 접근하는 쌍이므로
일반 비결합 거리 집계에서 제외하지만 별도로 거리 >1.2 Å를 검사한다.

실측: 유지되는 연결의 길이 1.227–1.539 Å, 일반 비결합 최소 거리 약 2.050 Å,
입체중심의 최소 절대 부피 약 2.398 Å³. 두 경로 모두 부호 반전이 없다.
이는 심각한 기하학적 오류를 거르는 검사이며 에너지적으로 타당한 중간체라는
뜻은 아니다. 모든 가능한 부동소수점 입력을 증명한 것도 아니다.

C1은 사슬형에서 C2/O1/aldehydic H 세 이웃을 갖는다. **원본의 H까지 포함**한
평면성 검사를 통과하고 각도는 약 124.27°, 120.28°, 115.44°이다.
애니메이션에서는 H를 숨기므로 관찰되는 것은 C1–O1의 짧아짐과
C2–C1–O1 각도 변화, O5의 분리이다. 수소·용매·양성자 전달은 묘사하지 않는다.

## 렌더링, 결합과 수명주기

- 설치된 3Dmol **2.5.5**의 실제 `GLModel.ts`와 타입을 확인했다.
  이 버전에는 `syncAtomPositions()`가 없다.
- 일반 모델은 모드 진입 때 숨기고, 같은 GLViewer에 heavy atom 모델을 한 번 만든다.
  이 모델의 12개 AtomSpec 객체와 단일 frame 배열은 모드 전체에서 유지된다.
- 공개 `addFrame(atoms)` / `setFrame(0)`를 사용한다. 로컬 setFrame은 동기적으로
  같은 배열을 적용하고 모델 geometry를 무효화한 뒤 resolved Promise를 반환한다.
  프레임마다 viewer/model을 교체하거나 `clear()`, `zoomTo()`, `setView()`를
  호출하지 않는다. 모델 geometry 자체는 공개 API를 통해 다시 만들어진다.
- 결합 그래프는 좌표 계산과 별도로 전환한다. 경로의 opening parameter 0.06에서
  C1–O5 single을 제거하고 C1–O1 single을 double로 바꾼다. 닫힘은 역순이다.
  다른 11개 원자 연결은 고정한다. 이 시점은 교육용 선택이며 물리적 결합
  차수의 시간 변화를 뜻하지 않는다. 불투명도/굵기 fade는 구현하지 않았다.
- 라벨은 기존 annotation 색상/글꼴을 공유하고 공개 `setLabelStyle`로 위치를 바꾼다.
  기본 C/O 색은 유지한다. 탄소 번호와 C1/O1/O5 추적을 사용할 수 있다.
  H/OH/아노머 강조와 axial 표시는 이 모드에서 비활성화하고 일반 보기에서 복원한다.
- RAF의 timestamp 차이로 진행한다. 처음에는 정지 상태이며, 사슬형에서 항상
  멈춘다. 사용자가 α 또는 β를 선택해야 닫힘 경로가 생긴다. reduced-motion에서는
  재생을 시작하지 않고 슬라이더·장면 버튼으로 같은 내용을 볼 수 있다.
- 모드 종료/분자 변경/비교 진입/unmount 시 RAF를 취소하고 disposed guard로
  이미 대기 중인 callback을 무시한다. 라벨과 전용 모델을 제거하고 일반 모델을
  표시한다. 기존 AbortController/disposed 로딩 취소 설계는 그대로 유지한다.

## 검증 기록과 한계

사전 상태: main, 미커밋 변경 없음. 테스트 92개·타입 검사·빌드 통과.
최종 결과와 브라우저 점검은 [VALIDATION.md](VALIDATION.md)의 2026-09-29 항목 참조.
기존 MoleculeViewer 테스트의 비동기 spin assertion에는 waitFor를 추가하여
React effect 완료를 기다리도록 했으며, 검사 내용은 제거하거나 완화하지 않았다.

jsdom 테스트만으로 WebGL 픽셀 출력을 검증하지는 못한다. 별도로 로컬 Edge의
실제 WebGL(소프트웨어 렌더링)에서 재생 중 마우스 드래그·휠, 양쪽 closure,
pause/resume, reset, 키보드 scrub, 모드 종료, 분자 변경, 비교 진입을 확인했다.
390×844 모바일 에뮬레이션에서 가로 넘침 0, reduced motion에서 수동 이동도 확인했다.

실제 태블릿의 터치, 그래픽 드라이버별 성능, 교실 프로젝터·확대 배율은 별도 점검이
필요하다. 보는 각도에 따라 원자/결합이 가려지거나 탄소 번호 라벨이 겹칠 수 있다.
회전·확대 또는 추적/탄소 번호 끄기로 확인한다. 카메라 보존을 우선하므로 경로
진행에 맞춘 자동 확대나 시점 변경은 하지 않는다.

## 추가·수정 파일

| 구분 | 파일 |
| --- | --- |
| 전환 UI (추가) | `src/components/RingChainControls.tsx` |
| 경로와 렌더링 (추가) | `src/lib/ringChain.ts`, `src/lib/ringChainRenderer.ts` |
| 준비된 경로·metadata (추가) | `src/data/ring-chain.json` |
| 원본과 취득 기록 (추가) | `public/molecules/references/aldehydo-D-glucose-PubChem-CID107526.sdf`, `aldehydo-D-glucose-source.json` |
| 개발용 취득·검증 (추가) | `scripts/acquire-ring-chain.mjs`, `scripts/prepare_ring_chain.py` |
| 테스트 (추가) | `tests/ringChain.test.ts`, `tests/ringChainRenderer.test.ts`, `tests/ringChainUI.test.tsx` |
| 기존 UI 연결 (수정) | `src/App.tsx`, `src/components/ComparisonViewer.tsx`, `src/components/MoleculeViewer.tsx`, `src/components/ViewerControls.tsx` |
| 공통 라벨·스타일 (수정) | `src/lib/annotations.ts`, `src/styles/app.css` |
| 개발 설정·기존 테스트 (수정) | `package.json`, `tests/MoleculeViewer.test.tsx` |
| 문서 (추가) | `docs/RING_CHAIN_PLAN.md`, 본 문서, `docs/ring-chain-validation.json` |
| 문서 (수정) | `README.md`, `docs/SCIENTIFIC_VALIDATION.md`, `docs/VALIDATION.md` |

새 runtime dependency는 없다. branch 변경, commit, push, 배포는 하지 않았다.
