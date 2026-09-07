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
