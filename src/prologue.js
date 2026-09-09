/* A playable home, shared apartment building and neighborhood before the night shift. */
window.NightPrologue = {
  build(W) {
    const B=BABYLON,V=B.Vector3,M=W.M,box=W.box,cyl=W.cyl;
    const first=W.scene.meshes.length,actions=new Map(),cityInteractions=[];
    const wood=W.mat('apartment oak','#796047'),plaster=W.mat('apartment warm plaster','#bcb3a0'),fabric=W.mat('home upholstery','#747b71'),tile=W.mat('bathroom enamel','#b7c4bb');
    // Share the already uploaded canvases; cloning DynamicTextures leaves an unready GPU texture.
    wood.diffuseTexture=M.wood.diffuseTexture;plaster.diffuseTexture=M.wall.diffuseTexture;
    wood.diffuseColor=new B.Color3(.92,.77,.64);plaster.diffuseColor=new B.Color3(.96,.91,.81);
    function surface(name,key,repeats=1){const m=W.mat(name,'#b0aaa0'),maps=window.NightTextures[key];if(maps){m.diffuseTexture=new B.Texture(maps.color,W.scene);m.bumpTexture=new B.Texture(maps.normal,W.scene);for(const t of [m.diffuseTexture,m.bumpTexture]){t.uScale=t.vScale=repeats;t.anisotropicFilteringLevel=4;}m.bumpTexture.level=.25;}return m;}
    const parquet=surface('apartment parquet','wood',7),brick=surface('city brick masonry','bricks',4);
    const P=W.prologue={stage:'none',actions,drive:0,keys:false,dressed:false};
    let api;
    const wall=(name,x,z,w,d)=>box(name,x,1.68,z,w,3.1,d,plaster,true);
    function opening(name,z,x0,x1,c,w){wall(name,(x0+c-w/2)/2,z,c-w/2-x0,.16);wall(name,(c+w/2+x1)/2,z,x1-c-w/2,.16);box(name+' lintel',c,2.91,z,w,.64,.16,plaster);}
    function use(id,mesh,label,fn){const o=W.interact('home-'+id,mesh,label,'home',{},3);cityInteractions.push(o);actions.set(o.id,fn);return mesh;}
    const notice=(title,text)=>api.openModal('NAO MORI • APARTMENT 101',title,'<p>'+text+'</p>');
    function sign(n,x,y,z,w,h,text,face=Math.PI){return W.sign(n,x,y,z,w,h,[{text,size:30,y:.5}],'#615e51','#eee6ce',face);}
    box('neighborhood ground',-99,-.1,25,72,.2,90,M.concrete);
    box('city road',-99,.012,23,72,.025,11,M.asphalt);
    for(let x=-131;x<-63;x+=6)box('city lane marking',x,.032,23,2.6,.012,.12,M.cream);
    box('apartment sidewalk',-100,.12,10.5,35,.24,6,M.concrete);
    box('apartment foundation',-100,.09,-.5,26,.25,17,M.concrete);
    box('home floor',-101,.18,-2,22,.1,12,parquet);
    box('communal hall floor',-100,.18,5.6,26,.1,3.1,M.floor);
    wall('home west wall north',-112,-6.25,.2,3.5);wall('home west wall south',-112,2.5,.2,9);
    box('living window sill wall',-112,.6,-3.25,.2,.75,2.5,plaster,true);
    box('living window header',-112,2.98,-3.25,.2,.5,2.5,plaster);
    box('living room window',-112,1.84,-3.25,.025,1.6,2.5,M.glass);
    box('living window frame',-111.98,1.84,-3.25,.05,1.7,.06,M.metal);
    wall('home north wall',-101,-8,22,.2);
    wall('stairwell east wall',-86.5,-.5,.2,15);
    opening('home hall wall',4,-112,-90,-96,1.25);
    opening('lobby street wall',7.15,-112,-86.5,-89,1.7);
    // Bedroom connects to the living room through a proper opening.
    wall('bedroom partition',-100,-5.4,.15,5.2);wall('bedroom short partition',-100,2.5,.15,3);
    box('bedroom doorway lintel',-100,2.91,-.95,.15,.64,3.7,plaster);
    wall('bathroom partition',-94,-4.5,.15,7);
    opening('bathroom front',-1,-94,-90,-92,1.1);
    wall('home east wall',-90,-2,.16,12);
    box('apartment ceiling',-101,3.28,-2,22,.14,12,plaster);
    // Upper floors are modeled around the accessible stairwell and gallery.
    box('upper gallery',-100,3.35,-7,26,.15,2,M.concrete);
    for(let i=0;i<18;i++)box('concrete stair tread',-88, .23+(i+1)*.175/2,2.5-i*.45,2.2,(i+1)*.175,.45,M.concrete);
    for(let i=0;i<12;i++)cyl('stair baluster',-86.85,.9+i*.25,2.5-i*.64,.035,1,M.metal,8);
    box('upper gallery parapet',-101.5,3.85,-6,23,.95,.12,M.metal,true);
    // Hollow upper floors, reached by the stairs, with shared galleries and locked flats.
    box('upper apartment floor',-101,3.35,-2,22,.14,12,wood);
    for(const y of [4.95,8.1]) {
      box('upper stairwell east wall',-86.5,y,-.5,.2,3.15,15,plaster,true);
      box('upper west wall',-112,y,-2,.2,3.15,12,plaster,true);
      box('upper north wall',-101,y,-8,22,3.15,.2,plaster,true);
      box('upper south facade',-101,y,4.2,22,3.15,.2,plaster,true);
      box('upper east end',-90,y,2.5,.18,3.15,3.5,plaster,true);
      box('upper apartment ceiling',-101,y+1.6,-2,22,.12,12,plaster);
    }
    for(let i=0;i<4;i++) {
      const x=-109.5+i*4.5;
      box('upper flat partition',x,4.95,-3.5,.14,3.1,9,plaster,true);
      const d=box('upper flat door',x+1.7,4.58,-5.95,1.05,2.35,.05,wood);
      sign('upper flat number',x+1.7,5.05,-5.91,.3,.18,String(201+i),0);
      use('upper-flat-'+i,d,'Knock on apartment '+(201+i),()=>{api.audio.play('knock');notice('Upstairs','The apartment is quiet. I should get to work.');});
      box('upper flat hall wall',x+1.7,4.95,-5.99,4.5,3.1,.12,plaster,true);
    }
    for(let level=0;level<3;level++)for(let j=0;j<7;j++) {
      const x=-110+j*3;box('upper apartment window',x,4.4+level*2.15,4.63,1.45,1.3,.035,M.dark);
      box('window mullion',x,4.4+level*2.15,4.66,.05,1.3,.025,M.metal);
      box('balcony slab',x,3.7+level*2.15,5,2.3,.12,1.1,M.concrete);
      box('balcony rail',x,4.15+level*2.15,5.5,2.3,.8,.05,M.metal);
    }
    const door=W.swingDoor('home-entry',-96,4,1.25,'101',2.4);cityInteractions.push(W.interactions.at(-1));door.target=0;
    for(const [x,num] of [[-109,'102'],[-104,'103']]) {
      const d=box('neighbor door '+num,x,1.43,4.11,1.1,2.4,.05,wood);
      sign('neighbor number '+num,x,1.9,4.15,.35,.18,num);
      use('neighbor-'+num,d,'Knock on apartment '+num,()=>{api.audio.play('knock');notice('Apartment '+num,'No answer. Most people in this building are still at work.');});
    }
    for(let i=0;i<8;i++)box('lobby mailbox',-111.75,1.05+Math.floor(i/4)*.35,4.55+(i%4)*.45,.3,.3,.38,M.metal);
    const buildingNotice=sign('lobby noticeboard',-102,1.7,7.04,2.2,1,'AOBA HEIGHTS • KEEP THE HALL CLEAR',0);
    use('noticeboard',buildingNotice,'Read building notice',()=>notice('Aoba Heights','The lift is awaiting inspection. Use the stairs. Laundry closes at nine. A yellowed notice asks residents not to leave the entrance unlocked after dark.'));
    // Living / dining area.
    box('sofa base',-109,.53,-3,1.1,.6,2.5,fabric,true);box('sofa back',-109.43,.95,-3,.25,.8,2.6,fabric);
    for(const z of [-4.15,-1.85])box('sofa arm',-109,.87,z,1.2,.6,.2,fabric);
    for(let i=0;i<3;i++)box('sofa cushion',-108.92,.86,-3.8+i*.8,.82,.17,.74,fabric);
    box('coffee table',-106.8,.52,-3,1.15,.1,1.9,wood,true);
    for(const x of [-107.25,-106.35])for(const z of [-3.7,-2.3])box('table leg',x,.32,z,.06,.4,.06,M.black);
    const remote=box('television remote',-106.8,.59,-2.9,.08,.035,.23,M.black);
    box('television stand',-103.8,.51,-3,.65,.58,1.7,wood,true);
    const tv=box('CRT television',-103.8,1.07,-3,.62,.57,.8,M.black);
    const screen=sign('apartment television screen',-104.12,1.09,-3,.68,.43,'EVENING NEWS',W.FACE.nx);
    let tvOn=false;
    use('tv',remote,'Switch television',()=>{tvOn=!tvOn;screen.setEnabled(tvOn);api.audio.play('switch');api.say('TELEVISION',tvOn?'A thunderstorm warning remains in effect along Mountain Route Seventeen. Police ask drivers to avoid the old bridge.':'The room becomes quiet.');});screen.setEnabled(false);
    const photo=sign('family photograph',-106.7,.68,-3.55,.32,.23,'MORI • SUMMER 1989');
    use('photo',photo,'Look at family photograph',()=>notice('Before the move','Mother took this outside our old house. I told her the city job was temporary. That was eight months ago.'));
    const phone=box('home telephone',-108.5,.86,1.5,.27,.16,.36,M.cream);
    box('telephone side table',-108.5,.55,1.5,.65,.45,.6,wood,true);
    use('phone',phone,'Listen to answering machine',()=>notice('One new message','Mother: “Nao, call after your first shift. Eat something before you leave, and take the main road. Your father says the mountain fog comes early this time of year.”'));
    // Kitchen: cabinets, hob, sink, refrigerator and dining furniture.
    box('kitchen counter',-105.5,.73,-7.35,5.8,1,.85,wood,true);box('kitchen worktop',-105.5,1.25,-7.35,5.95,.06,.9,M.cream);
    for(let i=0;i<5;i++){box('kitchen cupboard',-108+i*1.05,2.25,-7.62,.95,.75,.45,wood);box('cupboard handle',-107.68+i*1.05,2.21,-7.38,.035,.2,.025,M.metal);}
    for(let i=0;i<6;i++){box('base cabinet inset',-107.9+i*.95,.76,-6.916,.88,.84,.025,wood);box('base cabinet handle',-107.65+i*.95,1.02,-6.88,.18,.025,.025,M.metal);}
    for(let i=0;i<3;i++)cyl('kitchen spice jar',-103.25+i*.22,1.43,-7.5,.11,.27,i%2?M.cream:M.wood,20);
    box('kitchen chopping board',-105.3,1.3,-7.2,.47,.025,.35,wood);
    box('kitchen knife blade',-105.3,1.32,-7.2,.03,.012,.22,M.metal);
    cyl('saucepan',-104.7,1.44,-7.45,.26,.19,M.metal,24);
    const sink=box('kitchen sink',-106.5,1.29,-7.25,.8,.035,.54,M.metal);
    cyl('kitchen tap',-106.5,1.48,-7.49,.045,.4,M.metal,16);
    const water=cyl('tap water',-106.5,1.4,-7.25,.018,.22,M.glass,12);water.setEnabled(false);
    use('sink',sink,'Turn kitchen tap',()=>{water.setEnabled(!water.isEnabled());api.audio.noise(1,.025,1800);api.toast(water.isEnabled()?'Cold water runs into the sink.':'Tap closed.');});
    const hob=box('kitchen cooker',-104.5,1.3,-7.3,.8,.05,.63,M.black);
    for(const x of [-104.7,-104.3])for(const z of [-7.45,-7.15])cyl('hob ring',x,1.335,z,.18,.015,M.metal,24);
    use('cooker',hob,'Check stove',()=>notice('Gas stove','The gas is off. There is leftover curry in the refrigerator.'));
    box('home refrigerator cabinet',-110.9,1.16,-6.85,.85,1.86,.86,M.cream,true);
    const fridgeDoor=box('home refrigerator door',-110.9,1.16,-6.4,.85,1.8,.06,M.cream);
    const meal=box('leftover curry',-110.9,1.05,-6.48,.34,.12,.29,M.wood);meal.setEnabled(false);
    let fridgeOpen=false;use('fridge',fridgeDoor,'Open refrigerator',()=>{fridgeOpen=!fridgeOpen;fridgeDoor.rotation.y=fridgeOpen?-1.2:0;fridgeDoor.position.x=fridgeOpen?-111.25:-110.9;meal.setEnabled(fridgeOpen);notice('Kitchen refrigerator',fridgeOpen?'A covered bowl of curry and half a carton of milk. I eat a little before leaving.':'The door seals shut.');P.ate=true;});
    box('dining table',-104.2,.93,.9,1.6,.1,1.1,wood,true);
    for(const x of [-104.8,-103.6])for(const z of [.55,1.25])box('dining table leg',x,.58,z,.065,.65,.065,wood);
    for(const x of [-105.35,-103.05]){box('dining chair',x,.62,.9,.5,.09,.55,wood,true);box('chair back',x,1,.65,.5,.75,.05,wood);}
    cyl('dinner mug',-104.2,1.08,.9,.13,.2,M.cream,20);
    // Bedroom: bed, wardrobe, lamp, desk and keys.
    const bed=box('bed frame',-97.2,.42,-5.3,2.1,.4,3.1,wood,true);
    box('bed mattress',-97.2,.71,-5.3,2.06,.25,3,M.cream);box('folded duvet',-97.2,.89,-4.9,2.05,.13,2.2,fabric);
    for(const x of [-97.7,-96.7])box('bed pillow',x,.91,-6.4,.8,.16,.52,M.cream);
    use('bed',bed,'Sit on bed',()=>notice('A little before six','I slept badly. A first night at a new job always does this to me. The supervisor asked me to arrive before sunset.'));
    const wardrobe=box('wardrobe',-94.75,1.45,-6.2,.9,2.45,2.2,wood,true);
    use('wardrobe',wardrobe,'Put on work clothes',()=>{P.dressed=true;api.toast('Work clothes on. Take your car keys before leaving.');api.objective('Take your keys and leave for work.','The keys are on the bedroom desk. Your car is parked outside.');});
    box('bedroom desk',-97.2,.91,-1.3,1.8,.12,.65,wood,true);
    const key=cyl('apartment car keys',-97.1,.99,-1.3,.11,.018,M.metal,20);
    use('keys',key,'Take car keys',()=>{P.keys=true;key.setEnabled(false);api.audio.play('paper');api.toast('Car keys taken. Your car is the green sedan outside.');});
    const letter=sign('job appointment letter',-97.6,.99,-1.3,.4,.3,'KUROSE SERVICE • NAO MORI');letter.rotation.x=Math.PI/2;
    use('letter',letter,'Read appointment letter',()=>notice('First shift • 17 April','Meet Mr. Kuroda at Kurose Service before sunset for training. Night duty begins at 11:42 PM. Bring your own transport. Mountain Route Seventeen, beyond the bridge.'));
    const lamp=cyl('bedside lamp',-98.65,1.07,-6,.26,.34,M.warm,24);
    box('bedside cabinet',-98.65,.65,-6,.55,.75,.6,wood,true);
    const lampLight=new B.PointLight('bedside reading light',new V(-98.65,1.4,-6),W.scene);lampLight.intensity=.45;lampLight.range=5;
    use('lamp',lamp,'Switch bedside lamp',()=>{lampLight.intensity=lampLight.intensity?0:.45;api.audio.play('switch');});
    // Bathroom with separated shower, basin, mirror, toilet and laundry machine.
    box('bathroom tiled floor',-92,.236,-4.4,3.8,.025,6.5,M.floor);
    const toilet=cyl('toilet bowl',-91.1,.52,-6.7,.56,.5,tile,32);
    box('toilet cistern',-91.1,.94,-7.2,.6,.7,.26,tile,true);
    use('toilet',toilet,'Flush toilet',()=>{api.audio.noise(2,.05,500);api.toast('Water echoes through the old pipes.');});
    const basin=box('bathroom basin',-93.4,1,-3.1,.66,.2,.8,tile,true);
    const mirror=box('bathroom mirror',-93.83,1.76,-3.1,.025,.85,.76,M.metal);
    use('mirror',mirror,'Look in mirror',()=>notice('Nao Mori','Twenty-three. Too little sleep. I straighten my collar and try to look awake.'));
    use('basin',basin,'Wash face',()=>{api.audio.noise(1.4,.035,1700);api.toast('Cold water. I feel a little more awake.');});
    box('shower tray',-93,.3,-6.6,1.45,.15,1.6,tile);
    const shower=cyl('shower pipe',-93.77,1.7,-6.6,.045,1.8,M.metal,16);
    const spray=cyl('shower water',-93.25,1.35,-6.6,.2,1.8,M.glass,16);spray.setEnabled(false);
    use('shower',shower,'Turn shower on / off',()=>{spray.setEnabled(!spray.isEnabled());api.audio.noise(2,.025,2300);api.toast(spray.isEnabled()?'The shower warms slowly.':'Shower off.');});
    const washer=box('washing machine',-91.2,.78,-2,.85,1.05,.75,tile,true);
    cyl('washing machine drum',-91.2,.8,-1.61,.52,.025,M.black,32).rotation.x=Math.PI/2;
    use('washer',washer,'Check laundry',()=>notice('Laundry','The uniform is dry. I can do the rest tomorrow.'));
    // A furnished street and city blocks beyond the apartment entrance.
    for(let i=0;i<9;i++) {
      const x=-129+i*7.5,h=5+(i%3)*3;
      box('city shop block',x,h/2,39,6.3,h,11,i%2?brick:plaster,true);
      sign('city shop sign '+i,x,2.9,33.44,4.7,.55,['AOBA BOOKS','MORI LAUNDRY','NOODLE HOUSE','SAKURA PHARMACY'][i%4]);
      for(let j=0;j<3;j++)for(let k=0;k<Math.floor(h/2.5);k++)box('city facade window',x-1.8+j*1.8,1.6+k*2.4,33.45,1.2,1.35,.035,M.dark);
      box('shop awning',x,2.4,32.8,5.8,.12,1.4,i%2?M.red:wood);
      box('shop entrance frame',x,1.23,33.37,1.35,2.42,.07,M.metal);
      box('shop entrance glass',x,1.3,33.32,1.18,2.2,.03,M.glass);
      box('shop door handle',x+.48,1.17,33.27,.035,.4,.035,M.cream);
      cyl('facade drainpipe',x+2.95,h/2,33.34,.08,h,M.metal,12);
      box('air conditioning unit',x-1.7,3.35,33.14,.9,.55,.52,M.cream);
      for(let f=0;f<6;f++)box('air conditioner vent',x-2.01+f*.12,3.35,32.867,.035,.38,.018,M.metal);
      if(i%2===0){cyl('city lamp post',x,.0+2.5,12.2,.1,5,M.metal,12);box('street lamp',x,5.02,12.2,.5,.16,.5,M.cream);}
    }
    for(let i=0;i<5;i++)box('pedestrian crossing',-82+i*.75,.04,23,.4,.015,10,M.cream);
    box('bus shelter roof',-119,2.8,12.5,4,.12,1.8,M.metal);
    box('bus shelter glass',-119,1.65,11.7,3.9,2.2,.04,M.glass);
    box('bus bench',-119,.7,12.3,3,.1,.55,wood,true);
    const bus=sign('bus timetable',-117.3,1.7,12.1,.4,.6,'17 • MOUNTAIN ROUTE');
    use('bus',bus,'Read bus timetable',()=>notice('Last bus: 18:10','The last return service leaves before my shift starts. Good thing I brought the car.'));
    for(let i=0;i<3;i++){box('bicycle rack',-113+i*.65,.55,11,.04,.8,1.1,M.metal);cyl('street planter',-109+i*3,.5,11,.8,.7,wood,16);cyl('planter shrub',-109+i*3,1,11,1,.8,M.dark,16);}
    for(const [name,x,z,coat] of [['Mrs. Ito',-116,11,'#79635e'],['Student',-80,13,'#536878']]) {
      const n=W.makeNPC(name,coat,'#302922',name==='Mrs. Ito');n.root.position.set(x,.24,z);n.root.rotation.y=Math.PI/2;
      const o=W.interactions.find(o=>o.data.npc===n);o.kind='home';cityInteractions.push(o);
      actions.set(o.id,()=>api.dialogue(n,[[name,name==='Mrs. Ito'?'Off to work already? There’s rain coming from the mountains.':'The number seventeen bus is late again.'],['NAO','First shift at Kurose Service.'],[name,name==='Mrs. Ito'?'Come home safely, Nao. I’ll leave the lobby light on.':'That far out? Take the main road. They shut the old bridge years ago.']]));
    }
    const car=W.makeCar('sedan','#657a6c','KU 18-39');car.root.position.set(-96,0,17);car.root.rotation.y=Math.PI/2;P.car=car;
    P.route=[[-96,17],[-90,23],[-83,29],[-72,32],[-40,32],[-20,30.5],[-14,26],[-9,18],[-6.8,12.6]];
    P.routeCum=[0];for(let i=1;i<P.route.length;i++)P.routeCum.push(P.routeCum[i-1]+Math.hypot(P.route[i][0]-P.route[i-1][0],P.route[i][1]-P.route[i-1][1]));
    P.routeLen=P.routeCum[P.routeCum.length-1];
    use('car',car.hit,'Drive to Kurose Service',()=>{
      if(!P.keys||!P.dressed){api.toast(!P.dressed?'Put on work clothes at the bedroom wardrobe.':'Take your keys from the bedroom desk.');return;}
      api.openModal('MOUNTAIN ROUTE 17','Leave for work?','<p>The appointment letter is folded on the passenger seat. There is still daylight.</p>',[['Drive to Kurose Service',()=>{P.stage='driving';P.drive=0;for(const o of cityInteractions)o.enabled=false;api.objective('Mountain Route Seventeen','');api.audio.engine(true);}],['Stay a little longer',()=>{}]]);
    });
    P.meshes=W.scene.meshes.slice(first);
    P.cityInteractions=cityInteractions;
    const oldBlocked=W.isBlocked,oldFloor=W.floorElevation;
    W.isBlocked=(x,z,r=.25,ignoreCars=false)=>{
      if(x>-55)return oldBlocked(x,z,r,ignoreCars);
      if(x<-133||x>-64||z<-9||z>55)return true;
      const floor=W.floorElevation(x,z);
      return W.colliders.some(c=>{
        if(!c.enabled||(ignoreCars&&c.car))return false;
        if(x<=c.x-c.hx-r||x>=c.x+c.hx+r||z<=c.z-c.hz-r||z>=c.z+c.hz+r)return false;
        if(c.mesh){c.mesh.computeWorldMatrix(true);const b=c.mesh.getBoundingInfo().boundingBox;if(b.maximumWorld.y<floor+.1||b.minimumWorld.y>floor+1.8)return false;}
        return true;
      });
    };
    W.floorElevation=(x,z)=>{
      if(x>-55)return oldFloor(x,z);
      if(x>-89.2&&x<-86.8&&z<2.8&&z>-5.7)return .23+Math.min(3.15,Math.floor((2.8-z)/.45)*.175);
      if(P.level&&z<7.3)return 3.42;
      return z<7.3?.23:z<13.5?.24:0;
    };
    const boss=W.makeNPC('Mr. Kuroda','#697363','#44423b');
    boss.root.position.set(-5.6,-.02,-8.5);
    boss.root.rotation.y=Math.PI+.55; // seated at the desk, turned toward the door
    for(const leg of boss.legs)leg.rotation.x=-1.2;
    for(const arm of boss.arms)arm.rotation.x=-.4;
    boss.root.setEnabled(false);P.boss=boss;
    const bossInteraction=W.interactions.find(o=>o.data.npc===boss);bossInteraction.kind='boss';bossInteraction.enabled=false;
    P.setCity=on=>{cityInteractions.forEach(o=>o.enabled=on);P.meshes.forEach(m=>{if(!m.isDisposed())m.setEnabled(on);});};
    P.skip=()=>{P.stage='none';P.setCity(false);boss.root.setEnabled(false);bossInteraction.enabled=false;W.setDaylight(false);};
    P.start=a=>{api=a;P.stage='apartment';P.level=0;P.keys=false;P.dressed=false;P.setCity(true);key.setEnabled(true);screen.setEnabled(false);spray.setEnabled(false);water.setEnabled(false);meal.setEnabled(false);W.setDaylight(true);api.phase('apartment');api.teleport(-105.8,-3.8,Math.PI/2,.04);api.objective('Get ready for your first shift.','Explore your apartment. Work clothes are in the bedroom wardrobe; keys are on the desk.');api.say('NAO','Kuroda asked me to arrive before sunset. I should get ready.',8);};
    P.arrive=()=>{P.drive=0;P.stage='orientation';P.setCity(false);boss.root.setEnabled(true);bossInteraction.enabled=true;api.phase('orientation');api.teleport(-6.5,8.5,Math.PI,.02);api.audio.engine(false);api.objective('Meet Mr. Kuroda in the office.','Through the stockroom door at the back \u2014 the office is inside, on the left.');api.say('KURODA','\u2014 Mori? Back here! Through the stockroom \u2014 the office is on the left!',9);};
    P.talkBoss=()=>{
      const intro=[['KURODA','Nao Mori? You found us. I’m Kuroda. Thanks for coming early. The night shift is quiet, but I want you to know the place before I leave.'],['NAO','I’ve worked a register before. I haven’t worked a fuel desk.'],['KURODA','Then start there. Customers bring their shopping to the tray. Scan each item, validate their pump on the fuel terminal, then take payment. If someone is browsing, let them take their time.'],['KURODA','The stockroom is the door at the back. The office is inside it, on the left. Clock in there when the night shift begins. Keep the original receipts in the drawer.']];
      api.dialogue(boss,intro,()=>topics());
    };
    const topics=()=>{
      api.openModal('MR. KURODA','Before I leave…','<p>Kuroda folds his arms and looks toward the forecourt.</p>',[
        ['Ask about Pump Four',()=>api.dialogue(boss,[['NAO','Why is Four covered?'],['KURODA','Electrical fault. It stays disconnected. If the terminal shows a sale on Four, cancel it. Don’t try to finish someone else’s transaction.'],['NAO','Someone else’s?'],['KURODA','Old records. The system has a long memory. That’s all.']],topics)],
        ['Ask about food and equipment',()=>api.dialogue(boss,[['KURODA','Coffee: select a type and leave the cup under the nozzle until it finishes. For noodles, load the microwave, close it and let the timer finish. Never hand someone a cold dinner and call it service.'],['KURODA','The generator is outside behind the east wall. Leave its service switch alone. The rear door latch sticks; pull it shut.']],topics)],
        ['Ask about the regulars',()=>api.dialogue(boss,[['KURODA','Emi drives the taxi. Daichi takes the depot run. Mrs. Hasegawa knows everyone on this road. Listen to them; don’t rush them.'],['NAO','And if I need help?'],['KURODA','My number is beside the phone. Stay inside if the storm gets close.']],topics)],
        ['Ready for the night shift',()=>api.dialogue(boss,[['NAO','Scan, validate, take payment. Four stays off. Clock in through the stockroom.'],['KURODA','Good. There’s food in the back if you need it. I’ll see you in the morning.'],['NAO','I watch his car pull away. By the time I finish reading the handover notes, the daylight has gone.']],()=>{P.skip();api.night();})]
      ]);api.focus(boss);document.getElementById('modal').classList.add('conversation');
    };
    P.act=id=>actions.get(id)?.();
    P.update=dt=>{
      if(P.stage==='apartment'){const p=api.G.player;if(p.x>-89.2&&p.x<-86.8){if(p.z<-5.3)P.level=1;if(p.z>2.5)P.level=0;}return;}
      if(P.stage!=='driving')return;
      // A short scripted commute: out of the side street, east along Route 17
      // past the neighborhood, and in under the canopy. The camera rides at
      // dashboard height looking down the road, eased at both ends.
      P.drive+=dt;
      const D=19,t=Math.min(1,P.drive/D),e=t*t*(3-2*t);
      let dist=e*P.routeLen,seg=0;
      while(seg<P.routeCum.length-2&&dist>P.routeCum[seg+1])seg++;
      const [ax,az]=P.route[seg],[bx,bz]=P.route[seg+1],
        span=Math.max(.001,P.routeCum[seg+1]-P.routeCum[seg]),
        f=Math.min(1,(dist-P.routeCum[seg])/span),
        x=ax+(bx-ax)*f,z=az+(bz-az)*f,
        yaw=Math.atan2(bx-ax,bz-az);
      car.root.position.set(x,0,z);
      const dy=Math.atan2(Math.sin(yaw-car.root.rotation.y),Math.cos(yaw-car.root.rotation.y));
      car.root.rotation.y+=dy*Math.min(1,dt*4);
      const h=car.root.rotation.y;
      api.teleport(x+Math.sin(h)*.38,z+Math.cos(h)*.38,h,0);
      api.camera().position.y=1.31;
      if(t>=1)P.arrive();
    };
    P.skip();
  }
};
