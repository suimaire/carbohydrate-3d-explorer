// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { act,cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import App from "../src/App";
import { readSdf } from "./sdf";
import type { MoleculeId } from "../src/types/carbohydrate";
const mocks=vi.hoisted(()=>({create:vi.fn(),annotate:vi.fn(),renderer:vi.fn()}));
vi.mock("../src/lib/molecularViewer",()=>({createViewer:mocks.create}));
vi.mock("../src/lib/annotations",()=>({applyAnnotations:mocks.annotate}));
vi.mock("../src/lib/ringChainRenderer",()=>({createRingChainRenderer:mocks.renderer}));
let callbacks=new Map<number,FrameRequestCallback>(), next=0, time=0, reduced=false;
let motionChanged: (()=>void)[]=[];
const tick=(ms:number)=>{
  time+=ms; const current=[...callbacks.values()]; callbacks.clear();
  act(()=>{ for(const callback of current) callback(time); });
};
const slider=()=>screen.getByRole("slider",{name:"구조 전환 진행"});
const button=(name:string)=>screen.getByRole("button",{name});
const jump=(p:number)=>fireEvent.change(slider(),{target:{value:String(p)}});
async function open(start:"GLC"|"BGC"="BGC") {
  render(<App/>);
  await waitFor(()=>expect(mocks.annotate).toHaveBeenCalled());
  if(start==="GLC") {
    fireEvent.click(screen.getByRole("button",{name:/^α-D-glucose/}));
    await waitFor(()=>expect(mocks.annotate.mock.calls.at(-1)?.[1].id).toBe("GLC"));
  }
  fireEvent.click(button("고리 ↔ 사슬 전환"));
  await waitFor(()=>expect(mocks.renderer).toHaveBeenCalled());
  return mocks.renderer.mock.results.at(-1)!.value;
}
beforeEach(()=>{
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  callbacks=new Map();next=0;time=0;reduced=false;motionChanged=[];
  vi.stubGlobal("requestAnimationFrame",vi.fn((cb:FrameRequestCallback)=>{callbacks.set(++next,cb);return next;}));
  vi.stubGlobal("cancelAnimationFrame",vi.fn((id:number)=>callbacks.delete(id)));
  vi.stubGlobal("matchMedia",()=>({get matches(){return reduced;},
    addEventListener:(_e:string,cb:()=>void)=>motionChanged.push(cb),
    removeEventListener:(_e:string,cb:()=>void)=>{motionChanged=motionChanged.filter(c=>c!==cb);}}));
  vi.stubGlobal("ResizeObserver",class{observe(){} disconnect(){}});
  vi.stubGlobal("fetch",vi.fn(async (url:string)=>({ok:true,text:async()=>readSdf(url.split("/").pop()!.replace(".sdf","") as MoleculeId).text})));
  mocks.create.mockReset().mockImplementation(()=>({
    clear:vi.fn(),setView:vi.fn(),getView:()=>[0,0,0,-50,0,0,0,1],
    addModel:vi.fn((text:string)=>({selectedAtoms:()=>Array.from({length:Number(text.split(/\r?\n/)[3].slice(0,3))})})),
    setStyle:vi.fn(),zoomTo:vi.fn(),zoom:vi.fn(),render:vi.fn(),resize:vi.fn(),spin:vi.fn(),setViewChangeCallback:vi.fn(),
  }));
  mocks.annotate.mockReset();
  mocks.renderer.mockReset().mockImplementation(()=>({update:vi.fn(),dispose:vi.fn()}));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
for(const start of ["GLC","BGC"] as const) it(`${start}: play pauses at open, either closure is selectable, reset and scrub preserve camera`,async()=>{
  const renderer=await open(start);
  expect(screen.queryByRole("region", { name: /2D 구조식$/ })).toBeNull();
  const v=mocks.create.mock.results[0].value;
  const viewChanges=v.setView.mock.calls.length, zooms=v.zoomTo.mock.calls.length;
  expect((button("H 표시") as HTMLButtonElement).disabled).toBe(true);
  expect((button("탄소 번호") as HTMLButtonElement).disabled).toBe(false);
  expect(callbacks.size).toBe(0);
  fireEvent.click(button("재생"));tick(0);tick(2000);
  expect(Number((slider() as HTMLInputElement).value)).toBeCloseTo(1/3,2);
  fireEvent.click(button("일시정지"));const paused=(slider() as HTMLInputElement).value;
  tick(1000);expect((slider() as HTMLInputElement).value).toBe(paused);
  fireEvent.click(button("재생"));tick(0);tick(6000);
  expect((slider() as HTMLInputElement).value).toBe("1");
  expect(callbacks.size).toBe(0);
  expect(screen.getByText(/이 상태에서는 α\/β 구분이 없습니다/)).toBeTruthy();
  expect((button("재생") as HTMLButtonElement).disabled).toBe(true);
  const choices=screen.getByRole("group",{name:"어느 형태로 고리를 닫을까요?"});
  fireEvent.click(within(choices).getByRole("button",{name:"α-D-glucose"}));tick(0);tick(6000);
  expect((slider() as HTMLInputElement).value).toBe("2");
  expect(renderer.update.mock.calls.at(-1)![1]).toBe("GLC");
  jump(1);
  fireEvent.click(within(screen.getByRole("group",{name:"어느 형태로 고리를 닫을까요?"})).getByRole("button",{name:"β-D-glucose"}));tick(0);tick(6000);
  expect(renderer.update.mock.calls.at(-1)![1]).toBe("BGC");
  jump(1.3);expect((slider() as HTMLInputElement).value).toBe("1.3");
  fireEvent.click(button("처음으로"));
  expect((slider() as HTMLInputElement).value).toBe("0");
  jump(1.8);expect((slider() as HTMLInputElement).value).toBe("1");
  expect(v.setView).toHaveBeenCalledTimes(viewChanges);
  expect(v.zoomTo).toHaveBeenCalledTimes(zooms);
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it("mode exit cancels RAF, ignores an already queued callback and restores annotations/H settings",async()=>{
  const renderer=await open();
  fireEvent.click(button("재생"));tick(0);
  const stale=[...callbacks.values()][0];
  fireEvent.click(button("일반 구조 보기로"));
  expect(screen.getByRole("region", { name: "β-D-glucose 2D 구조식" })).toBeTruthy();
  expect(renderer.dispose).toHaveBeenCalledTimes(1);expect(callbacks.size).toBe(0);
  const count=renderer.update.mock.calls.length;
  act(()=>stale(6000));expect(renderer.update).toHaveBeenCalledTimes(count);
  expect((button("H 표시") as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(button("H 표시"));
  expect(mocks.annotate.mock.calls.at(-1)![2].hydrogen).toBe(true);
  fireEvent.click(button("고리 ↔ 사슬 전환"));
  fireEvent.click(button("일반 구조 보기로"));
  expect(button("H 표시").getAttribute("aria-pressed")).toBe("true");
});
it("changing molecule or entering comparison cancels animation and hides the feature",async()=>{
  const renderer=await open();
  fireEvent.click(button("재생"));tick(0);
  fireEvent.click(screen.getByRole("button",{name:/^D-galactose/}));
  await waitFor(()=>expect(mocks.annotate.mock.calls.at(-1)?.[1].id).toBe("GAL"));
  expect(callbacks.size).toBe(0);expect(renderer.dispose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("slider")).toBeNull();
  expect(screen.queryByRole("button",{name:"고리 ↔ 사슬 전환"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/^β-D-glucose/}));
  await waitFor(()=>expect(mocks.annotate.mock.calls.at(-1)?.[1].id).toBe("BGC"));
  fireEvent.click(button("고리 ↔ 사슬 전환"));fireEvent.click(button("재생"));tick(0);
  const current=mocks.renderer.mock.results.at(-1)!.value;
  fireEvent.click(screen.getByRole("button",{name:/비교 모드/}));
  expect(current.dispose).toHaveBeenCalledTimes(1);expect(callbacks.size).toBe(0);
  expect(screen.queryByRole("slider")).toBeNull();
});
it("reduced motion uses manual states; changing the preference stops a running animation",async()=>{
  reduced=true;
  await open();
  expect((button("재생") as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button("사슬형"));
  fireEvent.click(within(screen.getByRole("group",{name:"어느 형태로 고리를 닫을까요?"})).getByRole("button",{name:"β-D-glucose"}));
  expect(callbacks.size).toBe(0);
  fireEvent.click(button("닫힌 고리"));expect((slider() as HTMLInputElement).value).toBe("2");
  act(()=>{reduced=false;for(const cb of motionChanged)cb();});
  fireEvent.click(button("처음으로"));fireEvent.click(button("재생"));tick(0);
  expect(callbacks.size).toBe(1);
  act(()=>{reduced=true;for(const cb of motionChanged)cb();});
  expect(callbacks.size).toBe(0);
});
it("unmount releases RAF and renderer",async()=>{
  const renderer=await open();fireEvent.click(button("재생"));tick(0);
  cleanup();expect(renderer.dispose).toHaveBeenCalledTimes(1);expect(callbacks.size).toBe(0);
});
