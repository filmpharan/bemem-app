# Lagoon Glass — Validation & Adoption Gates

Version 2.0.0-rc.1 · สถานะรออนุมัติรายละเอียด · ผลด้านล่างแยก Browser/เอกสารจาก Native จริง

## หลักฐานในรอบนี้

- JSON และ alias graph ตรวจด้วย Python standard library ไม่ติดตั้ง dependencies
- Preview ถูกสร้างจาก TOKENS ใหม่ผ่าน Core/Semantic ชุดเดียวกัน
- Browser review ใช้ Microsoft Edge headless กับโปรไฟล์ทดสอบใหม่ ตรวจข้อมูล/geometry และสร้าง PNG
- เปรียบเทียบ hash ของไฟล์ที่มีอยู่ก่อนงานนี้ รวม DS v1.0, Preview เดิม, Skill, AGENTS.md และเว็บไซต์เดิม
- ผลที่อ่านได้ด้วยเครื่องอยู่ใน [validation-report.json](../../design-previews/bemem-lagoon-colors/validation-report.json) และ [browser-review.json](../../design-previews/bemem-lagoon-colors/browser-review.json)
- ยังไม่มี UI ใหม่ทำงานใน Expo และยังไม่วัด drag/card-open latency หรือสแกนบนโทรศัพท์จริง

## JSON / naming checklist

ผลตรวจเอกสารและ Browser วันที่ 7 พฤศจิกายน 2026:

| รายการ | ผล |
| --- | --- |
| JSON / alias resolution / palette shape | ผ่านทั้ง 6 ID; ไม่มี missing reference หรือ cycle |
| Shared Core | geometry, spacing, radius, typography, icons, motion และ touch ตรงกันทุกสี |
| Contrast model | ต่ำสุดประมาณ 4.718:1 ในแบบจำลองที่ตรวจ ไม่ใช่การรับรอง compositor จริง |
| Structure / artwork | phone markup ต่อ mode เหมือนกัน; computed artwork ไม่เปลี่ยนข้าม 12 หน้าจอ |
| Browser page/viewport | ผ่าน 16 กรณี |
| PNG | สร้างจริง 8 ไฟล์: รวม 12 หน้าจอ, คู่ภาพ 6 สี และวัสดุขยาย |
| Source protection | hash ของไฟล์เดิมในแอป 179 ไฟล์และเว็บ 189 ไฟล์ไม่เปลี่ยน รวม DS/Preview เดิม |
| TypeScript / lint ของแอปเดิม | ผ่าน; lint แบบ Read-only 20 ไฟล์ ไม่มี errors/warnings |
| Native device / persistence / scanning | ยังไม่ทดสอบ implementation ใหม่ เพราะไม่ได้สร้างในรอบนี้ |

1. Parse ได้ ไม่มี duplicate keys, NaN หรือ Infinity
2. Version 2.0.0-rc.1, schemaVersion 1 และ runtimeAdoption `not-applied`
3. themeIds มี 6 ID ตรงกับ palettes, Mint เป็น default, Peach Glow ไม่เป็น palette/alias
4. ทุก palette มี color roles และรูปทรงข้อมูลเหมือนกัน ไม่มี typography/geometry overrides ใน palette
5. Resolve `{palette.*}`, `{semantic.*}`, `{core.*}` ได้ทุก ID ไม่มี missing refs/cycles
6. Core และ Component schema หลัง resolve ต่างกันได้เฉพาะค่าสี ไม่ใช้ชื่อสีเป็น component API
7. Material alpha อยู่ 0–1, label opacity 1, state geometry ไม่เปลี่ยน, Save ไม่เป็น toggle
8. `themeApiContract` ไม่คืน wallet/layout objects และ preference example ไม่มีข้อมูลบัตร
9. สัญญา scan override ทุกธีม ไม่มี effect และไม่ใช้ margin QR แทน Code 128

## Contrast

เกณฑ์เสนอ: ข้อความปกติ ≥4.5:1, meaningful icons/control information ≥3:1 ตรวจตามหน้าที่ที่สื่อจริง ไม่ถือว่า rim ตกแต่งที่จางทำให้ control ที่มองไม่เห็นผ่านเกณฑ์ [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

การคำนวณใช้ sRGB linearization และ `(Lสว่าง+.05)/(Lมืด+.05)` ตรวจ primary/secondary บน canvas base/high/low และ material foreground หลัง composite fill กับพื้นดำ/ขาวสุดขั้ว รวม pressed/selected/inactive ที่ใช้จริง

โมเดลนี้สมมติ tint overlay ตาม recipe ครอบ label background จริง ไม่มี layer ที่อยู่นอกสัญญามาเปลี่ยนสี ไม่ใช่การ certify native refraction, แสงสะท้อนจริง หรือสี artwork หลัง compositing ต้องดูภาพ rendered อีกครั้ง โดยเฉพาะ text safe band ที่ห้ามแสง/occlusion รบกวนเกิน .04

Disabled ยังตั้งใจให้อ่านได้ แม้ inactive controls มีข้อยกเว้นบางมาตรฐาน จึงใช้ foreground เข้มและไม่ลด wrapper opacity ทั้งก้อน ไม่อ้างว่า state จาง = accessibility ผ่าน

หากไม่ผ่านให้เลือก opaque fallback หรือปรับ palette/recipe ผ่าน review ไม่แก้สีของบัตรหรือ geometry เพื่อช่วยให้ปุ่มผ่าน

## Browser / structure checks

- index มี 12 figures ครบ 6 Home + 6 Create; แต่ละสีมี HTML สอง mode
- phone markup ของแต่ละ mode เหมือนกันทุกสี ต่างเพียง palette ที่ parent
- Home ใช้ Saved fixture เดียวกัน Create ใช้ Draft fixture เดียวกัน (Coffee Club ลง 1 แถว) และไม่มี actual save/drag
- ค่าสี/gradient/radius/shadow ของ artwork บัตรเหมือนกันทุก palette; selection outline ภายนอกไม่ถือเป็น recolor
- Search อยู่ Header ขวา Create ขวาบน; FAB/Save ใน Create อยู่ซ้าย/ขวาล่าง
- Home มีบัตรไม่มี FAB; ตัวอย่าง Home ว่างมี FAB ขวาล่าง
- ภาพบัตรไม่ซ้อน/หลุด Canvas และไม่ถูก Action Rail บังใน viewport ที่ตรวจ
- Desktop + 375px responsive ไม่มี horizontal overflow ใน index/หน้าธีม; contact sheet เป็นแผ่นกว้างโดยตั้งใจ
- ฟอนต์โหลด local, HTML ไม่มี runtime scripts หรือ external asset URLs
- PNG มี signature/dimensions จริง ไม่ใช่การเปลี่ยนนามสกุล HTML

## Native / accessibility gates — ยังไม่ตรวจรับ

- [ ] iOS ≥44×44 pt / Android ≥48×48 dp; วัด hit area จริงและไม่ทับกัน
- [ ] ทดสอบ font scale 100/150/200% และค่ามากสุดของระบบกับไทย/อังกฤษและชื่อบัตรยาว ไม่ cap label สำคัญ
- [ ] VoiceOver/TalkBack มี label/role/expanded/selected/disabled/busy ที่ถูกต้อง focus order ตรงภาพ
- [ ] Create ยังคงชื่อเดิม เปลี่ยนโหมดจากสถานะ/สี ไม่ใช้สีอย่างเดียวสื่อสิ่งสำคัญ
- [ ] Reduce Motion เปลี่ยนสถานะได้ทันที ไม่มีแอนิเมชันรอเปิดบัตรหรือ shimmer
- [ ] Reduce Transparency บน iOS มี fallback และสังเกตการเปลี่ยน preference; Android ไม่อ้าง API ที่ไม่มี
- [ ] Native glass capability ไม่ผ่านแล้วไม่ crash และ fallback ยังอ่านง่าย/เห็น gel
- [ ] Gradient/boxShadow/legacy fallback เทียบภาพจริง ไม่ผูกค่าสีที่เลือกกับ material support
- [ ] ไม่บัง Safe Area, keyboard focus หรือ system navigation; modal ที่ต้องออกยังมีทางกลับ

## Performance gates — เป้าหมาย ไม่ใช่ผลวัด

| รายการ | เป้าหมายที่ต้องยืนยัน |
| --- | --- |
| Press feedback | ≤100ms ไม่มี timeout รอ blur |
| Warm card open p95 | ≤150ms และ regression ไม่เกิน 16.7ms ที่ 60Hz เทียบ baseline mode เดียวกัน |
| Frame budget | ประมาณ 16.7ms ที่ 60Hz; ต้องวัดอีกหาก 120Hz |
| Live local blur | ไม่เกิน 2 regions ต่อจอจริง |
| ระหว่าง drag | ไม่มี per-frame recapture, animated blur/highlight หรือ theme recomposition |
| Card artwork | เป็น static ไม่มี live material ต่อใบ |

วิธีวัด: เครื่อง/OS/build mode/refresh rate/ข้อมูลสมมติเดียวกัน อย่างน้อย 30 warm opens และ drag 10 วินาที 3 รอบ เก็บ median/p95 แยกเครื่อง ไม่เฉลี่ยจนซ่อนเครื่องช้า Expo Go ใช้ตรวจ UX ได้ แต่ต้องระบุ development overhead และไม่ถือเป็น release benchmark

หากงบไม่ผ่านให้ลด/ปิด blur ก่อน ไม่เปลี่ยน Drag & Drop เพื่อช่วยเอฟเฟกต์ และไม่ทำแอนิเมชันบังเวลาที่รหัสยังไม่พร้อม

## Behavior / persistence regression gates

- [ ] Cold open เข้า Home เสมอ พร้อม Saved Layout ล่าสุด
- [ ] Home ไม่ลาก Create ยังคง gesture/collision/scroll เดิม ไม่มี theme-driven positions
- [ ] Save สำเร็จจริงจึงยืนยัน; failure ยังเก็บ Draft และข้อมูลเดิม
- [ ] Discard กลับ Saved; Cancel อยู่ Create พร้อม Draft; ปิดโดยไม่ Save ไม่ยืนยัน Draft
- [ ] เปลี่ยนสีขณะมี dirty Draft ไม่เขียน layout; wallet Discard ไม่ย้อน preference สี
- [ ] Theme API ไม่ remount Canvas ไม่เปลี่ยน orientation/geometry/card image
- [ ] Future preference: no-file ใช้ Mint โดยไม่เขียน, corrupt/unknown schema ไม่เขียนทับ, failed write ไม่แสดง success
- [ ] Offline boot ใช้สีเดิมได้ ไม่ต้องบัญชีหรือ network
- [ ] ทุก palette ทำ scan surface ขาวทึบ/ดำและ quiet zone ไม่มี effects; ต้องสแกนจริงเมื่อมี renderer

รายการนี้เป็น gate ของงาน implementation ในอนาคต ชุดทดสอบ Node/Browser และเอกสารไม่ได้ทำให้รายการบนโทรศัพท์ผ่านแล้ว

## การอนุมัติ

1. ผู้ใช้ตรวจ 6 สี ปุ่มขยาย recipes และสัญญา tokens/API
2. ปรับเอกสาร candidate ตาม feedback โดยไม่แตะ DS/Preview เก่า
3. อนุมัติ implementation scope และ dependencies (ถ้าจำเป็น) แยก
4. ทำ visual adapter ทีละ component พร้อม regression/rollback ไม่ migrate wallet data
5. พิจารณาแก้ AGENTS.md หลังมีอนุมัติเท่านั้น
