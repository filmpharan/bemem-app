import { ciColors,ciStates } from '../../constants/ci-theme';
import type { ReactNode } from 'react';
import { ActivityIndicator,Pressable } from 'react-native';
import { lagoon } from '../../constants/lagoon-theme';
import { AddCardIcon } from './AddCardIcon';
import { BememIcon } from './BememIcon';
import { HomeAccountMenu } from './HomeAccountMenu';
import { CanvasPageSelector } from './CanvasPageSelector';
import { EightSlotHeader,compactHeaderStyles } from './EightSlotHeader';
import type { CanvasPage } from '../../lib/canvas-pages';

type Props={editing:boolean;searchOpen:boolean;disabled:boolean;onBack:()=>void;onSearch:()=>void;onCreate:()=>void;onDecorate:()=>void;onAdd:()=>void;addDisabled?:boolean;onLogo:()=>void;
 saveRequired?:boolean;saveDisabled?:boolean;saving?:boolean;onSave?:()=>void;
 page?:CanvasPage;pageDestinations?:Parameters<typeof CanvasPageSelector>[0]['destinations'];onPage?:(page:CanvasPage)=>void};
export function HomeHeader({editing,searchOpen,disabled,onBack,onSearch,onCreate,onDecorate,onAdd,addDisabled=false,onLogo,page=1,pageDestinations,onPage,saveRequired=false,saveDisabled=false,saving=false,onSave}:Props){
 const action=(label:string,onPress:()=>void,icon:ReactNode,inactive=disabled)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:inactive,...(label==='Search cards'||label==='Close search'?{expanded:searchOpen}:{})}}
   disabled={inactive} onPress={onPress} style={({pressed})=>[compactHeaderStyles.target,{opacity:inactive?ciStates.headerDisabled:pressed?ciStates.headerPressed:1}]}>{icon}</Pressable>;
 return <EightSlotHeader mode={editing?'Create':'Home'} disabled={disabled} onLogo={onLogo} slots={{
  4:editing?action('Back',onBack,<BememIcon name="chevron-left" color={ciColors.action.back}/>):null,
  6:editing?(saveRequired&&onSave?<Pressable accessibilityRole="button" accessibilityLabel="Save canvas" accessibilityHint={saving?'Saving canvas':undefined}
    accessibilityState={{disabled:disabled||saveDisabled||saving,busy:saving}} disabled={disabled||saveDisabled||saving} onPress={onSave}
    style={({pressed})=>[compactHeaderStyles.target,{opacity:(disabled||saveDisabled)&&!saving?ciStates.headerDisabled:pressed?ciStates.headerPressed:1}]}>
      {saving?<ActivityIndicator accessible={false} size="small" color={ciColors.action.positiveSave}/>:<AddCardIcon name="check" size={22} color={ciColors.action.positiveSave}/>}
    </Pressable>:null):action(searchOpen?'Close search':'Search cards',onSearch,<BememIcon name={searchOpen?'close':'search'} color={lagoon.text.primary}/>),
  7:editing?action('Add Card',onAdd,<AddCardIcon name="add-card" size={22}/>,disabled||addDisabled):<HomeAccountMenu compact disabled={disabled} onAddCard={onCreate} onDecorate={onDecorate}/>,
  8:onPage&&pageDestinations?<CanvasPageSelector compact context={editing?'editor':'home'} page={page} destinations={pageDestinations} onSelect={onPage} disabled={disabled}/>:null,
 }}/>;
}
