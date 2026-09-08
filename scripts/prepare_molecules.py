"""Validate published carbohydrate structures with RDKit; orient and export them.

Monosaccharides and disaccharides come straight from wwPDB Chemical Component
Dictionary ideal coordinates: no coordinate is invented and no stereocentre is
edited, only rigid rotation and translation. Polysaccharides are shipped as
representative fragments assembled from those validated residues, with every
glycosidic junction copied from a downloaded reference structure; see
scripts/glycans.py and docs/POLYSACCHARIDE_MODELING.md.

Run with numpy + rdkit available.
"""
import sys, pathlib, shlex, json, hashlib
sys.path.insert(0, str(pathlib.Path('.pydeps').resolve()))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np
from rdkit import Chem
from rdkit.Geometry import Point3D
import glycans

ROOT=pathlib.Path(__file__).resolve().parents[1]
IDS=['GLC','BGC','GAL','FRU','BDR','2DR']
DISACCHARIDES=['MAL','CBI','LAT','SUC']
POLYMERS=['AMYLOSE','AMYLOPECTIN','GLYCOGEN','CELLULOSE']
RETRIEVED='2026-09-07'
RETRIEVED_GLYCANS='2026-09-09'
# linkage key -> PubChem CID, name, residue template, acceptor carbon, donor anomer
PUBCHEM_REFERENCES={
 'a14':(439186,'maltose','GLC',4,'alpha'),
 'b14':(439178,'cellobiose','BGC',4,'beta'),
 'a16':(439193,'isomaltose','GLC',6,'alpha')}
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
        heights={c:round(float((xyz[index[c]]-mid.mean(0))@up),4) for c in ['C1','C4']}
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

def shared_frame_alignment(coords, ring_indices):
    """Rigidly move any pyranose into the library's shared viewpoint."""
    coords=np.asarray(coords)
    rotation=kabsch(coords[ring_indices], p[ri])
    return (coords-coords[ring_indices].mean(0))@rotation@frame@tilt

templates={}
anomeric=None
for id in IDS:
    mol,xyz,names,ixm,rim,atoms,bonds=raw[id]
    if id in ['GLC','BGC','GAL']:
        aligned=shared_frame_alignment(xyz, rim)
    else:
        z=normal(xyz[rim]); last='C5' if id in ['BDR','2DR'] else 'C6'; parent='C4' if id in ['BDR','2DR'] else 'C5'
        if (xyz[ixm[last]]-xyz[ixm[parent]])@z<0: z=-z
        c=xyz[rim].mean(0); first='C2' if id=='FRU' else 'C1'
        x=unit((xyz[ixm[first]]-c)-((xyz[ixm[first]]-c)@z)*z); y=np.cross(z,x)
        aligned=(xyz-c)@np.column_stack((x,y,z))@tilt
    for i,point in enumerate(aligned): mol.GetConformer().SetAtomPosition(i,Point3D(*point))
    sdf=Chem.MolToMolBlock(mol, includeStereo=True)+'\n$$$$\n'
    (ROOT/'public/molecules'/f'{id}.sdf').write_bytes(sdf.encode())
    # Round-trip the exact shipped file, deriving chirality from rounded 3D coordinates.
    check=Chem.MolFromMolBlock(sdf.split('$$$$')[0],removeHs=False)
    Chem.RemoveStereochemistry(check); Chem.AssignStereochemistryFrom3D(check)
    assert {names[a.GetIdx()]:a.GetProp('_CIPCode') for a in check.GetAtoms() if a.HasProp('_CIPCode')}==EXPECTED[id]
    templates[id]=dict(names=names,index=ixm,xyz=aligned,
                       elements=[a['type_symbol'] for a in atoms],
                       bonds=[(ixm[b['atom_id_1']],ixm[b['atom_id_2']]) for b in bonds])
    metadata[id]={'atoms':[{'name':n,'element':atoms[i]['type_symbol'],'index':i} for i,n in enumerate(names)],
      'carbons':{n:i for n,i in ixm.items() if n.startswith('C')},'ringAtoms':rim,
      'hydroxylAtoms':glycans.hydroxyl_atoms(mol),
      'anomericAtom':ixm['C2' if id=='FRU' else 'C1'],
      'sourceUrl':f'https://www.rcsb.org/ligand/{id}', 'downloadUrl':f'https://files.rcsb.org/ligands/download/{id}.cif',
      'retrieved':RETRIEVED,'sourceSHA256':hashlib.sha256((ROOT/'public/molecules'/f'{id}.cif').read_bytes()).hexdigest(),
      'sdfSHA256':hashlib.sha256(sdf.encode()).hexdigest(),'coordinateKind':'CCD ideal coordinates; rigid alignment only',
      'validation':reports[id]}

# Residue-level metadata for the monosaccharides, in the same shape the larger
# structures use, so the app never needs a per-molecule special case.
anomeric=glycans.AnomericReference(templates)
reports['anomericReference']={'alphaSign':int(anomeric.alpha),'referenceVolumes':anomeric.checks}
for id in IDS:
    mol=raw[id][0]
    data=dict(names=templates[id]['names'],index=templates[id]['index'],xyz=templates[id]['xyz'],
              elements=templates[id]['elements'])
    residue_meta,residue_report=glycans.monosaccharide_metadata(mol,data,id,anomeric)
    metadata[id].update({k:v for k,v in residue_meta.items()
                         if k in ('residues','glycosidicBonds','reducingEnds','branchPoints')})
    reports[id]['anomericConfiguration']=residue_report

# ---------------------------------------------------------------- disaccharides
for id in DISACCHARIDES:
    cif=ROOT/'public/molecules'/f'{id}.cif'
    sdf,meta,report=glycans.build_disaccharide(cif,id,templates,anomeric,shared_frame_alignment)
    (ROOT/'public/molecules'/f'{id}.sdf').write_bytes(sdf.encode())
    meta.update({
      'sourceUrl':f'https://www.rcsb.org/ligand/{id}',
      'downloadUrl':f'https://files.rcsb.org/ligands/download/{id}.cif',
      'retrieved':RETRIEVED_GLYCANS,
      'sourceSHA256':hashlib.sha256(cif.read_bytes()).hexdigest(),
      'sdfSHA256':hashlib.sha256(sdf.encode()).hexdigest(),
      'coordinateKind':'CCD ideal coordinates; rigid alignment only',
      'validation':report})
    metadata[id]=meta
    reports[id]=report

# ------------------------------------------------- polysaccharide fragment build
# Every junction in a shipped fragment copies a downloaded reference conformer.
# PubChem supplies all three so the fragments come from one archive and one
# conformer pipeline; the CCD dimers are measured too and reported alongside as
# an independent check that both sources describe the same conformational family.
links={}; link_reports={}
for key,(cid,sugar,template_id,acceptor,anomer) in PUBCHEM_REFERENCES.items():
    path=ROOT/'public/molecules/references'/f'{sugar}-PubChem-CID{cid}.sdf'
    links[key],link_reports[key]=glycans.measure_pubchem_dimer(
        path,templates,anomeric,cid,sugar,template_id,acceptor,anomer)
    link_reports[key]['file']=f'public/molecules/references/{path.name}'
    link_reports[key]['sourceSHA256']=hashlib.sha256(path.read_bytes()).hexdigest()
    link_reports[key]['sourceUrl']=f'https://pubchem.ncbi.nlm.nih.gov/compound/{cid}'
crosscheck={}
for key,ccd_id,template_id in [('a14','MAL','GLC'),('b14','CBI','BGC')]:
    _,crosscheck[key]=glycans.measure_linkage(ROOT/'public/molecules'/f'{ccd_id}.cif',ccd_id,templates,template_id)
reports['glycosidicLinkageReferences']=link_reports
reports['glycosidicLinkageCrossCheck']=crosscheck

for name in POLYMERS:
    sdf,meta,report=glycans.build_polymer(name,templates,links,anomeric,link_reports)
    (ROOT/'public/molecules'/f'{name}.sdf').write_bytes(sdf.encode())
    plan=glycans.POLYMER_PLANS[name]
    reference_ids=sorted({f'PubChem CID {PUBCHEM_REFERENCES[l][0]} ({PUBCHEM_REFERENCES[l][1]})'
                          for _,l in plan['plan'][1:]})
    meta.update({
      'sourceUrl':'https://www.rcsb.org/ligand/'+('BGC' if plan['template']=='BGC' else 'GLC'),
      'downloadUrl':None,
      'retrieved':RETRIEVED_GLYCANS,
      'sourceSHA256':None,
      'sdfSHA256':hashlib.sha256(sdf.encode()).hexdigest(),
      'coordinateKind':'representative fragment; rigid assembly of validated CCD residues',
      'builder':{'script':'scripts/glycans.py','residueTemplate':plan['template'],
                 'linkageReferences':reference_ids,
                 'hydrogenRelaxation':'MMFF94s, heavy atoms position-constrained',
                 'rdkitVersion':Chem.rdBase.rdkitVersion},
      'validation':report})
    metadata[name]=meta
    reports[name]=report

(ROOT/'src/data/structure-metadata.json').write_text(json.dumps(glycans.round_floats(metadata),indent=2)+'\n')
(ROOT/'docs/structure-validation.json').write_text(json.dumps(glycans.round_floats(reports),indent=2)+'\n')
print(json.dumps({k:v for k,v in reports.items() if k in POLYMERS or k in DISACCHARIDES
                  or k=='glycosidicLinkageReferences'},indent=2)[:6000])
