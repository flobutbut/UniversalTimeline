import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { zoomTransform } from 'd3';
import TimelineMapCanvas from '../TimelineMapCanvas.vue';

let view:ReturnType<typeof mount>;
beforeEach(()=>{
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
  vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype,'offsetWidth','get').mockReturnValue(2000);
  vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockReturnValue(1000);
});
afterEach(()=>{view?.unmount();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('fits the full scene with valid CSS pixel translations, zooms around the viewport center and pans by keyboard',async()=>{
  view=mount(TimelineMapCanvas,{props:{expanded:false},slots:{default:'<article>Frise</article>'}});
  const host=view.get('.timeline-map-canvas__viewport').element as HTMLElement;
  const scene=view.get('.timeline-map-canvas__scene').element as HTMLElement;
  await view.vm.$nextTick();
  const fitted=zoomTransform(host);
  expect(fitted.k).toBeCloseTo(.476);
  expect(fitted.x).toBeCloseTo(24);
  expect(fitted.y).toBeCloseTo(86);
  expect(scene.style.transform).toBe('translate(24px, 86px) scale(0.476)');
  await view.get('[aria-label="Zoomer"]').trigger('click');
  const enlarged=zoomTransform(host);
  expect(enlarged.k).toBeCloseTo(fitted.k*1.3);
  expect((500-enlarged.x)/enlarged.k).toBeCloseTo((500-fitted.x)/fitted.k);
  await view.get('.timeline-map-canvas__viewport').trigger('keydown',{key:'ArrowRight'});
  expect(zoomTransform(host).x).toBeCloseTo(enlarged.x-80);
  await view.setProps({expanded:true});expect(zoomTransform(host).k).toBe(enlarged.k);
  await view.get('.timeline-map-canvas__viewport').trigger('keydown',{key:'Home'});
  expect(zoomTransform(host).k).toBeCloseTo(fitted.k);
});
it('leaves text input keyboard shortcuts alone and bounds zoom controls',async()=>{
  view=mount(TimelineMapCanvas,{props:{expanded:false},slots:{default:'<input aria-label="Champ" />'}});
  await view.vm.$nextTick();const host=view.get('.timeline-map-canvas__viewport').element as HTMLElement;
  const before=zoomTransform(host);
  await view.get('input').trigger('keydown',{key:'ArrowRight'});expect(zoomTransform(host)).toBe(before);
  for(let i=0;i<10;i++)await view.get('[aria-label="Zoomer"]').trigger('click');
  expect(zoomTransform(host).k).toBe(3);expect(view.get('[aria-label="Zoomer"]').attributes('disabled')).toBeDefined();
});
it('allows zooming from cosmic time down to short frises while keeping row heights bounded',async()=>{
  view=mount(TimelineMapCanvas,{props:{expanded:false,temporal:true},slots:{default:'<article>Humanité</article>'}});
  await view.vm.$nextTick();
  const host=view.get('.timeline-map-canvas__viewport').element as HTMLElement;
  for(let i=0;i<20;i++)await view.get('[aria-label="Zoomer"]').trigger('click');
  expect(zoomTransform(host).k).toBeGreaterThan(3);
  const scene=view.get('.timeline-map-canvas__scene').element as HTMLElement;
  expect(scene.style.getPropertyValue('--canvas-row-scale')).toBe('1');
  const beforeY=zoomTransform(host).y;
  await view.get('[aria-label="Zoomer"]').trigger('click');
  expect(zoomTransform(host).y).toBeCloseTo(beforeY,6);
});
it('centers a subpixel frise using its date coordinates rather than rounded DOM measurements',async()=>{
  view=mount(TimelineMapCanvas,{props:{expanded:false,temporal:true},slots:{default:'<div data-temporal-story="recent" style="--row-left:4095px;--row-width:0.00007px;--row-top:88px"><article>Récente</article></div>'}});
  await view.vm.$nextTick();
  const host=view.get('.timeline-map-canvas__viewport').element as HTMLElement;
  (view.vm as unknown as {frame:(el:HTMLElement)=>void}).frame(view.get('article').element as HTMLElement);
  const transform=zoomTransform(host);
  expect(transform.k).toBeGreaterThan(1e6);
  expect(transform.x+4095*transform.k).toBeCloseTo(24,3);
});
