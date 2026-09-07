# 입체화학 검증 기록

검증일: 2026-09-07. 데이터: wwPDB Chemical Component Dictionary(CCD)의 ideal 좌표. 단백질에 결합된 특정 관측 구조나 임의 생성 좌표가 아닙니다.

## 원본 식별

- [GLC · alpha-D-glucopyranose](https://www.rcsb.org/ligand/GLC)
- [BGC · beta-D-glucopyranose](https://www.rcsb.org/ligand/BGC)
- [GAL · beta-D-galactopyranose](https://www.rcsb.org/ligand/GAL)
- [FRU · beta-D-fructofuranose](https://www.rcsb.org/ligand/FRU)
- [BDR · beta-D-ribofuranose](https://www.rcsb.org/ligand/BDR)
- [2DR · 2-deoxy-beta-D-erythro-pentofuranose](https://www.rcsb.org/ligand/2DR), synonym 2-deoxy-beta-D-ribofuranose

원본: `https://files.rcsb.org/ligands/download/{ID}.cif`. 각 CIF를 그대로 보존했습니다. PubChem의 일반 이름 검색 결과는 아노머/고리형이 섞일 수 있으므로 구조 파일로 사용하지 않았습니다.

## 독립적인 좌표 검사

1. CIF atom/bond loop에서 원자 이름, 원소, 결합, stereo_config, ideal 좌표를 읽습니다.
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

모두 일치했습니다. α/β glucose는 C1만 다르고, β glucose/galactose는 C4만 다릅니다. CIP 문자는 고리화에 따른 우선순위 변화를 반영하므로 열린 사슬의 R/S를 그대로 가져오지 않았습니다. R/S와 α/β는 서로 다른 명명 체계입니다.

## 의자형 및 치환기 검사

고리의 best-fit plane 법선과 각 C–치환기 단위 벡터의 내적 절댓값을 계산했습니다. axial은 1에 가깝고 equatorial은 작은 값을 보입니다.

| 구조 |  C1–O1 |  C2–O2 |  C3–O3 |  C4–O4 |  C5–C6 |
| ---- | -----: | -----: | -----: | -----: | -----: |
| GLC  | 0.9996 | 0.3639 | 0.3525 | 0.3638 | 0.3559 |
| BGC  | 0.3566 | 0.3641 | 0.3519 | 0.3639 | 0.3564 |
| GAL  | 0.3569 | 0.3635 | 0.3519 | 0.9995 | 0.3564 |

검사 기준: axial > 0.85, equatorial < 0.65. 이 구조들에서 명확히 분리됩니다. C2/C3/C5/O5 기준면에서 CH₂OH 쪽을 위로 정하면 C1은 약 −0.68 Å, C4는 약 +0.70 Å이므로 ⁴C₁임을 확인했습니다. 결과 수치는 구조 좌표에서 계산한 검사값이며 실험 측정값으로 주장하지 않습니다.

## 번호와 연결

피라노스 고리: C1–C2–C3–C4–C5–O5. 과당 푸라노스: C2–C3–C4–C5–O5. 리보스/디옥시리보스: C1–C2–C3–C4–O4.

OH는 O 원자에 H가 직접 결합한 경우로 판정하며 고리 O는 제외합니다. 2DR C2는 C1/C3/H/H와 연결되어 O2가 없음을 확인했습니다. H를 포함한 분자식·각 원자의 원자가·아노머 탄소의 두 O 이웃도 자동 검사합니다.

## 해석 한계

이 검증은 표시한 stereoisomer와 대표 chair의 기하학적 정확성을 확인합니다. 용액 중 분포, 에너지, 핵산 내 당의 형태, 5원자 고리 pseudorotation을 검증한 것은 아닙니다. Haworth의 위/아래는 고리 면의 상대 방향이며 화면 좌표나 axial/equatorial과 동의어가 아닙니다.
