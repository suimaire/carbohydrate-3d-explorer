// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { GLModel } from "3dmol/build/3Dmol.es6.js";
import type { GLViewer } from "../src/lib/molecularViewer";
import { createRingChainRenderer } from "../src/lib/ringChainRenderer";
import { atomOrder, sampleRingChain } from "../src/lib/ringChain";
import { defaultOptions } from "../src/data/carbohydrates";
import { readSdf } from "./sdf";
it("uses real 3Dmol 2.5.5 frames, keeps atom objects and camera, and releases the model", () => {
  const original=new GLModel(0); original.addMolData(readSdf("GLC").text,"sdf",{});
  const model=new GLModel(1);
  const hide=vi.spyOn(original,"hide"), show=vi.spyOn(original,"show");
  const setFrame=vi.spyOn(model,"setFrame");
  let view=[2,3,4,-43,.1,.2,.3,.9];
  const v={
    getModel:()=>original, addModel:vi.fn(()=>model), removeModel:vi.fn(),
    removeAllLabels:vi.fn(),removeAllShapes:vi.fn(),addLabel:vi.fn(()=>({})),removeLabel:vi.fn(),setLabelStyle:vi.fn(),
    render:vi.fn(),clear:vi.fn(),zoomTo:vi.fn(),setView:vi.fn(),getView:()=>view,
  };
  const renderer=createRingChainRenderer(v as unknown as GLViewer,"GLC");
  const atoms=model.selectedAtoms({});
  expect(atoms.map(a=>a.atom)).toEqual(atomOrder);
  expect(atoms.some(a=>a.elem==="H")).toBe(false);
  renderer.update(0,null,defaultOptions,true);
  expect(atoms[0].bonds).toContain(10);
  // User drag/zoom changes camera while the same model is animated.
  view=[1,2,3,-65,.2,.4,.1,.8];
  for(let i=0;i<=100;i++) renderer.update(i/100,null,defaultOptions,true);
  expect(model.getNumFrames()).toBe(1);
  for(const [i,a] of model.selectedAtoms({}).entries()) expect(a).toBe(atoms[i]);
  expect(atoms[0].bonds).not.toContain(10);
  expect(atoms[0].bondOrder![atoms[0].bonds!.indexOf(6)]).toBe(2);
  for(let i=101;i<=200;i++) renderer.update(i/100,"BGC",defaultOptions,true);
  expect(model.selectedAtoms({}).map(a=>[a.x,a.y,a.z])).toEqual(sampleRingChain("GLC","BGC",2).coordinates);
  expect(atoms[0].bonds).toContain(10);
  expect(atoms[0].bondOrder![atoms[0].bonds!.indexOf(6)]).toBe(1);
  expect(v.addModel).toHaveBeenCalledTimes(1);
  expect(v.clear).not.toHaveBeenCalled(); expect(v.zoomTo).not.toHaveBeenCalled(); expect(v.setView).not.toHaveBeenCalled();
  expect(v.getView()).toEqual(view); expect(hide).toHaveBeenCalledTimes(1);
  expect(v.addLabel).toHaveBeenCalledTimes(3);
  expect(v.setLabelStyle).toHaveBeenCalled();
  renderer.dispose(); renderer.dispose();
  expect(v.removeModel).toHaveBeenCalledTimes(1); expect(v.removeModel).toHaveBeenCalledWith(model);
  expect(show).toHaveBeenCalledTimes(1); expect(v.removeLabel).toHaveBeenCalledTimes(3);
  const count=setFrame.mock.calls.length;
  renderer.update(.5,null,defaultOptions,true);
  expect(setFrame).toHaveBeenCalledTimes(count);
});
