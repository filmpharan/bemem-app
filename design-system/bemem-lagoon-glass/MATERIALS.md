# Lagoon Glass — Material & Platform Rendering

Version 2.0.0-rc.1 · ค่าทดลองรอตรวจ · [ภาพขยายวัสดุ](../../design-previews/bemem-lagoon-colors/materials.html)

## Material construction

```text
Outer wrapper: geometry + hit target + one soft shadow
  Clip: radius inherited; no pointer handling
    Optional local backdrop material OR opaque fallback
    Palette tint
    Static inner curvature / bottom occlusion
    Fixed upper-left specular patch
    Outer + inner rim
  Content: icon / label / progress at full opacity
```

การใส่ alpha อย่างเดียวไม่พอ ต้องเห็นผิวบนที่มีแสงตกกระทบ ขอบที่บอกความหนา และเงาฐานที่ให้ความลอย ตัวหนังสือเป็นชั้นอิสระ ไม่ถูก specular วางทับด้านบน และ decorative layers ไม่รับ pointer/focus

## ค่าร่วมทุก palette

| Role | Fill alpha | Pressed alpha | ภาพและเหตุผล |
| --- | --- | --- | --- |
| utility | .70 | .80 | โปร่งพอเห็นสีพื้น เป็นเครื่องมือเบา แต่ contrast ยังพอในแบบจำลองพื้นสุดขั้ว |
| utilitySelected | .78 | .80 | Search ที่เปิดอยู่ หนาแน่นขึ้นโดยไม่กลายเป็น action หลัก |
| gel | .70 | .78 | FAB/Add Card มี meniscus และ inner volume เด่นกว่า utility แม้ alpha เท่ากัน |
| action | .86 | .96 | Create active/Save เชื่อถือได้ อ่านขาวชัดบนทุกสี; ไม่บังคับ .88–.90 จาก DS เก่า |
| inactive | .84 | ไม่รับกด | ลด hierarchy ด้วยพื้นสว่าง ไม่มีเงา/blur แทนการทำข้อความโปร่ง |

ผิว .70 หมายถึงทึบ 70% / โปร่ง 30% ไม่ใช่โปร่ง 70% โครงสร้างแสงและ alpha ใช้ร่วมกันทุกสี ต่างเฉพาะ tint/สี semantic ค่าพวกนี้ต้องตรวจจริงหลัง provider tint, accessibility setting และ compositor ของอุปกรณ์

## แสงสะท้อนและขอบ

- ทิศแสงหลัก: บนซ้าย คงที่ ไม่ติดตามนิ้ว
- utility top highlight alpha .82 / body .36; gel top .96 / body .48; action top .72 / body .18
- ขอบนอกใช้ white alpha .92 (action .76); ขอบใน tint บางตาม recipe ไม่ใช่เส้น glow รอบปุ่ม
- ความโค้งภายในใช้ gradient/occlusion อยู่ที่ขอบบนและฐานล่าง ไม่ถมหลัง label
- พื้นที่ label ตรงกลาง y 36–78% กำหนด effective highlight/occlusion รบกวนไม่เกิน .04 เป็นเกณฑ์ตรวจ rendering ไม่ใช่สิทธิ์ให้เลเยอร์ทับตัวอักษร
- default shadow: offset `(0,9)`, blur 24, spread -9, alpha .25 จาก shadow tint ของ palette; pressed ลดเป็น `(0,4)`, blur 12, spread -5, alpha .22
- ไม่มี shimmer, animated glow, moving caustics, animated refraction หรือ pulse

หาก native material มีแสง/เงาของระบบอยู่แล้ว ห้ามซ้อนทุกชั้นจน effect มากกว่าตัวอักษร ต้องลด/เลือก renderer และเทียบกับ Master ไม่สัญญาว่า Liquid Glass เท่ากับ gel ของภาพ Browser โดยตรง

## Native translation

ตรวจ API กับ Expo SDK 58 และ React Native 0.88.1 ที่ package.json ระบุแล้ว สิ่งต่อไปนี้เป็นแนวทางสำหรับงานอนุมัติถัดไป ไม่ใช่โค้ดที่สร้างหรือเปิดใช้งานแล้ว

| Layer | แนวทาง Native |
| --- | --- |
| geometry / tint | View styles ตัวเลข logical units และ rgba ที่ resolve จาก semantic |
| gel / specular | View layers หรือ static assets ที่ไม่รับสัมผัส; RN 0.88 มี backgroundImage แบบ linear/radial gradient แต่ไม่รองรับ CSS pseudo-elements โดยตรง |
| outer shadow | boxShadow บน New Architecture เมื่อรองรับ; fallback เป็น legacy iOS shadow หรือ Android elevation เพียงหนึ่งแบบ |
| clip | overflow hidden เฉพาะ material child; เงาอยู่ wrapper ภายนอก |
| label / icon | sibling content opacity 1 ไม่เป็นลูกของ View ที่ลด opacity |

ข้อจำกัด shadow/gradient อ้างอิง [RN View Style Props](https://reactnative.dev/docs/view-style-props): outset shadow ของ Android ต้องรุ่นที่รองรับ และ elevation ไม่ใช่ค่าเท่ากันกับ blur radius ห้าม copy CSS ทั้ง rule ลง StyleSheet หรือใช้ filter blur ทำให้ลูกปุ่มเบลอ

## Platform matrix

| แพลตฟอร์ม/เงื่อนไข | ทางเลือก |
| --- | --- |
| ยังไม่อนุมัติ provider เพิ่ม | opaque embossed gel: tint ทึบ + static highlight/rim/depth/shadow ไม่มี backdrop blur |
| iOS 26+ capability ทั้งสองผ่าน | ประเมิน expo-glass-effect ที่มีอยู่แล้ว ใช้ regular material; หากระบบให้ผิวไม่ตรงหรือ contrast ไม่ผ่าน ให้ fallback |
| iOS รุ่น/compiled app ไม่รองรับ | fallback; expo-blur เป็นทางเลือกได้หลังอนุมัติ dependency แยก |
| Android API 31+ หลังอนุมัติ expo-blur | shared BlurTargetView และวิธีที่จำกัด API เพื่อรักษาประสิทธิภาพ |
| Android API ≤30 / frame budget ไม่ผ่าน | opaque fallback ไม่บังคับ expensive blur |
| Reduce Transparency / increased contrast ตามที่รองรับ | เลือกพื้นทึบ ลดการสะท้อน ไม่เปลี่ยน geometry/label/action |
| ระหว่าง Drag & Drop | fallback คงที่สำหรับ gesture; ไม่ capture หรือตรวจภาพ Canvas ทุกเฟรม |

`isLiquidGlassAvailable` และ `isGlassEffectAPIAvailable` ตรวจคนละความพร้อมก่อนใช้ GlassView; ไม่มี numeric intensity เทียบ BlurView และ style `clear` ของระบบไม่ใช่ default ของเรา [Expo GlassEffect SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/glass-effect/)

หากอนุมัติ expo-blur ภายหลัง ค่าทดลองคือ intensity iOS 24 / Android 16, reductionFactor 4, `dimezisBlurViewSdk31Plus`; Android ต้องจัด BlurTargetView/target ref และตรวจลำดับกับเนื้อหา dynamic ค่า CSS blur 18px ของ Preview ไม่ใช่ intensity 18 [Expo BlurView SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/)

ยังไม่ติดตั้ง expo-blur และยังไม่ได้เพิ่ม Native rendering code ในงานนี้

## Effect budget

อนุญาต live local blur ไม่เกิน 2 regions ต่อจอจริง: Home ปกติให้ Search/Create เป็น candidate, Create ให้ FAB/Save มีลำดับก่อนและ Header ใช้ embossed fallback; Home ว่างให้ FAB มีลำดับก่อน ไม่เปิด 3 regions พร้อมกัน การเลือก budget เป็นหน้าที่ rendering adapter ในอนาคต ไม่เปลี่ยน gesture controller

artwork ของบัตรเป็น static เสมอ ไม่ใช้ per-card backdrop blur Specular ไม่เคลื่อนและไม่เพิ่ม opacity animation ทุกเฟรมที่นิ้วขยับ หาก fallback ต้องยังเห็น gel ด้วยรูปแสง ขอบ และเงา ไม่ลดเหลือปุ่มแบนที่ดูเหมือนล้มเหลว

## Accessibility preferences

Reduce Motion และ Reduce Transparency แยกกัน ตรวจ preference ตอนเริ่มและสังเกตการเปลี่ยน [RN AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) มี transparency API เฉพาะ iOS จึงไม่สมมติว่ามี equivalent บน Android ทุกเครื่อง บน Android เลือก fallback ได้จาก capability/performance โดยไม่อ้าง preference ที่อ่านไม่ได้

การลด motion ไม่ทำให้ status busy หาย สามารถใช้ข้อความคงที่แทน spinner ได้ ผลสำเร็จต้องมาจาก operation จริง ไม่ใช่การเล่นแสงเสร็จ

## Scan surface exception

คำสั่ง scan override ทุก palette และ material: พื้นขาวทึบ รหัสดำ opacity 1 ไม่มี blur/tint/gradient/specular/rim/soft shadow บน code และ quiet zone QR margin อย่างน้อย 4 modules; Code 128 ตาม renderer/symbology ที่เลือก ไม่ใช้ margin QR แทน การสแกนจริงยังรอระยะที่สร้าง renderer
