// Evaluate the production presentation recipe with the real palette, without native modules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json');
const file=path.resolve(__dirname,'../src/constants/sheet-visual.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
 if(name==='./ci-theme')return require('./ci-theme-fixture.cjs');
 if(name==='./lagoon-theme')return{lagoon:tokens.palettes[tokens.metadata.defaultThemeId].colors,alpha:(hex,a)=>hex+Math.round(a*255).toString(16).padStart(2,'0')};
 throw Error('Unexpected sheet dependency: '+name);
},module,module.exports);
