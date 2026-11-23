const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,nodes}=require('./profile-ui-fixture.cjs');
const tick=()=>new Promise(r=>setImmediate(r));
const by=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
const text=t=>nodes(t).filter(n=>n.type==='Text').map(n=>n.props.children).filter(x=>typeof x==='string');
function sheet(f,identity=null){const Sheet=f.load('src/components/bemem/ProfileSheet.tsx').ProfileSheet,closed=[];const props={anchor:{x:12,y:28,width:48,height:48},identity,onClosed:v=>closed.push(v)};const render=()=>f.render(Sheet,props);let t=render();nodes(t).find(n=>n.props?.ref).props.ref.current={measureInWindow:cb=>cb(0,0,393,844)};t.props.onShow();return{render,closed,props};}

test('Actual Header trigger waits for measurement, rejects rapid openings, replaces old menu and reflects shared avatar',()=>{
 const f=fixture(),Menu=f.load('src/components/bemem/HomeAccountMenu.tsx').HomeAccountMenu,p={disabled:false,compact:true},render=()=>f.render(Menu,p);
 let t=render();const trigger=by(t,'Account');nodes(t).find(n=>n.props?.ref).props.ref.current={measureInWindow:cb=>cb(12,32,48,48)};
 trigger.props.onPress();trigger.props.onPress();t=render();const sheets=nodes(t).filter(n=>n.type==='ProfileSheet');assert.equal(sheets.length,1);assert.deepEqual(sheets[0].props.anchor,{x:12,y:32,width:48,height:48});
 assert.equal(nodes(t).some(n=>n.type==='Modal'),false);assert.equal(text(t).includes('Login'),false);
 f.profile.profile.avatar='avatar-test.jpg';t=render();assert.equal(nodes(t).find(n=>n.type==='ProfileAvatar').props.avatar,'avatar-test.jpg');
 sheets[0].props.onClosed(false);t=render();assert.equal(nodes(t).some(n=>n.type==='ProfileSheet'),false);
 by(t,'Account').props.onPress();t=render();nodes(t).find(n=>n.type==='ProfileSheet').props.onClosed(true);t=render();const policy=nodes(t).find(n=>n.type==='AddCardSheet');assert.equal(policy.props.title,'Policy');assert.equal(nodes(t).some(n=>n.type==='ProfileSheet'),false);
 assert.ok(text(policy).includes('Decorate — One-Time Purchase'));assert.ok(text(policy).includes('Cloud Backup — Monthly Subscription'));policy.props.onClose();assert.equal(nodes(render()).some(n=>n.type==='AddCardSheet'),false);
});

test('Disabled Profile never opens and measuring duplicate callbacks are ignored',()=>{
 const f=fixture(),Menu=f.load('src/components/bemem/HomeAccountMenu.tsx').HomeAccountMenu;
 let t=f.render(Menu,{disabled:true});nodes(t).find(n=>n.props?.ref).props.ref.current={measureInWindow(){assert.fail();}};by(t,'Account').props.onPress();assert.equal(nodes(f.render(Menu,{disabled:true})).some(n=>n.type==='ProfileSheet'),false);
});

test('Guest UI is truthful; Local is selected, Cloud cannot write, Premium is above Policy and has exactly3 planned benefits',async()=>{
 const f=fixture(),s=sheet(f);await tick();let t=s.render();
 assert.ok(text(t).includes('My profile'));assert.equal(text(t).includes('Premium'),false);assert.equal(text(t).some(v=>v.includes('@')),false);assert.equal(text(t).includes('Login'),true);
 assert.equal(by(t,'Local storage').props.accessibilityState.selected,true);const cloud=by(t,'Cloud storage unavailable');assert.equal(cloud.props.disabled,true);assert.equal(cloud.props.onPress,undefined);assert.equal(f.events.length,0);
 assert.ok(nodes(t).indexOf(by(t,'Get Premium'))<nodes(t).indexOf(by(t,'Policy')));
 by(t,'Get Premium').props.onPress();t=s.render();assert.equal(nodes(t).filter(n=>n.type==='Modal').length,1);assert.equal(nodes(t).some(n=>/Header|Footer/.test(String(n.type))),false);
 assert.ok(text(t).includes('Premium features are in development.'));
 const benefits=f.load('src/components/bemem/ProfileSheet.tsx').premiumBenefits;assert.equal(benefits.length,3);for(const [title,body]of benefits){assert.ok(text(t).includes(title));assert.ok(text(t).includes(body));}
 assert.equal(text(t).some(v=>/Buy Now|Upgrade Now|Start Free Trial|Subscribe|monthly|yearly/i.test(v)),false);
 const openings=f.animations.filter(a=>a.toValue===1).length;t.props.onRequestClose();t=s.render();assert.ok(by(t,'Get Premium'));assert.equal(f.animations.filter(a=>a.toValue===1).length,openings);
 t.props.onRequestClose();t=s.render();assert.equal(t.props.visible,false);assert.deepEqual(s.closed,[false]);
});

test('Email and badge use only supplied authenticated identity; Cloud stays disabled for Premium',()=>{
 for(const premium of [false,true]){const f=fixture(),s=sheet(f,{status:'authenticated',email:'synthetic@example.invalid',premiumEntitled:premium}),t=s.render();assert.ok(text(t).includes('synthetic@example.invalid'));assert.equal(by(t,'Login'),undefined);assert.equal(!!by(t,'Premium member'),premium);assert.equal(by(t,'Cloud storage unavailable').props.disabled,true);assert.ok(by(t,premium?'Premium Benefits':'Get Premium'));}
});

test('Unicode name edits validate, trim, cancel safely and prevent duplicate Save',async()=>{
 const f=fixture(),s=sheet(f);let t=s.render();by(t,'Edit display name').props.onPress();t=s.render();by(t,'Display name').props.onChangeText('   ');t=s.render();await by(t,'Save name').props.onPress();await tick();t=s.render();assert.ok(text(t).includes('Enter a name between 1 and 60 characters.'));assert.equal(f.profile.profile.name,'My profile');
 by(t,'Display name').props.onChangeText('  ชื่อใหม่ 🌿  ');t=s.render();by(t,'Save name').props.onPress();await tick();t=s.render();assert.equal(f.profile.profile.name,'ชื่อใหม่ 🌿');assert.equal(by(t,'Display name'),undefined);
 by(t,'Edit display name').props.onPress();t=s.render();by(t,'Display name').props.onChangeText('not saved');t=s.render();by(t,'Cancel').props.onPress();assert.equal(f.profile.profile.name,'ชื่อใหม่ 🌿');
});

test('Photo options are contextual, cancellation/permission denial preserve avatar, remove restores placeholder',async()=>{
 const f=fixture(),s=sheet(f);f.profile.profile.avatar='avatar-old.jpg';let t=s.render();by(t,'Change profile photo').props.onPress();t=s.render();assert.ok(by(t,'Remove Photo'));
 by(t,'Choose from Gallery').props.onPress();s.render();await tick();t=s.render();assert.equal(f.profile.profile.avatar,'avatar-old.jpg');
 by(t,'Change profile photo').props.onPress();t=s.render();f.picker.permission=false;by(t,'Take Photo').props.onPress();s.render();await tick();t=s.render();assert.equal(f.profile.profile.avatar,'avatar-old.jpg');assert.ok(text(t).some(v=>v.startsWith('Allow camera access')));
 by(t,'Change profile photo').props.onPress();t=s.render();by(t,'Remove Photo').props.onPress();await tick();t=s.render();assert.equal(f.profile.profile.avatar,null);
 by(t,'Change profile photo').props.onPress();t=s.render();assert.equal(by(t,'Remove Photo'),undefined);by(t,'Cancel').props.onPress();assert.equal(f.events.filter(e=>e[0]==='write').length,0);
});

test('Measured clip unfolds right/down without text scaling; reduced motion and dismissal remove overlay',async()=>{
 for(const reduce of [false,true]){fixture.reduced=reduce;const f=fixture(),s=sheet(f);await tick();let t=s.render();const animation=f.animations.find(a=>a.toValue===1);assert.equal(animation.duration,reduce?0:300);assert.equal(animation.useNativeDriver,false);
 const clip=nodes(t).find(n=>n.type==='Animated.View'),style=clip.props.style[1];assert.equal(style.left,12);assert.equal(style.top,28);assert.equal(style.width.outputRange[0],48);assert.ok(style.width.outputRange[1]>48);assert.equal(style.height.outputRange[0],48);assert.equal(style.transform,undefined);
 by(t,'Close Profile').props.onPress();t=s.render();assert.equal(t.props.visible,false);assert.equal(f.animations.at(-1).duration,reduce?0:250);assert.deepEqual(s.closed,[false]);}fixture.reduced=false;
});

test('Premium X closes whole sheet; Back returns Profile; Policy closes before opening existing destination',async()=>{
 for(const target of ['close','back','policy']){const f=fixture(),s=sheet(f);await tick();let t=s.render();by(t,'Get Premium').props.onPress();t=s.render();
 if(target==='close')by(t,'Close Profile Sheet').props.onPress();else{by(t,'Back to Profile').props.onPress();t=s.render();if(target==='policy')by(t,'Policy').props.onPress();else t.props.onRequestClose();}
 t=s.render();assert.equal(t.props.visible,false);assert.deepEqual(s.closed,[target==='policy']);}
});

test('Anchor geometry preserves safe bounds, bottom gap, internal scroll and keyboard visibility at representative widths',()=>{
 const f=fixture(),layout=f.load('src/lib/profile-sheet-layout.ts').profileSheetLayout;
 for(const width of [280,360,393,412])for(const height of [360,480,844])for(const top of [0,24,40]){
  const g=layout({x:12,y:top+4,width:48,height:48},{x:0,y:0,width,height},{top,bottom:24,left:0,right:0},1200);
  assert.equal(g.left,12);assert.equal(g.top,top+4);assert.ok(g.left+g.width<=width-12);assert.ok(g.top+g.height<=height-24-64);assert.equal(g.originWidth,48);
 }
 const s=sheet(f);let t=s.render();assert.ok(nodes(t).some(n=>n.type==='ScrollView'&&n.props.keyboardShouldPersistTaps==='handled'));f.listeners.get('keyboardDidShow')({endCoordinates:{screenY:410}});t=s.render();const style=nodes(t).find(n=>n.type==='Animated.View').props.style[1];assert.ok(style.top+style.height.outputRange[1]<=410-24-64);
});

test('Profile store persists Unicode and independent avatar; reload and missing-file fallback never write Wallet',async()=>{
 const f=fixture(),{createLocalProfileStore}=f.load('src/lib/local-profile.ts');let disk=null,writes=0;const io={read:async()=>disk,write:async p=>{writes++;disk=JSON.parse(JSON.stringify(p));},avatarExists:id=>id==='avatar-photo.jpg'};
 const store=createLocalProfileStore(io);await store.load();await store.update({name:'  Guest ไทย  ',avatar:'avatar-photo.jpg'});assert.equal(store.getSnapshot().profile.name,'Guest ไทย');
 const next=createLocalProfileStore(io);await next.load();assert.deepEqual(next.getSnapshot().profile,store.getSnapshot().profile);await next.update({avatar:null});assert.equal(disk.name,'Guest ไทย');assert.equal(disk.avatar,null);
 disk.avatar='avatar-missing.jpg';const third=createLocalProfileStore(io);await third.load();assert.equal(third.getSnapshot().profile.avatar,null);assert.equal(writes,2);assert.equal(f.events.length,0);
});

test('Invalid name, failed writes, corrupt reads and concurrent updates preserve last confirmed profile',async()=>{
 const f=fixture(),{createLocalProfileStore}=f.load('src/lib/local-profile.ts');let disk={name:'Confirmed',avatar:null},fail=false,release;const gate=new Promise(r=>release=r);let hold=false;
 const store=createLocalProfileStore({read:async()=>disk,write:async p=>{if(hold)await gate;if(fail)throw Error('mock disk error');disk=p;},avatarExists:()=>true});await store.load();
 for(const name of ['', '   ','x'.repeat(61)])await assert.rejects(store.update({name}));assert.equal(disk.name,'Confirmed');hold=true;const work=store.update({name:'First'});await tick();await assert.rejects(store.update({name:'Second'}));release();await work;assert.equal(disk.name,'First');
 fail=true;await assert.rejects(store.update({name:'Failed'}));assert.equal(store.getSnapshot().profile.name,'First');assert.match(store.getSnapshot().error,/not confirmed/);assert.equal(disk.name,'First');
 const corrupt=createLocalProfileStore({read:async()=>({name:'',avatar:null}),write:async()=>assert.fail(),avatarExists:()=>true});await corrupt.load();await assert.rejects(corrupt.update({name:'No overwrite'}));
});

test('Native photo copy is durable and verified; profile snapshots roundtrip without touching unrelated files',async()=>{
 const f=fixture(),native=f.load('src/lib/local-profile-native.ts');f.files.set('documents/bemem-wallet-v2/wallet.json',Buffer.from('unchanged'));f.files.set('cache/picker.jpg',Buffer.from('synthetic JPEG bytes'));
 f.picker.result={canceled:false,assets:[{uri:'cache/picker.jpg',width:500,height:500,mimeType:'image/jpeg'}]};const id=await native.chooseProfilePhoto(false);assert.match(id,/^avatar-/);assert.ok(native.profileAvatarUri(id).startsWith('documents/bemem-profile/'));f.files.delete('cache/picker.jpg');
 await native.deviceProfileStore.load();await native.deviceProfileStore.update({name:'  Local user  ',avatar:id});await native.deviceProfileStore.load(true);assert.deepEqual(native.deviceProfileStore.getSnapshot().profile,{name:'Local user',avatar:id});
 assert.equal(f.files.get('documents/bemem-wallet-v2/wallet.json').toString(),'unchanged');assert.ok(f.events.every(e=>e[0]==='gallery'||e[1].startsWith('documents/bemem-profile')));assert.ok(f.events.some(e=>e[0]==='move'));assert.equal([...f.files.keys()].some(k=>k.endsWith('.tmp')),false);
 f.picker.result={canceled:true};assert.equal(await native.chooseProfilePhoto(false),null);f.picker.permission=false;await assert.rejects(native.chooseProfilePhoto(true));
});

test('Successful photo selection updates shared Header state; save failures preserve the old avatar and name',async()=>{
 const f=fixture(),s=sheet(f);f.files.set('cache/selected.jpg',Buffer.from('synthetic JPEG'));
 f.picker.result={canceled:false,assets:[{uri:'cache/selected.jpg',width:300,height:300,mimeType:'image/jpeg'}]};
 let t=s.render();by(t,'Change profile photo').props.onPress();t=s.render();by(t,'Choose from Gallery').props.onPress();s.render();await tick();t=s.render();
 assert.match(f.profile.profile.avatar,/^avatar-/);assert.equal(nodes(t).find(n=>n.type==='ProfileAvatar').props.avatar,f.profile.profile.avatar);
 const saved={...f.profile.profile};f.profile.update=async()=>{throw Error('Saving was not confirmed.');};
 by(t,'Edit display name').props.onPress();t=s.render();by(t,'Display name').props.onChangeText('Unconfirmed');t=s.render();by(t,'Save name').props.onPress();await tick();t=s.render();
 assert.deepEqual(f.profile.profile,saved);assert.ok(text(t).includes('Saving was not confirmed.'));assert.ok(by(t,'Display name'));
});

test('Repeated close callbacks cannot reopen Policy or deliver a second dismissal',async()=>{
 const f=fixture(),s=sheet(f);await tick();let t=s.render();by(t,'Policy').props.onPress();t=s.render();t.props.onDismiss();t.props.onDismiss();
 assert.deepEqual(s.closed,[true]);assert.equal(t.props.visible,false);
});


test('Guest Login sits directly below name with compact flexible styling and no persistence',()=>{
 for(const width of [280,360,393,412])for(const fontScale of [1,1.5,2]){
  const f=fixture({width,height:844,fontScale}),s=sheet(f),t=s.render(),button=by(t,'Login');
  assert.ok(button);assert.ok(nodes(t).indexOf(by(t,'Edit display name'))<nodes(t).indexOf(button));
  const identity=nodes(t).find(n=>n.type==='View'&&Array.isArray(n.props?.children)&&n.props.children.includes(button));
  const children=identity.props.children.flat().filter(Boolean);assert.equal(children.at(-1),button);assert.ok(nodes(children.at(-2)).includes(by(t,'Edit display name')));
  const style=button.props.style({pressed:false})[0];assert.equal(style.alignSelf,'center');assert.equal(style.minHeight,48);assert.equal(style.maxWidth,'100%');assert.equal(style.height,undefined);
  assert.equal(button.props.children.props.numberOfLines,undefined);assert.equal(f.events.length,0);
 }
});

test('Login reuses inline information dialog; rapid taps, OK, dismiss and Android Back preserve Profile and motion',async()=>{
 const f=fixture(),s=sheet(f);await tick();let t=s.render();const login=by(t,'Login'),animations=f.animations.length;
 login.props.onPress();login.props.onPress();t=s.render();
 const dialogs=nodes(t).filter(n=>n.type==='ConfirmationDialog'&&n.props.request);assert.equal(dialogs.length,1);
 const dialog=dialogs[0];assert.equal(dialog.props.presentation,'inline');assert.equal(dialog.props.request.title,'Login Coming Soon');
 assert.equal(nodes(t).filter(n=>n.type==='Modal').length,1);assert.equal(t.props.visible,true);
 assert.equal(nodes(t).find(n=>n.type==='Animated.View').props.importantForAccessibility,'no-hide-descendants');
 by(t,'Close Profile').props.onPress();assert.equal(s.render().props.visible,true);
 dialog.props.request.actions[0].onPress();t=s.render();assert.equal(nodes(t).find(n=>n.type==='ConfirmationDialog').props.request,null);
 by(t,'Login').props.onPress();t=s.render();nodes(t).find(n=>n.type==='ConfirmationDialog').props.request.onDismiss();assert.equal(s.render().props.visible,true);
 by(s.render(),'Login').props.onPress();t=s.render();t.props.onRequestClose();t=s.render();assert.equal(t.props.visible,true);assert.equal(nodes(t).find(n=>n.type==='ConfirmationDialog').props.request,null);
 assert.equal(f.animations.length,animations);assert.deepEqual(s.closed,[]);assert.equal(f.events.length,0);assert.equal(by(t,'Local storage').props.accessibilityState.selected,true);
 assert.ok(by(t,'Edit display name'));assert.ok(by(t,'Change profile photo'));assert.ok(by(t,'Policy'));assert.ok(by(t,'Get Premium'));
 t.props.onRequestClose();assert.equal(s.render().props.visible,false);
});

test('Login is unavailable during name editing or profile save and never fabricates identity',()=>{
 const f=fixture(),s=sheet(f);let t=s.render();by(t,'Edit display name').props.onPress();t=s.render();assert.equal(by(t,'Login'),undefined);
 by(t,'Cancel').props.onPress();f.profile.busy=true;t=s.render();assert.equal(by(t,'Login').props.disabled,true);by(t,'Login').props.onPress();assert.equal(nodes(s.render()).find(n=>n.type==='ConfirmationDialog').props.request,null);
 assert.equal(text(t).some(v=>v.includes('@')),false);assert.equal(by(t,'Premium member'),undefined);assert.equal(f.events.length,0);
});
