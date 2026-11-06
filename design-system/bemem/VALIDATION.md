# bemem Design System v1.0 — Validation

เวอร์ชัน 1.0.0 · วันที่ 6 พฤศจิกายน 2026 · **การตรวจเอกสารไม่ใช่การตรวจรับ UI บนอุปกรณ์**

## 1. สถานะและหลักฐาน

| รายการ | สถานะของรอบนี้ |
| --- | --- |
| สร้างเอกสารเฉพาะ 4 ไฟล์ | ผ่าน: เปรียบเทียบ SHA-256 ก่อน/หลังของแอปและเว็บไซต์เดิม โดยแยกเอกสารใหม่ออก |
| JSON parse, version และการแยก existing/proposed | ผ่าน: ไม่มี duplicate keys; state และ shadow/blur references ครบ |
| ค่าจาก bemem-theme.ts และ Header baseline | ผ่านการตรวจเทียบ source แบบ Read-only; ไม่ใช่การรับรองภาพหรือ accessibility |
| Markdown tables และลิงก์ไฟล์ในเอกสาร | ผ่าน: ตารางครบคอลัมน์ และลิงก์ local 16 จุดชี้ไฟล์ที่มีอยู่ |
| TypeScript ของแอปเดิม | `npx.cmd tsc --noEmit` ผ่าน; ไม่ได้ import tokens ใหม่นี้เข้าแอป |
| ESLint ของไฟล์ Phase 1 เดิม | fallback แบบ Read-only ผ่าน 20 ไฟล์ ไม่มี error/warning; ไม่ติดตั้ง dependency เพิ่ม |
| Contrast แบบคำนวณสี sRGB | มีค่าประเมินด้านล่าง; ยังไม่ใช่ภาพ compositing ของ native material |
| UI หลังใช้ tokens | ยังไม่มี implementation |
| Android/iOS, Reduce Motion, Reduce Transparency | ยังไม่ทดสอบ UI ใหม่นี้บนอุปกรณ์ |
| Drag frame time / card-open latency | ยังไม่ได้วัด |
| QR/Code 128 scan | ยังไม่มี renderer ใน Phase 1; ไม่อ้างว่าผ่าน |
| อนุมัติการนำไปใช้ | รอผู้ใช้ตรวจเอกสาร |

รอบนี้ห้ามแก้ source, bemem-theme.ts, AGENTS.md, Skill, dependencies, Canvas/Save/storage หรือเว็บไซต์เดิม การทดสอบทั้งหมดต้องไม่เขียนไฟล์ layout ของแอปหรือใช้ข้อมูลผู้ใช้จริง

## 2. ตรวจโครงสร้าง tokens ก่อน implementation

- JSON อ่านได้โดยไม่มี duplicate keys, NaN หรือ Infinity
- metadata ระบุ schemaVersion 1, designSystemVersion 1.0.0 และ runtimeAdoption `not-applied`
- มี `existing`, `webReference`, `proposed` แยกกัน พร้อม source/status ไม่เอาค่าข้อเสนอไปแสดงว่าใช้ในแอปแล้ว
- `existing.theme.values` ตรงกับ theme จริงครบ 8 สีและ radius 12
- Header ตรงกับ source เดิม รวมข้อความ Create, ขนาด/ระยะ, weight, tracking, สี, pressed/disabled และข้อจำกัด scaling
- Clear/Dark มี default, pressed, disabled, saving ครบ; alpha อยู่ใน 0–1; content opacity 1
- token path ของ blur/shadow ที่อ้างถึง resolve ได้ภายใน JSON และไม่ส่ง metadata เป็น native props
- font family targets ไม่ถูกเข้าใจเป็นไฟล์ฟอนต์ที่ติดตั้งแล้ว; blur intensity ไม่ถูกเข้าใจเป็น px
- มี fallback พื้นทึบ ไม่มี blur ทั้งสอง variant; ไม่มีตัวเลขหรือ setting ที่เปิด PRO/เปลี่ยน Canvas schema

## 3. Contrast ที่คำนวณในรอบเอกสาร

ใช้ sRGB linearization และสูตร `(Lสว่าง + .05) / (Lมืด + .05)` ตาม [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) สำหรับ tint คำนวณ `Cผล = alpha × Cfill + (1-alpha) × Cพื้นหลัง` ก่อนหา luminance ตัวเลขปัดเพื่อรายงาน ไม่ใช้การปัดขึ้นให้ผ่านเกณฑ์

| คู่สี | อัตราส่วนโดยประมาณ | ข้อสรุป |
| --- | --- | --- |
| existing muted `#64748b` / canvas `#f1f5f9` | 4.344:1 | ต่ำกว่าเป้าหมายข้อความปกติ 4.5:1; ไม่แก้ baseline เอง |
| proposed secondary `#475569` / canvas | 6.917:1 | ผ่านการคำนวณสำหรับคู่สีทึบนี้ |
| ink `#0f172a` / white | 17.853:1 | ผ่านการคำนวณสำหรับคู่สีทึบนี้ |

สำหรับ glass ประเมิน foreground opacity 1 บนชั้น RGBA ของ bemem หลังทับพื้นดำและขาวสุดขั้ว แล้วเลือกค่าต่ำกว่า:

| State | Clear | Dark |
| --- | --- | --- |
| default | 14.238:1 | 12.216:1 |
| pressed | 16.346:1 | 15.640:1 |
| disabled | 6.938:1 | 6.382:1 |
| saving | 14.238:1 | 12.216:1 |

ผลนี้ตรวจแบบจำลอง **tint overlay ที่มี opacity ตาม tokens จริงและครอบเต็มพื้นที่หลังข้อความ** ไม่ได้จำลองแสงสะท้อน/การแปรสีของ native material, anti-aliasing หรือการจัดวางจริง ห้ามใช้เป็นหลักฐานว่าการเลือก native `clear` material เพียงอย่างเดียวได้ contrast นี้ หาก provider จัดชั้นต่างจาก contract ต้องตรวจใหม่ทั้งหมด

เป้าหมาย implementation: ข้อความปกติ ≥4.5:1; meaningful icon/control boundary ≥3:1 ในทุก state ที่ทำงาน ตรวจภาพสีเข้ม สีอ่อน ภาพบัตร และแสงสะท้อนจริงด้วย ขอบตกแต่งอย่างเดียวไม่ทำให้ปุ่มที่หาไม่เจอผ่านเกณฑ์ Disabled ใช้ semantics และเหตุผลประกอบ แม้ข้อความของส่วน inactive มีข้อยกเว้นใน WCAG เราตั้งเป้าให้อ่านได้ตามตาราง

หากไม่ผ่านให้ใช้ opaque fallback จาก tokens ก่อน ไม่ทำให้พื้นหลังบัตรหรือ Header เปลี่ยนเพื่อแก้ contrast ของปุ่ม

## 4. Header และอัตลักษณ์

รายการตรวจรอบนำไปใช้ (ยังไม่ทำเครื่องหมายผ่าน):

- [ ] ภาพก่อน/หลังจากอุปกรณ์เดียวกัน ขนาดและ font scale เดียวกัน แสดง Home/Create และเปิดค้นหา
- [ ] โลโก้ bemem. จุด Search และ Create ไม่เคลื่อน ไม่เปลี่ยนฟอนต์ น้ำหนัก สี หรือความโค้ง
- [ ] Create ยังคงชื่อเดิมทั้งสองโหมด; ไม่มี glass หรือธีมใหม่ override Header
- [ ] ไม่มีสี palette หรือฟอนต์อัตโนมัติของ Skill เข้ามาแทนแบรนด์
- [ ] จุดที่เว็บไซต์กับแอปเดิมต่างกันถูกแยกบันทึกจากการเปลี่ยนแปลงครั้งใหม่ ไม่อ้างว่าตรงเว็บไซต์แล้วโดยไม่มีภาพเทียบ

**ประเด็นที่ทราบอยู่แล้ว:** Search visual frame 44 และ Create minHeight 36 ต้องตรวจ Android 48dp/iOS 44pt ด้วยพื้นที่แตะจริง; Header cap font scale 1.25 ยังไม่ผ่านการพิสูจน์ที่ 200%; ข้อความ muted บางส่วนของ UI เดิมอาจต่ำกว่าเกณฑ์ การทำเอกสารไม่ถือว่าแก้ประเด็นเหล่านี้แล้ว ถ้าขยาย target โดยคงภาพและไม่ชนกันไม่ได้ ให้ขอ review เฉพาะเรื่องก่อนเปลี่ยน

## 5. พื้นที่แตะ ภาษา และ assistive technology

- [ ] iOS target ≥44×44 pt; Android ≥48×48 dp; ไม่สับสนกับ CSS px ดู [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps#touch-targets)
- [ ] เป้าหมายช่องว่างระหว่าง targets 8 logical units; expanded hit area ไม่ทับปุ่มอื่นหรือ gesture bar
- [ ] ทดสอบไทย/อังกฤษ ชื่อบัตรยาว ตัวอักษรใหญ่ 100%, 150%, 200% และระดับใหญ่สุดที่ระบบรองรับ; บันทึกข้อจำกัด Header แยกต่างหาก
- [ ] VoiceOver/TalkBack อ่านชื่อและ role ถูกต้อง โดยเฉพาะ FAB ที่มีแต่เครื่องหมายบวก
- [ ] Saving ประกาศ busy/disabled ตามจริง ไม่ประกาศสำเร็จก่อนเขียนไฟล์เสร็จ; error อ่านได้โดยไม่อาศัยสีแดงอย่างเดียว
- [ ] Decorative icon ไม่สร้าง focus ซ้ำกับ label; focus order ตรงกับลำดับภาพ
- [ ] sheet/dialog ไม่บังปุ่มปิดหรือ focus; กลับ/Cancel ใช้งานได้กับ keyboard และ screen reader
- [ ] รักษา accessibility actions ของ Canvas เดิม; หากต้องเพิ่ม visible alternative สำหรับ drag ให้เป็นงานอนุมัติแยก ไม่เปลี่ยน gesture ในงานแต่งภาพ

ข้อกำหนดนี้อิงแนวทาง native ของ [Skill pro-rules](../../.agents/skills/ui-ux-pro-max/references/pro-rules.md) ไม่ได้หมายความว่าแอป native ผ่าน WCAG โดยอัตโนมัติ

## 6. Motion และ transparency

- [ ] ตรวจค่าตั้งแต่เริ่มแอป และอัปเดตตามการเปลี่ยน setting ระหว่างใช้งาน ตาม [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo)
- [ ] Reduce Motion: ไม่ pulse, shimmer, scale, morph หรือเพิ่มแอนิเมชันรอเปิดบัตร; state เปลี่ยนทันทีได้
- [ ] Reduce Transparency บน iOS: ใช้ opaque fallback; ไม่ใช้ Reduce Motion เป็นตัวแทนเงื่อนไขนี้
- [ ] Android/อุปกรณ์ที่อ่าน preference ด้าน transparency ไม่ได้: fallback ใช้ได้เสมอ ไม่อ้างว่ามี API เทียบเท่ากันทุก OS
- [ ] Pressed ไม่มีการเปลี่ยน width/height/padding/ตำแหน่ง ทำให้ Save/ไอคอนไม่สั่น
- [ ] Progress ตอนลด motion ยังบอกได้ว่ากำลังบันทึก แม้ใช้ข้อความนิ่งแทน spinner

## 7. Blur/provider matrix

ทดสอบกับ runtime จริง ไม่ผ่านด้วย simulator หรือภาพ static เพียงอย่างเดียว:

| กรณี | ผลที่ต้องได้ | สถานะ |
| --- | --- | --- |
| ไม่มี provider ที่อนุมัติ | พื้นทึบและไม่มี blur | รอ implementation |
| iOS 26+ capability ผ่าน | ผิว/contrast คงตาม contract ไม่กระทบ Header | รออุปกรณ์ |
| iOS capability ไม่ผ่าน / OS เก่า | fallback ไม่มี crash | รออุปกรณ์ |
| Android API 31+ หากอนุมัติ expo-blur | target ถูกต้อง ขอบ clip ถูก เงาไม่ถูกตัด | ยังไม่อนุมัติ dependency |
| Android API ≤30 | fallback ไม่เลือก blur วิธีแพง | รออุปกรณ์ |
| ภาพบัตรเปลี่ยน/เลื่อนใต้ปุ่ม | ผิวไม่ค้างผิดเนื้อหา ไม่กระพริบ ไม่ recapture ทุกเฟรมขณะ drag | รออุปกรณ์ |
| Modal บังเครื่องมือ | ไม่คง local effects ที่ไม่จำเป็นไว้ด้านหลัง | รอ implementation |

รายละเอียด API/candidate อยู่ใน MASTER ไม่ใช้ CSS `backdrop-filter` หรือ RN `filter: blur` แทนการ blur พื้นหลัง เพราะอาจทำให้เนื้อหาปุ่ม/รหัสเบลอด้วย

## 8. ความเร็วและ regression ของ Canvas

ตัวเลขต่อไปนี้เป็น **เป้าหมายที่เสนอ ยังไม่ได้วัด**:

- Press feedback ไม่เกิน 100ms ไม่มีการตั้ง timeout เพื่อรอ blur
- Warm card open p95 เป้าหมายไม่เกิน 150ms และ regression จาก baseline ไม่เกินหนึ่ง frame ที่ 60Hz ≈16.7ms; ต้องผ่านทั้งสองข้อ หรือเสนอทบทวนเป้าหมายก่อนใช้จริง
- งบ frame ที่ 60Hz ≈16.7ms; ตรวจการใช้ JS/UI thread บนเครื่องจริง ไม่ตีความว่าใช้ได้เท่ากันที่ 120Hz
- effect ที่มองเห็นพร้อมกันไม่เกิน 2 จุด, ไม่ใส่ effect ต่อบัตรหรือเต็ม Canvas

วิธีวัด: บันทึกเครื่อง/OS/build mode/refresh rate/font scale/จำนวนบัตรชุดเดียวกัน เทียบ baseline กับ candidate อย่างน้อย 30 ครั้งสำหรับ warm open และลากต่อเนื่องอย่างน้อย 10 วินาที จำนวน 3 รอบ ไม่รวม cold font/network load เป็น warm result เก็บ median/p95 และอาการสะดุดของแต่ละเครื่อง ไม่เฉลี่ยข้ามรุ่นจนซ่อนเครื่องที่ช้า

ใช้เครื่อง Android ที่มีประสิทธิภาพจำกัด เครื่อง Android API 31+ และ iPhone ที่รองรับ/ไม่รองรับ native glass ตามอุปกรณ์ที่เข้าถึงได้ Expo Go ใช้ตรวจ UX เบื้องต้นได้ แต่ performance sign-off ต้องเทียบ build mode เดียวกันและระบุข้อจำกัดของ development runtime หาก budget ไม่ผ่านให้ปิด blur ก่อน ไม่เขียน Drag & Drop ใหม่เพื่อช่วยเอฟเฟกต์

Regression ที่ต้องยืนยันด้วยข้อมูลสมมติ:

- [ ] Home ไม่มีกริด ไม่มี drag และแตะบัตรทำงานครั้งเดียว
- [ ] Create ใช้กริดและการชน/ขอบ/scroll/orientation เดิม; กรอบปุ่มไม่กินพื้นที่ที่แตะบัตรได้
- [ ] FAB Home แสดงเฉพาะจำนวนบัตรรวมเป็นศูนย์ ไม่ใช่เพราะคำค้นไม่ตรง
- [ ] ลากเปลี่ยนเฉพาะ Draft; ไม่มี file write จาก pressed/drag/theme change
- [ ] Save เขียนผลจริงครั้งเดียว; ปิด–เปิดแล้วเริ่ม Home พร้อมผังที่บันทึกล่าสุด
- [ ] Discard กลับ Saved; Cancel อยู่ Create พร้อม Draft; ปิดโดยไม่ Save ไม่ยืนยัน Draft
- [ ] file read/write failure ยังแจ้ง error และรักษาข้อมูลเดิม ไม่มีแอนิเมชัน success ปลอม
- [ ] ทดสอบจอเล็ก/ใหญ่ portrait/landscape และ Safe Area; ไม่มีปุ่มทับ gesture bar หรือบังบัตรที่เลื่อนไปถึง

ชุดทดสอบเดิม `node scripts/test-canvas.cjs` ใช้ได้ในรอบ implementation แต่ผลบน Node ไม่แทนการปิด–เปิด Android จริง

## 9. รหัสสแกน — gate สำหรับระยะที่มี renderer

- [ ] QR และ Code 128 เป็นข้อมูลสมมติ ไม่มีข้อมูลสมาชิกจริง
- [ ] white/black opacity 1; ไม่มี glass, tint, blur, gradient, เงา หรือสติกเกอร์เหนือ code/quiet zone
- [ ] QR quiet zone ≥4 modules ทุกด้าน; Code 128 ตรวจตาม renderer/symbology ไม่ใช้ค่าของ QR
- [ ] ไม่ rounded-clip รหัส ไม่บีบอัตราส่วน ไม่มี anti-alias/fractional resize ที่ทำให้เส้นผิดรูป
- [ ] ปุ่มปิด/แชร์/สถานะอยู่นอกพื้นที่สแกน ไม่ overlay ทับขอบว่าง
- [ ] เปิดออฟไลน์ได้ทันที ไม่ต้องรอการโหลด font/effect/Cloud
- [ ] สแกนสำเร็จด้วยเครื่องอ่านจริงในหลายความสว่างและระยะ ถือ screenshot ชัดเพียงอย่างเดียวไม่พอ

รายการนี้ยังไม่เริ่มตรวจใน Phase 1 เพราะยังไม่มีรหัสจริง

## 10. เวอร์ชัน การนำไปใช้ และเกณฑ์อนุมัติ

- [ ] ผู้ใช้ตรวจและอนุมัติเอกสาร/ค่าข้อเสนอที่เลือก
- [ ] งาน UI ระบุ scope ของ component ที่จะเปลี่ยน ไม่รวม Header หรือ logic แฝง
- [ ] dependency ใหม่ได้รับอนุมัติแยกถ้าจำเป็น; ไม่ให้ Skill ติดตั้งให้เอง
- [ ] adapter ใหม่รองรับ token version; token เก่ายังใช้ได้ระหว่าง deprecation
- [ ] ไม่มีการเปลี่ยน Canvas schemaVersion, file path, commit semantics หรือ migration ของ layout เพราะเปลี่ยน DS version
- [ ] rollback เฉพาะ visual adapter ได้โดยไม่ลบข้อมูลใน Documents
- [ ] ไม่แก้ AGENTS.md จนผู้ใช้อนุมัติ; ไม่แก้ SKILL.md เพื่อฝังกฎแบรนด์
- [ ] Create PRO ยังเป็น extension boundary ไม่ใช่ฟีเจอร์ที่สร้างแล้ว

หากข้อที่เกี่ยวกับความปลอดภัยของข้อมูล ความอ่านได้ของรหัส หรือ Header lock ไม่ผ่าน ห้ามนำ candidate ไปใช้เป็นดีไซน์หลัก ให้บันทึกเหตุผลและเสนอแก้เอกสาร/variant เพื่อ review ก่อน
