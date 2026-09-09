/* Stateful appliances and weather: all animation uses world time, including tests. */
window.NightExperience = {
  install(W) {
    const B=BABYLON,V=B.Vector3,M=W.M,box=W.box,cyl=W.cyl;
    const micro=W.scene.getMeshByName('microwave oven');micro.visibility=0;
    W.scene.getMeshByName('microwave window').dispose();
    box('microwave back',8.94,1.6,3.4,.04,.48,.64,M.cream);
    for(const y of [1.36,1.84])box('microwave shell',8.7,y,3.4,.5,.035,.64,M.cream);
    for(const z of [3.08,3.72])box('microwave side',8.7,1.6,z,.5,.48,.03,M.cream);
    const plate=cyl('microwave turntable',8.69,1.396,3.4,.37,.016,M.cream,32);
    const pivot=new B.TransformNode('microwave door hinge',W.scene);pivot.position.set(8.435,1.36,3.72);
    box('microwave door glass',0,.24,-.32,.026,.43,.62,M.glass,false,pivot);
    for(const y of [.02,.46])box('microwave door frame',0,y,-.32,.045,.04,.65,M.black,false,pivot);
    for(const z of [-.62,0])box('microwave door stile',0,.24,z,.045,.46,.035,M.black,false,pivot);
    box('microwave handle',-.05,.24,-.57,.035,.27,.035,M.metal,false,pivot);
    const timer=W.sign('microwave timer',8.428,1.69,3.84,.18,.12,[{text:'00:00',size:38,y:.5}],'#10150e','#abd17d',W.FACE.nx);
    box('microwave controls',8.7,1.6,3.84,.5,.48,.2,M.black);
    W.microwave={open:0,target:0,remaining:0,meal:null,ready:false,pivot,timer};
    W.startMicrowave=(meal,done)=>{
      const m=W.microwave;if(m.remaining>0)return false;
      m.meal=meal;m.ready=false;m.target=1;m.remaining=10;m.done=done;m.lastSecond=-1;
      if(meal)meal.position.set(8.68,1.405,3.4);return true;
    };
    W.scene.getMeshByName('coffee pot').dispose();
    cyl('coffee nozzle',8.48,1.77,2.3,.04,.1,M.metal,16);
    const cup=cyl('brewer paper cup',8.48,1.455,2.3,.15,.2,M.cream,24);
    const coffeeMat=W.mat('fresh dark coffee','#24140c');
    const stream=cyl('visible coffee stream',8.48,1.64,2.3,.012,.2,coffeeMat,10);stream.setEnabled(false);
    const liquid=cyl('coffee fill',8.48,1.37,2.3,.135,.006,coffeeMat,24);liquid.setEnabled(false);cup.setEnabled(false);
    const label=W.sign('coffee recipe display',8.505,1.91,2.3,.33,.11,[{text:'SELECT COFFEE',size:28,y:.5}],'#132019','#d7d9b0',W.FACE.nx);
    W.coffee={remaining:0,recipe:null,cup,stream,liquid,label};
    W.pourCoffee=(recipe,done)=>{
      if(W.coffee.remaining)return false;
      Object.assign(W.coffee,{remaining:6,recipe,done});cup.setEnabled(true);stream.setEnabled(true);liquid.setEnabled(true);
      coffeeMat.diffuseColor=B.Color3.FromHexString(recipe==='Café au lait'?'#9a6840':'#24140c');
      W.setDisplay(label,'BREWING',recipe.toUpperCase(),'PLEASE WAIT');return true;
    };
    // Generator is deliberately an inspectable future-story prop, independent of the current breaker plot.
    box('generator concrete pad',11.3,.08,-8.5,2.9,.2,2,M.concrete);
    const generator=box('standby generator',11.3,.82,-8.5,2.2,1.35,1.15,M.metal,true);
    for(let i=0;i<12;i++)box('generator cooling louvre',10.18,.63+i*.05,-8.5,.025,.018,.8,M.black);
    cyl('generator exhaust',12.15,1.78,-8.78,.11,.9,M.metal,16);
    box('generator control panel',11.3,1.13,-7.91,.65,.35,.04,M.black);
    W.sign('generator label',11.3,.71,-7.905,1.4,.3,[{text:'KUROSE • STANDBY DIESEL',size:25,y:.5}],'#6e7261','#eee5c4',W.FACE.pz);
    W.interact('generator',generator,'Inspect standby generator','generator',{},2.8);
    const flash=new B.HemisphericLight('distant lightning',new V(0,1,0),W.scene);flash.intensity=0;flash.diffuse=new B.Color3(.72,.8,1);flash.renderPriority=100;
    W.weather={nextStorm:80+Math.random()*100,stormUntil:0,nextFlash:0,flash:0,thunderAt:0,storms:0};
    const update=W.update;
    W.update=(dt,player)=>{
      update(dt,player);
      const m=W.microwave,c=W.coffee,t=W.time;
      if(m.remaining>0){m.remaining=Math.max(0,m.remaining-dt);m.target=m.remaining>8?1:0;
        if(m.remaining<8)plate.rotation.y+=dt*2;
        const sec=Math.ceil(Math.min(8,m.remaining));if(sec!==m.lastSecond){m.lastSecond=sec;W.setDisplay(timer,'HEAT','00:'+String(sec).padStart(2,'0'),'');}
        if(!m.remaining){m.ready=true;m.target=1;const f=m.done;m.done=null;f?.();}
      }
      m.open=B.Scalar.Lerp(m.open,m.target,Math.min(1,dt*5));pivot.rotation.y=m.open*1.7;
      if(c.remaining>0){c.remaining=Math.max(0,c.remaining-dt);liquid.position.y=1.37+(1-c.remaining/6)*.15;
        stream.scaling.y=.7+.3*Math.sin(t*30);if(!c.remaining){stream.setEnabled(false);cup.setEnabled(false);liquid.setEnabled(false);W.setDisplay(label,'READY',c.recipe.toUpperCase(),'ENJOY');const f=c.done;c.done=null;f?.();}
      }
      const w=W.weather;
      if(!W.daylight&&t>w.nextStorm){w.stormUntil=t+12+Math.random()*20;w.nextStorm=w.stormUntil+100+Math.random()*140;w.nextFlash=t;w.storms++;}
      if(!W.daylight&&t<w.stormUntil&&t>=w.nextFlash){w.flash=.12;w.thunderAt=t+.8+Math.random()*2;w.nextFlash=t+4+Math.random()*7;}
      if(w.thunderAt&&t>=w.thunderAt){w.thunderAt=0;W.onThunder?.();}
      w.flash=Math.max(0,w.flash-dt);flash.intensity=w.flash>0?.9:0;
      for(const n of W.npcs)if(n.active&&n.root.isEnabled())n.root.position.y=W.floorElevation(n.root.position.x,n.root.position.z);
    };
  }
};
