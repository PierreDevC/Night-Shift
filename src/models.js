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
  function dress(W,n,coat,hair,female) {
    const root=n.root;
    root.getChildren().forEach(m=>m.dispose());n.legs=[];n.arms=[];n.knees=[];
    const skin=W.mat(n.name+' complexion','#b9977e'),cloth=W.mat(n.name+' woven jacket',coat),pants=W.mat(n.name+' denim','#30383e'),hm=W.mat(n.name+' hair',hair);
    if(!W.fabricTexture){const f=new B.DynamicTexture('woven civilian fabric',256,W.scene,false),c=f.getContext();c.fillStyle='#b4b4b4';c.fillRect(0,0,256,256);for(let i=0;i<256;i+=2){c.fillStyle=i%4?'#898989':'#d1d1d1';c.fillRect(i,0,1,256);c.fillStyle='#77777744';c.fillRect(0,i,256,1);}f.update();f.uScale=4;f.vScale=4;W.fabricTexture=f;}
    cloth.diffuseTexture=W.fabricTexture;pants.diffuseTexture=W.fabricTexture;
    const tex=new B.DynamicTexture(n.name+' skin detail',128,W.scene,false),ctx=tex.getContext();
    ctx.fillStyle='#c6a58d';ctx.fillRect(0,0,128,128);
    for(let i=0;i<2200;i++){ctx.fillStyle=i%3?'#a7867420':'#ebc5a530';ctx.fillRect(W.random()*128,W.random()*128,1,1);}tex.update();skin.diffuseTexture=tex;
    if(window.NightHumanHead){
      const m=new B.Mesh(n.name+' anatomical face',W.scene),d=new B.VertexData(),h=NightHumanHead;
      d.positions=h.positions;d.indices=h.indices;d.normals=[];B.VertexData.ComputeNormals(d.positions,d.indices,d.normals);
      d.uvs=h.positions.flatMap((v,i)=>i%3===0?[(v+.2)/.4,(h.positions[i+1]-1.5)/.4]:[]);
      d.applyToMesh(m);m.parent=root;m.material=skin;m.isPickable=false;skin.backFaceCulling=false;
      if(female)m.scaling.x=.94;
    }
    loft(W,'jacket silhouette',[[.82,.18,.115],[.92,.195,.13],[1.13,.19,.125],[1.34,.235,.13],[1.43,.18,.105],[1.47,.09,.085]],cloth,root);
    loft(W,'trouser hips',[[.74,.19,.11],[.87,.20,.12],[.96,.175,.11]],pants,root);
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
      ell(W,'hand palm',0,-.535,.015,.084,.12,.052,skin,arm);
      for(let f=0;f<4;f++)ell(W,'individual finger',(f-1.5)*.019,-.61+Math.abs(f-1.5)*.008,.024,.019,.087,.024,skin,arm);
      ell(W,'thumb',-side*.05,-.55,.033,.032,.075,.03,skin,arm);n.arms.push(arm);
      ell(W,'eye white',side*.057,1.729,.092,.038,.015,.016,W.M.cream,root);
      ell(W,'iris',side*.057,1.729,.101,.015,.014,.005,W.M.black,root);
      const brow=W.box('eyebrow',side*.058,1.75,.087,.043,.007,.008,hm,false,root);brow.rotation.z=side*.08;
    }
    W.cyl('neck',0,1.515,0,.115,.14,skin,20,root);
    for(let i=0;i<5;i++)ell(W,'jacket button',0,1.02+i*.065,.143,.014,.014,.008,W.M.metal,root);
    ell(W,'fitted hair cap',0,1.799,-.025,.275,.135,.237,hm,root);
    for(let i=0;i<14;i++) {
      const a=i/14*Math.PI*2;
      const lock=ell(W,'combed hair strand',Math.cos(a)*.116,1.795,Math.sin(a)*.085-.02,.035,.12,.048,hm,root);lock.rotation.z=Math.cos(a)*.3;
    }
    if(female)ell(W,'tied back hair',0,1.655,-.115,.2,.25,.1,hm,root);
    if(n.name.includes('Hasegawa'))for(const side of [-1,1]) {
      const rim=B.MeshBuilder.CreateTorus('spectacle rim',{diameter:.062,thickness:.004,tessellation:24},W.scene);rim.rotation.x=Math.PI/2;rim.position.set(side*.058,1.73,.114);rim.material=W.M.metal;rim.parent=root;
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
    for(const side of [-1,1]) {
      for(const z of [-.6,.35]) {
        const seat=W.box('upholstered seat',side*.4,.87,z,.48,.18,.48,W.M.dark,false,root);
        const back=W.box('seat back',side*.4,1.12,z-.21,.47,.52,.13,W.M.dark,false,root);back.rotation.x=-.13;
        W.box('headrest',side*.4,1.42,z-.25,.24,.16,.13,W.M.dark,false,root);
        W.box('chrome door handle',side*.914,.99,z-.1,.025,.035,.17,W.M.metal,false,root);
      }
      W.box('body sill',side*.88,.49,0,.065,.06,3.4,W.M.metal,false,root);
      W.box('side indicator',side*.864,.87,1.55,.018,.06,.12,W.M.yellow,false,root);
    }
    W.box('dashboard',0,1.06,.67,1.42,.22,.26,W.M.black,false,root);
    const wheel=B.MeshBuilder.CreateTorus('steering wheel',{diameter:.33,thickness:.03,tessellation:28},W.scene);wheel.parent=root;wheel.material=W.M.black;wheel.position.set(.4,1.15,.48);wheel.rotation.x=1;
    for(let i=0;i<9;i++)W.box('radiator grille',-.48+i*.12,.69,2.012,.06,.16,.02,W.M.black,false,root);
    for(const z of [-1.25,1.25])for(const side of [-1,1]) {
      const rim=B.MeshBuilder.CreateTorus('wheel rim',{diameter:.45,thickness:.035,tessellation:32},W.scene);rim.parent=root;rim.material=W.M.metal;rim.position.set(side*1.008,.43,z);rim.rotation.z=Math.PI/2;
      for(let k=0;k<6;k++){const a=k*Math.PI/3;const spoke=W.box('alloy spoke',side*1.015,.43+Math.sin(a)*.1,z+Math.cos(a)*.1,.018,.025,.22,W.M.metal,false,root);spoke.rotation.x=-a;}
    }
    c.detail='shaped coachwork / interior / alloy wheels';
  }
  return {dress,car};
})();
