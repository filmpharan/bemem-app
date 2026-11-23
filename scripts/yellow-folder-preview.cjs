// Derive static review geometry from the REAL production layout function. No native APIs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
 if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
  if(!name.startsWith('.'))throw Error('No IO/native imports allowed: '+name);
  return load(path.resolve(path.dirname(file),name));
 },module,module.exports);return module.exports;
}
const layout=load(path.join(root,'src/lib/group-folder-visual.ts')).folderVisualLayout;
const names=['Everyday essentials','Weekend','Everyday memberships, journeys and favourite places',
 '\u0e1a\u0e31\u0e15\u0e23\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e41\u0e25\u0e30\u0e04\u0e27\u0e32\u0e21\u0e17\u0e23\u0e07\u0e08\u0e33\u0e17\u0e35\u0e48\u0e0a\u0e2d\u0e1a'];
const fixtures=[];
for(const [index,count] of [2,3,4,5,6,4,4].entries())for(const orientation of ['landscape','portrait'])for(const fontScale of [1,1.3,2]){
 const unit=(360-32)/12,width=(orientation==='landscape'?5.8:3.8)*unit,height=(orientation==='landscape'?3.8:5.8)*unit;
 fixtures.push({orientation,count,fontScale,width,height,name:names[index===0?1:index<5?0:index===5?2:3],
  key:orientation+'-'+index,visual:layout(width,height,orientation,count,fontScale)});
}
const output=path.join(root,'design-previews/yellow-group-folder');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'fixtures.js'),'window.folderFixtures='+JSON.stringify(fixtures,null,2)+';\n');
