// Real CI aliases/roles with the real default palette, for existing native-free component harnesses.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json'),file=path.resolve(__dirname,'../src/constants/ci-theme.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
 if(name!=='./lagoon-theme')throw Error('Unexpected CI dependency: '+name);
 return{lagoon:tokens.palettes[tokens.metadata.defaultThemeId].colors,lagoonTokens:tokens,lagoonFonts:{latin:'BememManrope',thai:'BememThai'}};
},module,module.exports);
