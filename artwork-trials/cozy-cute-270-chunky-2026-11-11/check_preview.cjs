// Offline script/asset smoke check. A DOM shim is not a real browser or native device.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),created=[];
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={setProperty(){}};this.classList={add(){}};created.push(this);}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attributes[k]=v;}getBoundingClientRect(){return{width:388};}
}
const elements=Object.fromEntries(['selector','grid','status','selection','reviews'].map(id=>[id,new Element('div')]));
const context=vm.createContext({document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag)},addEventListener(){}});
vm.runInContext(html.match(/<script>([\s\S]+)<\/script>/)[1],context);
const selector=elements.selector,grid=elements.grid;
assert.equal(selector.children.length,6);
const counts=[];
for(let i=0;i<6;i++){
 selector.children[i].onclick();assert.equal(grid.children.length,24);
 assert.equal(selector.children.filter(b=>b.attributes['aria-pressed']==='true').length,1);
 const pages=[];let next;
 do{
  pages.push(grid.children.filter(n=>n.attributes['aria-label']&&!/artwork page/.test(n.attributes['aria-label'])).length);
  next=grid.children.find(n=>n.attributes['aria-label']==='Next artwork page');if(next)next.onclick();
 }while(next);
 assert.deepEqual(pages,[0,2,5].includes(i)?[23,22,5]:[23,17]);counts.push(pages);
 selector.children[i].onclick();assert.ok(!grid.children.some(n=>n.attributes['aria-label']==='Previous artwork page'));
}
for(const e of created)if(e.tag==='img')assert.ok(fs.existsSync(path.resolve(__dirname,e.src)),e.src);
for(const href of [...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))assert.ok(fs.existsSync(path.resolve(__dirname,href)),href);
const result={status:'pass',collections:6,assetCounts:[50,40,50,40,40,50],pages:counts,cellsPerPage:24,localImageLinksExist:true,realBrowser:false,samsungVerified:false};
fs.writeFileSync(path.join(__dirname,'review/preview-check.json'),JSON.stringify(result,null,2));console.log(result);
