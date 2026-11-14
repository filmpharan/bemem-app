/* Visual-only state. No storage, uploads, encoder, account, network or submission. */
'use strict';
const byId = id => document.getElementById(id);
if (new URLSearchParams(location.search).get('footer') === 'source') document.body.classList.add('source-footer');
const face = byId('card-face'), preview = byId('preview-width');
let back = false;
const gradients = {
  seven: 'linear-gradient(135deg,oklch(.62 .17 145),oklch(.7 .18 55) 60%,oklch(.6 .22 27))',
  the1: 'linear-gradient(135deg,oklch(.25 .02 260),oklch(.45 .18 20))',
  ptt: 'var(--ptt)', lotus: 'linear-gradient(135deg,oklch(.55 .12 190),oklch(.72 .12 175))',
};
function updateFace(){byId('face-name').textContent=byId('card-name').value || 'Card name';byId('back-number').textContent=byId('member-number').value || '0000'}
byId('card-name').addEventListener('input',updateFace);byId('member-number').addEventListener('input',updateFace);
byId('flip').addEventListener('click',()=>{back=!back;byId('flip').setAttribute('aria-pressed',String(back));byId('side-label').textContent=back?'Back':'Front';byId('face-name').hidden=back;byId('back-number').hidden=!back});
function orientation(value){const portrait=['portrait','vaccine-passport'].includes(value);preview.classList.toggle('portrait',portrait);face.style.aspectRatio=({landscape:'1.586',portrait:'2 / 3',voucher:'7 / 3','boarding-pass':'2 / 1','vaccine-passport':'5 / 7'})[value];byId('landscape-size').hidden=portrait;byId('landscape-button').hidden=!portrait;byId('portrait-size').hidden=!portrait;byId('portrait-button').hidden=portrait}
byId('portrait-button').addEventListener('click',()=>{byId('portrait-size').value='portrait';orientation('portrait')});
byId('landscape-button').addEventListener('click',()=>{byId('landscape-size').value='landscape';orientation('landscape')});
for(const name of ['landscape-size','portrait-size'])byId(name).addEventListener('change',e=>orientation(e.target.value));
byId('brand').addEventListener('input',e=>{const name=e.target.value;byId('card-name').value=name==='None'?'':name;const s=name.toLowerCase();let preset=s.includes('all member')||s.includes('7-eleven')?'seven':s.includes('the 1')||s.includes('tops')?'the1':s.includes('ptt')||s.includes('blue card')?'ptt':s.includes('lotus')?'lotus':null;if(preset)face.style.background=gradients[preset];updateFace()});
const close=()=>{byId('overlay').hidden=true;byId('reopen').hidden=false;byId('reopen').focus()};byId('close').addEventListener('click',close);byId('overlay').addEventListener('click',e=>{if(e.target===byId('overlay'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});byId('reopen').addEventListener('click',()=>{byId('overlay').hidden=false;byId('reopen').hidden=true;byId('close').focus()});byId('card-form').addEventListener('submit',e=>e.preventDefault());
