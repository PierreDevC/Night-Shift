/* Home-to-work progression and physical service regressions, offline. */
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {launch}=require('./helpers/browser.cjs');
(async()=>{
 const browser=await launch();
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},offline:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(pathToFileURL(path.resolve('index.html')).href+'?debug=1');
  await page.waitForFunction(()=>window.__nightShift,{},{timeout:20000});
  await page.waitForSelector('#menu:not(.hidden)',{timeout:60000}).catch(async e=>{console.error(await page.locator('#load-status').textContent(),errors);throw e;});
  fs.mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/new-title.png'});
  await page.click('#start');
  const ev=fn=>page.evaluate(fn),act=id=>page.evaluate(id=>__nightShift.interact(id),id);
  const tick=s=>page.evaluate(s=>__nightShift.tick(s),s);
  const capture=async(name,x,z,yaw=0,pitch=0)=>{
   await page.evaluate(({x,z,yaw,pitch})=>{__nightShift.teleport(x,z,yaw,pitch);__nightShift.scene.render();},{x,z,yaw,pitch});
   await page.screenshot({path:'test-results/'+name+'.png'});
  };
  assert.equal(await ev(()=>__nightShift.G.phase),'apartment');
  assert.ok(await ev(()=>__nightShift.G.player.x<-90));
  await capture('apartment-living',-106,-1.1,Math.PI,.05);
  await capture('apartment-bedroom',-97.5,-1.9,Math.PI,.08);
  await capture('apartment-bathroom',-92,-1.7,Math.PI,.1);
  await act('home-car');
  assert.equal(await ev(()=>__nightShift.W.prologue.stage),'apartment','Cannot depart without work clothes and keys');
  await act('home-tv');assert.equal(await ev(()=>__nightShift.scene.getMeshByName('apartment television screen').isEnabled()),true);
  await act('home-sink');assert.equal(await ev(()=>__nightShift.scene.getMeshByName('tap water').isEnabled()),true);
  await act('home-sink');
  await act('home-wardrobe');await act('home-keys');
  await act('home-entry');await tick(2);
  assert.equal(await ev(()=>__nightShift.W.isBlocked(-96,4,.24)),false,'Apartment entry is traversable');
  assert.deepEqual(await ev(()=>{
    const W=__nightShift.W,step=.3,x0=-112,z0=-8,nx=87,nz=81,seen=new Set(),q=[];
    const id=(i,j)=>i*nz+j;const si=Math.round((-105.8-x0)/step),sj=Math.round((-3.8-z0)/step);
    q.push([si,sj]);seen.add(id(si,sj));
    for(let h=0;h<q.length;h++){const [i,j]=q[h];for(const [a,b]of[[i+1,j],[i-1,j],[i,j+1],[i,j-1]]){
      if(a<0||b<0||a>=nx||b>=nz||seen.has(id(a,b))||W.isBlocked(x0+a*step,z0+b*step,.24))continue;
      seen.add(id(a,b));q.push([a,b]);
    }}
    return [['bedroom',-97.5,-2],['bathroom',-92,-2.5],['lobby',-89,6],['street',-94,14]].filter(([,x,z])=>!q.some(([i,j])=>Math.hypot(x0+i*step-x,z0+j*step-z)<.5)).map(p=>p[0]);
  }),[],'Continuous walking routes connect home rooms, lobby and street');
  await ev(()=>__nightShift.teleport(-96,2.8,0));
  await page.keyboard.down('KeyW');
  try{await page.waitForFunction(()=>__nightShift.G.player.z>4.5,{},{timeout:12000});}finally{await page.keyboard.up('KeyW');}
  await capture('apartment-building',-99,17,Math.PI,.02);
  await capture('city-street',-91,13.5,0,.02);
  await act('home-car');
  await page.getByRole('button',{name:'Drive to Kurose Service',exact:true}).click();
  await ev(()=>__nightShift.engine.stopRenderLoop());
  await ev(()=>__nightShift.W.prologue.update(9));
  await page.screenshot({path:'test-results/commute.png'});
  assert.equal(await ev(()=>__nightShift.G.phase),'apartment','Still driving mid-route');
  await ev(()=>__nightShift.W.prologue.update(10));
  assert.equal(await ev(()=>__nightShift.G.phase),'orientation');
  assert.equal(await ev(()=>__nightShift.W.daylight),true);
  await act('timeclock');assert.equal(await ev(()=>!!__nightShift.G.flags.clocked),false);
  const boss=await ev(()=>__nightShift.W.interactions.find(o=>o.kind==='boss').id);
  await capture('daylight-station',-6.5,8.5,Math.PI,0);
  await capture('boss-model',1.7,4,Math.PI/2,.03);
  assert.ok(await ev(()=>__nightShift.scene.getMeshByName('Mr. Kuroda anatomical face').getTotalVertices()>4000));
  await act(boss);
  assert.equal(await page.locator('#modal.conversation').count(),1);
  for(let i=0;i<4;i++)await page.locator('#modal-buttons button').first().click();
  assert.ok(await page.getByRole('button',{name:'Ask about Pump Four',exact:true}).isVisible());
  await page.screenshot({path:'test-results/boss-conversation.png'});
  await page.getByRole('button',{name:'Ask about Pump Four',exact:true}).click();
  for(let i=0;i<4;i++)await page.locator('#modal-buttons button').first().click();
  await page.getByRole('button',{name:'Ready for the night shift',exact:true}).click();
  for(let i=0;i<3;i++)await page.locator('#modal-buttons button').first().click();
  assert.equal(await ev(()=>__nightShift.G.phase),'handover');
  assert.equal(await ev(()=>__nightShift.W.daylight),false);
  assert.equal(await ev(()=>__nightShift.W.prologue.boss.root.isEnabled()),false);
  assert.equal(await ev(()=>__nightShift.W.staffDoor.pivot.getChildMeshes()[0].getBoundingInfo().boundingBox.extendSize.y),.7);
  assert.equal(await ev(()=>{
    const s=__nightShift.scene,g=s.getMeshByName('cashier glass'),c=s.getMeshByName('countertop');g.computeWorldMatrix(true);c.computeWorldMatrix(true);
    return Math.abs(g.getBoundingInfo().boundingBox.minimumWorld.y-c.getBoundingInfo().boundingBox.maximumWorld.y)<.002;
  }),true,'Glazing meets the counter');
  await capture('new-counter',7.6,3.2,-Math.PI/2,.22);
  await act('coffee-machine');await page.getByRole('button',{name:'Café au lait',exact:true}).click();
  await tick(3);
  assert.ok(await ev(()=>__nightShift.W.coffee.stream.isEnabled()));
  await capture('coffee-pouring',7.6,2.3,Math.PI/2,.3);
  await tick(4);
  assert.equal(await ev(()=>__nightShift.G.carry.name),'Café au lait');
  assert.equal(await ev(()=>__nightShift.W.coffee.stream.isEnabled()),false);
  await ev(()=>{__nightShift.teleport(7.6,1.5,0);__nightShift.dropCarry();});
  assert.ok(await ev(()=>{
    const o=__nightShift.W.interactions.findLast(o=>o.kind==='pickup');return o.data.root.position.y>.46;
  }),'Dropped cup rests on raised platform');
  await ev(()=>{
    const d=__nightShift,meal=d.W.makeProduct('noodles',0,0,0);
    d.W.startMicrowave(meal,()=>{d.G.flags.testHeated=true;});
  });
  await tick(1);assert.ok(await ev(()=>__nightShift.W.microwave.open>.9));
  await tick(3);assert.ok(await ev(()=>__nightShift.W.microwave.open<.1));
  assert.ok(await ev(()=>__nightShift.W.microwave.remaining>0));
  await capture('microwave-timer',7.6,3.4,Math.PI/2,.15);
  await tick(7);assert.equal(await ev(()=>__nightShift.G.flags.testHeated),true);
  await act('generator');assert.match(await page.locator('#modal-body').textContent(),/Transfer switch: OFF/);
  await ev(()=>__nightShift.closeModal());
  await ev(()=>{const d=__nightShift;d.W.weather.nextStorm=d.W.time;d.G.ambientEnabled=false;});await tick(1);
  assert.ok(await ev(()=>__nightShift.W.weather.storms>0));
  await capture('generator',11.3,-5.9,Math.PI,.1);
  assert.deepEqual(errors,[]);
  console.log('PASS: apartment preparation, interactive home, city/commute, daylight boss dialogue, night handover, half gate, glazing, coffee pour, platform drops, microwave door/timer, generator and storm scheduling.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
