import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const {expect}=await import(process.env.PLAYWRIGHT_EXPECT_MODULE??'playwright/test');
const api=JSON.parse(await fs.readFile('/private/tmp/navigation-postchange-api.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.NAVIGATION_BROWSER_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],unknown=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname.replace(/^\/api/,'');
 if(route.request().method()!=='GET')return route.abort();
 let body;
 if(path==='/stories')body=api.stories;
 else if(/^\/stories\/\d+$/.test(path))body=api.details[path.split('/').pop()];
 else if(path==='/categories')body=[];
 else if(path==='/access')body={enabled:true,account:null};
 else{unknown.push(path);return route.fulfill({status:404,json:{error:'Not in read-only fixture'}});}
 await route.fulfill({json:body});
});
const base='http://127.0.0.1:5173/timeline?';
async function go(query){await page.goto(base+query);const refuse=page.getByRole('button',{name:'Tout refuser',exact:true});if(await refuse.isVisible())await refuse.click();await expect(page.locator('.home-view')).toBeVisible();await expect(page.locator('.period-grid')).not.toHaveAttribute('aria-busy','true');}
async function associated(label,title){const origin=new URL(page.url()).searchParams.get('story');await page.getByRole('button',{name:label}).click();await page.locator('.associated-stories__item').filter({hasText:title}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('story')).not.toBe(origin);await expect(page.locator('.period-grid')).not.toHaveAttribute('aria-busy','true');}
const marker=()=>page.locator('.period-card--parent .period-card__title-action');
try{
 await go('story=1&period=PER_MILKYWAY');await associated(/3 frises associées à Terre/,'Histoire géologique de la Terre');
 await expect(marker()).toHaveText('Terre');await expect(page.locator('[data-period-id="PER_HADEAN"]')).toBeVisible();
 await expect(page.locator('.period-card--timeline').last()).toHaveCSS('opacity','1');
 await page.screenshot({path:'audits/navigation-2026-11-04/geology.png'});
 await marker().click();await expect(page).toHaveURL(/story=1/);await expect(page).toHaveURL(/period=PER_MILKYWAY/);
 await go('story=24&view=overview');await page.locator('[data-period-id="Q12554"] .period-card__title-action').click();
 await associated(/frise associée à Moyen Âge/,'Moyen Âge');await expect(marker()).toHaveText('Moyen Âge');
 await expect(page.getByRole('button',{name:/Période précédente.*Antiquité/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Période suivante.*Époque moderne/})).toBeVisible();
 await expect(page.locator('.period-card--timeline').last()).toHaveCSS('opacity','1');await page.screenshot({path:'audits/navigation-2026-11-04/middle-ages.png'});
 await page.getByRole('button',{name:/Période suivante.*Époque moderne/}).click();await expect(page).toHaveURL(/story=16/);
 await expect(page.getByRole('button',{name:/Afficher l’événement/}).first()).toBeVisible();await marker().click();
 await expect(page).toHaveURL(/story=24/);await expect(page).toHaveURL(/period=Q12554/);
 await go('story=5&view=overview');await associated(/frise associée à Genre Homo/,'Histoire des techniques');
 await expect(marker()).toHaveText('Genre Homo');await expect(page.locator('.period-card--timeline').first()).toBeVisible();
 await marker().click();await expect(page).toHaveURL(/story=5/);
 await go('story=1&period=PER_MILKYWAY');await associated(/3 frises associées à Terre/,'Histoire du climat');await expect(marker()).toHaveText('Terre');
 await page.reload();await expect(marker()).toHaveText('Terre');await marker().click();await expect(page).toHaveURL(/period=PER_MILKYWAY/);
 await go('story=11&view=overview');await associated(/frises associées à Histoire géologique de la Terre/,'Histoire du climat');
 await expect(marker()).toHaveText('Histoire géologique de la Terre');await marker().click();await expect(page).toHaveURL(/story=11/);await expect(page).toHaveURL(/view=overview/);
 await go('story=15&context=24&period=Q12554');await expect(marker()).toHaveText('Moyen Âge');await expect(page.locator('.home-view__context-label')).toHaveText('Période de référence');
 await expect(page.getByRole('button',{name:/Période suivante.*Époque moderne/})).toBeVisible();await marker().click();await expect(page).toHaveURL(/story=24/);
 if(errors.length||unknown.length)throw new Error(JSON.stringify({errors,unknown}));
 console.log(JSON.stringify({realHomeView:true,postchangeApiFromLocalPostgres:true,cases:6,rootEntry:true,crossStoryTemporalNavigation:true,differentDurations:true,multipleOrigins:true,browserReloadPreservesReturn:true,legacyDeepLink:true,pageErrors:0,liveDataWritten:false}));
}finally{await browser.close();}
