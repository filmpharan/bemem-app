import type { CanvasPage } from './canvas-pages';

export type FooterAccess={page:CanvasPage;readable?:boolean;editable:boolean;visible:boolean;preview:boolean};
/** Reflect the central access policy; navigation never grants a login or entitlement. */
export function footerCanvasChoices(page:CanvasPage,access:readonly FooterAccess[],editing:boolean){
 return ([1,2,3,4,5] as const).map(destination=>{
  const rule=access.find(a=>a.page===destination);
  const entitled=!!rule?.visible&&(editing?rule.editable:!!rule.readable);
  const kind=destination===page?'current':entitled?'select':'disabled';
  return {page:destination,kind,locked:false,disabled:kind==='disabled'} as const;
 });
}
