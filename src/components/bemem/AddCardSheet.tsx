import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sheetVisual } from '../../constants/sheet-visual';
import { GlassButton } from './GlassButton';
import { AddCardIcon } from './AddCardIcon';
import { AddCardText } from './AddCardText';
import { addCardLayout as layout } from './add-card-layout';
import type {KeepsSheetMotion} from './keeps-motion';
import type {KeepsContentMotion} from './keeps-editor-motion';

export const supportsSheetBackgroundBlur = () => Platform.OS === 'android' && Number(Platform.Version) >= 31;

/** Source-flow footer: header, form and CTA all belong to the same scroll content. */
export function AddCardSheet({ children, footer, background, onClose, title = 'Add Card', closeDisabled = false, modalOnly = false, virtualized = false, fixedFooter = false,confirmation,presentation = 'modal', face,onContentViewportLayout,contentScrollEnabled = true, keepsMotion, keepsContentMotion }: {
  keepsMotion?:KeepsSheetMotion; keepsContentMotion?:KeepsContentMotion;
  children: ReactNode; footer: ReactNode; background?: ReactNode; onClose: () => void;
  title?: string; closeDisabled?: boolean; modalOnly?: boolean; virtualized?: boolean;
  contentScrollEnabled?:boolean;fixedFooter?: boolean;presentation?:'modal'|'inline';
  confirmation?:{content:ReactNode;onRequestClose:()=>void};
  /** Optional read-only measurement of the fixed-footer content viewport. */
  onContentViewportLayout?:(size:{width:number;height:number})=>void;
  face?: { side: 'front'|'back'; disabled: boolean; onToggle: () => void };
}) {
  const [headerWidth, setHeaderWidth] = useState(320);
  const [titleWidth, setTitleWidth] = useState(title.length*12), [faceWidth, setFaceWidth] = useState(76);
  const stackedFace = headerWidth < titleWidth * 2 + faceWidth + 24;
  const requestClose = closeDisabled ? () => {} : onClose;
  function requestBack() {
    if (Keyboard.isVisible?.()) { Keyboard.dismiss(); return; }
    (confirmation?.onRequestClose ?? requestClose)();
  }
  const faceButton = face && <GlassButton accessibilityLabel="Switch card front and back" disabled={face.disabled}
    accessibilityValue={{text:face.side==='front'?'Front':'Back'}} accessibilityState={{ selected: face.side==='back' }}
    onPress={face.onToggle} style={{minHeight:48,width:faceWidth,borderRadius:layout.buttonRadius}}>
    <AddCardText maxWidth={faceWidth-12} onMeasure={width=>setFaceWidth(Math.max(64,width+20))}
      style={{...ciTypography.button,color:ciColors.text.primary}}>{face.side==='front'?'Front':'Back'}</AddCardText>
  </GlassButton>;
  const header = face ? <View testID="card-form-header" onLayout={event=>setHeaderWidth(event.nativeEvent.layout.width)} style={{marginBottom:10}}>
    <View style={{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <AddCardText accessibilityRole="header" onMeasure={setTitleWidth}
        maxWidth={Math.max(1,stackedFace?headerWidth-60:(headerWidth-faceWidth)/2-12)} style={styles.title}>{title}</AddCardText>
      <View style={{width:48,minHeight:48,alignItems:'center',justifyContent:'center'}}>
        <GlassButton tone="tertiary" accessibilityLabel={`Close ${title}`} disabled={closeDisabled} hitSlop={6} onPress={requestClose} style={styles.close}><AddCardIcon name="close" /></GlassButton>
      </View>
    </View>
    <View testID="card-form-face-control" style={stackedFace?{alignSelf:'center'}:{position:'absolute',left:(headerWidth-faceWidth)/2,top:0}}>{faceButton}</View>
  </View> : <View style={styles.header} onLayout={event => setHeaderWidth(event.nativeEvent.layout.width)}>
    <AddCardText accessibilityRole="header" maxWidth={Math.max(1, headerWidth - 12 - layout.toolSize - 8)} style={styles.title}>{title}</AddCardText>
    <GlassButton tone="tertiary" accessibilityLabel={`Close ${title}`} disabled={closeDisabled} hitSlop={6} onPress={requestClose} style={styles.close}><AddCardIcon name="close" /></GlassButton>
  </View>;
  const fields=fixedFooter ? <View style={{flex:1}}>
              <View style={[styles.content,{paddingBottom:0}]}>{header}</View>
              <ScrollView scrollEnabled={contentScrollEnabled} onLayout={event=>onContentViewportLayout?.(event.nativeEvent.layout)} style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingTop:0}]}>{children}</ScrollView>
              <View style={[styles.content,{paddingTop:12}]}>{footer}</View>
            </View> : virtualized ? <View style={{ flex: 1 }}>
              <View style={[styles.content, { paddingBottom: 0 }]}>{header}</View>
              {children}
              <ScrollView style={{ flexGrow: 0, maxHeight: '40%' }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{footer}</ScrollView>
            </View> : <ScrollView scrollEnabled={contentScrollEnabled} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} contentContainerStyle={styles.content}>
              {header}{children}<View style={styles.footer}>{footer}</View>
            </ScrollView>;
  const body=<View accessibilityElementsHidden={!!confirmation} importantForAccessibility={confirmation?'no-hide-descendants':'auto'} accessibilityViewIsModal={!confirmation&&presentation!=='inline'} style={[styles.sheet, (virtualized || fixedFooter) && { height: '92%' }]}>
            <View pointerEvents="none" accessible={false} style={styles.rim} />
            {keepsContentMotion?keepsContentMotion.renderContent(fields,virtualized||fixedFooter):fields}
          </View>;
  const Container=presentation==='inline'?View:SafeAreaView;
  const content=<Container style={presentation==='inline'?[styles.overlay,styles.inline]:keepsMotion?[styles.overlay,{backgroundColor:'transparent'}]:styles.overlay}>
        {keepsMotion?.scrim}
        <Pressable accessibilityElementsHidden={!!confirmation} importantForAccessibility={confirmation?'no-hide-descendants':'auto'} accessibilityLabel={`Close ${title}`} accessibilityRole="button" disabled={closeDisabled||!!confirmation} onPress={requestClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.keyboard} pointerEvents="box-none">
          {keepsMotion?keepsMotion.renderSheet(body):body}
          {confirmation?.content}
        </KeyboardAvoidingView>
      </Container>;
  if(presentation==='inline')return content;
  const sheet=<Modal visible transparent animationType="none" {...(keepsMotion||keepsContentMotion?{onShow:()=>{keepsMotion?.onShow();keepsContentMotion?.onShow();}}:{})} onRequestClose={requestBack} statusBarTranslucent navigationBarTranslucent>{content}</Modal>;
  return modalOnly ? sheet : <View style={styles.screen}>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none"
      style={[StyleSheet.absoluteFill, supportsSheetBackgroundBlur() && { filter: [{ blur: 5 }] }]}>{background}</View>
    {sheet}
  </View>;
}
const styles = StyleSheet.create({
  inline:{...StyleSheet.absoluteFill,zIndex:5},
  screen: { flex: 1, backgroundColor: sheetVisual.surface },
  overlay: { flex: 1, backgroundColor: sheetVisual.scrim },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', width: '100%', alignSelf: 'center', flexShrink: 1, overflow: 'hidden',
    backgroundColor: sheetVisual.surface, borderTopLeftRadius: layout.sheetRadius, borderTopRightRadius: layout.sheetRadius,
    boxShadow: sheetVisual.shadow },
  rim: { ...StyleSheet.absoluteFill, borderWidth: StyleSheet.hairlineWidth, borderColor: sheetVisual.rim,
    borderTopLeftRadius: layout.sheetRadius, borderTopRightRadius: layout.sheetRadius, zIndex: 1 },
  // Keep the visual 16-unit bottom gap while allowing the close hit area to grow.
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    padding: 6, marginHorizontal: -6, marginTop: -6, marginBottom: 10 },
  title: { ...ciTypography.title, color: ciColors.text.primary, lineHeight: 28, flexShrink: 0 },
  close: { backgroundColor: sheetVisual.elevated, borderRadius: 18, width: layout.toolSize, height: layout.toolSize, minWidth: layout.toolSize, minHeight: layout.toolSize },
  content: { padding: layout.padding },
  footer: { marginTop: layout.gap, gap: 4 },
});
