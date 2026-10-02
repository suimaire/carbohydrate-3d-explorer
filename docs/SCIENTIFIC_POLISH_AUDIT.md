# 최종 polish 독립 과학 감사 · 2026-10-03

배포할 **14종의 연결·번호·입체배치·2D 대응은 원본 CCD 및 실제 SDF와 일치**했다.
좌표나 결합을 고쳐야 할 오류는 발견하지 않았다. 설명의 오류·모호성은 네 행에
`CORRECTED`로 기록한다. 여기서 `VERIFIED`는 아래 검사 범위에만 적용되며, 용액의
평형이나 실제 전체 고분자의 형태까지 확정한다는 뜻이 아니다.

재현: `python scripts/audit_scientific_polish.py`.
결과와 원자별 수치는 [scientific-polish-audit.json](scientific-polish-audit.json)에 있다.
이 스크립트는 원본 파일을 변경하지 않으며 기존 생성기나 이전 검증 결과를 import하지 않는다.
Python 표준 라이브러리와 이미 설치된 Node만 사용한다. 새 의존성·런타임 API는 없다.

## 검사 방법과 독립성

1. 보존된 10종 CCD CIF의 atom/bond loop와 ideal 좌표를 새 파서로 읽었다. 기존 검증
   JSON의 `CIP_matches_CCD` 같은 결론은 기대값으로 사용하지 않았다.
2. 14종 배포 SDF를 별도 파서로 읽어 원소·원자가·연결성·닫힌 고리·독립 고리 수·OH를
   확인했다. OH 강조 목록에는 O와 그 O에 직접 연결된 H가 함께 있음을 확인했다.
3. CCD 10종의 모든 원자 대응, 탄소 번호, 전체 결합 그래프와 모든 원자쌍 거리를 SDF와
   대조했다. 거리 차이의 최댓값은 **0.0001275 Å**로 SDF 소수점 반올림 범위였다.
   거리만으로 검출할 수 없는 반사는 각 입체중심의 방향성으로 별도 배제했다.
4. SDF의 각 잔기에서 실제 무거운 원자 그래프를 잘라내고, 공여 OH가 제거된 경우 기존
   다리 산소의 좌표에 OH를 복원했다. **60개 잔기 모두** 원본 CCD 단당류의 번호가 있는
   연결 그래프와 입체중심 방향성이 일치했다. 기대 잔기는 GLC/BGC/GAL/FRU/BDR/2DR
   원본에서 정했으며, 앱의 `sugar` 문자열이나 이전 생성기의 템플릿을 정답으로 쓰지 않았다.
5. 실제 `formulaResidue` / `formulaGeometry` 출력을 검사 대상으로 불러온 뒤, 고리면과
   치환기 방향을 독립적인 무거운 원자 그래프로 복원해 **원본 CCD**와 대조했다.
   정상 방향과 반바퀴 돌린 방향 **120개 검사**가 통과했다. 그중 실제 Haworth로 표시되는
   단당류·이당류는 14개 잔기 × 2방향 = 28개이며, 나머지 92개는 다당류 잔기의
   투영 모델 일관성 검사다. 실제 다당류 화면은 Haworth가 아닌 연결 개념도다.
6. 다리 산소는 SDF에서 고리 밖의 O이며 서로 다른 잔기의 C 두 개와 연결된 원자로
   직접 찾았다. 이 집합을 metadata의 donor / bridge / acceptor와 비교했다.
   자유 아노머 OH, 가지 수용 C6, 가지 깊이, 환원·비환원 말단도 실제 그래프에서 확인했다.
7. GLC/BGC/GAL의 고리면 법선을 별도 Jacobi 고유벡터 계산으로 구해 axial/equatorial
   지표를 다시 계산했다. GLC C1은 0.999641, GAL C4는 0.999478로 axial이며,
   BGC 다섯 치환기는 모두 0.352–0.364로 equatorial이다. 기존 metadata와 일치했다.

## 14종 결과

`CORRECTED`는 설명 수정까지 포함한 최종 등급이다. 아래 네 행도 원자 구조 자체는
`VERIFIED`이며 SDF·CIF·구조 metadata·투영의 입체배치는 수정하지 않았다.

| 구조 | 등급 | 원본 ↔ 3D ↔ 2D 확인 결과 |
| --- | --- | --- |
| α-D-glucose · GLC | VERIFIED | α-D-glucopyranose, 6원자 고리, C1 아노머. 표준 Haworth O1/O2/O4 아래, O3/C6 위. C1–OH axial. |
| β-D-glucose · BGC | VERIFIED | β-D-glucopyranose, 6원자 고리. GLC와 C1 방향만 다름; O1 위. 표시하는 다섯 치환기 equatorial. |
| D-galactose · GAL | VERIFIED | β-D-galactopyranose, 6원자 고리. BGC 대비 C4만 반대, O4 위 및 axial. |
| D-fructose · FRU | VERIFIED | **β-D-fructofuranose**, C2–C3–C4–C5–O5의 5원자 고리. 아노머 C2. O2/O3/C6 위, O4/C1 아래. CH₂OH 두 개이며 glucose형 pyranose로 단순화하지 않음. |
| D-ribose · BDR | VERIFIED | **β-D-ribofuranose**, C1–C2–C3–C4–O4의 5원자 고리. O1/C5 위, O2/O3 아래. 3D와 같은 furanose. |
| 2-deoxy-D-ribose · 2DR | VERIFIED | **2-deoxy-β-D-ribofuranose**, 5원자 고리. C2 이웃 C1/C3/H/H, O2 없음. O1/C5 위, O3 아래. |
| Maltose · MAL | CORRECTED | A α-D-Glcp C1–O–B C4, **α(1→4)**. B C1–OH 자유·α, 환원 말단 B. CBI와 비교할 때 대표 구조의 자유 환원 말단 차이도 설명하도록 수정. |
| Cellobiose · CBI | CORRECTED | A β-D-Glcp C1–O–B C4, **β(1→4)**. B C1–OH 자유·β, 환원 말단 B. 두 배포 구조가 C1 하나에서만 다르다는 비교 해설 수정. |
| Lactose · LAT | CORRECTED | A β-D-Galp C1–O–B β-D-Glcp C4, **β(1→4)**. 환원 말단 B. B의 C4를 자유 OH로 부르던 문구를 글리코시드 산소로 수정. |
| Sucrose · SUC | CORRECTED | A α-D-Glcp C1–O–B β-D-Fruf C2, **α(1→2)β**. 두 아노머 탄소 모두 결합, 환원 말단 없음. 회전된 Fru 그림의 접근성 설명에서 표준 Haworth 방향과 표시 방향을 구별하도록 수정. |
| Amylose · AMYLOSE | VERIFIED | α-D-Glcp 10개, **α(1→4) × 9**, 가지 없음. 환원 J, 비환원 A. 실제 fragment 그래프와 개념도 일치. |
| Amylopectin · AMYLOPECTIN | VERIFIED | α-D-Glcp 12개, **α(1→4) × 10 + α(1→6) × 1**. D:C6 가지, 환원 H, 비환원 A/I, 가지 깊이 1. |
| Glycogen · GLYCOGEN | VERIFIED | α-D-Glcp 16개, **α(1→4) × 13 + α(1→6) × 2**. E:C6 및 K:C6 가지, 환원 G, 비환원 A/H/M. K는 첫 가지 사슬에 있어 깊이 2의 가지 위 가지가 실제로 존재. |
| Cellulose · CELLULOSE | VERIFIED | β-D-Glcp 8개, **β(1→4) × 7**, 가지 없음. 환원 H, 비환원 A. 개념도는 이 fragment 연결만 나타냄. |

이 표의 단당류 위/아래는 **표준 Haworth 방향의 고리면 기준**이다. Sucrose의 Fru는
glucose 쪽으로 연결을 보이도록 x와 고리 법선 방향을 함께 뒤집은 정상 회전이다.
x만 반사한 enantiomer가 아니며, 두 방향 모두 원본 CCD 입체배치에 일치했다.
Haworth의 위/아래와 의자형의 axial/equatorial, 회전된 3D 화면의 위/아래를 동일시하지 않는다.
[IUPAC 탄수화물 표기·아노머 정의](https://iupac.qmul.ac.uk/BlueBook/P10.html)를 함께 확인했다.

## 원본 및 외부 교차 확인

배포 10종은 `public/molecules/{ID}.cif`에 보존된 wwPDB CCD ideal 좌표를 사용한다.
이번 감사는 보존 파일의 SHA-256, 실제 원자 및 결합을 읽어 비교했으며 외부 좌표나 그림으로
앱 데이터를 교체하지 않았다. D/α/β와 고리 형태는 현재 공개된
[GLC](https://www.rcsb.org/ligand/GLC), [BGC](https://www.rcsb.org/ligand/BGC),
[GAL](https://www.rcsb.org/ligand/GAL), [FRU](https://www.rcsb.org/ligand/FRU),
[BDR](https://www.rcsb.org/ligand/BDR), [2DR](https://www.rcsb.org/ligand/2DR)
정의와도 일치했다.

Sucrose의 두 아노머 탄소 연결은 [ChEBI sucrose](https://www.ebi.ac.uk/chebi/CHEBI:17992),
lactose의 Gal→Glc β(1→4)와 환원 말단의 α/β 구분은
[ChEBI lactose](https://www.ebi.ac.uk/chebi/CHEBI:17716)와 맞는다.
다당류의 주된 반복·가지 결합은 [amylose](https://www.ebi.ac.uk/chebi/CHEBI:28102),
[amylopectin](https://www.ebi.ac.uk/chebi/CHEBI:28057),
[glycogen](https://www.ebi.ac.uk/chebi/CHEBI:28087),
[cellulose](https://www.ebi.ac.uk/chebi/CHEBI:18246) 정의와 맞는다.
가지 개수·간격·분자 길이가 하나로 고정되지 않으므로 이 자료를 대표 fragment의
정량적 생체 유사성의 근거로 사용하지 않았다.

## UNCERTAIN · 확정하지 않은 항목

- **새 RDKit CIP/InChI 재계산:** `.pydeps`의 RDKit/numpy는 Python 3.13용인데 설치된
  Python과 앱 번들 Python은 3.12였다. 실행 불가를 확인했으며 패키지나 런타임을 새로
  설치하지 않았다. JSON의 `publishedInChiKey`는 원본 CCD에 기록된 값이지 이번에
  새로 계산한 값이 아니다. 연결과 각 입체중심의 방향성은 표준 라이브러리 검사로 독립
  확인했으나, 이전 문서의 RDKit 결과를 이번 실행 결과로 재기록하지 않았다.
- **원본의 물리적 conformer 타당성:** CCD ideal 좌표와 일치한다는 결과는 실험적으로
  가장 안정한 형태라는 증거가 아니다. CBI A:O5···B:O3는 **2.13284 Å**, LAT는
  **2.13153 Å**, 두 경우 모두 그래프 거리 5결합임을 새로 측정했다. 원본 좌표는
  유지했으며 이 접촉의 에너지·안정성은 이번에 확정하지 않았다.
- **실제 전체 다당류:** 화면의 사슬 길이, 가지 빈도·위치, 나선 주기, 결정성, 미세섬유,
  단백질 결합 등은 검증한 fragment 그래프만으로 확정할 수 없다. 표시한 자유 환원 OH는
  배포 fragment 자체의 성질이며 생체 내 완전한 고분자의 말단 상태를 재현한 것이 아니다.
- **용액 상태:** 아노머 평형, mutarotation 속도, furanose pseudorotation 및 에너지 분포는
  검사 범위 밖이다. 하나의 대표 구조만으로 용액의 주된 형태를 확정하지 않는다.
- **최신 원본 byte 동일성:** 이번에는 보존 CIF를 교체하거나 10종을 다시 다운로드하지
  않았다. 특히 obsolete SUC ligand page는 현재 웹 조회에서 열리지 않았다. 보존 CCD
  원본과 공개 ChEBI 정의를 교차 사용했으며 최신 서버 파일과의 byte 동일성은 주장하지 않는다.

최종 구조 등급은 14종 모두 `VERIFIED`, 설명까지 합친 행 등급은
`VERIFIED` 10종 / `CORRECTED` 4종이다. 위 `UNCERTAIN` 항목은 그대로 남겨 둔다.
