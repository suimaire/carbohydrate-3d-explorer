"""Disaccharide validation and representative polysaccharide-fragment construction.

Two jobs, both driven by structures that were downloaded from public archives:

1. Disaccharides are taken *whole* from wwPDB Chemical Component Dictionary entries
   (MAL, CBI, LAT, SUC). Nothing is generated: only rigid alignment plus independent
   checks of stereochemistry, residue identity and glycosidic connectivity.

2. Polysaccharide *fragments* are assembled. Ring residues are the already validated
   CCD monosaccharide templates (GLC / BGC) placed as rigid bodies; every glycosidic
   junction reproduces the geometry measured in a downloaded reference structure
   (MAL for alpha(1->4), CBI for beta(1->4), PubChem isomaltose for alpha(1->6)).
   No bond length, angle or torsion is invented. See docs/POLYSACCHARIDE_MODELING.md.
"""

import math
import pathlib
import shlex

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Geometry import Point3D

RING = ["C1", "C2", "C3", "C4", "C5", "O5"]
EXOCYCLIC_6 = ["O6", "H61", "H62", "HO6"]


# --------------------------------------------------------------------------- io
def cif_loop(text, prefix):
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith(prefix + "."))
    headers = []
    rows = []
    i = start
    while lines[i].startswith(prefix + "."):
        headers.append(lines[i].strip().split(".")[1])
        i += 1
    while i < len(lines) and not lines[i].startswith(("#", "loop_", "_")):
        values = shlex.split(lines[i])
        i += 1
        if values:
            assert len(values) == len(headers), (prefix, values)
            rows.append(dict(zip(headers, values)))
    return rows


def read_ccd(path):
    """Atom names, elements, bonds, declared stereo and ideal coordinates."""
    text = pathlib.Path(path).read_text()
    atoms = cif_loop(text, "_chem_comp_atom")
    bonds = cif_loop(text, "_chem_comp_bond")
    names = [a["atom_id"] for a in atoms]
    index = {n: i for i, n in enumerate(names)}
    xyz = np.array(
        [[float(a[f"pdbx_model_Cartn_{ax}_ideal"]) for ax in "xyz"] for a in atoms]
    )
    residues = {}
    for i, a in enumerate(atoms):
        number = a.get("pdbx_residue_numbering", "?")
        if number not in ("?", "."):
            residues.setdefault(int(number), {})[a["pdbx_component_atom_id"]] = i
    return dict(
        atoms=atoms,
        names=names,
        index=index,
        xyz=xyz,
        elements=[a["type_symbol"] for a in atoms],
        bonds=[(index[b["atom_id_1"]], index[b["atom_id_2"]]) for b in bonds],
        residues=residues,
        declared={
            a["atom_id"]: a["pdbx_stereo_config"]
            for a in atoms
            if a["pdbx_stereo_config"] in ("R", "S")
        },
        components={
            int(a["pdbx_residue_numbering"]): a["pdbx_component_comp_id"]
            for a in atoms
            if a.get("pdbx_residue_numbering", "?") not in ("?", ".")
        },
    )


def rdkit_from_ccd(data):
    rw = Chem.RWMol()
    for element in data["elements"]:
        rw.AddAtom(Chem.Atom(element))
    for i, j in data["bonds"]:
        rw.AddBond(i, j, Chem.BondType.SINGLE)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    conf = Chem.Conformer(mol.GetNumAtoms())
    conf.Set3D(True)
    for i, p in enumerate(data["xyz"]):
        conf.SetAtomPosition(i, Point3D(*p))
    mol.AddConformer(conf)
    Chem.AssignStereochemistryFrom3D(mol)
    return mol


def cip_from_3d(mol, names):
    return {
        names[a.GetIdx()]: a.GetProp("_CIPCode")
        for a in mol.GetAtoms()
        if a.HasProp("_CIPCode")
    }


# ---------------------------------------------------------------------- geometry
def unit(v):
    return v / np.linalg.norm(v)


def torsion(p0, p1, p2, p3):
    b0, b1, b2 = p0 - p1, p2 - p1, p3 - p2
    n = unit(b1)
    v = b0 - (b0 @ n) * n
    w = b2 - (b2 @ n) * n
    return math.degrees(math.atan2(np.cross(n, v) @ w, v @ w))


def bond_angle(p0, p1, p2):
    a, b = p0 - p1, p2 - p1
    return math.degrees(math.acos(np.clip(a @ b / np.linalg.norm(a) / np.linalg.norm(b), -1, 1)))


def signed_volume(centre, a, b, c):
    """Local chirality of a tetrahedral centre; sign is conformation independent."""
    return float(np.dot(a - centre, np.cross(b - centre, c - centre)))


# Three named neighbours per ring stereocentre, in a fixed order. The sign of the
# volume they span is a direct chirality read-out that, unlike an R/S letter, does
# not change when a neighbouring OH becomes a glycosidic bond.
CHIRALITY_PROBES = {
    "C2": ("C1", "C3", "O2"),
    "C3": ("C2", "C4", "O3"),
    "C4": ("C3", "C5", "O4"),
    "C5": ("C4", "O5", "C6"),
}


def chirality_signs(xyz, atoms):
    """Signed volume at each ring stereocentre that has all of its probe atoms."""
    out = {}
    for centre, probe in CHIRALITY_PROBES.items():
        if centre in atoms and all(n in atoms for n in probe):
            out[centre] = round(
                signed_volume(xyz[atoms[centre]], *[xyz[atoms[n]] for n in probe]), 4
            )
    return out


def kabsch(P, Q):
    """4x4 rigid transform mapping P onto Q. Reflection is forbidden."""
    cp, cq = P.mean(0), Q.mean(0)
    U, _, Vt = np.linalg.svd((P - cp).T @ (Q - cq))
    d = np.eye(3)
    d[-1, -1] = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ d @ U.T
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = cq - R @ cp
    assert np.linalg.det(R) > 0.99, "rigid transform must not reflect the structure"
    return M


def transform(M, X):
    return np.asarray(X) @ M[:3, :3].T + M[:3, 3]


def invert(M):
    R = M[:3, :3].T
    N = np.eye(4)
    N[:3, :3] = R
    N[:3, 3] = -R @ M[:3, 3]
    return N


def rmsd(A, B):
    return float(np.sqrt(((np.asarray(A) - np.asarray(B)) ** 2).sum(1).mean()))


def local_frame(a, b, c):
    """Right-handed frame anchored at c, x along b->c, y towards a."""
    e1 = unit(c - b)
    v = a - b
    e2 = unit(v - (v @ e1) * e1)
    M = np.eye(4)
    M[:3, :3] = np.column_stack((e1, e2, np.cross(e1, e2)))
    M[:3, 3] = c
    return M


def rotate_about(origin, direction, degrees, points):
    d = unit(direction)
    t = math.radians(degrees)
    K = np.array([[0, -d[2], d[1]], [d[2], 0, -d[0]], [-d[1], d[0], 0]])
    R = np.eye(3) + math.sin(t) * K + (1 - math.cos(t)) * (K @ K)
    return (np.asarray(points) - origin) @ R.T + origin


# ------------------------------------------------------------- anomeric reference
class AnomericReference:
    """alpha/beta from the sign of the volume spanned at the anomeric carbon.

    The sign is read from the CCD monosaccharides this project already validated
    (GLC = alpha, BGC = beta), so it never depends on ring conformation, on CIP
    priorities that change when the anomeric OH becomes a glycosidic bond, or on
    which way the picture happens to be drawn.
    """

    def __init__(self, templates):
        glc, bgc = templates["GLC"], templates["BGC"]
        alpha_volume = self._volume(glc, "C1", "O1")
        beta_volume = self._volume(bgc, "C1", "O1")
        self.alpha = np.sign(alpha_volume)
        beta = np.sign(beta_volume)
        assert self.alpha == -beta != 0, "alpha and beta must give opposite signs"
        self.checks = {
            "GLC": round(float(alpha_volume), 4),
            "BGC": round(float(beta_volume), 4),
        }
        for name, anomeric, exo, expected in [
            ("GAL", "C1", "O1", beta),
            ("FRU", "C2", "O2", beta),
        ]:
            volume = self._volume(templates[name], anomeric, exo)
            assert np.sign(volume) == expected, f"{name} reference anomer disagrees"
            self.checks[name] = round(float(volume), 4)
        # Both shipped pentofuranoses are beta; there is no alpha counterpart to
        # calibrate against, so they are only required to agree with each other.
        pentose = {
            name: round(float(self._volume(templates[name], "C1", "O1", ring_oxygen="O4")), 4)
            for name in ("BDR", "2DR")
        }
        assert np.sign(pentose["BDR"]) == np.sign(pentose["2DR"]) != 0
        self.pentofuranose_beta = np.sign(pentose["BDR"])
        self.checks.update(pentose)

    @staticmethod
    def _volume(template, anomeric, exo, ring_oxygen="O5", ring_neighbour=None):
        xyz, index = template["xyz"], template["index"]
        ring_neighbour = ring_neighbour or ("C2" if anomeric == "C1" else "C3")
        return signed_volume(
            xyz[index[anomeric]],
            xyz[index[ring_oxygen]],
            xyz[index[exo]],
            xyz[index[ring_neighbour]],
        )

    def classify(self, xyz, anomeric_i, ring_oxygen_i, exocyclic_i, ring_neighbour_i):
        v = signed_volume(
            xyz[anomeric_i], xyz[ring_oxygen_i], xyz[exocyclic_i], xyz[ring_neighbour_i]
        )
        return ("alpha" if np.sign(v) == self.alpha else "beta"), round(float(v), 4)


# ------------------------------------------------------------------- SDF helpers
def molblock(mol):
    return Chem.MolToMolBlock(mol, includeStereo=True) + "\n$$$$\n"


def roundtrip_cip(sdf, names):
    """Re-read the exact shipped bytes and recompute R/S from rounded coordinates."""
    check = Chem.MolFromMolBlock(sdf.split("$$$$")[0], removeHs=False)
    Chem.RemoveStereochemistry(check)
    Chem.AssignStereochemistryFrom3D(check)
    return cip_from_3d(check, names)


def hydroxyl_atoms(mol):
    oxygens = [
        a
        for a in mol.GetAtoms()
        if a.GetSymbol() == "O" and any(n.GetSymbol() == "H" for n in a.GetNeighbors())
    ]
    return sorted(
        [a.GetIdx() for a in oxygens]
        + [n.GetIdx() for a in oxygens for n in a.GetNeighbors() if n.GetSymbol() == "H"]
    )


def minimum_nonbonded_distance(mol, xyz, ignore_pairs=()):
    """Closest heavy-atom contact that is not 1-2, 1-3 or 1-4 bonded."""
    heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetSymbol() != "H"]
    dm = Chem.GetDistanceMatrix(mol)
    worst, pair = math.inf, None
    for a in range(len(heavy)):
        for b in range(a + 1, len(heavy)):
            i, j = heavy[a], heavy[b]
            if dm[i][j] <= 3 or (i, j) in ignore_pairs:
                continue
            d = float(np.linalg.norm(xyz[i] - xyz[j]))
            if d < worst:
                worst, pair = d, (i, j)
    return round(worst, 3), pair


def relax_hydrogens(mol):
    """MMFF94s relaxation of hydrogen positions only.

    Every heavy atom is held by a strong positional constraint, so the ring
    geometry, the glycosidic junctions and every stereocentre stay exactly where
    the rigid assembly placed them; only rotatable O-H orientations settle.
    """
    before = np.array(mol.GetConformer().GetPositions())
    props = AllChem.MMFFGetMoleculeProperties(mol, mmffVariant="MMFF94s")
    assert props is not None, "MMFF94s could not type this molecule"
    ff = AllChem.MMFFGetMoleculeForceField(mol, props)
    for a in mol.GetAtoms():
        if a.GetSymbol() != "H":
            ff.MMFFAddPositionConstraint(a.GetIdx(), 0.0, 1.0e5)
    ff.Minimize(maxIts=2000)
    after = np.array(mol.GetConformer().GetPositions())
    heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetSymbol() != "H"]
    shift = float(np.abs(after[heavy] - before[heavy]).max())
    assert shift < 5e-3, f"heavy atoms moved during hydrogen relaxation ({shift:.4f} A)"
    return round(shift, 5)


def orient_by_inertia(xyz, elements, head, tail, reference):
    """Rigidly orient a fragment: long axis to x, chain start towards -x.

    Only a proper rotation and a translation; the sign conventions are fixed by
    atoms of the molecule itself so the result is deterministic.
    """
    heavy = [i for i, e in enumerate(elements) if e != "H"]
    centred = xyz - xyz[heavy].mean(0)
    _, _, vt = np.linalg.svd(centred[heavy] - centred[heavy].mean(0))
    x = unit(vt[0])
    if (centred[tail] - centred[head]) @ x < 0:
        x = -x
    v = centred[reference] - centred[heavy].mean(0)
    y = unit(v - (v @ x) * x)
    R = np.column_stack((x, y, np.cross(x, y)))
    assert np.linalg.det(R) > 0.99
    return centred @ R


# ------------------------------------------------------------------ disaccharides
DISACCHARIDES = {
    # CCD id: donor residue number, acceptor residue number, acceptor atom carrying
    # the bridging oxygen, donor anomeric carbon, acceptor linkage carbon.
    "MAL": dict(donor=2, acceptor=1, bridge="O4", donorAnomeric="C1", acceptorCarbon="C4"),
    "CBI": dict(donor=2, acceptor=1, bridge="O4", donorAnomeric="C1", acceptorCarbon="C4"),
    "LAT": dict(donor=2, acceptor=1, bridge="O4", donorAnomeric="C1", acceptorCarbon="C4"),
    "SUC": dict(donor=1, acceptor=2, bridge="O2", donorAnomeric="C1", acceptorCarbon="C2"),
}

# Chemical facts each shipped disaccharide has to satisfy, written down before the
# files are read. Sugar identity is proved by superposing the validated CCD
# monosaccharide; the anomeric configurations are decided geometrically.
DISACCHARIDE_CHEMISTRY = {
    "MAL": dict(
        template={1: "GLC", 2: "GLC"},
        anomer={1: "alpha", 2: "alpha"},
        linkage="alpha", donorCarbon=1, acceptorCarbon=4, reducing=1,
    ),
    "CBI": dict(
        template={1: "BGC", 2: "BGC"},
        anomer={1: "beta", 2: "beta"},
        linkage="beta", donorCarbon=1, acceptorCarbon=4, reducing=1,
    ),
    "LAT": dict(
        template={1: "BGC", 2: "GAL"},
        anomer={1: "beta", 2: "beta"},
        linkage="beta", donorCarbon=1, acceptorCarbon=4, reducing=1,
    ),
    "SUC": dict(
        template={1: "GLC", 2: "FRU"},
        anomer={1: "alpha", 2: "beta"},
        linkage="alpha", donorCarbon=1, acceptorCarbon=2, reducing=None,
    ),
}

RESIDUE_LABEL = {
    "GLC": ("glucose", "Glc", "포도당", "alpha-D-glucopyranose", "pyranose", "C1"),
    "BGC": ("glucose", "Glc", "포도당", "beta-D-glucopyranose", "pyranose", "C1"),
    "GAL": ("galactose", "Gal", "갈락토스", "beta-D-galactopyranose", "pyranose", "C1"),
    "FRU": ("fructose", "Fru", "과당", "beta-D-fructofuranose", "furanose", "C2"),
    "BDR": ("ribose", "Rib", "리보스", "beta-D-ribofuranose", "furanose", "C1"),
    "2DR": ("2-deoxyribose", "dRib", "2-디옥시리보스",
            "2-deoxy-beta-D-ribofuranose", "furanose", "C1"),
}

RING_ATOMS_BY_TEMPLATE = {
    "GLC": RING, "BGC": RING, "GAL": RING,
    "FRU": ["C2", "C3", "C4", "C5", "O5"],
    "BDR": ["C1", "C2", "C3", "C4", "O4"],
    "2DR": ["C1", "C2", "C3", "C4", "O4"],
}

RING_OXYGEN_BY_TEMPLATE = {
    "GLC": "O5", "BGC": "O5", "GAL": "O5", "FRU": "O5", "BDR": "O4", "2DR": "O4",
}


def residue_descriptor(template_id, anomer, atoms, ring_atoms, anomeric_atom, free):
    sugar, short, korean, form, ring, anomeric_carbon = RESIDUE_LABEL[template_id]
    assert anomer is None or anomer in form, (template_id, anomer, form)
    display = form.replace("alpha", "α").replace("beta", "β")
    return dict(
        sugar=sugar,
        sugarLabel=short,
        koreanSugar=korean,
        ringForm=ring,
        form=display,
        anomericCarbon=anomeric_carbon,
        anomericConfiguration=anomer,
        anomericAtom=anomeric_atom,
        ringAtoms=ring_atoms,
        carbons={n: i for n, i in sorted(atoms.items()) if n.startswith("C")},
        atoms=atoms,
        freeAnomeric=free,
    )


def notation(config, donor_carbon, acceptor_carbon, branch=False, reciprocal=None):
    greek = "α" if config == "alpha" else "β"
    if reciprocal:
        other = "α" if reciprocal[0] == "alpha" else "β"
        return f"{greek}({donor_carbon}→{acceptor_carbon}){other}"
    return f"{greek}({donor_carbon}→{acceptor_carbon})"


def monosaccharide_metadata(mol, data, template_id, anomeric_ref):
    """Single-residue metadata in the same shape the larger structures use."""
    names, xyz, index = data["names"], data["xyz"], data["index"]
    ring_names = RING_ATOMS_BY_TEMPLATE[template_id]
    ring_oxygen = RING_OXYGEN_BY_TEMPLATE[template_id]
    anomeric_carbon = RESIDUE_LABEL[template_id][5]
    exocyclic = "O1" if anomeric_carbon == "C1" else "O2"
    ring_neighbour = "C2" if anomeric_carbon == "C1" else "C3"
    volume = signed_volume(
        xyz[index[anomeric_carbon]], xyz[index[ring_oxygen]],
        xyz[index[exocyclic]], xyz[index[ring_neighbour]],
    )
    if RESIDUE_LABEL[template_id][4] == "pyranose" or template_id == "FRU":
        anomer = "alpha" if np.sign(volume) == anomeric_ref.alpha else "beta"
    else:
        anomer = "beta" if np.sign(volume) == anomeric_ref.pentofuranose_beta else "alpha"
    expected = "alpha" if template_id == "GLC" else "beta"
    assert anomer == expected, (template_id, anomer)
    residue = residue_descriptor(
        template_id, anomer, dict(index), [index[n] for n in ring_names],
        index[anomeric_carbon], True,
    )
    metadata = assemble_metadata(mol, names, data["elements"], [
        dict(id="A", residueIndex=1, **residue)
    ], [])
    return metadata, dict(anomer=anomer, anomericSignedVolume=round(float(volume), 4))


def build_disaccharide(cif_path, ccd_id, templates, anomeric_ref, align):
    """Validate a CCD disaccharide and return (sdf, metadata, report)."""
    spec = DISACCHARIDES[ccd_id]
    facts = DISACCHARIDE_CHEMISTRY[ccd_id]
    data = read_ccd(cif_path)
    mol = rdkit_from_ccd(data)
    names, xyz, residues = data["names"], data["xyz"], data["residues"]

    cip = cip_from_3d(mol, names)
    assert cip == data["declared"], (ccd_id, "CIP from 3D disagrees with the CCD")
    rings = [list(r) for r in Chem.GetSymmSSSR(mol)]
    assert len(rings) == 2, (ccd_id, "expected exactly two sugar rings")

    donor, acceptor = residues[spec["donor"]], residues[spec["acceptor"]]
    bridge = acceptor[spec["bridge"]]
    donor_anomeric = donor[spec["donorAnomeric"]]
    acceptor_carbon = acceptor[spec["acceptorCarbon"]]

    # The bridging oxygen must really be the only non-ring O joining the two rings.
    ring_atoms = {i for r in rings for i in r}
    linkers = [
        a.GetIdx()
        for a in mol.GetAtoms()
        if a.GetSymbol() == "O"
        and a.GetIdx() not in ring_atoms
        and len([n for n in a.GetNeighbors() if n.GetSymbol() == "C"]) == 2
        and a.GetDegree() == 2
    ]
    assert linkers == [bridge], (ccd_id, "unexpected glycosidic oxygen", linkers)
    neighbours = {n.GetIdx() for n in mol.GetAtomWithIdx(bridge).GetNeighbors()}
    assert neighbours == {donor_anomeric, acceptor_carbon}, (ccd_id, "linkage mismatch")

    # Residue identity: superpose the already validated monosaccharide.
    report_residues = {}
    descriptors = {}
    for number, atoms in sorted(residues.items()):
        template_id = facts["template"][number]
        assert data["components"][number] == template_id, (
            ccd_id, number, "CCD subcomponent disagrees with the expected sugar")
        template = templates[template_id]
        shared = [
            n for n in template["index"]
            if n in atoms and not n.startswith("H")
        ]
        P = np.array([template["xyz"][template["index"][n]] for n in shared])
        Q = np.array([xyz[atoms[n]] for n in shared])
        fit = rmsd(transform(kabsch(P, Q), P), Q)
        limit = 0.35 if RESIDUE_LABEL[template_id][4] == "furanose" else 0.10
        assert fit < limit, (ccd_id, number, "residue does not match its monosaccharide", fit)

        anomeric_name = RESIDUE_LABEL[template_id][5]
        ring_neighbour = "C2" if anomeric_name == "C1" else "C3"
        exocyclic_name = "O1" if anomeric_name == "C1" else "O2"
        exocyclic = atoms.get(exocyclic_name, bridge)
        anomer, volume = anomeric_ref.classify(
            xyz, atoms[anomeric_name], atoms[RING_OXYGEN_BY_TEMPLATE[template_id]],
            exocyclic, atoms[ring_neighbour]
        )
        assert anomer == facts["anomer"][number], (ccd_id, number, anomer)
        # A reducing end needs a free anomeric OH. In sucrose the fructose does
        # carry an O2, but it is the bridging oxygen, not a hydroxyl.
        free = exocyclic_name in atoms and atoms[exocyclic_name] != bridge
        ring_list = [atoms[n] for n in RING_ATOMS_BY_TEMPLATE[template_id]]
        descriptors[number] = residue_descriptor(
            template_id, anomer, atoms, ring_list, atoms[anomeric_name], free
        )
        report_residues[number] = dict(
            component=template_id, anomer=anomer, superpositionRmsd=round(fit, 4),
            anomericSignedVolume=volume, freeAnomericOH=free,
        )

    donor_number, acceptor_number = spec["donor"], spec["acceptor"]
    donor_anomer = descriptors[donor_number]["anomericConfiguration"]
    assert donor_anomer == facts["linkage"], (ccd_id, "linkage configuration")

    prev_name = "C3" if spec["acceptorCarbon"] == "C4" else "C1"
    geometry = dict(
        bond=round(float(np.linalg.norm(xyz[donor_anomeric] - xyz[bridge])), 3),
        angle=round(bond_angle(xyz[donor_anomeric], xyz[bridge], xyz[acceptor_carbon]), 2),
        phi=round(torsion(xyz[donor["O5"]], xyz[donor_anomeric], xyz[bridge], xyz[acceptor_carbon]), 2),
        psi=round(torsion(xyz[donor_anomeric], xyz[bridge], xyz[acceptor_carbon], xyz[acceptor[prev_name]]), 2),
    )
    assert 1.36 < geometry["bond"] < 1.48, (ccd_id, geometry)
    assert 105 < geometry["angle"] < 125, (ccd_id, geometry)

    # Rigid alignment into the shared display frame, anchored on residue 1's ring
    # so every pyranose in the library is presented from the same viewpoint.
    anchor_ring = [residues[1][n] for n in RING]
    aligned = align(xyz, anchor_ring)
    for i, p in enumerate(aligned):
        mol.GetConformer().SetAtomPosition(i, Point3D(*p))
    sdf = molblock(mol)
    assert roundtrip_cip(sdf, names) == cip, (ccd_id, "CIP changed after serialisation")

    # Residue letters: A is the non-reducing (donor) residue, as glycans are written.
    order = [donor_number, acceptor_number]
    letters = {number: chr(ord("A") + i) for i, number in enumerate(order)}
    residue_meta = []
    for number in order:
        d = descriptors[number]
        residue_meta.append(dict(id=letters[number], residueIndex=len(residue_meta) + 1, **d))

    reciprocal = None
    if facts["reducing"] is None:
        reciprocal = (descriptors[acceptor_number]["anomericConfiguration"],)
    bond = dict(
        id="L1",
        donorResidue=letters[donor_number],
        donorCarbon=spec["donorAnomeric"],
        acceptorResidue=letters[acceptor_number],
        acceptorCarbon=spec["acceptorCarbon"],
        donorAtom=donor_anomeric,
        acceptorAtom=acceptor_carbon,
        bridgingAtom=bridge,
        configuration=donor_anomer,
        notation=notation(donor_anomer, facts["donorCarbon"], facts["acceptorCarbon"],
                          reciprocal=reciprocal),
        branch=False,
        geometry=geometry,
    )
    # Present the atoms by residue and biochemical name ("Glc A - C1") rather
    # than by the CCD's own primed labels, which the original file keeps.
    component_names = list(names)
    residue_of = [None] * len(names)
    for number, atoms_map in residues.items():
        for component_atom, index in atoms_map.items():
            component_names[index] = component_atom
            residue_of[index] = letters[number]
    assert all(r is not None for r in residue_of), (ccd_id, "unassigned atom")
    metadata = assemble_metadata(mol, component_names, data["elements"],
                                 residue_meta, [bond], residue_of=residue_of,
                                 source_names=names)
    expected_reducing = [] if facts["reducing"] is None else [letters[facts["reducing"]]]
    assert metadata["reducingEnds"] == expected_reducing, (
        ccd_id, "reducing end", metadata["reducingEnds"])
    report = dict(
        source="wwPDB Chemical Component Dictionary",
        component=ccd_id,
        CIP_from_3D=cip,
        CIP_matches_CCD=True,
        CIP_after_serialisation=True,
        rings=[len(r) for r in rings],
        residues=report_residues,
        linkage=dict(notation=bond["notation"], **geometry),
        reducingEnds=[r["id"] for r in residue_meta if r["freeAnomeric"]],
    )
    return sdf, metadata, report


# ----------------------------------------------------------- polysaccharide build
def measure_linkage(cif_path, ccd_id, templates, template_id, acceptor_atom="O4"):
    """Local transform placing a donor residue on an acceptor, read off a CCD dimer."""
    spec = DISACCHARIDES[ccd_id]
    data = read_ccd(cif_path)
    xyz = data["xyz"]
    donor, acceptor = data["residues"][spec["donor"]], data["residues"][spec["acceptor"]]
    bridge = acceptor[acceptor_atom]
    carbon = "C4" if acceptor_atom == "O4" else "C6"
    previous = "C3" if acceptor_atom == "O4" else "C5"
    template = templates[template_id]
    P = np.array([template["xyz"][template["index"][n]] for n in RING])
    fit_acceptor = kabsch(P, np.array([xyz[acceptor[n]] for n in RING]))
    fit_donor = kabsch(P, np.array([xyz[donor[n]] for n in RING]))
    placed_bridge = transform(fit_acceptor, [template["xyz"][template["index"][acceptor_atom]]])[0]
    report = dict(
        source=f"wwPDB CCD {ccd_id}",
        acceptorRingRmsd=round(rmsd(transform(fit_acceptor, P), np.array([xyz[acceptor[n]] for n in RING])), 4),
        donorRingRmsd=round(rmsd(transform(fit_donor, P), np.array([xyz[donor[n]] for n in RING])), 4),
        bridgingOxygenDeviation=round(float(np.linalg.norm(placed_bridge - xyz[bridge])), 4),
        bond=round(float(np.linalg.norm(xyz[donor["C1"]] - xyz[bridge])), 3),
        angle=round(bond_angle(xyz[donor["C1"]], xyz[bridge], xyz[acceptor[carbon]]), 2),
        phi=round(torsion(xyz[donor["O5"]], xyz[donor["C1"]], xyz[bridge], xyz[acceptor[carbon]]), 2),
        psi=round(torsion(xyz[donor["C1"]], xyz[bridge], xyz[acceptor[carbon]], xyz[acceptor[previous]]), 2),
    )
    assert report["acceptorRingRmsd"] < 0.02 and report["donorRingRmsd"] < 0.02
    assert report["bridgingOxygenDeviation"] < 0.02
    frame = local_frame(xyz[acceptor[previous]], xyz[acceptor[carbon]], xyz[bridge])
    return invert(frame) @ fit_donor, report


def _name_pyranose(mol, ring, anomeric_carbon, ring_oxygen):
    """Walk a pyranose ring and hand back biochemical atom names."""
    names = {"C1": anomeric_carbon, "O5": ring_oxygen}
    previous, current = ring_oxygen, anomeric_carbon
    for label in ["C2", "C3", "C4", "C5"]:
        nxt = next(
            n.GetIdx()
            for n in mol.GetAtomWithIdx(current).GetNeighbors()
            if n.GetIdx() in ring and n.GetIdx() != previous
        )
        names[label] = nxt
        previous, current = current, nxt
    return names


def measure_pubchem_dimer(sdf_path, templates, anomeric_ref, cid, sugar,
                          template_id, acceptor_carbon, expected_anomer):
    """Glycosidic geometry from a PubChem computed 3D conformer of a disaccharide.

    PubChem's conformers are the reference for every junction in the shipped
    polysaccharide fragments: one pipeline, one archive, and non-bonded contacts
    that stay in a physically sensible range.
    """
    mol = Chem.MolFromMolFile(str(sdf_path), removeHs=False)
    assert mol is not None, sdf_path
    xyz = np.array(mol.GetConformer().GetPositions())
    rings = [list(r) for r in Chem.GetSymmSSSR(mol)]
    assert len(rings) == 2 and all(len(r) == 6 for r in rings), (cid, "two pyranose rings")
    ring_atoms = {i for r in rings for i in r}

    def neighbours(i):
        return [n.GetIdx() for n in mol.GetAtomWithIdx(i).GetNeighbors()]

    def symbol(i):
        return mol.GetAtomWithIdx(i).GetSymbol()

    def anomeric(c):
        oxygens = [n for n in neighbours(c) if symbol(n) == "O"]
        return c in ring_atoms and len(oxygens) == 2 and any(o in ring_atoms for o in oxygens)

    bridges = [
        a.GetIdx()
        for a in mol.GetAtoms()
        if a.GetSymbol() == "O" and a.GetIdx() not in ring_atoms and a.GetDegree() == 2
        and all(symbol(n) == "C" for n in neighbours(a.GetIdx()))
    ]
    assert len(bridges) == 1, (cid, "exactly one glycosidic oxygen")
    bridge = bridges[0]
    left, right = neighbours(bridge)
    donor_c1, acceptor = (left, right) if anomeric(left) else (right, left)
    assert anomeric(donor_c1) and not anomeric(acceptor), (cid, "donor/acceptor")

    donor_o5 = next(n for n in neighbours(donor_c1) if symbol(n) == "O" and n in ring_atoms)
    donor = _name_pyranose(mol, next(r for r in rings if donor_c1 in r), donor_c1, donor_o5)

    if acceptor_carbon == 6:
        assert acceptor not in ring_atoms, (cid, "C6 acceptor must be exocyclic")
        acceptor_ring_carbon = next(
            n for n in neighbours(acceptor) if symbol(n) == "C" and n in ring_atoms)
        acceptor_previous = acceptor_ring_carbon
        omega_ring_oxygen = next(
            n for n in neighbours(acceptor_ring_carbon) if symbol(n) == "O" and n in ring_atoms)
    else:
        assert acceptor in ring_atoms, (cid, "C4 acceptor must be in the ring")
        ring = next(r for r in rings if acceptor in r)
        acceptor_anomeric = next(c for c in ring if symbol(c) == "C" and anomeric(c))
        acceptor_o5 = next(
            n for n in neighbours(acceptor_anomeric) if symbol(n) == "O" and n in ring_atoms)
        acceptor_names = _name_pyranose(mol, ring, acceptor_anomeric, acceptor_o5)
        assert acceptor_names[f"C{acceptor_carbon}"] == acceptor, (cid, "acceptor position")
        acceptor_previous = acceptor_names[f"C{acceptor_carbon - 1}"]
        omega_ring_oxygen = None

    config, volume = anomeric_ref.classify(xyz, donor_c1, donor_o5, bridge, donor["C2"])
    assert config == expected_anomer, (cid, sugar, config)

    template = templates[template_id]
    P = np.array([template["xyz"][template["index"][n]] for n in RING])
    Q = np.array([xyz[donor[n]] for n in RING])
    fit_donor = kabsch(P, Q)
    report = dict(
        source=f"PubChem CID {cid} ({sugar}), computed 3D conformer",
        donorRingRmsd=round(rmsd(transform(fit_donor, P), Q), 4),
        donorAnomer=config,
        donorAnomericSignedVolume=volume,
        bond=round(float(np.linalg.norm(xyz[donor_c1] - xyz[bridge])), 3),
        angle=round(bond_angle(xyz[donor_c1], xyz[bridge], xyz[acceptor]), 2),
        phi=round(torsion(xyz[donor_o5], xyz[donor_c1], xyz[bridge], xyz[acceptor]), 2),
        psi=round(torsion(xyz[donor_c1], xyz[bridge], xyz[acceptor], xyz[acceptor_previous]), 2),
    )
    if omega_ring_oxygen is not None:
        report["omega"] = round(
            torsion(xyz[omega_ring_oxygen], xyz[acceptor_previous], xyz[acceptor], xyz[bridge]), 2)
    assert report["donorRingRmsd"] < 0.10, report
    assert 1.36 < report["bond"] < 1.48 and 105 < report["angle"] < 125, report
    frame = local_frame(xyz[acceptor_previous], xyz[acceptor], xyz[bridge])
    return invert(frame) @ fit_donor, report


# Standard staggered rotamers. The alpha(1->6) linkage has three rotatable
# torsions and is genuinely flexible, so psi and the acceptor's omega are chosen
# from the staggered set that keeps a branch clear of the backbone. phi always
# keeps the exo-anomeric value measured in the isomaltose reference.
STAGGERED_PSI = (180.0, 60.0, -60.0)
STAGGERED_OMEGA = (-60.0, 60.0, 180.0)


class Fragment:
    """A representative oligosaccharide built from rigid, validated residues."""

    def __init__(self, template, links):
        self.template = template
        self.links = links
        self.index = template["index"]

    def place(self, plan, branch_torsions):
        t, ix, X = self.template, self.index, self.template["xyz"]
        coords = [np.array(X)]
        used = []
        step = 0
        for parent, link in plan[1:]:
            base = coords[parent]
            if link.endswith("14"):
                frame = local_frame(base[ix["C3"]], base[ix["C4"]], base[ix["O4"]])
                coords.append(transform(frame @ self.links[link], X))
            else:
                psi, omega = branch_torsions[step]
                step += 1
                coords[parent] = self._set_omega(base, omega)
                base = coords[parent]
                frame = local_frame(base[ix["C5"]], base[ix["C6"]], base[ix["O6"]])
                placed = transform(frame @ self.links[link], X)
                current = torsion(placed[ix["C1"]], base[ix["O6"]], base[ix["C6"]], base[ix["C5"]])
                coords.append(
                    rotate_about(base[ix["O6"]], base[ix["O6"]] - base[ix["C6"]], psi - current, placed)
                )
                used.append((psi, omega))
        return coords, used

    def _set_omega(self, coords, target):
        ix = self.index
        current = torsion(coords[ix["O5"]], coords[ix["C5"]], coords[ix["C6"]], coords[ix["O6"]])
        moving = [ix[n] for n in EXOCYCLIC_6 if n in ix]
        out = coords.copy()
        out[moving] = rotate_about(
            coords[ix["C5"]], coords[ix["C6"]] - coords[ix["C5"]], target - current, coords[moving]
        )
        return out

    def separation(self, coords, plan):
        heavy = [i for i, e in enumerate(self.template["elements"]) if e != "H"]
        worst, pair = math.inf, None
        for i in range(len(coords)):
            for j in range(i + 1, len(coords)):
                if plan[j][0] == i or plan[i][0] == j:
                    continue
                d = np.linalg.norm(
                    coords[i][heavy][:, None, :] - coords[j][heavy][None, :, :], axis=2
                ).min()
                if d < worst:
                    worst, pair = float(d), (i, j)
        return worst, pair

    def choose(self, plan):
        """Pick staggered branch torsions that keep the fragment free of overlap."""
        count = sum(1 for _, link in plan[1:] if link.endswith("16"))
        options = [(p, o) for p in STAGGERED_PSI for o in STAGGERED_OMEGA]
        if count == 0:
            coords, used = self.place(plan, [])
            return coords, used, self.separation(coords, plan)
        best = None
        stack = [[]]
        while stack:
            partial = stack.pop()
            if len(partial) == count:
                coords, used = self.place(plan, partial)
                score = self.separation(coords, plan)
                if best is None or score[0] > best[2][0]:
                    best = (coords, used, score)
                continue
            for option in options:
                stack.append(partial + [option])
        return best


POLYMER_PLANS = {
    # residue 0 is the reducing end; every entry is (parent residue, linkage).
    "AMYLOSE": dict(
        template="GLC",
        plan=[(None, None)] + [(i, "a14") for i in range(0, 9)],
        expected={"a14": 9},
    ),
    "CELLULOSE": dict(
        template="BGC",
        plan=[(None, None)] + [(i, "b14") for i in range(0, 7)],
        expected={"b14": 7},
    ),
    "AMYLOPECTIN": dict(
        template="GLC",
        plan=[(None, None)]
        + [(i, "a14") for i in range(0, 7)]
        + [(4, "a16"), (8, "a14"), (9, "a14"), (10, "a14")],
        expected={"a14": 10, "a16": 1},
    ),
    "GLYCOGEN": dict(
        template="GLC",
        plan=[(None, None)]
        + [(i, "a14") for i in range(0, 6)]
        + [(2, "a16"), (7, "a14"), (8, "a14"), (9, "a14"), (10, "a14")]
        + [(8, "a16"), (12, "a14"), (13, "a14"), (14, "a14")],
        expected={"a14": 13, "a16": 2},
    ),
}

LINK_INFO = {
    "a14": dict(config="alpha", donor=1, acceptor=4, acceptorAtom="O4", branch=False),
    "b14": dict(config="beta", donor=1, acceptor=4, acceptorAtom="O4", branch=False),
    "a16": dict(config="alpha", donor=1, acceptor=6, acceptorAtom="O6", branch=True),
}


def build_polymer(name, templates, links, anomeric_ref, link_reports):
    plan = POLYMER_PLANS[name]["plan"]
    template_id = POLYMER_PLANS[name]["template"]
    template = templates[template_id]
    fragment = Fragment(template, links)
    coords, branch_torsions, (separation, pair) = fragment.choose(plan)
    assert separation > 2.6, (name, "fragment has a steric overlap", separation, pair)

    ix = template["index"]
    names = template["names"]
    elements = template["elements"]

    # Residues are lettered the way glycans are written: A is the non-reducing
    # terminus of the main chain, letters run towards the reducing end, and each
    # branch follows in the same direction after the chain it hangs from.
    children = {i: [] for i in range(len(plan))}
    for child, (parent, link) in enumerate(plan):
        if link is not None:
            children[parent].append((child, link))

    def chain_from(root):
        chain = [root]
        while True:
            straight = [c for c, l in children[chain[-1]] if not LINK_INFO[l]["branch"]]
            assert len(straight) <= 1, (name, "a residue may extend only one chain")
            if not straight:
                break
            chain.append(straight[0])
        return chain

    def order_from(root):
        ordered = list(reversed(chain_from(root)))
        tail = []
        for residue in ordered:
            for c, l in children[residue]:
                if LINK_INFO[l]["branch"]:
                    tail.extend(order_from(c))
        return ordered + tail

    main_chain = chain_from(0)
    display = order_from(0)
    assert sorted(display) == list(range(len(plan))), (name, "every residue must be lettered")
    letter_of = {residue: chr(ord("A") + i) for i, residue in enumerate(display)}

    # Atoms dropped when a glycosidic bond forms: the donor's anomeric OH and the
    # acceptor's hydroxyl hydrogen. The bridging oxygen belongs to the acceptor.
    drop = [set() for _ in plan]
    for child, (parent, link) in enumerate(plan):
        if link is None:
            continue
        drop[child] |= {ix["O1"], ix["HO1"]}
        drop[parent].add(ix["HO4" if LINK_INFO[link]["acceptorAtom"] == "O4" else "HO6"])

    rw = Chem.RWMol()
    positions = []
    atom_meta = []
    mapping = [None] * len(plan)
    for residue in display:
        local = {}
        for i, atom_name in enumerate(names):
            if i in drop[residue]:
                continue
            local[atom_name] = rw.AddAtom(Chem.Atom(elements[i]))
            positions.append(coords[residue][i])
            atom_meta.append(dict(name=atom_name, element=elements[i], residue=letter_of[residue]))
        mapping[residue] = local
    for residue in display:
        for i, j in template["bonds"]:
            a, b = names[i], names[j]
            if a in mapping[residue] and b in mapping[residue]:
                rw.AddBond(mapping[residue][a], mapping[residue][b], Chem.BondType.SINGLE)
    bonds_meta = []
    for child in display:
        parent, link = plan[child]
        if link is None:
            continue
        info = LINK_INFO[link]
        bridge_name = info["acceptorAtom"]
        rw.AddBond(mapping[child]["C1"], mapping[parent][bridge_name], Chem.BondType.SINGLE)
        bonds_meta.append((child, parent, link, bridge_name))

    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    conf = Chem.Conformer(mol.GetNumAtoms())
    conf.Set3D(True)
    for i, p in enumerate(positions):
        conf.SetAtomPosition(i, Point3D(*p))
    mol.AddConformer(conf)
    hydrogen_shift = relax_hydrogens(mol)
    Chem.AssignStereochemistryFrom3D(mol)

    xyz = np.array(mol.GetConformer().GetPositions())
    rings = [list(r) for r in Chem.GetSymmSSSR(mol)]
    assert len(rings) == len(plan) and all(len(r) == 6 for r in rings), (name, "ring check")

    # Independent per-residue checks on the assembled fragment. R/S letters are
    # not comparable here: the CIP priority at C3/C4 flips as soon as a
    # neighbouring OH becomes a glycosidic bond, even though no atom moved. The
    # chirality of every ring centre is therefore read from the geometry itself
    # and compared with the validated monosaccharide template.
    template_signs = chirality_signs(template["xyz"], template["index"])
    residue_reports = []
    residue_meta = []
    for position, residue in enumerate(display):
        letter = letter_of[residue]
        local = mapping[residue]
        free = "O1" in local
        exocyclic = local["O1"] if free else mapping[plan[residue][0]][
            LINK_INFO[plan[residue][1]]["acceptorAtom"]
        ]
        anomer, volume = anomeric_ref.classify(
            xyz, local["C1"], local["O5"], exocyclic, local["C2"]
        )
        expected_anomer = "alpha" if template_id == "GLC" else "beta"
        assert anomer == expected_anomer, (name, letter, anomer)
        cip = {
            atom_name: mol.GetAtomWithIdx(i).GetProp("_CIPCode")
            for atom_name, i in local.items()
            if mol.GetAtomWithIdx(i).HasProp("_CIPCode")
        }
        for carbon in ["C1", "C2", "C3", "C4", "C5"]:
            assert carbon in cip, (name, letter, carbon, "stereocentre not recognised")
        signs = chirality_signs(xyz, local)
        assert set(signs) == set(template_signs), (name, letter, "probe atoms missing")
        for carbon, value in signs.items():
            assert np.sign(value) == np.sign(template_signs[carbon]), (
                name, letter, carbon, value, template_signs[carbon])
        ring_list = [local[n] for n in RING]
        descriptor = residue_descriptor(
            template_id, anomer, dict(local), ring_list, local["C1"], free
        )
        residue_meta.append(dict(id=letter, residueIndex=position + 1, **descriptor))
        residue_reports.append(
            dict(id=letter, anomer=anomer, anomericSignedVolume=volume,
                 ringChiralitySigns={k: int(np.sign(v)) for k, v in sorted(signs.items())},
                 CIP={k: cip[k] for k in sorted(cip)})
        )

    linkage_reports = []
    glycosidic = []
    counts = {}
    for order, (child, parent, link, bridge_name) in enumerate(bonds_meta, start=1):
        donor_letter, acceptor_letter = letter_of[child], letter_of[parent]
        info = LINK_INFO[link]
        donor_c1 = mapping[child]["C1"]
        donor_o5 = mapping[child]["O5"]
        bridge = mapping[parent][bridge_name]
        acceptor_carbon = mapping[parent]["C4" if bridge_name == "O4" else "C6"]
        previous = mapping[parent]["C3" if bridge_name == "O4" else "C5"]
        measured = dict(
            bond=round(float(np.linalg.norm(xyz[donor_c1] - xyz[bridge])), 3),
            angle=round(bond_angle(xyz[donor_c1], xyz[bridge], xyz[acceptor_carbon]), 2),
            phi=round(torsion(xyz[donor_o5], xyz[donor_c1], xyz[bridge], xyz[acceptor_carbon]), 2),
            psi=round(torsion(xyz[donor_c1], xyz[bridge], xyz[acceptor_carbon], xyz[previous]), 2),
        )
        # Every junction has to reproduce its reference structure. The small
        # allowance absorbs the ~0.04 A difference between the CCD residue
        # template and the reference conformer's own ring; psi of a 1->6 branch is
        # deliberately re-set to a staggered value and is checked separately.
        reference = link_reports[link]
        for key, tolerance in [("bond", 0.03), ("angle", 1.5), ("phi", 3.0), ("psi", 3.0)]:
            delta = abs(measured[key] - reference[key])
            if key in ("phi", "psi"):
                delta = min(delta, 360 - delta)
            if not (link == "a16" and key == "psi"):
                assert delta < tolerance, (name, order, key, measured[key], reference[key])
        if link == "a16":
            assert min(abs(measured["psi"] - p) % 360 for p in STAGGERED_PSI) < 3.0 or min(
                abs(measured["psi"] - p + 360) % 360 for p in STAGGERED_PSI) < 3.0, (
                name, order, "branch psi is not a staggered rotamer", measured["psi"])
        counts[link] = counts.get(link, 0) + 1
        glycosidic.append(dict(
            id=f"L{order}",
            donorResidue=donor_letter,
            donorCarbon="C1",
            acceptorResidue=acceptor_letter,
            acceptorCarbon="C4" if bridge_name == "O4" else "C6",
            donorAtom=donor_c1,
            acceptorAtom=acceptor_carbon,
            bridgingAtom=bridge,
            configuration=info["config"],
            notation=notation(info["config"], info["donor"], info["acceptor"]),
            branch=info["branch"],
            geometry=measured,
        ))
        linkage_reports.append(dict(id=f"L{order}", notation=glycosidic[-1]["notation"], **measured))
    assert counts == POLYMER_PLANS[name]["expected"], (name, counts)

    head = mapping[0]["C1"]
    tail = mapping[main_chain[-1]]["C1"]
    oriented = orient_by_inertia(xyz, [a["element"] for a in atom_meta], head, tail, mapping[0]["O5"])
    for i, p in enumerate(oriented):
        mol.GetConformer().SetAtomPosition(i, Point3D(*p))
    sdf = molblock(mol)
    check = Chem.MolFromMolBlock(sdf.split("$$$$")[0], removeHs=False)
    Chem.RemoveStereochemistry(check)
    Chem.AssignStereochemistryFrom3D(check)
    reread = np.array(check.GetConformer().GetPositions())
    for position, residue in enumerate(display):
        letter = letter_of[residue]
        local = mapping[residue]
        free = "O1" in local
        exocyclic = local["O1"] if free else mapping[plan[residue][0]][
            LINK_INFO[plan[residue][1]]["acceptorAtom"]
        ]
        anomer, _ = anomeric_ref.classify(reread, local["C1"], local["O5"], exocyclic, local["C2"])
        assert anomer == residue_meta[position]["anomericConfiguration"], (name, letter)
        for carbon, value in chirality_signs(reread, local).items():
            assert np.sign(value) == np.sign(template_signs[carbon]), (
                name, letter, carbon, "chirality changed after serialisation")

    separation_after, close_pair = minimum_nonbonded_distance(mol, oriented)
    metadata = assemble_metadata(mol, [a["name"] for a in atom_meta],
                                 [a["element"] for a in atom_meta], residue_meta, glycosidic,
                                 residue_of=[a["residue"] for a in atom_meta])
    report = dict(
        kind="representative fragment, assembled from validated residues",
        residues=len(plan),
        atoms=mol.GetNumAtoms(),
        residueChecks=residue_reports,
        linkages=linkage_reports,
        linkageCounts=counts,
        branchTorsions=[dict(psi=p, omega=o) for p, o in branch_torsions],
        # Contacts between residues that are not directly linked are the test of
        # the assembly itself; the closest contact overall is dominated by the
        # inherent geometry of each glycosidic junction.
        minimumNonAdjacentResidueDistance=round(separation, 3),
        closestNonAdjacentResidues=[letter_of[i] for i in pair],
        minimumNonBondedHeavyDistance=separation_after,
        closestNonBondedPair=[atom_meta[i]["residue"] + ":" + atom_meta[i]["name"] for i in close_pair],
        hydrogenRelaxationHeavyAtomShift=hydrogen_shift,
        ringSizes=sorted(len(r) for r in rings),
        residueTemplate=template_id,
        templateRingChiralitySigns={k: int(np.sign(v)) for k, v in sorted(template_signs.items())},
        stereochemistryUnchangedAfterSerialisation=True,
    )
    if not counts.get("a16"):
        # Only meaningful for an unbranched run of one repeating linkage.
        report["screw"] = screw_parameters(coords, template)
    return sdf, metadata, report


def screw_parameters(coords, template):
    """Rotation and rise per residue of the repeating unit, for the linear runs."""
    ring = [template["index"][n] for n in RING]
    M = kabsch(coords[0][ring], coords[1][ring])
    R = M[:3, :3]
    angle = math.degrees(math.acos(np.clip((np.trace(R) - 1) / 2, -1, 1)))
    axis = unit(np.array([R[2, 1] - R[1, 2], R[0, 2] - R[2, 0], R[1, 0] - R[0, 1]]))
    return dict(
        degreesPerResidue=round(angle, 1),
        residuesPerTurn=round(360 / angle, 2),
        risePerResidue=round(abs(float(M[:3, 3] @ axis)), 2),
    )


# -------------------------------------------------------------------- metadata
def assemble_metadata(mol, names, elements, residues, glycosidic,
                      residue_of=None, source_names=None):
    atoms = [
        dict(name=names[i], element=elements[i], index=i)
        | ({"residue": residue_of[i]} if residue_of else {})
        | ({"sourceName": source_names[i]} if source_names else {})
        for i in range(mol.GetNumAtoms())
    ]
    ring_atoms = sorted({i for r in residues for i in r["ringAtoms"]})
    prefix = len(residues) > 1
    carbons = {}
    for residue in residues:
        for carbon, i in residue["carbons"].items():
            carbons[f"{residue['id']}:{carbon}" if prefix else carbon] = i
    reducing = [r["id"] for r in residues if r["freeAnomeric"]]
    branch_points = [
        dict(residue=b["acceptorResidue"], carbon=b["acceptorCarbon"], bond=b["id"])
        for b in glycosidic
        if b["branch"]
    ]
    return dict(
        atoms=atoms,
        carbons=carbons,
        ringAtoms=ring_atoms,
        hydroxylAtoms=hydroxyl_atoms(mol),
        anomericAtom=residues[0]["anomericAtom"] if not reducing
        else next(r["anomericAtom"] for r in residues if r["freeAnomeric"]),
        residues=residues,
        glycosidicBonds=glycosidic,
        reducingEnds=reducing,
        branchPoints=branch_points,
    )


def round_floats(value, digits=4):
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, dict):
        return {k: round_floats(v, digits) for k, v in value.items()}
    if isinstance(value, list):
        return [round_floats(v, digits) for v in value]
    return value
