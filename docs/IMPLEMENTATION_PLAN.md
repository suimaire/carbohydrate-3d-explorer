# 구현 계획

2026-09-07: 상위 작업 폴더는 Git 저장소가 아니며 대상 폴더는 비어 있음. 기존 다른 프로젝트와 수업 자료 보존.

1. Vite + React + TypeScript + 3Dmol.js. 백엔드와 런타임 외부 API 없음. base='./'.
2. wwPDB CCD / RCSB의 원자 이름, 결합, ideal 좌표를 다운로드. 원본 CIF 보존, SDF와 원자 대응표 생성.
3. 분자식, 결합, 각 탄소 CIP, α/β 차이, C4 epimer, C2 deoxy, chair 치환기 방향을 검사. 좌표에는 반사나 구조 변형 없이 강체 회전/이동만 적용.
4. 기본 3D 뷰어와 분자 선택기를 먼저 제작하고 미리보기 제공.
5. 탄소 번호/OH/아노머/axial-equatorial 표시, 양방향 비교 동기화.
6. 한국어 관찰 질문, 해설, glucose Haworth, 접근성/반응형/오류 복구.
7. 데이터 및 동기화 테스트 → typecheck → production build.

추가 고리형은 β-D-galactopyranose, β-D-fructofuranose, β-D-ribofuranose, 2-deoxy-β-D-ribofuranose로 명시. 자유 단당류 대표 conformer이며 용액의 전체 평형이나 핵산 결합 구조를 뜻하지 않음.

## 2026-09-09: 이당류·다당류 확장

기존 단당류 6종과 그 SDF는 바이트 단위로 그대로 유지한 채 범위를 넓혔다.

1. 데이터 모델을 먼저 일반화. `residues[]`, `glycosidicBonds[]`, `reducingEnds`,
   `branchPoints`를 모든 구조에 부여하고 단당류도 잔기 1개로 기술한다. 분자 ID를 검사해
   아노머 탄소를 정하던 분기를 없애고 잔기 metadata에서 읽는다.
2. 이당류 4종은 wwPDB CCD 성분(MAL/CBI/LAT/SUC)을 통째로 사용. 좌표는 생성하지 않고
   잔기 동정·아노머 배치·결합 연결을 독립 검사한다. PubChem CID는 화합물 동정 참조로 기록.
3. 다당류는 단일 고정 구조로 만들지 않고 대표 fragment로 조립한다. 잔기는 검증된 CCD
   단당류, junction 기하는 PubChem 참조 conformer에서 측정한 값. 눈대중 값은 쓰지 않는다.
   근거와 한계는 docs/POLYSACCHARIDE_MODELING.md에 별도로 남긴다.
4. 표시 옵션은 구조의 capability에서 생성한다. axial/equatorial은 검증된 chair 기하가 있는
   구조에서만, 글리코시드/환원 말단/가지는 해당 구조에서만 노출.
5. 라벨은 잔기 이름을 포함하고(`Glc A · C1`), 큰 fragment에서는 초점에 따라 제한한다.
   가지 결합은 색뿐 아니라 점선과 표기로도 구별한다.
6. 다당류에는 자체 SVG 개념도를 추가하되 fragment의 실제 위상만 그리고, 크기·가지 빈도를
   나타내지 않는다는 문구를 함께 둔다.
7. 비교쌍에 맥아당/셀로비오스, 아밀로스/셀룰로스, 아밀로펙틴/글리코젠을 추가한다.
8. 녹말은 단일 분자로 만들지 않는다. 사이드바에서 아밀로스·아밀로펙틴을 '녹말' 그룹으로 묶는다.
