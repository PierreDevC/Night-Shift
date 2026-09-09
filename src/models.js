/* Anatomical CC0 faces, tailored civilian clothing and detailed vehicle bodies. */
window.NightModels = (() => {
  const B = BABYLON, V = B.Vector3;
  function ell(W, name, x,y,z,sx,sy,sz,material,parent) {
    const m=B.MeshBuilder.CreateSphere(name,{segments:20,diameter:1},W.scene);
    m.position.set(x,y,z);m.scaling.set(sx,sy,sz);m.material=material;m.parent=parent;m.isPickable=false;return m;
  }
  function loft(W,name,rings,material,parent,axis='y') {
    rings=[...rings].sort((a,b)=>a[0]-b[0]);
    const p=[],ind=[],count=16;
    for(const [h,rx,rz,offset=0] of rings) for(let j=0;j<count;j++) {
      const a=j/count*Math.PI*2;
      p.push(rx*Math.cos(a),axis==='y'?h:offset+rz*Math.sin(a),axis==='y'?offset+rz*Math.sin(a):h);
    }
    for(let i=0;i<rings.length-1;i++) for(let j=0;j<count;j++) {
      const a=i*count+j,b=i*count+(j+1)%count,c=b+count,d=a+count;
      ind.push(a,b,c,a,c,d);
    }
    for(let j=1;j<count-1;j++){ind.push(0,j+1,j);const k=(rings.length-1)*count;ind.push(k,k+j,k+j+1);}
    const m=new B.Mesh(name,W.scene),d=new B.VertexData();d.positions=p;d.indices=ind;
    d.uvs=[];for(let i=0;i<rings.length;i++)for(let j=0;j<count;j++)d.uvs.push(j/count,i/(rings.length-1));
    d.normals=[];B.VertexData.ComputeNormals(p,ind,d.normals);d.applyToMesh(m);m.material=material;material.backFaceCulling=false;m.parent=parent;m.isPickable=false;return m;
  }

  function createFaceTexture(W, name, baseTone, charType) {
    const size = 256;
    const tex = new B.DynamicTexture(name + ' face texture', size, W.scene, false);
    const ctx = tex.getContext();

    // Base skin filling
    ctx.fillStyle = baseTone;
    ctx.fillRect(0, 0, size, size);

    // Subtle skin pore and complexion grain
    for (let i = 0; i < 2800; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.035)';
      ctx.fillRect(W.random() * size, W.random() * size, 1.5, 1.5);
    }

    // Anatomical orbital eye sockets shading (Y ~ 100-118, Left eye X ~ 164, Right eye X ~ 92)
    const eyeGradR = ctx.createRadialGradient(92, 108, 6, 92, 108, 26);
    eyeGradR.addColorStop(0, 'rgba(60,35,25,0.32)');
    eyeGradR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eyeGradR;
    ctx.beginPath(); ctx.arc(92, 108, 26, 0, Math.PI * 2); ctx.fill();

    const eyeGradL = ctx.createRadialGradient(164, 108, 6, 164, 108, 26);
    eyeGradL.addColorStop(0, 'rgba(60,35,25,0.32)');
    eyeGradL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eyeGradL;
    ctx.beginPath(); ctx.arc(164, 108, 26, 0, Math.PI * 2); ctx.fill();

    // Eyelid crease lines
    ctx.strokeStyle = 'rgba(50,30,20,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(92, 106, 15, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(164, 106, 15, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();

    // Nose bridge highlight & lateral shadows
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(118, 105, 5, 34); // left shadow
    ctx.fillRect(133, 105, 5, 34); // right shadow
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(124, 104, 8, 32); // bridge highlight

    // Nose tip and nostrils
    const noseTip = ctx.createRadialGradient(128, 137, 2, 128, 137, 12);
    noseTip.addColorStop(0, 'rgba(255,255,255,0.22)');
    noseTip.addColorStop(0.6, 'rgba(120,60,40,0.18)');
    noseTip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = noseTip;
    ctx.beginPath(); ctx.arc(128, 137, 12, 0, Math.PI * 2); ctx.fill();

    // Dark nostrils
    ctx.fillStyle = 'rgba(25,10,10,0.75)';
    ctx.beginPath(); ctx.ellipse(121, 142, 3.5, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(135, 142, 3.5, 2, 0.3, 0, Math.PI * 2); ctx.fill();

    // Philtrum groove
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(126, 145, 4, 16);

    // Lips and mouth contour (Y ~ 166, X ~ 112 to 144)
    const lipGrad = ctx.createLinearGradient(128, 160, 128, 178);
    if (charType === 'female') {
      lipGrad.addColorStop(0, 'rgba(175,95,95,0.65)');
      lipGrad.addColorStop(0.5, 'rgba(120,40,40,0.85)');
      lipGrad.addColorStop(1, 'rgba(195,115,115,0.65)');
    } else if (charType === 'elderly') {
      lipGrad.addColorStop(0, 'rgba(145,105,95,0.5)');
      lipGrad.addColorStop(0.5, 'rgba(80,50,45,0.7)');
      lipGrad.addColorStop(1, 'rgba(150,110,100,0.5)');
    } else if (charType === 'pale') {
      lipGrad.addColorStop(0, 'rgba(110,95,95,0.55)');
      lipGrad.addColorStop(0.5, 'rgba(70,55,55,0.75)');
      lipGrad.addColorStop(1, 'rgba(115,100,100,0.55)');
    } else {
      lipGrad.addColorStop(0, 'rgba(150,90,80,0.6)');
      lipGrad.addColorStop(0.5, 'rgba(90,45,35,0.8)');
      lipGrad.addColorStop(1, 'rgba(165,100,90,0.6)');
    }
    // Upper lip
    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.moveTo(112, 166);
    ctx.quadraticCurveTo(122, 161, 128, 164);
    ctx.quadraticCurveTo(134, 161, 144, 166);
    ctx.quadraticCurveTo(128, 168, 112, 166);
    ctx.fill();

    // Mouth parting line
    ctx.strokeStyle = 'rgba(40,15,15,0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(111, 166);
    ctx.quadraticCurveTo(128, 168, 145, 166);
    ctx.stroke();

    // Lower lip
    ctx.beginPath();
    ctx.moveTo(113, 166);
    ctx.quadraticCurveTo(128, 176, 143, 166);
    ctx.quadraticCurveTo(128, 168, 113, 166);
    ctx.fill();

    // Chin shadow
    const chinGrad = ctx.createRadialGradient(128, 188, 4, 128, 188, 22);
    chinGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
    chinGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = chinGrad;
    ctx.beginPath(); ctx.arc(128, 188, 22, 0, Math.PI * 2); ctx.fill();

    // Cheek warmth & contour
    const cheekR = ctx.createRadialGradient(72, 136, 4, 72, 136, 32);
    cheekR.addColorStop(0, charType === 'female' ? 'rgba(215,110,100,0.26)' : 'rgba(160,80,60,0.14)');
    cheekR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cheekR;
    ctx.beginPath(); ctx.arc(72, 136, 32, 0, Math.PI * 2); ctx.fill();

    const cheekL = ctx.createRadialGradient(184, 136, 4, 184, 136, 32);
    cheekL.addColorStop(0, charType === 'female' ? 'rgba(215,110,100,0.26)' : 'rgba(160,80,60,0.14)');
    cheekL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cheekL;
    ctx.beginPath(); ctx.arc(184, 136, 32, 0, Math.PI * 2); ctx.fill();

    // Character-specific detailing
    if (charType === 'supervisor') {
      // Kuroda: 5 o'clock stubble shadow around jaw and chin
      ctx.fillStyle = 'rgba(50,45,40,0.25)';
      for (let y = 160; y < 220; y += 3) {
        for (let x = 85; x < 172; x += 3) {
          if (W.random() > 0.45 && Math.hypot(x - 128, y - 180) < 46) {
            ctx.fillRect(x + W.random() * 2, y + W.random() * 2, 1.5, 1.5);
          }
        }
      }
      // Forehead worry lines
      ctx.strokeStyle = 'rgba(60,40,30,0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(95, 62); ctx.lineTo(160, 62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(98, 70); ctx.lineTo(158, 70); ctx.stroke();
    } else if (charType === 'elderly') {
      // Mrs. Hasegawa: soft nasolabial folds and crow's feet
      ctx.strokeStyle = 'rgba(70,45,35,0.32)';
      ctx.lineWidth = 1.5;
      // Nasolabial
      ctx.beginPath(); ctx.moveTo(110, 142); ctx.quadraticCurveTo(104, 160, 108, 178); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(146, 142); ctx.quadraticCurveTo(152, 160, 148, 178); ctx.stroke();
      // Crow's feet
      for (let side of [-1, 1]) {
        const cx = side === -1 ? 74 : 182;
        ctx.beginPath(); ctx.moveTo(cx, 106); ctx.lineTo(cx + side * 14, 100); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 108); ctx.lineTo(cx + side * 16, 108); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 110); ctx.lineTo(cx + side * 14, 116); ctx.stroke();
      }
    } else if (charType === 'shock') {
      // Ryo: sweat droplets and scratch
      ctx.strokeStyle = 'rgba(160,35,30,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(172, 76); ctx.lineTo(184, 88); ctx.stroke(); // cut on temple
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(100, 72, 2, 4); ctx.fillRect(150, 75, 2, 5); // sweat beads
    } else if (charType === 'gaunt') {
      // Shibata: sunken cheek hollows
      ctx.fillStyle = 'rgba(40,30,25,0.35)';
      ctx.beginPath(); ctx.ellipse(78, 150, 14, 24, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(178, 150, 14, 24, -0.2, 0, Math.PI * 2); ctx.fill();
    } else if (charType === 'mimic') {
      // Mimic: unearthly desaturated waxy sheen
      ctx.fillStyle = 'rgba(160,200,180,0.14)';
      ctx.fillRect(0, 0, size, size);
    } else if (charType === 'passenger') {
      // Passenger: dark decaying fissures
      ctx.strokeStyle = 'rgba(15,20,15,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(128, 40); ctx.lineTo(124, 90); ctx.lineTo(134, 140); ctx.lineTo(120, 210); ctx.stroke();
      ctx.fillStyle = 'rgba(10,15,10,0.65)';
      ctx.fillRect(70, 90, 44, 34); ctx.fillRect(142, 90, 44, 34); // blackened sockets
    }

    tex.update();
    return tex;
  }

  function dress(W,n,coat,hair,female) {
    const root=n.root;
    root.getChildren().forEach(m=>m.dispose());n.legs=[];n.arms=[];n.knees=[];

    // Determine character profile
    let charType = female ? 'female' : 'standard';
    let baseTone = '#c2a188';
    let eyeColor = '#3a2b20';
    if (n.name.includes('Kuroda')) { charType = 'supervisor'; baseTone = '#bf987d'; eyeColor = '#302218'; }
    else if (n.name.includes('Emi')) { charType = 'female'; baseTone = '#d5b29c'; eyeColor = '#5c3d25'; }
    else if (n.name.includes('Hasegawa')) { charType = 'elderly'; baseTone = '#c7a992'; eyeColor = '#3b2a20'; }
    else if (n.name.includes('Daichi')) { charType = 'standard'; baseTone = '#bd9a81'; eyeColor = '#2c1f17'; }
    else if (n.name.includes('Ryo')) { charType = 'shock'; baseTone = '#af9987'; eyeColor = '#46504a'; }
    else if (n.name.includes('Shibata')) { charType = 'gaunt'; baseTone = '#a5907e'; eyeColor = '#241a14'; }
    else if (n.name.includes('Mimic') || n.name.includes('double')) { charType = 'mimic'; baseTone = '#9ea19a'; eyeColor = '#0c0e0c'; }
    else if (n.threat || n.name.includes('Passenger')) { charType = 'passenger'; baseTone = '#4b5048'; eyeColor = '#050705'; }

    const skin = W.mat(n.name + ' complexion', baseTone);
    const cloth = W.mat(n.name + ' woven jacket', coat);
    const pants = W.mat(n.name + ' denim', n.name.includes('Kuroda') ? '#353c37' : '#30383e');
    const hm = W.mat(n.name + ' hair', n.name.includes('Hasegawa') ? '#6b6664' : hair);

    // Dynamic woven fabric for clothing
    if(!W.fabricTexture){
      const f=new B.DynamicTexture('woven civilian fabric',256,W.scene,false),c=f.getContext();
      c.fillStyle='#b4b4b4';c.fillRect(0,0,256,256);
      for(let i=0;i<256;i+=2){c.fillStyle=i%4?'#898989':'#d1d1d1';c.fillRect(i,0,1,256);c.fillStyle='#77777744';c.fillRect(0,i,256,1);}
      f.update();f.uScale=4;f.vScale=4;W.fabricTexture=f;
    }
    cloth.diffuseTexture=W.fabricTexture; pants.diffuseTexture=W.fabricTexture;

    // Apply procedural anatomical face texture
    skin.diffuseTexture = createFaceTexture(W, n.name, baseTone, charType);
    skin.specularColor = new B.Color3(0.06, 0.06, 0.06);

    // Anatomical 3D head mesh from MakeHuman
    if(window.NightHumanHead){
      const m=new B.Mesh(n.name+' anatomical face',W.scene),d=new B.VertexData(),h=NightHumanHead;
      d.positions=h.positions;d.indices=h.indices;d.normals=[];B.VertexData.ComputeNormals(d.positions,d.indices,d.normals);
      d.uvs=h.positions.flatMap((v,i)=>i%3===0?[(v+.2)/.4,(h.positions[i+1]-1.5)/.4]:[]);
      d.applyToMesh(m);m.parent=root;m.material=skin;m.isPickable=false;skin.backFaceCulling=false;
      if(female)m.scaling.x=.94;
    }

    // Torso, hips, jacket
    loft(W,'jacket silhouette',[[.82,.18,.115],[.92,.195,.13],[1.13,.19,.125],[1.34,.235,.13],[1.43,.18,.105],[1.47,.09,.085]],cloth,root);
    loft(W,'trouser hips',[[.74,.19,.11],[.87,.20,.12],[.96,.175,.11]],pants,root);

    // Character specific torso additions
    if (n.name.includes('Kuroda')) {
      // Supervisor badge
      const badge = W.box('supervisor badge', 0.11, 1.34, 0.132, 0.055, 0.035, 0.008, W.M.cream, false, root);
      W.sign('badge text', 0.11, 1.34, 0.137, 0.052, 0.03, [{ text: 'KUROSE', size: 30, y: 0.5 }], '#152518', '#e2e6c8', 0, root);
      // Shoulder epaulets
      for (const side of [-1, 1]) W.box('shoulder epaulet', side * 0.19, 1.45, 0, 0.08, 0.015, 0.09, W.M.dark, false, root);
    } else if (n.name.includes('Emi')) {
      // Taxi badge
      W.box('taxi badge', 0.1, 1.32, 0.13, 0.05, 0.03, 0.008, W.M.yellow, false, root);
    } else if (n.name.includes('Daichi')) {
      // Courier pocket crest
      W.box('courier logo', 0.1, 1.31, 0.13, 0.06, 0.04, 0.008, W.M.red, false, root);
    }

    // Limbs and facial features
    const irisMat = W.mat(n.name + ' iris', eyeColor);
    for(const side of [-1,1]) {
      const lapel=W.box('folded jacket lapel',side*.07,1.35,.12,.068,.18,.018,cloth,false,root);lapel.rotation.z=side*.28;
      W.box('stitched pocket',side*.11,1.13,.128,.1,.095,.018,cloth,false,root);
      const leg=new B.TransformNode('hip joint',W.scene);leg.parent=root;leg.position.set(side*.105,.84,0);
      loft(W,'shaped trouser thigh',[[0,.098,.105],[-.18,.087,.09],[-.36,.067,.065]],pants,leg);
      const knee=new B.TransformNode('knee joint',W.scene);knee.parent=leg;knee.position.y=-.36;
      loft(W,'trouser calf',[[0,.067,.065],[-.16,.076,.071],[-.37,.053,.054]],pants,knee);
      ell(W,'leather shoe',0,-.4,.045,.16,.13,.3,W.M.black,knee);
      W.box('shoe sole',0,-.448,.05,.16,.025,.3,W.M.metal,false,knee);
      for(let j=0;j<3;j++) W.box('shoe lace',0,-.352,.02+j*.03,.09,.009,.008,W.M.cream,false,knee);
      n.legs.push(leg);n.knees.push(knee);

      const arm=new B.TransformNode('shoulder joint',W.scene);arm.parent=root;arm.position.set(side*.224,1.38,0);arm.rotation.z=side*.055;
      loft(W,'tailored sleeve',[[.03,.096,.094],[-.14,.081,.08],[-.28,.065,.065],[-.48,.052,.053]],cloth,arm);
      W.box('shirt cuff',0,-.48,0,.104,.035,.105,cloth,false,arm);

      // Ryo arm injury bandage on left arm
      if (n.name.includes('Ryo') && side === -1) {
        const b1 = cyl('forearm bandage', 0, -0.32, 0, 0.09, 0.16, W.M.cream, 12, arm);
        const bSpot = W.box('blood spot', 0.038, -0.32, 0.02, 0.02, 0.04, 0.02, W.M.red, false, arm);
      }

      ell(W,'hand palm',0,-.535,.015,.084,.12,.052,skin,arm);
      for(let f=0;f<4;f++)ell(W,'individual finger',(f-1.5)*.019,-.61+Math.abs(f-1.5)*.008,.024,.019,.087,.024,skin,arm);
      ell(W,'thumb',-side*.05,-.55,.033,.032,.075,.03,skin,arm);n.arms.push(arm);

      // Anatomical eye structure
      ell(W,'eye white',side*.057,1.729,.092,.038,.017,.018,W.M.cream,root);
      ell(W,'iris',side*.057,1.729,.101,.021,.019,.006,irisMat,root);
      ell(W,'pupil',side*.057,1.729,.104,.01,.01,.004,W.M.black,root);
      // Upper eyelid fold
      const eyelid = W.box('eyelid fold', side * 0.057, 1.741, 0.094, 0.038, 0.007, 0.014, skin, false, root);
      eyelid.rotation.x = -0.15;

      const brow=W.box('eyebrow',side*.058,1.755,.087,.044,.008,.008,hm,false,root);
      brow.rotation.z=side*(charType === 'shock' ? -0.12 : 0.08);
    }

    W.cyl('neck',0,1.515,0,.115,.14,skin,20,root);
    for(let i=0;i<5;i++)ell(W,'jacket button',0,1.02+i*.065,.143,.014,.014,.008,W.M.metal,root);

    // Hair and headwear
    ell(W,'fitted hair cap',0,1.799,-.025,.275,.135,.237,hm,root);
    for(let i=0;i<14;i++) {
      const a=i/14*Math.PI*2;
      const lock=ell(W,'combed hair strand',Math.cos(a)*.116,1.795,Math.sin(a)*.085-.02,.035,.12,.048,hm,root);lock.rotation.z=Math.cos(a)*.3;
    }
    if(female)ell(W,'tied back hair',0,1.655,-.115,.2,.25,.1,hm,root);

    // Emi's driver cap
    if (n.name.includes('Emi')) {
      const capCrown = ell(W, 'cabbie cap crown', 0, 1.835, 0.01, 0.28, 0.1, 0.27, W.M.dark, root);
      const capVisor = W.box('cabbie visor', 0, 1.785, 0.14, 0.22, 0.015, 0.12, W.M.black, false, root);
      capVisor.rotation.x = 0.2;
      W.box('cap gold band', 0, 1.8, 0.095, 0.23, 0.018, 0.02, W.M.yellow, false, root);
    }
    // Daichi's delivery beanie
    else if (n.name.includes('Daichi')) {
      ell(W, 'delivery beanie', 0, 1.835, -0.01, 0.28, 0.12, 0.26, W.M.metal, root);
      W.box('beanie brim', 0, 1.78, 0.02, 0.29, 0.035, 0.28, W.M.metal, false, root);
    }
    // Mrs. Hasegawa's glasses and scarf
    else if(n.name.includes('Hasegawa')) {
      for(const side of [-1,1]) {
        const rim=B.MeshBuilder.CreateTorus('spectacle rim',{diameter:.062,thickness:.004,tessellation:24},W.scene);
        rim.rotation.x=Math.PI/2;rim.position.set(side*.058,1.73,.114);rim.material=W.M.metal;rim.parent=root;
        const lens=B.MeshBuilder.CreateDisc('spectacle lens',{radius:.029,tessellation:20},W.scene);
        lens.position.set(side*.058,1.73,.114);lens.material=W.M.glass;lens.parent=root;
      }
      const bridge=W.box('spectacle bridge',0,1.73,.114,.024,.004,.004,W.M.metal,false,root);
      // Knitted wool scarf around neck
      loft(W,'woolen neck scarf',[[1.46,.14,.13],[1.52,.155,.145],[1.56,.14,.13]],W.M.cream,root);
    }
    // Shibata's trenchcoat flared lower tail
    else if (n.name.includes('Shibata')) {
      loft(W,'trenchcoat flare',[[.42,.24,.18],[.62,.22,.16],[.82,.20,.13]],cloth,root);
    }

    n.detail='CC0 anatomical face / articulated civilian clothing';
  }

  function car(W,c,body,glass) {
    const root=c.root;
    for(const name of ['body','hood','cabin','roof'])root.getChildMeshes().filter(m=>m.name===name).forEach(m=>m.dispose());
    body.specularColor=new B.Color3(.5,.5,.5);body.specularPower=80;glass.alpha=.35;

    loft(W,'curved coachwork',[[-2,.72,.17,.65],[-1.8,.87,.24,.72],[-1,.91,.26,.75],[.7,.9,.26,.75],[1.65,.84,.22,.73],[2,.73,.14,.65]],body,root,'z');
    loft(W,'sloped cabin glass',[[-1.3,.72,.02,1],[-.83,.7,.23,1.27],[.38,.69,.23,1.27],[.91,.75,.02,1]],glass,root,'z');
    loft(W,'formed roof',[[-.92,.63,.025,1.49],[-.68,.7,.035,1.54],[.18,.69,.035,1.54],[.42,.62,.025,1.49]],body,root,'z');

    // Interior seats, handles, indicators, and side mirrors
    for(const side of [-1,1]) {
      for(const z of [-.6,.35]) {
        const seat=W.box('upholstered seat',side*.4,.87,z,.48,.18,.48,W.M.dark,false,root);
        const back=W.box('seat back',side*.4,1.12,z-.21,.47,.52,.13,W.M.dark,false,root);back.rotation.x=-.13;
        W.box('headrest',side*.4,1.42,z-.25,.24,.16,.13,W.M.dark,false,root);
        W.box('chrome door handle',side*.914,.99,z-.1,.025,.035,.17,W.M.metal,false,root);
      }
      W.box('body sill',side*.88,.49,0,.065,.06,3.4,W.M.metal,false,root);
      W.box('side indicator',side*.864,.87,1.55,.018,.06,.12,W.M.yellow,false,root);

      // Wing mirrors
      const mirrorStem = W.box('mirror stem', side * 0.94, 1.08, 0.72, 0.07, 0.02, 0.03, W.M.metal, false, root);
      const mirrorHousing = W.box('mirror housing', side * 1.01, 1.1, 0.72, 0.06, 0.09, 0.14, body, false, root);
      W.box('mirror glass', side * 0.99, 1.1, 0.72, 0.015, 0.075, 0.12, W.M.metal, false, root);
    }

    // Dashboard & steering wheel
    W.box('dashboard',0,1.06,.67,1.42,.22,.26,W.M.black,false,root);
    const wheel=B.MeshBuilder.CreateTorus('steering wheel',{diameter:.33,thickness:.03,tessellation:28},W.scene);
    wheel.parent=root;wheel.material=W.M.black;wheel.position.set(.4,1.15,.48);wheel.rotation.x=1;
    for(let i=0;i<9;i++)W.box('radiator grille',-.48+i*.12,.69,2.012,.06,.16,.02,W.M.black,false,root);

    // Front headlights and rear taillights
    for(const side of [-1, 1]) {
      const hl = W.box('headlight lens', side * 0.65, 0.72, 2.01, 0.28, 0.14, 0.02, W.M.cream, false, root);
      const tl = W.box('taillight lens', side * 0.68, 0.76, -2.01, 0.26, 0.15, 0.02, W.M.red, false, root);
    }

    // Wheels & rims
    for(const z of [-1.25,1.25])for(const side of [-1,1]) {
      const rim=B.MeshBuilder.CreateTorus('wheel rim',{diameter:.45,thickness:.035,tessellation:32},W.scene);rim.parent=root;rim.material=W.M.metal;rim.position.set(side*1.008,.43,z);rim.rotation.z=Math.PI/2;
      for(let k=0;k<6;k++){const a=k*Math.PI/3;const spoke=W.box('alloy spoke',side*1.015,.43+Math.sin(a)*.1,z+Math.cos(a)*.1,.018,.025,.22,W.M.metal,false,root);spoke.rotation.x=-a;}
    }

    // Taxi roof sign (Andon) for Emi's taxi
    if (c.kind === 'taxi' || (c.plate && c.plate.includes('23-81'))) {
      const andonBase = W.box('andon mount', 0, 1.55, 0, 0.38, 0.025, 0.18, W.M.metal, false, root);
      const andonLight = W.box('andon lantern', 0, 1.63, 0, 0.36, 0.13, 0.16, W.M.yellow, false, root);
      W.sign('taxi sign text', 0, 1.63, 0.082, 0.32, 0.11, [{ text: 'TAXI', size: 36, y: 0.5 }], '#102010', '#e0df80', 0, root);
      // Checkerboard door stripe
      for (const side of [-1, 1]) {
        for (let s = 0; s < 7; s++) {
          W.box('taxi stripe ' + s, side * 0.895, 0.82, -0.7 + s * 0.24, 0.015, 0.06, 0.12, s % 2 ? W.M.dark : W.M.cream, false, root);
        }
      }
    }
    // Delivery van details for Daichi
    else if (c.kind === 'van') {
      loft(W, 'van cargo roof', [[-1.2, 1.05, 0.02, 1.35], [-0.5, 1.12, 0.03, 1.38], [0.3, 1.1, 0.03, 1.38], [0.8, 1.05, 0.02, 1.35]], body, root, 'z');
      W.box('van rear door seam', 0, 0.95, -2.015, 0.02, 0.75, 0.01, W.M.black, false, root);
    }
    // Pickup truck bed for Ryo
    else if (c.kind === 'pickup') {
      W.box('pickup bed floor', 0, 0.58, -1.1, 1.48, 0.04, 1.7, W.M.metal, false, root);
      for (const side of [-1, 1]) W.box('pickup bed wall', side * 0.76, 0.85, -1.1, 0.06, 0.48, 1.7, body, false, root);
      W.box('pickup tailgate', 0, 0.85, -1.98, 1.48, 0.48, 0.06, body, false, root);
    }

    c.detail='shaped coachwork / interior / alloy wheels';
  }
  return {dress,car};
})();
