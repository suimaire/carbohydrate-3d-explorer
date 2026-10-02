"""Read-only independent audit; Python stdlib + already installed Node only.

Run: python scripts/audit_scientific_polish.py
No generation code or prior validation result is imported. Raw CCD loops and
SDF are independently parsed. The application projection model is the subject
under test, exported through Node, not a source of expected chemical identity.
Only writes docs/scientific-polish-audit.json.
"""
from collections import Counter, deque
import hashlib
import json
import math
from pathlib import Path
import shlex
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "src/data/structure-metadata.json").read_text())
EXPECTED = {
    "GLC": ["GLC"], "BGC": ["BGC"], "GAL": ["GAL"], "FRU": ["FRU"],
    "BDR": ["BDR"], "2DR": ["2DR"], "MAL": ["GLC", "GLC"],
    "CBI": ["BGC", "BGC"], "LAT": ["GAL", "BGC"], "SUC": ["GLC", "FRU"],
    "AMYLOSE": ["GLC"] * 10, "AMYLOPECTIN": ["GLC"] * 12,
    "GLYCOGEN": ["GLC"] * 16, "CELLULOSE": ["BGC"] * 8,
}
EXPECTED_COUNTS = {"AMYLOSE": {"alpha1-4": 9}, "AMYLOPECTIN": {"alpha1-4": 10, "alpha1-6": 1},
                   "GLYCOGEN": {"alpha1-4": 13, "alpha1-6": 2}, "CELLULOSE": {"beta1-4": 7}}
MONOMERS = list(EXPECTED)[:6]


def edge(a, b):
    return tuple(sorted((a, b)))


def read_cif(path):
    # Preserved CCD files use one logical row per line; reject future files
    # with multiline loop values rather than silently misparsing them.
    rows, scalar = {}, {}
    lines = path.read_text().splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line == "loop_":
            i += 1
            headers = []
            while i < len(lines) and lines[i].strip().startswith("_"):
                headers.append(lines[i].strip())
                i += 1
            values = []
            while i < len(lines) and not lines[i].strip().startswith(("#", "_", "loop_")):
                if lines[i].strip():
                    row = shlex.split(lines[i], posix=True)
                    assert len(row) == len(headers), (path, i, row)
                    values.append(dict(zip(headers, row)))
                i += 1
            rows[headers[0].split(".")[0]] = values
            continue
        if line.startswith("_"):
            pieces = shlex.split(line, posix=True)
            if len(pieces) == 2:
                scalar[pieces[0]] = pieces[1]
        i += 1
    atoms = {a["_chem_comp_atom.atom_id"]: {
        "element": a["_chem_comp_atom.type_symbol"],
        "xyz": tuple(float(a[f"_chem_comp_atom.pdbx_model_Cartn_{axis}_ideal"]) for axis in "xyz"),
        "cip": a["_chem_comp_atom.pdbx_stereo_config"],
        "component": a.get("_chem_comp_atom.pdbx_component_comp_id"),
        "localName": a.get("_chem_comp_atom.pdbx_component_atom_id", a["_chem_comp_atom.atom_id"]),
    } for a in rows["_chem_comp_atom"]}
    bonds = {edge(b["_chem_comp_bond.atom_id_1"], b["_chem_comp_bond.atom_id_2"]) for b in rows["_chem_comp_bond"]}
    assert all(b["_chem_comp_bond.value_order"] == "SING" for b in rows["_chem_comp_bond"])
    key = next(r["_pdbx_chem_comp_descriptor.descriptor"] for r in rows["_pdbx_chem_comp_descriptor"]
               if r["_pdbx_chem_comp_descriptor.type"] == "InChIKey")
    return {"scalar": scalar, "atoms": atoms, "bonds": bonds, "inChiKey": key}


def read_sdf(path):
    lines = path.read_text().splitlines()
    na, nb = int(lines[3][:3]), int(lines[3][3:6])
    atoms = [{"element": s[31:34].strip(), "xyz": tuple(float(s[i:i + 10]) for i in [0, 10, 20])}
             for s in lines[4:4 + na]]
    bonds = set()
    for s in lines[4 + na:4 + na + nb]:
        assert int(s[6:9]) == 1
        bonds.add(edge(int(s[:3]) - 1, int(s[3:6]) - 1))
    return atoms, bonds


def adjacency(keys, bonds):
    adj = {k: [] for k in keys}
    for a, b in bonds:
        adj[a].append(b)
        adj[b].append(a)
    return adj


def determinant(a, b, c):
    return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])


def volume(xyz, center, neighbors):
    # For three heavy neighbors the implicit H is the fourth ligand; for
    # fructose C2 use the actual four heavy ligands, independent of CIP order.
    origin = xyz[center] if len(neighbors) == 3 else xyz[neighbors[3]]
    vectors = [tuple(x - y for x, y in zip(xyz[n], origin)) for n in neighbors[:3]]
    return determinant(*vectors)


def verify_handedness(source, actual_xyz, actual_bonds):
    heavy = {n: a for n, a in source["atoms"].items() if a["element"] != "H"}
    heavy_bonds = {e for e in source["bonds"] if all(n in heavy for n in e)}
    assert set(actual_xyz) == set(heavy)
    assert actual_bonds == heavy_bonds
    adj = adjacency(heavy, heavy_bonds)
    source_xyz = {n: a["xyz"] for n, a in heavy.items()}
    centers = {}
    for n, atom in heavy.items():
        if atom["cip"] not in ("R", "S"):
            continue
        neighbors = sorted(adj[n])
        a, b = volume(source_xyz, n, neighbors), volume(actual_xyz, n, neighbors)
        assert abs(a) > 0.1 and abs(b) > 0.1
        assert a * b > 0, (n, a, b)
        centers[n] = {"sourceCIP": atom["cip"], "sourceVolume": round(a, 6), "actualVolume": round(b, 6)}
    return centers


def actual_residue(atoms, bonds, r, links):
    # Slice actual graph by canonical CCD numbering, restoring donor OH at
    # the existing bridge position. No generated monomer template is used.
    names = {i: n for n, i in r["atoms"].items() if atoms[i]["element"] != "H"}
    xyz = {n: atoms[i]["xyz"] for i, n in names.items()}
    residue_bonds = {edge(names[a], names[b]) for a, b in bonds if a in names and b in names}
    for b in links:
        if b["donorResidue"] == r["id"] and b["bridgingAtom"] not in names:
            oxygen = "O" + b["donorCarbon"][1:]
            xyz[oxygen] = atoms[b["bridgingAtom"]]["xyz"]
            residue_bonds.add(edge(b["donorCarbon"], oxygen))
    return xyz, residue_bonds


def projection_graph(formula, geometry):
    # Reconstruct model with ring in xy plane and up/down in +/- z, then
    # compare its labeled heavy graph and handedness with RAW CCD monomer.
    names = formula["ring"]
    xyz = {n: (geometry["ring"][n]["x"] / 65, -geometry["ring"][n]["y"] / 65, 0.0) for n in names}
    bonds = {edge(names[i], names[(i + 1) % len(names)]) for i in range(len(names))}
    for s in formula["substituents"]:
        if s["label"] == "H":
            continue
        base = xyz[s["carbon"]]
        xyz[s["atom"]] = (base[0], base[1], -geometry["directions"][s["side"]] * 1.3)
        bonds.add(edge(s["carbon"], s["atom"]))
        if s["label"] == "CH₂OH":
            oxygen = "O" + s["atom"][1:]
            xyz[oxygen] = (base[0] + 0.8, base[1] + 0.8, xyz[s["atom"]][2] * 1.8)
            bonds.add(edge(s["atom"], oxygen))
    return xyz, bonds


def ring_normal(points):
    # Small symmetric Jacobi eigensolver, independent of the numpy/SVD path
    # used when preparing the data. Smallest covariance eigenvector = normal.
    mean = [sum(p[i] for p in points) / len(points) for i in range(3)]
    centered = [[p[i] - mean[i] for i in range(3)] for p in points]
    matrix = [[sum(p[i] * p[j] for p in centered) for j in range(3)] for i in range(3)]
    vectors = [[float(i == j) for j in range(3)] for i in range(3)]
    for _ in range(40):
        p, q = max([(0, 1), (0, 2), (1, 2)], key=lambda pair: abs(matrix[pair[0]][pair[1]]))
        if abs(matrix[p][q]) < 1e-12:
            break
        theta = 0.5 * math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p])
        c, s = math.cos(theta), math.sin(theta)
        rot = [[float(i == j) for j in range(3)] for i in range(3)]
        rot[p][p], rot[q][q], rot[p][q], rot[q][p] = c, c, s, -s
        right = [[sum(matrix[i][k] * rot[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
        matrix = [[sum(rot[k][i] * right[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
        vectors = [[sum(vectors[i][k] * rot[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    k = min(range(3), key=lambda i: matrix[i][i])
    return [vectors[i][k] for i in range(3)]


export_js = """
import fs from 'node:fs';
import { formulaResidue, formulaGeometry } from './src/lib/structureFormula.ts';
const data = JSON.parse(fs.readFileSync('src/data/structure-metadata.json', 'utf8'));
const output = {};
for (const [id, d] of Object.entries(data)) output[id] = d.residues.map(r => {
  const f = formulaResidue(d, r);
  return { formula: f, geometries: [false, true].map(turned => {
    const g = formulaGeometry(f, 0, turned);
    return { turned, ring: g.ring, directions: { up: g.direction('up'), down: g.direction('down') } };
  }) };
});
process.stdout.write(JSON.stringify(output));
"""
PROJECTIONS = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "--input-type=module", "-e", export_js], cwd=ROOT, text=True, encoding="utf-8"))
CIFS = {i: read_cif(ROOT / f"public/molecules/{i}.cif") for i in list(EXPECTED)[:10]}
report = {
    "date": "2026-10-03", "method": "Python standard-library independent raw CIF/SDF parsers; source atom/number/bond maps; all-pairs source-to-SDF distance invariance and chiral handedness; residue graph restoration and raw CCD comparison; actual projection-model heavy graph and tetrahedral handedness versus raw CCD in normal/turned orientations; reducing/branch endpoints derived from actual SDF neighbors.",
    "runtimeNetworkRequests": 0, "scope": "Shipped configurations and fragment topology; not solution populations, energies or full biological architecture.",
    "freshCipRecalculation": {"status": "UNCERTAIN", "reason": "Existing .pydeps RDKit/numpy are Python 3.13 binaries; available system and bundled Python are 3.12. No package/runtime installed. Source CIP names are associated through independently verified atom graphs and handedness, not freshly assigned by RDKit."},
    "auditedFileSHA256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ["src/data/structure-metadata.json", "src/lib/structureFormula.ts", "src/components/HaworthPreview.tsx", "src/components/PolymerSchematic.tsx"]},
    "records": [],
}
for id, data in DATA.items():
    path = ROOT / f"public/molecules/{id}.sdf"
    atoms, bonds = read_sdf(path)
    adj = adjacency(range(len(atoms)), bonds)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == data["sdfSHA256"]
    assert len(atoms) == len(data["atoms"])
    for i, atom in enumerate(data["atoms"]):
        assert atom["index"] == i and atom["element"] == atoms[i]["element"]
        assert len(adj[i]) == {"C": 4, "O": 2, "H": 1}[atom["element"]]
    seen, queue = {0}, deque([0])
    while queue:
        for n in adj[queue.popleft()]:
            if n not in seen:
                seen.add(n)
                queue.append(n)
    assert len(seen) == len(atoms)
    assert len(bonds) - len(atoms) + 1 == len(data["residues"])
    for r in data["residues"]:
        ring = r["ringAtoms"]
        assert len(ring) == len(set(ring))
        assert len(ring) == (5 if r["ringForm"] == "furanose" else 6)
        assert all(edge(ring[i], ring[(i + 1) % len(ring)]) in bonds for i in range(len(ring)))
    hydroxyls = {i for i, a in enumerate(atoms) if a["element"] == "O" and any(atoms[n]["element"] == "H" for n in adj[i])}
    hydroxyl_hydrogens = {n for i in hydroxyls for n in adj[i] if atoms[n]["element"] == "H"}
    assert hydroxyls | hydroxyl_hydrogens == set(data["hydroxylAtoms"])
    record = {"id": id, "structureStatus": "VERIFIED", "atomCount": len(atoms),
              "elementCountsFromGraph": dict(Counter(a["element"] for a in atoms)),
              "ringSizesCheckedAgainstGraph": [len(r["ringAtoms"]) for r in data["residues"]], "residues": []}
    if id in ["CBI", "LAT"]:
        ra, rb = data["residues"]
        first, second = ra["atoms"]["O5"], rb["atoms"]["O3"]
        steps, queue = {first: 0}, deque([first])
        while second not in steps:
            at = queue.popleft()
            for n in adj[at]:
                if n not in steps:
                    steps[n] = steps[at] + 1
                    queue.append(n)
        record["sourceConformerContact"] = {"atoms": "A:O5...B:O3", "distanceAngstrom": math.dist(atoms[first]["xyz"], atoms[second]["xyz"]), "graphDistanceBonds": steps[second], "sourceCoordinatesRetained": True}
    if id in ["GLC", "BGC", "GAL"]:
        r = data["residues"][0]
        normal = ring_normal([atoms[i]["xyz"] for i in r["ringAtoms"]])
        cosines = {}
        for carbon, substituent in [("C1", "O1"), ("C2", "O2"), ("C3", "O3"), ("C4", "O4"), ("C5", "C6")]:
            a, b = [atoms[r["atoms"][n]]["xyz"] for n in [carbon, substituent]]
            vector = [b[i] - a[i] for i in range(3)]
            cosine = abs(sum(vector[i] * normal[i] for i in range(3))) / math.sqrt(sum(v * v for v in vector))
            assert abs(cosine - data["validation"]["axialNormalCosines"][carbon]) < 0.0002
            is_axial = (id == "GLC" and carbon == "C1") or (id == "GAL" and carbon == "C4")
            assert cosine > 0.85 if is_axial else cosine < 0.65
            cosines[carbon] = round(cosine, 6)
        record["independentAxialNormalCosines"] = cosines
    if id in CIFS:
        source = CIFS[id]
        assert hashlib.sha256((ROOT / f"public/molecules/{id}.cif").read_bytes()).hexdigest() == data["sourceSHA256"]
        names = {a.get("sourceName", a["name"]): a["index"] for a in data["atoms"]}
        assert set(names) == set(source["atoms"])
        assert all(atoms[i]["element"] == source["atoms"][n]["element"] for n, i in names.items())
        assert {edge(names[a], names[b]) for a, b in source["bonds"]} == bonds
        assert all(a["name"] == source["atoms"][a.get("sourceName", a["name"])]["localName"] for a in data["atoms"])
        deviations = [abs(math.dist(source["atoms"][a]["xyz"], source["atoms"][b]["xyz"]) - math.dist(atoms[names[a]]["xyz"], atoms[names[b]]["xyz"]))
                      for a in names for b in names if a < b]
        assert max(deviations) < 0.0002
        heavy_xyz = {n: atoms[i]["xyz"] for n, i in names.items() if atoms[i]["element"] != "H"}
        heavy_bonds = {e for e in source["bonds"] if all(n in heavy_xyz for n in e)}
        centers = verify_handedness(source, heavy_xyz, heavy_bonds)
        record["ccd"] = {"name": source["scalar"]["_chem_comp.name"], "status": source["scalar"]["_chem_comp.pdbx_release_status"],
                          "publishedInChiKey": source["inChiKey"], "sourceHashMatches": True, "numberingAndGraphMatch": True,
                          "maxAllPairDistanceDeviationAngstrom": max(deviations), "chiralCentersAgreeWithSource": centers}
    residue_by_atom = {i: r["id"] for r in data["residues"] for i in r["atoms"].values()}
    ring_atoms = set(data["ringAtoms"])
    actual_links = {(frozenset(adj[i]), i) for i, a in enumerate(atoms) if a["element"] == "O" and i not in ring_atoms
                    and len(adj[i]) == 2 and all(atoms[n]["element"] == "C" for n in adj[i])
                    and len({residue_by_atom[n] for n in adj[i]}) == 2}
    assert actual_links == {(frozenset((b["donorAtom"], b["acceptorAtom"])), b["bridgingAtom"]) for b in data["glycosidicBonds"]}
    reducing = []
    identities = dict(zip([r["id"] for r in data["residues"]], EXPECTED[id]))
    for r, p in zip(data["residues"], PROJECTIONS[id]):
        target = identities[r["id"]]
        source = CIFS[target]
        centers = verify_handedness(source, *actual_residue(atoms, bonds, r, data["glycosidicBonds"]))
        for g in p["geometries"]:
            verify_handedness(source, *projection_graph(p["formula"], g))
        anomeric = r["anomericAtom"]
        assert anomeric == r["atoms"]["C2" if target == "FRU" else "C1"]
        assert r["anomericConfiguration"] == ("alpha" if target == "GLC" else "beta")
        free = any(n in hydroxyls for n in adj[anomeric])
        assert free == r["freeAnomeric"]
        if free:
            reducing.append(r["id"])
        if target == "2DR":
            assert sorted(atoms[n]["element"] for n in adj[r["atoms"]["C2"]]) == ["C", "C", "H", "H"]
            assert "O2" not in r["atoms"]
        record["residues"].append({"residue": r["id"], "identityFromGraphAndHandedness": source["scalar"]["_chem_comp.name"],
                                   "sourceMonomer": target, "centersChecked": centers, "projectionNormalAndTurnedMatch": True,
                                   "anomericCarbon": r["anomericCarbon"], "freeAnomericHydroxyl": free,
                                   "projectionSides": {s["atom"]: s["side"] for s in p["formula"]["substituents"]}})
    assert reducing == data["reducingEnds"]
    record["reducingEndsFromGraph"] = reducing
    counts = Counter()
    record["linksFromGraph"] = []
    for b in data["glycosidicBonds"]:
        rd = next(r for r in data["residues"] if r["id"] == b["donorResidue"])
        ra = next(r for r in data["residues"] if r["id"] == b["acceptorResidue"])
        assert b["donorAtom"] == rd["anomericAtom"] == rd["atoms"][b["donorCarbon"]]
        assert b["acceptorAtom"] == ra["atoms"][b["acceptorCarbon"]]
        config = "alpha" if identities[rd["id"]] == "GLC" else "beta"
        assert b["configuration"] == config
        notation = ("α" if config == "alpha" else "β") + f'({b["donorCarbon"][1:]}→{b["acceptorCarbon"][1:]})' + ("β" if id == "SUC" else "")
        assert b["notation"] == notation
        assert b["branch"] == (b["acceptorCarbon"] == "C6")
        counts[f'{config}{b["donorCarbon"][1:]}-{b["acceptorCarbon"][1:]}'] += 1
        record["linksFromGraph"].append({"id": b["id"], "donor": f'{b["donorResidue"]}:{b["donorCarbon"]}',
                                       "oxygenIndex": b["bridgingAtom"], "acceptor": f'{b["acceptorResidue"]}:{b["acceptorCarbon"]}', "notation": notation})
    branches = [{"residue": b["acceptorResidue"], "carbon": "C6", "bond": b["id"]} for b in data["glycosidicBonds"] if b["branch"]]
    assert branches == data["branchPoints"]
    record["branchPointsFromGraph"] = branches
    if id in EXPECTED_COUNTS:
        assert dict(counts) == EXPECTED_COUNTS[id]
        assert len(data["glycosidicBonds"]) == len(data["residues"]) - 1 and len(reducing) == 1
        record["fragmentLinkCounts"] = dict(counts)
        acceptors = {b["acceptorResidue"] for b in data["glycosidicBonds"]}
        record["nonReducingEndsFromGraph"] = [r["id"] for r in data["residues"] if r["id"] not in acceptors]
        outgoing = {b["donorResidue"]: b for b in data["glycosidicBonds"]}
        depths = {}
        for r in data["residues"]:
            at, depth = r["id"], 0
            while at in outgoing:
                b = outgoing[at]
                depth += int(b["branch"])
                at = b["acceptorResidue"]
            assert at in reducing
            depths[r["id"]] = depth
        assert max(depths.values()) == {"AMYLOSE": 0, "AMYLOPECTIN": 1, "GLYCOGEN": 2, "CELLULOSE": 0}[id]
        record["branchDepthFromGraph"] = depths
        record["biologicalArchitectureStatus"] = "UNCERTAIN: representative fragment; no unique full biological polymer/conformer established"
    report["records"].append(record)

corrections = {
    "MAL": "Comparison explanation now distinguishes donor C1 configuration from the free reducing-end configuration; represented maltose is alpha at both.",
    "CBI": "Comparison explanation no longer implies the shipped maltose/cellobiose pair differs only at one atom; their free reducing ends are alpha versus beta too.",
    "LAT": "Explanation uses C4 substituent rather than incorrectly calling the glucose acceptor's glycosidic C4 oxygen a free OH.",
    "SUC": "Accessible Haworth description states canonical standard-orientation sides and explains the fructose ring's proper half-turn, avoiding display-y versus canonical-side ambiguity.",
}
for record in report["records"]:
    record["overallStatus"] = "CORRECTED" if record["id"] in corrections else "VERIFIED"
    if record["id"] in corrections:
        record["wordingCorrection"] = corrections[record["id"]]
report["summary"] = {"structuresVerified": len(report["records"]), "residuesComparedToRawCcd": sum(len(r["residues"]) for r in report["records"]),
                     "projectionGraphAndHandednessChecks": sum(len(r["residues"]) * 2 for r in report["records"]), "wholeCcdGraphAndGeometryChecks": len(CIFS),
                     "overallClassification": {"VERIFIED": 10, "CORRECTED": 4}, "coordinateOrConnectivityCorrections": 0}
(ROOT / "docs/scientific-polish-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report["summary"]))
