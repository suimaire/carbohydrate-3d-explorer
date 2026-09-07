"""Validate CCD ideal coordinates independently with RDKit; rigidly orient and export.
Run with numpy + rdkit available. No invented coordinates or stereocentre editing.
"""
import sys, pathlib, shlex, json, hashlib
sys.path.insert(0, str(pathlib.Path('.pydeps').resolve()))
import numpy as np
from rdkit import Chem
from rdkit.Geometry import Point3D

ROOT=pathlib.Path(__file__).resolve().parents[1]
IDS=['GLC','BGC','GAL','FRU','BDR','2DR']
EXPECTED={
 'GLC': {'C1':'S','C2':'R','C3':'S','C4':'S','C5':'R'},
 'BGC': {'C1':'R','C2':'R','C3':'S','C4':'S','C5':'R'},
 'GAL': {'C1':'R','C2':'R','C3':'S','C4':'R','C5':'R'},
 'FRU': {'C2':'R','C3':'S','C4':'S','C5':'R'},
 'BDR': {'C1':'R','C2':'R','C3':'S','C4':'R'},
 '2DR': {'C1':'R','C3':'S','C4':'R'}}

def loop(text, prefix):
    lines=text.splitlines(); start=next(i for i,l in enumerate(lines) if l.startswith(prefix+'.'))
    headers=[]; rows=[]; i=start
    while lines[i].startswith(prefix+'.'):
        headers.append(lines[i].strip().split('.')[1]); i+=1
    while i<len(lines) and not lines[i].startswith(('#','loop_','_')):
        values=shlex.split(lines[i]); i+=1
        if values:
            assert len(values)==len(headers), (prefix,values)
            rows.append(dict(zip(headers,values)))
    return rows

def unit(v): return v/np.linalg.norm(v)
def normal(p): return np.linalg.svd(p-p.mean(axis=0))[2][-1]
def kabsch(p,q):
    u,_,vt=np.linalg.svd((p-p.mean(0)).T@(q-q.mean(0)))
    d=np.eye(3); d[-1,-1]=np.linalg.det(u@vt)
    return u@d@vt

raw={}; metadata={}; reports={}
for id in IDS:
    source=ROOT/'public/molecules'/f'{id}.cif'; text=source.read_text()
    atoms=loop(text,'_chem_comp_atom'); bonds=loop(text,'_chem_comp_bond')
    names=[a['atom_id'] for a in atoms]; index={n:i for i,n in enumerate(names)}
    xyz=np.array([[float(a[f'pdbx_model_Cartn_{axis}_ideal']) for axis in 'xyz'] for a in atoms])
    rw=Chem.RWMol()
    for a in atoms: rw.AddAtom(Chem.Atom(a['type_symbol']))
    for b in bonds:
        assert b['value_order']=='SING'
        rw.AddBond(index[b['atom_id_1']],index[b['atom_id_2']],Chem.BondType.SINGLE)
    mol=rw.GetMol(); Chem.SanitizeMol(mol)
    conf=Chem.Conformer(len(atoms)); conf.Set3D(True)
    for i,p in enumerate(xyz): conf.SetAtomPosition(i,Point3D(*p))
    mol.AddConformer(conf)
    Chem.AssignStereochemistryFrom3D(mol)
    actual={names[a.GetIdx()]:a.GetProp('_CIPCode') for a in mol.GetAtoms() if a.HasProp('_CIPCode')}
    declared={a['atom_id']:a['pdbx_stereo_config'] for a in atoms if a['pdbx_stereo_config'] in ['R','S']}
    assert actual==declared==EXPECTED[id], (id,actual,declared,EXPECTED[id])
    ring=['C1','C2','C3','C4','C5','O5'] if id in ['GLC','BGC','GAL'] else (['C2','C3','C4','C5','O5'] if id=='FRU' else ['C1','C2','C3','C4','O4'])
    ri=[index[n] for n in ring]
    assert len(Chem.GetSymmSSSR(mol))==1 and len(Chem.GetSymmSSSR(mol)[0])==len(ring)
    raw[id]=(mol,xyz,names,index,ri,atoms,bonds)
    report={'CIP_from_3D':actual,'CIP_matches_CCD':True,'ringSize':len(ring)}
    if id in ['GLC','BGC','GAL']:
        n=normal(xyz[ri]); ratios={}
        for c,sub in [('C1','O1'),('C2','O2'),('C3','O3'),('C4','O4'),('C5','C6')]:
            ratios[c]=round(float(abs(unit(xyz[index[sub]]-xyz[index[c]])@n)),4)
        expected_ax=['C1'] if id=='GLC' else (['C4'] if id=='GAL' else [])
        for c,r in ratios.items(): assert r>0.85 if c in expected_ax else r<0.65, (id,c,r)
        mid=xyz[[index[n] for n in ['C2','C3','C5','O5']]]
        up=normal(mid)
        if (xyz[index['C6']]-xyz[index['C5']])@up<0: up=-up
        heights={c:float((xyz[index[c]]-mid.mean(0))@up) for c in ['C1','C4']}
        assert heights['C1']<-.2 and heights['C4']>.2, (id,heights)
        report.update(axialNormalCosines=ratios,chair='4C1',chairHeights=heights)
    reports[id]=report

# A single shared frame for glucose/galactose; Kabsch uses ring atoms only and prohibits reflection.
ref=raw['BGC']; p=ref[1]; ix=ref[3]; ri=ref[4]
center=p[ri].mean(0); z=normal(p[ri])
if (p[ix['C6']]-p[ix['C5']])@z<0: z=-z
x=unit((p[ix['C1']]-center)-((p[ix['C1']]-center)@z)*z); y=np.cross(z,x)
frame=np.column_stack((x,y,z))
angle=np.deg2rad(52); tilt=np.array([[1,0,0],[0,np.cos(angle),np.sin(angle)],[0,-np.sin(angle),np.cos(angle)]])
for id in IDS:
    mol,xyz,names,ix,ri,atoms,bonds=raw[id]
    if id in ['GLC','BGC','GAL']:
        rotation=kabsch(xyz[ri],p[ref[4]])
        aligned=(xyz-xyz[ri].mean(0))@rotation@frame@tilt
    else:
        z=normal(xyz[ri]); last='C5' if id in ['BDR','2DR'] else 'C6'; parent='C4' if id in ['BDR','2DR'] else 'C5'
        if (xyz[ix[last]]-xyz[ix[parent]])@z<0: z=-z
        c=xyz[ri].mean(0); first='C2' if id=='FRU' else 'C1'
        x=unit((xyz[ix[first]]-c)-((xyz[ix[first]]-c)@z)*z); y=np.cross(z,x)
        aligned=(xyz-c)@np.column_stack((x,y,z))@tilt
    for i,point in enumerate(aligned): mol.GetConformer().SetAtomPosition(i,Point3D(*point))
    sdf=Chem.MolToMolBlock(mol, includeStereo=True)+'\n$$$$\n'
    (ROOT/'public/molecules'/f'{id}.sdf').write_bytes(sdf.encode())
    # Round-trip the exact shipped file, deriving chirality from rounded 3D coordinates.
    check=Chem.MolFromMolBlock(sdf.split('$$$$')[0],removeHs=False)
    Chem.RemoveStereochemistry(check); Chem.AssignStereochemistryFrom3D(check)
    assert {names[a.GetIdx()]:a.GetProp('_CIPCode') for a in check.GetAtoms() if a.HasProp('_CIPCode')}==EXPECTED[id]
    oh=[a for a in mol.GetAtoms() if a.GetSymbol()=='O' and any(n.GetSymbol()=='H' for n in a.GetNeighbors())]
    metadata[id]={'atoms':[{'name':n,'element':atoms[i]['type_symbol'],'index':i} for i,n in enumerate(names)],
      'carbons':{n:i for n,i in ix.items() if n.startswith('C')},'ringAtoms':ri,
      'hydroxylAtoms':[a.GetIdx() for a in oh]+[n.GetIdx() for a in oh for n in a.GetNeighbors() if n.GetSymbol()=='H'],
      'anomericAtom':ix['C2' if id=='FRU' else 'C1'],
      'sourceUrl':f'https://www.rcsb.org/ligand/{id}', 'downloadUrl':f'https://files.rcsb.org/ligands/download/{id}.cif',
      'retrieved':'2026-09-07','sourceSHA256':hashlib.sha256((ROOT/'public/molecules'/f'{id}.cif').read_bytes()).hexdigest(),
      'sdfSHA256':hashlib.sha256(sdf.encode()).hexdigest(),'coordinateKind':'CCD ideal coordinates; rigid alignment only',
      'validation':reports[id]}
(ROOT/'src/data/structure-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
(ROOT/'docs/structure-validation.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
