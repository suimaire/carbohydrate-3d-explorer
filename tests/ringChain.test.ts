import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { atomOrder, ringChainData as data, sampleRingChain } from "../src/lib/ringChain";
import { structures } from "../src/data/carbohydrates";
import { readSdf } from "./sdf";
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const distance = (a: number[], b: number[]) => Math.hypot(...sub(a, b));
const det = (a: number[], b: number[], c: number[]) =>
  a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
const volume = (p: number[][], i: number) => det(sub(p[i-1],p[i]),sub(p[i+1],p[i]),sub(p[i+6],p[i]));
const rawBytes = readFileSync("public/molecules/references/aldehydo-D-glucose-PubChem-CID107526.sdf");
const lines = rawBytes.toString().split(/\r?\n/);
const n = Number(lines[3].slice(0,3)), nb = Number(lines[3].slice(3,6));
const rawAtoms = lines.slice(4,4+n).map(l => ({
  elem: l.slice(31,34).trim(), point: [Number(l.slice(0,10)),Number(l.slice(10,20)),Number(l.slice(20,30))],
}));
const rawBonds = lines.slice(4+n,4+n+nb).map(l=>[Number(l.slice(0,3))-1,Number(l.slice(3,6))-1,Number(l.slice(6,9))]);
it("archives an intact PubChem 3D source and explicit graph-derived C/O mapping", () => {
  expect(lines[0]).toBe("107526");
  expect(createHash("sha256").update(rawBytes).digest("hex")).toBe(data.endpoints.OPEN.sourceSHA256);
  expect(atomOrder).toEqual(["C1","C2","C3","C4","C5","C6","O1","O2","O3","O4","O5","O6"]);
  const mapping = data.endpoints.OPEN.sourceAtomIndices;
  expect(new Set(Object.values(mapping)).size).toBe(12);
  for (const [name,index] of Object.entries(mapping)) expect(rawAtoms[index].elem).toBe(name[0]);
  for (const [a,b,order] of data.endpoints.OPEN.bonds) {
    const ai=mapping[atomOrder[a] as keyof typeof mapping], bi=mapping[atomOrder[b] as keyof typeof mapping];
    expect(rawBonds.some(([x,y,o])=>o===order && ((x===ai&&y===bi)||(x===bi&&y===ai)))).toBe(true);
  }
  // All pair distances are preserved: the open endpoint underwent only rigid alignment.
  for (let i=0;i<12;i++) for(let j=i+1;j<12;j++) {
    const a=mapping[atomOrder[i] as keyof typeof mapping], b=mapping[atomOrder[j] as keyof typeof mapping];
    expect(distance(data.endpoints.OPEN.coordinates[i],data.endpoints.OPEN.coordinates[j]))
      .toBeCloseTo(distance(rawAtoms[a].point,rawAtoms[b].point),5);
  }
});
it("open C1 is trigonal planar using its source aldehydic H, without a proton trajectory", () => {
  const c = data.endpoints.OPEN.sourceAtomIndices.C1;
  const neighbors = rawBonds.filter(([a,b])=>a===c||b===c).map(([a,b])=>a===c?b:a);
  expect(neighbors).toHaveLength(3);
  expect(neighbors.map(i=>rawAtoms[i].elem).sort()).toEqual(["C","H","O"]);
  const v=neighbors.map(i=>sub(rawAtoms[i].point,rawAtoms[c].point)).map(a=>a.map(x=>x/Math.hypot(...a)));
  expect(Math.abs(det(v[0],v[1],v[2]))).toBeLessThan(.025);
  for(let i=0;i<3;i++) for(let j=i+1;j<3;j++) {
    const angle=Math.acos(v[i].reduce((s,x,k)=>s+x*v[j][k],0))*180/Math.PI;
    expect(angle).toBeGreaterThan(112); expect(angle).toBeLessThan(128);
  }
});
for (const start of ["GLC","BGC"] as const) describe(start, () => {
  it("preserves the existing metadata mapping, source hash and exact ring coordinates", () => {
    const sdf=readSdf(start);
    expect(createHash("sha256").update(sdf.text).digest("hex")).toBe(data.endpoints[start].sdfSHA256);
    const mapping=data.endpoints[start].sourceAtomIndices;
    for(const [i,name] of atomOrder.entries()) {
      const atom=structures[start].atoms.find(a=>a.name===name)!;
      expect(mapping[name as keyof typeof mapping]).toBe(atom.index);
      const p=sdf.atoms[atom.index];
      expect(sampleRingChain(start,null,0).coordinates[i]).toEqual([p.x,p.y,p.z]);
    }
  });
  for(const target of ["GLC","BGC"] as const) {
    it(`reaches the same aldehyde and chosen ${target} endpoint with correct bonds`, () => {
      const ring=sampleRingChain(start,target,0), open=sampleRingChain(start,target,1), end=sampleRingChain(start,target,2);
      expect(open.coordinates).toEqual(data.endpoints.OPEN.coordinates);
      expect(end.coordinates).toEqual(data.endpoints[target].coordinates);
      for(const sample of [ring,end]) {
        expect(sample.bonds).toContainEqual([0,10,1]); expect(sample.bonds).toContainEqual([0,6,1]);
        expect(sample.bonds).toHaveLength(12);
      }
      expect(open.bonds).not.toContainEqual([0,10,1]);
      expect(open.bonds).toContainEqual([0,6,2]); expect(open.bonds).toHaveLength(11);
    });
    it(`keeps identity, finite geometry, bonds, chirality and continuity on the entire ${target} path`, () => {
      const expected=data.endpoints[start].coordinates;
      const exclusions=new Set([...data.permanentBonds, [0,10]].map(([a,b])=>[a,b].sort((x,y)=>x-y).join(":")));
      let previous=sampleRingChain(start,target,0).coordinates;
      let minGap=Infinity, minBond=Infinity, maxBond=0, maxStep=0, minVolume=Infinity;
      for(let step=0;step<=2000;step++) {
        const p=sampleRingChain(start,target,step/1000).coordinates;
        expect(p).toHaveLength(12);
        expect(p.flat().every(Number.isFinite)).toBe(true);
        for(const [a,b] of data.permanentBonds) { const d=distance(p[a],p[b]); minBond=Math.min(minBond,d); maxBond=Math.max(maxBond,d); }
        for(let a=0;a<12;a++) for(let b=a+1;b<12;b++)
          if(!exclusions.has(`${a}:${b}`)) minGap=Math.min(minGap,distance(p[a],p[b]));
        // C1/O5 are an approaching/breaking pair, but must never overlap either.
        expect(distance(p[0],p[10])).toBeGreaterThan(1.2);
        for(let i=1;i<=4;i++) {
          minVolume=Math.min(minVolume,Math.abs(volume(p,i)));
          expect(Math.sign(volume(p,i))).toBe(Math.sign(volume(expected,i)));
        }
        maxStep=Math.max(maxStep,...p.map((a,i)=>distance(a,previous[i])));
        previous=p;
      }
      expect(minGap).toBeGreaterThan(1.25);
      expect(minBond).toBeGreaterThan(1.15); expect(maxBond).toBeLessThan(1.65);
      expect(minVolume).toBeGreaterThan(.7); expect(maxStep).toBeLessThan(.03);
    });
  }
});
it("cannot silently close before the user chooses an anomer, and clamps invalid input", () => {
  expect(sampleRingChain("GLC",null,2).phase).toBe("open");
  expect(sampleRingChain("GLC",null,NaN).coordinates).toEqual(data.endpoints.GLC.coordinates);
});

it("both ring C1 sites are tetrahedral while the shared aldehyde has planar C1", () => {
  for(const id of ["GLC","BGC"] as const) {
    const p=data.endpoints[id].coordinates;
    const v=[10,6,1].map(i=>sub(p[i],p[0])).map(a=>a.map(x=>x/Math.hypot(...a)));
    expect(Math.abs(det(v[0],v[1],v[2]))).toBeGreaterThan(.65);
    for(let i=0;i<3;i++) for(let j=i+1;j<3;j++) {
      const angle=Math.acos(v[i].reduce((sum,x,k)=>sum+x*v[j][k],0))*180/Math.PI;
      expect(angle).toBeGreaterThan(100); expect(angle).toBeLessThan(116);
    }
  }
});
