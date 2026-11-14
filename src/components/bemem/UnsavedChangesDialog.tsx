import { ConfirmationDialog } from './ConfirmationDialog';

/** Compatibility facade: Create retains the same callbacks and action order. */
export function UnsavedChangesDialog({visible,saving,onSave,onDiscard,onCancel}:{
 visible:boolean;saving:boolean;onSave:()=>void;onDiscard:()=>void;onCancel:()=>void;
}){
 return visible?<ConfirmationDialog busy={saving} request={{id:'create-exit',title:'Save your layout?',
  description:'You have unsaved changes. Choose Save to keep this layout, or Discard to restore the last saved layout.',onDismiss:onCancel,
  actions:[{label:'Save',role:'primary',onPress:onSave},{label:'Discard',role:'destructive',onPress:onDiscard},{label:'Cancel',role:'neutral',onPress:onCancel}]}}/>:null;
}
