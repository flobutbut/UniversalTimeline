import { describe, expect, it } from 'vitest';
import { useNavigationPrototype } from '../model';
const earth={type:'period' as const,id:'PER_MILKYWAY'};
const middle={type:'period' as const,id:'Q12554'};

describe('navigation prototype using the actual timeline components',()=>{
  it('returns to the actual Earth position without inserting Earth in the geological narrative',()=>{
    const n=useNavigationPrototype();n.enterStory('11',earth);
    expect(n.currentStory.value.periods.some(p=>p.id===earth.id)).toBe(false);
    expect(n.currentPeriod.value).toBeNull();
    expect(n.contextBar.value?.label.fr).toBe('Terre');
    expect(n.contextBar.value?.startDate).toBe('');
    n.goBack();expect(n.position.value).toMatchObject({storyId:'1',periodId:earth.id});
  });
  it('keeps temporal neighbors across narratives whose wrapper periods were removed',()=>{
    const n=useNavigationPrototype();n.reset('temps');
    n.openPeriod(n.currentStory.value.periods.find(p=>p.id===middle.id)!);n.enterStory('15',middle);
    expect(n.currentStory.value.periods.some(p=>p.id===middle.id)).toBe(false);
    expect(n.previousPeriod.value?.id).toBe('Q40244');expect(n.nextPeriod.value?.id).toBe('Q7432');
    n.adjacent('next');expect(n.currentStory.value.id).toBe('16');expect(n.returns.value).toHaveLength(1);
    n.adjacent('previous');expect(n.currentStory.value.id).toBe('15');
    n.adjacent('previous');expect(n.currentStory.value.id).toBe('10');
    n.goBack();expect(n.position.value).toMatchObject({storyId:'24',periodId:middle.id});
  });
  it('uses the local temporal subdivision inside a narrative, then restores the reference neighbors',()=>{
    const n=useNavigationPrototype();n.reset('temps');n.enterStory('15',middle);
    const central=n.currentStory.value.periods.find(p=>p.label.fr.includes('central'))!;
    n.openPeriod(central);expect(n.nextPeriod.value?.label.fr).toContain('tardif');
    n.goBack();expect(n.currentPeriod.value).toBeNull();expect(n.nextPeriod.value?.id).toBe('Q7432');
  });
  it('keeps the climate dates independent of the much older Earth return marker',()=>{
    const n=useNavigationPrototype();n.reset('durees');n.enterStory('23',earth);
    expect(n.bounds.value?.startYearsBP).toBe(2450000000);
    expect(n.currentPeriod.value).toBeNull();expect(n.contextBar.value?.startDate).toBe('');
    expect(n.previousPeriod.value).toBeNull();expect(n.nextPeriod.value).toBeNull();
    n.goBack();expect(n.position.value.periodId).toBe(earth.id);
  });
  it('opens Techniques from the root of Homo without constraining the target to the source dates',()=>{
    const n=useNavigationPrototype();n.reset('racine');expect(n.rootStories.value.map(s=>s.id)).toContain('39');
    n.enterStory('39');expect(n.bounds.value?.startYearsBP).toBe(3300000);
    expect(n.contextBar.value?.label.fr).toBe('Genre Homo');
    n.goBack();expect(n.position.value).toMatchObject({storyId:'5',periodId:null});
  });
  it('returns to either actual origin of the same climate narrative',()=>{
    const n=useNavigationPrototype();n.reset('origines');n.enterClimate('earth');n.goBack();
    expect(n.position.value).toMatchObject({storyId:'1',periodId:earth.id});
    n.enterClimate('geology');expect(n.contextBar.value?.label.fr).toBe('Histoire géologique de la Terre');n.goBack();
    expect(n.position.value).toMatchObject({storyId:'11',periodId:null});
  });
  it('retains chronological reference on direct entry without inventing a visit history',()=>{
    const n=useNavigationPrototype();n.reset('direct');expect(n.returns.value).toHaveLength(0);
    expect(n.nextPeriod.value?.id).toBe('Q7432');n.goBack();
    expect(n.position.value).toMatchObject({storyId:'24',periodId:middle.id});expect(n.returns.value).toHaveLength(0);
  });
  it('retains the shared Earth entry while returning through actual visited narratives',()=>{
    const n=useNavigationPrototype();n.enterStory('11',earth);n.enterStory('2',earth);
    expect(n.contextStories.value.map(s=>s.id)).toContain('23');
    n.goBack();expect(n.position.value.storyId).toBe('11');n.goBack();expect(n.position.value.storyId).toBe('1');
  });
});
