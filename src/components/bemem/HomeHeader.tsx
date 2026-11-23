import { NavigationHeader } from './NavigationHeader';

export function HomeHeader({editing,...props}:{editing:boolean;searchOpen:boolean;disabled:boolean;onSearch:()=>void;onCancel?:()=>void;onSave?:()=>void;saveDisabled?:boolean;cancelDisabled?:boolean;saving?:boolean}){
 return <NavigationHeader mode={editing?'Create':'Home'} {...props}/>;
}
