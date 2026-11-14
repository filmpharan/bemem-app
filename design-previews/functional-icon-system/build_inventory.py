"""Source-backed context inventory. Read-only app inspection; output stays here."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
rows=[]
def add(action,icon,file,needle,current,policy='Label',risk='Ambiguous without context',frequency='Occasional',destructive=False):
 source=PROJECT/'src/components/bemem'/(file+'.tsx')
 if file=='index':source=PROJECT/'src/app/index.tsx'
 lines=source.read_text(encoding='utf-8').splitlines();line=next((i+1 for i,t in enumerate(lines) if needle in t),None)
 assert line,(action,needle)
 rows.append({'action':action,'canonicalIcon':icon,'source':str(source.relative_to(PROJECT)).replace('\\','/'),'line':line,'evidence':needle,'current':current,'intendedAction':action,'frequency':frequency,'recommendation':policy,'risk':risk,'destructive':destructive})

add('Open/close Search','search / close','HomeHeader','Search cards','Frameless search/X','Icon only','Keep expanded state and Search cards / Close search accessible names','Frequent')
add('Open Account','account','HomeAccountMenu','accessibilityLabel="Account"','Native profile outline in circle','Icon only','Preserve48dp circular target and expanded state','Frequent')
add('Return Home via wordmark','home','HomeHeader','bemem. Back to Home','bemem. text','Keep wordmark','Do not replace the brand wordmark with a home glyph','Occasional')
add('Enter Create','add-card','HomeAccountMenu',"'Add Card'","Add Card menu label",'Icon + label','Must mean existing Create, not immediate Add form','Frequent')
add('Open Decorate','decorate','HomeAccountMenu',"'Decorate'",'Decorate menu/header text','Icon + label','Brush can be mistaken for Edit; preserve label','Frequent')
add('Back from Create','previous','HomeHeader','Back to Home','Chevron','Icon only','Unsaved changes flow must stay intact','Frequent')
add('Open Add Card form','add-card','CanvasActions','accessibilityLabel="Add Card"','Plus FAB','Context test','Keep FAB context; distinguish from menu entry to Create','Frequent')
add('Save Canvas','save','CanvasActions','onSave','Save text','Icon + label','Never show success before verified persistence','Frequent')
add('Save unsaved layout on exit','save','UnsavedChangesDialog','onSave','Save text','Label','Dialog choice must remain explicit','Occasional')
add('Discard unsaved layout','delete','UnsavedChangesDialog','onDiscard','Discard text','Label','Do not use a trash-only dialog choice','Occasional',True)
add('Cancel exit','close','UnsavedChangesDialog','onCancel','Cancel text','Label','Distinct outcome from discarding changes','Occasional')
add('Submit Add Card','add-card','AddCardEditor','Add Card to Create draft','Add Card text','Icon + label','Adds a draft, not implicit final layout Save','Frequent')
add('Cancel Add/Edit form','close','AddCardEditor','Cancel adding card','Cancel text','Label','Preserve dirty-form discard confirmation','Frequent')
add('Edit selected membership card','edit','MembershipCardDetail','accessibilityLabel="Edit Card"','Lucide-derived pencil','Icon only','Create-only permission; no new Home edit action','Frequent')
add('Save membership changes','save','EditMembershipCardEditor','Save membership changes','Save Changes text','Icon + label','Same ID; duplicate-submit guard unchanged','Frequent')
add('Delete membership card','delete','EditMembershipCardEditor','accessibilityLabel="Delete Card"','Delete Card text','Label','Irreversible; show exact history/receipt impact and confirmation','Rare',True)
add('Show Front side','flip-front','AddCardForm','Switch card front and back','Flip glyph + Front/Back','Icon + state label','Front glyph is a state cue; do not add a second control','Frequent')
add('Show Back side','flip-back','MembershipCardDetail','Switch card front and back','Same flip glyph + state text','Icon + state label','Two illustrative states of the same existing toggle','Frequent')
add('Choose card artwork','gallery','CardArtworkControls','Choose from Gallery','Image-plus glyph','Context test','Gallery must not imply automatic upload','Occasional')
add('Take card photo','camera','CardArtworkControls','Take Photo','Camera glyph','Context test','Camera permission; retain accessible label','Occasional')
add('Open artwork options','more','CardArtworkControls','Artwork options','Three-dot glyph','Icon only','Context menu reveals Crop/Remove, not hidden immediate deletion','Occasional')
add('Crop/reposition card artwork','crop','CardArtworkControls','Adjust image','Crop screen with text tools','Icon + label','Do not change crop UI/gesture behavior in this phase','Occasional')
for title,icon,needle in [('Move crop left','previous',"'Left'"),('Move crop right','next',"'Right'"),('Move crop up','previous +90deg',"'Up'"),('Move crop down','previous -90deg',"'Down'")]:
 add(title,icon,'CardArtworkControls',needle,'English directional text','Context test','Alternative to drag; keep accessible directional names')
add('Zoom in image','zoom-in','CardArtworkControls','Zoom in','Plus text','Icon only','Do not introduce zoom controls into viewers that lack them')
add('Zoom out image','zoom-out','CardArtworkControls','Zoom out','Minus text','Icon only','Keep minimum zoom state accessible')
add('Use image crop','check','CardArtworkControls','Use image crop','Use Image text','Icon + label','Explicitly applies crop; check alone is ambiguous')
add('Choose orientation','landscape / portrait','AddCardForm',"'Landscape'",'Landscape / Portrait controls','Icon + label','Keep both exact orientation labels')
add('Choose one of7 card sizes','landscape / portrait','AddCardForm','preset.label','Preset name + block dimensions','Label','Do not replace7 distinct preset labels with one rectangle')
add('Find/select Brand','search','AddCardForm','Find or select a brand','TextInput and brand results','Keep field label','Field search, not another global Search action')
add('Expand Code and color options','chevron-down','AddCardForm','Code and color options','Code & color text','Icon + label','Expose expanded state; collapse rotates same chevron')
add('Reset code to membership number','check','AddCardForm','Use membership number as code value','Text action','Label','May replace independently edited payload; preserve explicit text')
add('Choose QR preference','qr','AddCardForm',"'QR Code'",'QR Code text','Icon + label','QR symbol is a UI glyph, never an encoder output')
add('Choose Code128 preference','barcode','AddCardForm',"'Code 128'",'Code128 text','Icon + label','Payload validation unchanged')
add('Choose card color/gradient','palette','AddCardForm','No gradient','Swatches + text choices','Keep existing swatches/labels','Do not confuse monochrome functional ink with user card colors')
add('Share card','share','MembershipCardDetail','Share card','Three-node share glyph','Icon only','Retain exact share preview/privacy controls','Frequent')
add('Choose share output type','gallery / barcode','ShareCardSheet','Choose what to share','Card Image / Card with Scan Code','Label','Private encoded data inclusion must stay explicit')
add('Choose share side','flip-front / flip-back','ShareCardSheet','Share ${side','Front / Back text','Icon + label','Disabled when no Back artwork; preserve explanation')
add('Choose share code format','qr / barcode','ShareCardSheet','Share ${format','QR / Code128 text','Icon + label','Cannot silently convert unsupported values')
add('Prepare share image again','refresh','ShareCardSheet','onRetry','Prepare again text','Label','Do not imply auto retry or share success')
add('Switch code display','qr / barcode','MembershipCardDetail','Show ${nextFormat','Destination code glyph + current format label','Context test','Keep current format label; accessible name describes destination','Frequent')
add('Open Card History and Receipts','journal','MembershipCardDetail','View Card History and Receipts','History glyph + long text','Icon + label','Journal must not be confused with Undo','Frequent')
add('Add Photo entry','add-photo','CardHistorySheet','label="Add Photo"','Add Photo text','Icon + label','Creates journal entry, not gallery upload','Frequent')
add('Select journal entries','select','CardHistorySheet','label="Select"','Select text','Icon + label','Selection mode must be visibly distinct from opening entries')
add('Select All entries','select-all','CardHistorySheet','label="Select All"','Select All text','Icon + label','Keep scope/count visible')
add('Cancel selection','close','CardHistorySheet','Cancel Selection','Cancel Selection text','Label','Must not clear saved records')
add('Delete Selected entries','delete','CardHistorySheet','Delete Selected','Delete Selected text','Label','Keep actual count and irreversible confirmation','Occasional',True)
add('Open journal entry','journal','CardHistorySheet',"'Open'",'Tappable record row','Keep row content','No new standalone Open icon; preserve date/notes/photo content','Frequent')
add('Back to Card / History','previous','CardHistorySheet','Back to History','Back to Card / Back to History text','Icon + label','Context-dependent target should remain explicit')
add('Reload History','refresh','CardHistorySheet','Reload History','Reload History text','Label','Recovery inspection, not automatic retry','Rare')
add('Restore preserved History','refresh','CardHistorySheet','Restore Preserved History','Restore Preserved History text','Label','Recovery operation needs explicit user confirmation','Rare')
add('Finish receipt cleanup','delete','CardHistorySheet','Finish Receipt Cleanup','Finish Receipt Cleanup text','Label','Recovery removal, never icon-only','Rare',True)
add('Take journal/receipt photo','camera','ReceiptAttachments','Take photo','Take Photo text','Icon + label','Camera permission/context; maximum4 journal photos')
add('Choose journal/receipt photos','gallery','ReceiptAttachments','Choose photos from Gallery','Choose from Gallery text','Icon + label','Keep action name and4-photo limits')
add('Open photo/receipt viewer','view-image','ReceiptAttachments','Open photo','Photo thumbnail','Keep thumbnail','No extra visible viewer navigation invented')
add('Replace receipt image','gallery','ReceiptAttachments','Replace receipt','Replace text','Label','Existing image preserved until replacement succeeds')
add('Crop receipt/photo','crop','ReceiptAttachments','Crop receipt','Crop text','Icon + label','Original/Square crop choice explicit')
add('Remove photo/receipt from entry','delete','ReceiptAttachments','Remove receipt','Remove text','Label','Entry-local removal; do not confuse with deleting wallet card','Occasional',True)
add('Share receipt','share','ReceiptViewer','Share receipt','Share Receipt text','Icon + label','Preserve verified file export preview')
add('Close viewer/sheets','close','ReceiptViewer','Close receipt','Close text and sheet X controls','Context test','X can be icon-only; bottom Close labels stay where present','Frequent')
add('Undo decoration/card move','undo','DecorateMode','Undo last','Undo text','Icon only candidate','Disabled/accessible name must stay clear','Frequent')
add('Redo decoration/card move','redo','DecorateMode','Redo last','Redo text','Icon only candidate','Must not be confused with Rotate','Frequent')
add('Rotate decoration90deg','rotate','WalletCanvas','Rotate','Native circular arrow','Icon only','Keep contextual right-side position','Frequent')
add('Remove decoration','delete','WalletCanvas','Delete','Native trash glyph','Context test','Keep contextual left-side position; Undo available','Frequent',True)
add('Decoration previous/next page','previous / next','DecorateMode','Next artwork page','Chevron in grid cell','Icon only','Navigation cells are never draggable','Frequent')
add('Choose decoration collection','existing artwork (excluded)','DecorateMode','Artwork collections','6 approved illustrations','Keep existing artwork','These are approved category symbols, not replacement functional assets','Frequent')
add('Policy information','policy','HomeAccountMenu',"'Policy'",'Policy menu text','Icon + label','Not consent, acceptance or complete legal policy')
add('Login Coming Soon','login','HomeAccountMenu','Coming Soon','Login label / Coming Soon sheet','Icon + label','Do not imply a functioning auth or cloud service')
add('Close Policy / Back to Home notice','close / home','HomeAccountMenu','Back to Home','Close / Back to Home text','Label','Keep explicit destination')
add('Reinspect / Retry activation','refresh','index','Reinspect wallet','Recovery text links','Label','Wallet admission and uncertain commit must not be bypassed','Rare')

(ROOT/'inventory.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
md='# Production functional-action inventory\n\n'+str(len(rows))+' context-specific action groups, consolidated into43 canonical drawing proposals plus semantic aliases and field/information affordances. Counts are not a count of every Pressable instance. No proposed production replacement is approved.\n\n'
md+='| Action / intended result | Canonical glyph | Existing source | Current control | Frequency | Recommendation | Risk | Destructive |\n|---|---|---|---|---|---|---|---|\n'
for a in rows:
 md+='| '+ ' | '.join([a['action'],a['canonicalIcon'],f"[{Path(a['source']).name}:{a['line']}](../../{a['source']}#L{a['line']})",a['current'],a['frequency'],a['recommendation'],a['risk'],'Yes' if a['destructive'] else 'No'])+' |\n'
md+='''\n## Scope notes and non-actions

- Source is the current React Native render path, not the old website or a presumed icon catalog. MembershipCardDetail is reached through CardPreview for membership cards; the legacy/demo preview still has a disabled Edit placeholder. Do not treat that placeholder as an active Edit feature.
- `location`: current Country indicator is noninteractive; do not turn it into a country picker. `calendar`: optional expiry-month field adornment only; no calendar picker is currently implemented. `warning`/`info`: existing error/status copy can be paired with these, not new actions. `cloud-info`: informational Policy concept only; never a working backup button.
- No current `Clear History` button was found by searching production `src`. Keep the label if a separately approved future flow adds it; `clear-history → delete` is a reserved semantic mapping, not a new screen/control in this exploration.
- The current ReceiptViewer has Share Receipt / Close and a ScrollView, not previous/next-image or zoom buttons. Those glyphs are available from existing pagination/crop functions; this phase does not add viewer controls.
- Country, Brand results, card sizes, swatches and gradients keep existing visible data labels. User card data is not translated or rendered in an icon.
- DEV-only wallet test, diagnostics, consent and cutover routes remain outside the consumer mockups. Their existing Run/Inspect/Review/Cancel/Import/Backup/recovery text must remain explicit, with destructive/write gates intact. They can reuse info/refresh/check/close symbols after future approval; no new DEV UI is proposed.
- Home wordmark remains the wordmark, not a Home glyph. The six approved collection symbols remain the decorative illustrations and are excluded from functional icon replacement.
- Existing AddCardIcon explicitly attributes its current paths to Lucide (ISC). This new review's paths are drawn from scratch; familiar functional metaphors are retained for comprehension. No stock SVG/path file was imported or traced, and no legal exclusivity is claimed.
'''
(ROOT/'ICON-INVENTORY.md').write_text(md,encoding='utf-8')
print('Source-backed action groups:',len(rows))
