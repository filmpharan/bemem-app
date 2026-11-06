# bemem Components v1.0

เวอร์ชัน 1.0.0 · สถานะรอตรวจ · **ข้อกำหนดภาพและสถานะ ไม่ใช่ component ที่สร้างแล้ว**

อ่านร่วมกับ [MASTER](MASTER.md), [TOKENS](TOKENS.json) และ [VALIDATION](VALIDATION.md) ค่าที่ระบุว่า proposed ยังไม่ถูกนำเข้า source code

## 1. Header — locked

โครงสร้างเดิม: **bemem. → Search → Create** อ้างอิง [HomeHeader.tsx](../../src/components/bemem/HomeHeader.tsx) และ `existing.header` เป็น baseline ที่ล็อก ไม่มีหน้าใดเปลี่ยน Header เป็น glass หรือเปลี่ยน Create เป็น Add Card/Done/Save

| รายการ | ค่าเดิมที่บันทึกเป็นข้อกำหนด |
| --- | --- |
| container | inset แนวนอน 20, top 20 หลัง Safe Area, gap 8 |
| โลโก้ | 30 / lineHeight 38, weight 800, tracking -1.2, ink; จุด muted |
| Search | visual frame 44×44, radius 22, icon 20; เปิดค้นหาเป็น Close ตามพฤติกรรมเดิม |
| Create | minHeight 36, padding H24/V8, pill 99, พื้น `#14161f` |
| Create label | `Create`, 14 / lineHeight 20, weight 500, `#f8fafc` |
| เดิม pressed/disabled | wrapper opacity 0.75 / 0.45; บันทึกไว้โดยไม่เปลี่ยน |

`proposed.typography`, ปุ่ม glass และ reduced-motion style ใหม่ไม่ override Header โดยอัตโนมัติ รูปแบบฟอนต์ของ Header ปัจจุบันยังเป็นระบบและมี maxFontSizeMultiplier 1.25 การปรับให้เหมือนฟอนต์เว็บ/รองรับตัวอักษรใหญ่มากต้องเสนอพร้อมภาพเปรียบเทียบก่อน

พื้นที่แตะใหญ่กว่าภาพได้เฉพาะเมื่อไม่ทำให้ Header เคลื่อนและไม่ชน target ข้างเคียง ตรวจจริงก่อนเลือก hitSlop ห้ามสรุปว่าเพิ่ม hitSlop อย่างเดียวแล้วผ่านทุกขนาดจอ หากทำไม่ได้โดยรักษาภาพเดิมให้รายงานเป็นประเด็นขออนุมัติ ไม่แก้เอง

## 2. ลักษณะปุ่มที่เสนอ

| ปุ่ม | รูปทรงและตำแหน่ง | ผิวปกติที่เสนอ | ลักษณะเนื้อหา |
| --- | --- | --- | --- |
| FAB Add Card | วงกลม 56×56, radius 28; Home ว่างล่างขวา / Create ล่างซ้าย | Dark: ink alpha 88%, ขอบ white alpha 40%, เงา rest | บวก 20 สี `#f8fafc`; accessible name `Add Card` |
| | Home มีบัตรไม่แสดง แม้ค้นหาไม่พบ | ไม่มี glass บนบัตรรอบข้าง | เครื่องหมายบวกขนาด 20 สี `#f8fafc`, accessible name `Add Card` |
| Add Card แบบมีข้อความ | capsule minHeight 48, padding H16/V12, radius 999 | Clear: white alpha 90%, ขอบ ink alpha 56%, เงา rest | บวก 20 + ช่อง 8 + `Add Card` 14/20 weight 600 |
| Save บน Canvas | minHeight 56, radius 16, padding H16/V12; คง left 72/right 0 ภายใน action rail เดิม | Dark เหมือน FAB; ไม่เปลี่ยน Header | `Save` 14/20 weight 600; ขณะบันทึก `Saving…` และ progress |

FAB/action rail คง inset แนวนอน 16 และ bottom 24 ภายใน Safe Area ตาม `existing.actions` ไม่ตีความ bottom 24 ว่าเริ่มจากขอบ physical screen และไม่ย้าย FAB เมื่อเปลี่ยนชนิดผิว

สำหรับปุ่มที่มีข้อความ ตัวเลขความสูงเป็นขั้นต่ำ ไม่ใช่การบังคับตัดข้อความเมื่อ font scale สูงขึ้น ให้ขยายปุ่มขึ้นจาก bottom anchor และเพิ่มระยะหลบเครื่องมือของพื้นที่เลื่อนตามที่จำเป็นในงาน UI ที่อนุมัติแล้ว โดยไม่เปลี่ยน logical grid หรือพิกัด Saved/Draft ส่วน FAB คง 56×56 เพราะไม่มีข้อความให้ขยาย ถ้าพื้นที่ไม่พอให้เสนอภาพและขอ review ห้ามย่อฟอนต์หรือ Header เอง

Add Card แบบมีข้อความเป็นข้อกำหนดสำหรับพื้นที่เพิ่มบัตรในอนาคต **ไม่เพิ่มปุ่มใหม่ลง Home และไม่สร้างฟอร์มเพิ่มบัตรในระยะนี้** ทุกปุ่มใน Phase 1 ที่ยังไม่มีระบบเพิ่มบัตรต้องแจ้งตามจริงว่าใช้งานไม่ได้ ห้ามทำให้ดูเพิ่มบัตรสำเร็จ

## 3. State ของ Clear และ Dark

เส้นทาง canonical: `proposed.glass.<variant>.states.<state>` ขนาดและตำแหน่งไม่เปลี่ยนตาม state ลำดับความสำคัญคือ **saving → disabled → pressed → default** กรณี saving จะปิดการกด แต่ต้องไม่รับลักษณะ disabled จนข้อความ progress จาง

| State | Clear | Dark | พฤติกรรมภาพและ accessibility |
| --- | --- | --- | --- |
| default | white alpha .90 / ink text | ink alpha .88 / near-white text | เงา rest, ขอบ 1, effect เฉพาะจุดเมื่อ provider อนุมัติ |
| pressed | white alpha .96 / ink text | ink alpha .96 / near-white text | เงา pressed, feedback ทันที; ไม่ scale หรือย้ายขอบปุ่ม |
| disabled | white alpha .96 / `#475569` | ink alpha .96 / `#94a3b8` | ไม่มี blur/เงา; disabled semantics และไม่รับ action; ให้เหตุผลถ้าผู้ใช้อาจไม่เข้าใจ |
| saving | เหมือน default | เหมือน default | label `Saving…`, busy semantics, slot progress ขนาดคงที่; ป้องกันกดซ้ำ |

Default border: Clear `rgba(15,23,42,.56)`, Dark `rgba(255,255,255,.40)`; pressed .64/.50 และ disabled .24/.22 ตามลำดับ ค่าสีและเงาเต็มอยู่ใน JSON ห้ามลด opacity ของ wrapper ทั้งก้อนเหมือนปุ่มเก่าเมื่อใช้ variant ใหม่

Token saving เป็นภาพสะท้อนสถานะจริง ไม่ใช่ timer ถ้าไฟล์เขียนไม่สำเร็จต้องแสดง error ตามระบบเดิมและรักษา Draft ไม่แสดง success เพื่อจบแอนิเมชัน การออกจากโหมดหลัง Save ยังต้องรอผลบันทึกเดิม

Spinner ไม่ทำให้ label เลื่อน: กันพื้นที่ progress ไว้ใน geometry เดิม และต้องไม่กินพื้นที่จนคำว่า Saving… ถูกตัด เมื่อ Reduce Motion เปิดอยู่ อนุญาตข้อความ busy คงที่แทนการหมุน; ไม่ใช้ shimmer/pulse/แสงวิ่ง

## 4. วิธีประกอบ glass ในอนาคต

ลำดับชั้นที่แนะนำสำหรับงานที่ได้รับอนุมัติแล้ว:

```text
Wrapper: geometry + touch semantics + เงาหนึ่งแบบ
  Material clip: radius เดียวกับ wrapper, overflow hidden, ไม่รับ pointer
    Provider material หรือ opaque fallback
    Bemem tint overlay (เฉพาะกรณี material)
  Content: icon + label + progress, opacity 1, ไม่ถูก tint ทับ
```

Material เป็นลูกที่ไม่รับ gesture ไม่ครอบ Canvas, PanResponder หรือ ScrollView โดยเปลี่ยนตัวรับสัมผัส ไม่ใส่ blur/shadow filter ลง style ของบัตรที่กำลังลาก การแยก wrapper เงาออกจาก clip ป้องกันเงาถูกตัดตามขอบมุม

ตัวแปลงเลือกผิวและ state ก่อน แล้วแยก style/props ดังนี้:

| ข้อมูลจาก JSON | ปลายทาง |
| --- | --- |
| `width/height/minHeight/borderRadius/padding*` | outer geometry ตาม component; ห้าม global override Header |
| state `backgroundColor/borderColor/borderWidth` | tint/border layer |
| state `color` | Text และ icon ที่สื่อความหมาย |
| state `opacity` | ค่า 1; ไม่ทำ label จาง |
| `shadow` path | resolve เป็น renderer ที่เลือกเพียงหนึ่งแบบ |
| `blur` path | นโยบาย provider; ไม่ใช่ StyleSheet prop |
| `interactive` | native disabled/busy semantics ตามสถานะเดิม ไม่ใช่ตัวจัดการ Save ใหม่ |

เมื่อใช้ opaque fallback: ใช้สีพื้น/ขอบจาก `opaqueFallback`, ใช้ foreground จาก state ที่เลือก, ใช้เงา rest/pressed/none ตาม state และปิด blur เสมอ Disabled ยังใช้ข้อความ muted ที่กำหนดสำหรับ variant นั้น ห้ามนำ RGBA tint มาทำให้ fallback กลับโปร่ง

Native glass ที่ระบบสร้างเงาให้ใช้เพียงเงาระบบ ไม่เปิด boxShadow/elevation เพิ่ม ส่วน RN shadow fallback เลือก boxShadow **หรือ** legacy iOS shadow **หรือ** Android elevation; ตัวเลข elevation ไม่เท่ากับ blurRadius และต้องเทียบภาพจริง

## 5. นโยบายเลือกผิว

- ค่าเริ่มต้นก่อนอนุมัติ provider: opaque fallback ที่ระบุชัดว่าไม่มี backdrop blur
- Native glass ต้องตรวจ capability และ contrast จริง ไม่เลือกจากเลข OS อย่างเดียว
- ไม่ตีความ `clear` ของ bemem เป็น `glassEffectStyle="clear"`; native candidate ใช้ regular material ตาม MASTER
- เฉพาะปุ่มลอยที่มองเห็น ใช้ effect พร้อมกันไม่เกิน 2 จุด หาก modal เปิดอยู่ให้หยุด effect ของเครื่องมือที่ถูกบัง
- ขณะลาก ใช้ fallback คงที่ตั้งแต่ต้นจนจบ gesture; ไม่เปลี่ยน variant ตามตำแหน่งบัตรทุกเฟรม
- รูปแบบสว่าง/เข้มเป็นตัวเลือกเชิง semantic ไม่สลับอัตโนมัติตามภาพบัตรใต้ปุ่ม ซึ่งจะทำให้กระพริบและ hierarchy เปลี่ยน
- เครื่องมืออนาคตอาจใช้ Clear ในฐานะ action รอง หรือ Dark สำหรับ action หลัก แต่ต้องเสนอ component contract ก่อน ไม่ใส่กระจกให้ทั้ง toolbar โดยอัตโนมัติ

## 6. Save ใน dialog / Discard / Cancel

ข้อเสนอ glass Save ใน v1.0 มุ่งที่ปุ่ม Save บน Canvas ก่อน ปุ่ม Save ใน unsaved dialog ยังคงภาพเดิมจนมีอนุมัติขอบเขตภาพของ dialog โดยเฉพาะ ไม่ใส่ glass ให้ overlay หรือ Discard/Cancel อัตโนมัติ

- dialog ต้องยังมี Save / Discard / Cancel ครบ ชื่อและลำดับเดิม
- Discard ยังกลับผังที่บันทึกล่าสุด; Cancel ยังเก็บ Draft และอยู่ Create
- การปิดแอปก่อน Save ยังไม่ทำให้ Draft ถูกเขียนถาวร
- การขยาย target, ปรับ icon หรือ loading ต้องไม่สร้าง onPress ซ้ำหรือเปลี่ยนเงื่อนไข visibility/disabled ของระบบเดิม

## 7. บัตรและพื้นที่ Canvas

บัตรยังใช้ภาพหรือ palette ของบัตร ชื่อหนา และขอบมนตามเดิม ไม่ใส่ frosted layer ทับชื่อ ไม่ใช้ theme เพื่อบังคับสีแบรนด์บนบัตรทุกใบ Home พื้นเรียบและไม่ลาก; Create ใช้กริด + เดิม

ระบบตำแหน่ง logical grid, Saved/Draft, snapping, collision, orientation และการ scroll เป็นข้อกำหนดเชิงฟังก์ชันนอกอำนาจของ Design System เงาหรือขอบใหม่ต้องไม่เปลี่ยน layout box/hit box ของบัตร และต้องไม่เพิ่ม blur ที่บัตรหรือเต็ม Canvas

## 8. Barcode / QR Code — สัญญาสำหรับระยะถัดไป

ยังไม่ได้สร้าง renderer หรือรหัสจริงในรอบนี้ เมื่อสร้างในอนาคตให้แยก scan surface จากภาพหน้าบัตรและจาก effect tree ทั้งหมด ใช้ `proposed.scanSurface`

- พื้นขาว `#ffffff` รหัสดำ `#000000` opacity 1; ไม่มี glass, blur, gradient, tint, scrim, text shadow, animation หรือรูปภาพทับสัญลักษณ์
- ห้าม rounded clipping กัดมุมรหัสหรือ quiet zone เงาของ container อยู่ภายนอกได้แต่ต้องไม่รุกพื้นที่ว่างของรหัส
- QR ต้องมี quiet zone อย่างน้อย 4 modules ทุกด้านตาม [DENSO WAVE](https://www.qrcode.com/en/howto/code.html)
- Code 128 ให้ renderer กำหนด quiet zone ตาม symbology ที่เลือกและทดสอบเครื่องสแกน ห้ามใช้ margin 4 modules ของ QR แทนโดยอัตโนมัติ
- ไม่บีบอัตราส่วนหรือใช้ fractional scaling ที่ทำให้เส้น/ช่องผิดรูป; กำหนดขนาดตาม renderer และความหนาแน่นจอ
- ปุ่มปิด/แชร์/สถานะต้องอยู่นอกสัญลักษณ์และ quiet zone ไม่สร้าง FAB ทับรหัส
- เมื่อเปิดบัตรต้องไม่รอ font download, การจับภาพ blur หรือแอนิเมชันตกแต่ง รหัสออฟไลน์ต้องไม่พึ่ง network
- การผ่าน screenshot อย่างเดียวไม่พอ ต้องสแกนด้วยอุปกรณ์จริงในระยะที่มี renderer

## 9. Create PRO ในอนาคต

มีเพียงขอบเขตการต่อยอด: ของตกแต่งต้องแยกจาก hit targets, Header และ scan surface ไม่มีตัวอย่าง palette/sticker/frame/ธีม PRO ที่อนุมัติใน v1.0 สิทธิ์ PRO ไม่ทำให้ข้ามเกณฑ์อ่านง่าย ความเร็ว หรือความจริงของสถานะบันทึก
