"""Build educational heavy-atom keyframes from archived endpoints, offline.

Requires numpy + RDKit, just like prepare_molecules.py. No embedding, force-field
optimization, invented endpoint or reflection. Intermediates are internal-coordinate
illustrations, NOT calculated reaction intermediates or a dynamical trajectory.
"""
import pathlib, sys, json, hashlib, math
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.pydeps'))
import numpy as np
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors

NAMES = [f'C{i}' for i in range(1, 7)] + [f'O{i}' for i in range(1, 7)]
PERMANENT = [(i, i+1) for i in range(5)] + [(i, i+6) for i in range(6)]
unit = lambda v: v / np.linalg.norm(v)
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):
    m = Chem.MolFromMolFile(str(path), removeHs=False)
    assert m and m.GetConformer().Is3D()
    Chem.RemoveStereochemistry(m)
    Chem.AssignStereochemistryFrom3D(m)
    return m, np.array(m.GetConformer().GetPositions())
def cip(m, mapping):
    return {n: m.GetAtomWithIdx(i).GetProp('_CIPCode') for n, i in mapping.items()
            if m.GetAtomWithIdx(i).HasProp('_CIPCode')}
def bonds(m, mapping):
    inverse = {v: NAMES.index(k) for k, v in mapping.items()}
    return sorted([*sorted([inverse[b.GetBeginAtomIdx()], inverse[b.GetEndAtomIdx()]]), int(b.GetBondTypeAsDouble())]
                  for b in m.GetBonds() if b.GetBeginAtomIdx() in inverse and b.GetEndAtomIdx() in inverse)
def basis(p, c, a, b):
    u = unit(p[a]-p[c]); n = unit(np.cross(u, p[b]-p[c])); v = np.cross(n, u)
    return np.array([u, v, n])
def polar(p, i, c, a, b):
    d = p[i]-p[c]; length = np.linalg.norm(d); x, y, z = basis(p,c,a,b) @ (d/length)
    return np.array([length, np.arccos(np.clip(x,-1,1)), np.arctan2(z,y)])
def place(p, q, i, c, a, b):
    length, theta, phi = q
    p[i] = p[c] + length * (np.array([np.cos(theta), np.sin(theta)*np.cos(phi), np.sin(theta)*np.sin(phi)]) @ basis(p,c,a,b))
def proper_align(p, target):
    u, _, vt = np.linalg.svd((p-p.mean(0)).T @ (target-target.mean(0)))
    d = np.eye(3); d[-1,-1] = np.linalg.det(u@vt)
    return (p-p.mean(0)) @ (u@d@vt) + target.mean(0)
def smooth(t): return (lambda x: x*x*(3-2*x))(np.clip(t,0,1))
# Z-matrix references: backbone first, then independently attached oxygens.
REFS = [(3,2,1,0),(4,3,2,1),(5,4,3,2),
        (6,0,1,2),(7,1,0,2),(8,2,1,3),(9,3,2,4),(10,4,3,5),(11,5,4,3)]
def internals(p):
    theta = np.arccos(np.clip(unit(p[0]-p[1]) @ unit(p[2]-p[1]),-1,1))
    root = np.array([np.linalg.norm(p[0]-p[1]), np.linalg.norm(p[2]-p[1]), theta])
    return root, np.array([polar(p,*r) for r in REFS])
def morph(ring, opened, progress):
    if progress == 0: return ring.copy()
    if progress == 1: return opened.copy()
    r0,z0 = internals(ring); r1,z1 = internals(opened)
    # Unlatch/flatten C1 first, then unfold the backbone, then settle into the
    # source aldehyde conformer. Reverse traversal folds and closes the ring.
    backbone = smooth((progress-.035)/.93)
    oxygen = smooth(progress/.9)
    r = r0+(r1-r0)*backbone
    p = np.zeros((12,3)); p[2] = [r[1],0,0]; p[0] = [r[0]*np.cos(r[2]), r[0]*np.sin(r[2]), 0]
    for j, ref in enumerate(REFS):
        t = backbone if j < 3 else (smooth(progress/.24) if ref[0] == 6 else oxygen)
        delta = z1[j]-z0[j]
        delta[2] = (delta[2]+np.pi) % (2*np.pi)-np.pi
        # The signed oxygen half-space at C2–C5 must never change. Their endpoint
        # torsions lie in the same open half-plane; no shortest-angle wrap needed.
        if 7 <= ref[0] <= 10: delta[2] = z1[j,2]-z0[j,2]
        place(p, z0[j]+t*delta, *ref)
    return proper_align(p, ring+(opened-ring)*smooth(progress))
def volumes(p):
    return np.array([np.linalg.det([p[i-1]-p[i],p[i+1]-p[i],p[i+6]-p[i]]) for i in range(1,5)])
def metrics(frames, expected):
    lengths=[]; gaps=[]; vols=[]; steps=[]
    excluded = {tuple(sorted(e)) for e in PERMANENT+[(0,10)]}
    for frame in frames:
        assert np.isfinite(frame).all()
        lengths += [np.linalg.norm(frame[a]-frame[b]) for a,b in PERMANENT]
        gaps += [np.linalg.norm(frame[a]-frame[b]) for a in range(12) for b in range(a+1,12) if (a,b) not in excluded]
        v=volumes(frame); assert np.all(v*expected > 0), v
        vols += list(abs(v))
    steps=[np.linalg.norm(b-a,axis=1).max() for a,b in zip(frames,frames[1:])]
    report=dict(minPermanentBond=float(min(lengths)),maxPermanentBond=float(max(lengths)),
                minNonbondedDistance=float(min(gaps)),minAbsStereoVolume=float(min(vols)),
                maxAdjacentAtomDisplacement=float(max(steps)))
    assert min(lengths)>1.15 and max(lengths)<1.65, report
    assert min(gaps)>1.25, report
    assert min(vols)>.7, report
    return report

metadata=json.loads((ROOT/'src/data/structure-metadata.json').read_text())
endpoints={}; xyz={}
for id in ['GLC','BGC']:
    path=ROOT/f'public/molecules/{id}.sdf'; m,p=read(path)
    mapping={a['name']:a['index'] for a in metadata[id]['atoms'] if a['name'] in NAMES}
    assert len(mapping)==12
    xyz[id]=p[[mapping[n] for n in NAMES]]
    endpoints[id]=dict(sourceIdentifier=f'CCD {id}',sourceUrl=metadata[id]['sourceUrl'],
                       sourceSHA256=metadata[id]['sourceSHA256'],sdfSHA256=digest(path),
                       retrieved=metadata[id]['retrieved'],sourceAtomIndices=mapping,
                       CIP_from_3D=cip(m,mapping),bonds=bonds(m,mapping))

raw=ROOT/'public/molecules/references/aldehydo-D-glucose-PubChem-CID107526.sdf'
source=json.loads(raw.with_name('aldehydo-D-glucose-source.json').read_text())
assert digest(raw)==source['sourceSHA256']
m,p=read(raw)
assert rdMolDescriptors.CalcMolFormula(m)=='C6H12O6' and m.GetRingInfo().NumRings()==0
carbonyl=[b for b in m.GetBonds() if b.GetBondTypeAsDouble()==2 and {b.GetBeginAtom().GetSymbol(),b.GetEndAtom().GetSymbol()}=={'C','O'}]
assert len(carbonyl)==1
c=next(a for a in [carbonyl[0].GetBeginAtom(),carbonyl[0].GetEndAtom()] if a.GetSymbol()=='C')
chain=[c.GetIdx()]
while len(chain)<6:
    ns=[a.GetIdx() for a in m.GetAtomWithIdx(chain[-1]).GetNeighbors() if a.GetSymbol()=='C' and a.GetIdx() not in chain]
    assert len(ns)==1
    chain.append(ns[0])
mapping={f'C{i+1}':idx for i,idx in enumerate(chain)}
for i,idx in enumerate(chain):
    ns=[a.GetIdx() for a in m.GetAtomWithIdx(idx).GetNeighbors() if a.GetSymbol()=='O']; assert len(ns)==1
    mapping[f'O{i+1}']=ns[0]
assert cip(m,mapping)=={'C2':'R','C3':'S','C4':'R','C5':'R'}
neighbors=[a.GetIdx() for a in m.GetAtomWithIdx(chain[0]).GetNeighbors()]
vectors=[unit(p[i]-p[chain[0]]) for i in neighbors]
planarity=abs(np.linalg.det(vectors)); assert planarity<.025
angles=[float(np.degrees(np.arccos(np.clip(a@b,-1,1)))) for i,a in enumerate(vectors) for b in vectors[i+1:]]
assert all(112 < a < 128 for a in angles)
opened=proper_align(p[[mapping[n] for n in NAMES]], xyz['BGC'])
xyz['OPEN']=opened
endpoints['OPEN']=dict(**source,sourceAtomIndices=mapping,CIP_from_3D=cip(m,mapping),bonds=bonds(m,mapping),
                       C1_planarity=planarity,C1_neighborAngles=angles,
                       coordinateTransform='proper Kabsch rigid alignment to shipped BGC heavy atoms')
output=dict(atomOrder=NAMES,permanentBonds=PERMANENT,endpoints=endpoints,paths={})
reports={}
for id in ['GLC','BGC']:
    frames=np.array([morph(xyz[id],opened,i/120) for i in range(121)])
    frames=np.round(frames,6)
    dense=np.array([a+(b-a)*t for a,b in zip(frames,frames[1:]) for t in np.linspace(0,1,11)])
    reports[id]=metrics(dense,np.sign(volumes(xyz[id])))
    assert np.max(abs(frames[0]-xyz[id]))<1e-6 and np.max(abs(frames[-1]-opened))<1e-6
    output['paths'][id]=frames.tolist()
for id in xyz: endpoints[id]['coordinates']=np.round(xyz[id],6).tolist()
output['validation']=reports
output['generator']=dict(script='scripts/prepare_ring_chain.py',rdkitVersion=Chem.rdBase.rdkitVersion,
                          keyframesPerPath=121,validationSamplesPerPath=1320,
                          interpolation='staged bond-length/angle/torsion interpolation; proper rigid alignment; nearby Cartesian samples at runtime')
(ROOT/'src/data/ring-chain.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
(ROOT/'docs/ring-chain-validation.json').write_text(json.dumps(dict(endpoints=endpoints,paths=reports,generator=output['generator']),indent=2)+'\n')
print(json.dumps(reports,indent=2))
