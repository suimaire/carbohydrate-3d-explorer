# 입체화학 검증 기록

단당류·이당류 검증일: 2026-09-07 / 2026-09-09. 데이터: wwPDB Chemical Component
Dictionary(CCD)가 제공하는 **idealized coordinates**(`pdbx_model_Cartn_*_ideal`).

여기서 "ideal"은 사전이 화합물의 화학적 기술로부터 **계산해 만든 이상화 좌표**라는 뜻입니다.
실험적으로 측정된 conformation이 아니고, 특정 PDB 엔트리에서 관측된 좌표도 아닙니다.
이 프로젝트는 CCD를 **화학적 동정과 입체배치의 출처**로 사용하며, 그 좌표를 실제 생체
conformation으로 해석하지 않습니다. 화면의 모든 구조는 대표 conformer입니다.

다당류 대표 fragment의 제작·검증은 별도 문서
[POLYSACCHARIDE_MODELING.md](POLYSACCHARIDE_MODELING.md)에 있습니다.
전체 수치는 [structure-validation.json](structure-validation.json).

## 원본 식별

### 단당류

- [GLC · alpha-D-glucopyranose](https://www.rcsb.org/ligand/GLC)
- [BGC · beta-D-glucopyranose](https://www.rcsb.org/ligand/BGC)
- [GAL · beta-D-galactopyranose](https://www.rcsb.org/ligand/GAL)
- [FRU · beta-D-fructofuranose](https://www.rcsb.org/ligand/FRU)
- [BDR · beta-D-ribofuranose](https://www.rcsb.org/ligand/BDR)
- [2DR · 2-deoxy-beta-D-erythro-pentofuranose](https://www.rcsb.org/ligand/2DR), synonym 2-deoxy-beta-D-ribofuranose

### 이당류

| 화면        | CCD   | CCD 이름       | PubChem 참조 CID | 화면 표기                  |
| ----------- | ----- | -------------- | ---------------- | -------------------------- |
| Maltose     | `MAL` | MALTOSE        | 439186           | α-D-Glcp-(1→4)-α-D-Glcp    |
| Cellobiose  | `CBI` | CELLOBIOSE     | 439178           | β-D-Glcp-(1→4)-β-D-Glcp    |
| Lactose     | `LAT` | BETA-LACTOSE   | 440995           | β-D-Galp-(1→4)-β-D-Glcp    |
| Sucrose     | `SUC` | SUCROSE        | 5988             | α-D-Glcp-(1→2)-β-D-Fruf    |

원본: `https://files.rcsb.org/ligands/download/{ID}.cif`. 각 CIF를 그대로 보존합니다.

이 네 성분에 대해 밝혀 둘 점이 두 가지 있습니다.

1. **CCD에서 OBS(obsolete) 상태입니다.** 2020년 wwPDB 탄수화물 remediation 이후 PDB 엔트리는
   이당류를 단당류 잔기의 연결로 기술하므로, 하나로 합쳐진 이 성분들은 신규 기탁에 쓰이지
   않습니다. 화학적 기술과 idealized 좌표는 계속 배포되며 이 앱은 그 좌표를 쓰고 있습니다.
   이 성분을 고른 이유는 (a) 원자별 `pdbx_component_comp_id` / `pdbx_residue_numbering` /
   `pdbx_component_atom_id`로 **잔기 대응이 출처 자체에 명시**되어 있고, (b) 환원 말단의
   아노머 배치가 **확정**되어 있기 때문입니다.
2. **PubChem CID는 화합물 동정용 참조입니다.** 위 표의 maltose/cellobiose/lactose CID는
   환원 말단 아노머가 지정되지 않은 레코드라 3D conformer의 그 자리는 임의로 정해집니다.
   수업에서 환원 말단을 다루므로 좌표는 CCD를 사용했습니다. sucrose는 아노머 자유도가 없어
   CCD `SUC`와 PubChem CID 5988의 InChIKey가 `CZMRCDWAGMRECN-UGDNZRGBSA-N`으로 일치합니다.

## 독립적인 좌표 검사

1. CIF atom/bond loop에서 원자 이름, 원소, 결합, stereo_config, idealized 좌표를 읽습니다.
2. 원본 결합과 좌표로 RDKit 분자를 만들고 `AssignStereochemistryFrom3D`를 실행합니다.
3. 계산된 모든 CIP R/S를 CCD의 원자별 표기 및 고정된 기대값과 대조합니다.
4. 고리 원자를 기준으로 reflection을 금지한 Kabsch 정렬을 적용합니다. 원자 배치 자체는 변경하지 않습니다.
5. SDF 직렬화 후 다시 읽어, stereo tag를 제거하고 실제 3D 좌표에서 R/S를 재계산합니다.

| CCD | 생화학적 번호 기준 CIP            |
| --- | --------------------------------- |
| GLC | C1 S, C2 R, C3 S, C4 S, C5 R      |
| BGC | C1 R, C2 R, C3 S, C4 S, C5 R      |
| GAL | C1 R, C2 R, C3 S, C4 R, C5 R      |
| FRU | C2 R, C3 S, C4 S, C5 R            |
| BDR | C1 R, C2 R, C3 S, C4 R            |
| 2DR | C1 R, C3 S, C4 R; C2는 비키랄 CH₂ |

모두 일치했습니다. α/β glucose는 C1만 다르고, β glucose/galactose는 C4만 다릅니다. CIP 문자는
고리화에 따른 우선순위 변화를 반영하므로 열린 사슬의 R/S를 그대로 가져오지 않았습니다.
R/S와 α/β는 서로 다른 명명 체계입니다.

## 아노머 배치의 판정

α/β는 CIP 문자로 판정하지 않습니다. 아노머 탄소의 이웃 OH가 글리코시드 결합으로 바뀌면
원자가 전혀 움직이지 않아도 CIP 우선순위가 달라지기 때문입니다(실제로 maltose 환원 말단
잔기의 C3는 자유 α-D-glucose와 같은 자리인데도 S가 아니라 R로 나옵니다).

대신 아노머 탄소에서 (고리 O, 고리 밖 O, 고리 이웃 C)가 만드는 **부호 있는 부피**를 계산하고,
이미 검증된 CCD `GLC`(α)와 `BGC`(β)의 부호와 대조합니다. 이 값은 고리 형태, 화면 방향,
결합 상태와 무관합니다.

| 기준          | 부호 있는 부피 | 판정                     |
| ------------- | -------------: | ------------------------ |
| GLC (기준 α)  |        +2.4059 | α                        |
| BGC (기준 β)  |        −2.4098 | β                        |
| GAL           |        −2.4085 | β (기대와 일치)          |
| FRU (C2 기준) |        −2.4716 | β (기대와 일치)          |
| BDR / 2DR     | −2.5485 / −2.5594 | 서로 같은 부호(둘 다 β) |

BDR·2DR은 앱에 α 대응물이 없어 절대 판정 대신 **서로 일치하는지**만 확인하고, 배치 자체는
CCD 성분 이름(β)을 따릅니다.

## 이당류 검증

각 이당류에 대해 다음을 모두 확인했습니다(전부 assert).

- 3D에서 계산한 CIP가 CCD 표기와 완전히 일치, SDF 직렬화 후에도 유지.
- 고리 2개(SUC만 6원자+5원자, 나머지는 6원자 2개).
- **잔기 동정**: 각 잔기 위에 검증된 단당류 CCD를 Kabsch 정합해 RMSD로 확인.
  다른 에피머·다른 아노머는 겹쳐지지 않으므로 구성 단당류의 신원과 배치를 함께 검증합니다.
- **글리코시드 결합**: 고리 밖 산소 중 탄소 두 개와만 결합한 원자가 정확히 하나이고,
  그 두 이웃이 공여체 아노머 탄소와 수용체의 지정된 탄소인지 확인.
- **환원 말단**: 아노머 탄소의 고리 밖 산소가 다리 산소가 아닌 경우에만 환원 말단으로 셉니다.
  sucrose의 fructose에는 O2가 존재하지만 그것이 다리 산소이므로 환원 말단이 아닙니다.

| CCD | 잔기 B (수용체)                  | 잔기 A (공여체)                  | 결합    | C–O (Å) | C–O–C (°) | φ (°)  | ψ (°)  | 환원 말단 |
| --- | -------------------------------- | -------------------------------- | ------- | ------: | --------: | -----: | -----: | --------- |
| MAL | α-D-Glcp, RMSD 0.0086            | α-D-Glcp, RMSD 0.0006            | α(1→4)  |   1.429 |    114.01 | +72.67 | +85.82 | 있음 (B)  |
| CBI | β-D-Glcp, RMSD 0.0008            | β-D-Glcp, RMSD 0.0006            | β(1→4)  |   1.429 |    114.05 | −65.05 | +90.02 | 있음 (B)  |
| LAT | β-D-Glcp, RMSD 0.0006            | β-D-Galp, RMSD 0.0007            | β(1→4)  |   1.428 |    114.03 | −65.01 | +89.95 | 있음 (B)  |
| SUC | β-D-Fruf, RMSD 0.0593            | α-D-Glcp, RMSD 0.0007            | α(1→2)β |   1.429 |    114.02 | +69.01 | +55.16 | **없음**  |

RMSD는 잔기의 무거운 원자 기준 Å. 푸라노스는 자유 당과 이당류에서 고리 접힘이 조금 달라
피라노스보다 값이 큽니다(허용 한도 0.35 Å).

화면에서 잔기 A는 아노머 탄소를 내어놓는 공여체, B는 그것을 받는 수용체입니다. 글리칸을
쓰는 방향(비환원 → 환원)과 같습니다. MAL·CBI·LAT에서는 B가 환원 말단이고, SUC에는
환원 말단이 없습니다.

### 화면 정렬

이당류는 **환원 말단 쪽 피라노스 고리**를 단당류와 같은 기준 좌표계에 강체 정합합니다.
그래서 maltose/cellobiose 비교에서 두 화면의 환원 말단 고리가 같은 자리에 놓이고,
차이가 두 번째 고리의 방향으로만 나타납니다. 회전·평행이동만 사용하며 반사는 금지합니다.

### 알려진 한계: CCD idealized 좌표의 짧은 비결합 접촉

배포되는 SDF에서 직접 측정한 값입니다.

| 구조 | 원자 | 원자 번호 | 거리 | 공유 결합 | 결합 그래프상 거리 | 판정 |
| ---- | ---- | --------- | ---: | --------- | ------------------ | ---- |
| CBI  | B:O3 ··· A:O5 | 8 ··· 21 | 2.133 Å | 아니오 | 5 결합 | 진짜 비결합 접촉 |
| LAT  | B:O3 ··· A:O5 | 8 ··· 21 | 2.132 Å | 아니오 | 5 결합 | 진짜 비결합 접촉 |

두 원자는 1-3 이나 1-4 관계가 아니라 5 결합만큼 떨어져 있으므로, 이 값은 through-bond
기하로 설명되지 않는 **unusually short nonbonded O···O contact**입니다. 이 문서는 측정된
사실만 기록하며, 일반적인 O···O 거리의 기준값을 주장하지 않습니다.

저희는 **공개된 좌표를 수정하지 않고 그대로 배포**합니다(이 프로젝트는 좌표를 생성하지
않는다는 원칙을 유지합니다). 공-막대 모형에서 두 산소가 겹쳐 보이지는 않고, 결합 위치·
α/β·환원 말단 등 수업에서 다루는 내용에는 영향이 없습니다. 다만 다당류 fragment는 같은
기하가 residue마다 반복되므로, β(1→4) junction 기하는 CCD가 아니라 PubChem conformer에서
측정했습니다(→ POLYSACCHARIDE_MODELING.md §2). 같은 접촉이 PubChem cellobiose
conformer에서는 2.81 Å입니다.

## 의자형 및 치환기 검사

고리의 best-fit plane 법선과 각 C–치환기 단위 벡터의 내적 절댓값을 계산했습니다. axial은 1에
가깝고 equatorial은 작은 값을 보입니다. 앱의 axial/equatorial 표시는 이 표에서 직접 생성되며,
이 값이 없는 구조에서는 해당 버튼 자체를 제공하지 않습니다.

| 구조 |  C1–O1 |  C2–O2 |  C3–O3 |  C4–O4 |  C5–C6 |
| ---- | -----: | -----: | -----: | -----: | -----: |
| GLC  | 0.9996 | 0.3639 | 0.3525 | 0.3638 | 0.3559 |
| BGC  | 0.3566 | 0.3641 | 0.3519 | 0.3639 | 0.3564 |
| GAL  | 0.3569 | 0.3635 | 0.3519 | 0.9995 | 0.3564 |

검사 기준: axial > 0.85, equatorial < 0.65. 이 구조들에서 명확히 분리됩니다. C2/C3/C5/O5
기준면에서 CH₂OH 쪽을 위로 정하면 C1은 약 −0.68 Å, C4는 약 +0.70 Å이므로 ⁴C₁임을
확인했습니다. 결과 수치는 구조 좌표에서 계산한 검사값이며 실험 측정값으로 주장하지 않습니다.

## 번호와 연결

피라노스 고리: C1–C2–C3–C4–C5–O5. 과당 푸라노스: C2–C3–C4–C5–O5. 리보스/디옥시리보스:
C1–C2–C3–C4–O4.

OH는 O 원자에 H가 직접 결합한 경우로 판정하며 고리 O는 제외합니다. 2DR C2는 C1/C3/H/H와
연결되어 O2가 없음을 확인했습니다. H를 포함한 분자식·각 원자의 원자가·아노머 탄소의 두 O
이웃도 자동 검사합니다. 잔기가 둘 이상인 구조에서는 원자를 CCD의 고유 이름(C1′ 등) 대신
**잔기 + 생화학적 번호**(`Glc A · C1`)로 표시하고, 원래 이름은 metadata의 `sourceName`과
원본 CIF에 보존합니다.

## 해석 한계

이 검증은 표시한 stereoisomer, 대표 chair, 그리고 글리코시드 결합의 위치·배치·연결이
정확한지를 확인합니다. 다음은 검증하지 않았습니다.

- 용액 중 아노머 분포와 mutarotation 평형, conformer의 상대적 에너지.
- 글리코시드 결합 주위의 회전 자유도. 화면은 각 구조의 대표 conformer 하나입니다.
- 5원자 고리의 pseudorotation 전체, 핵산 내 당의 실제 pucker.
- 다당류의 실제 길이·가지 빈도·고차 구조 (→ POLYSACCHARIDE_MODELING.md §6).

Haworth의 위/아래는 고리 면의 상대 방향이며 화면 좌표나 axial/equatorial과 동의어가
아닙니다. α/β는 아노머 탄소의 입체배치이지 "결합이 위/아래를 향한다"는 그림 규칙 자체가
아닙니다.
