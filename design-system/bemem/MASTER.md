# bemem Design System v1.0

เวอร์ชันเอกสารและ tokens: **1.0.0** · วันที่ 6 พฤศจิกายน 2026 · React Native 0.88.1 / Expo SDK 58

สถานะ: **รอตรวจและอนุมัติการออกแบบ — ยังไม่นำไปใช้ในแอป**

เอกสารนี้กำหนด CI ในความหมายของอัตลักษณ์ภาพและการใช้งาน ไม่เกี่ยวกับ CI/CD หรือการ Deploy การอนุมัติให้เขียนเอกสารไม่ใช่การอนุมัติให้เปลี่ยน UI, dependencies, AGENTS.md หรือข้อมูลที่เก็บไว้

## 1. เอกสารหลักและขอบเขต

| ไฟล์ | หน้าที่ |
| --- | --- |
| [MASTER.md](MASTER.md) | อัตลักษณ์ หลักตัดสินใจ ข้อห้าม และแนวทางเปลี่ยนเวอร์ชัน |
| [TOKENS.json](TOKENS.json) | ค่าตัวเลข สี และข้อมูลสำหรับทำตัวแปลงไปใช้กับ React Native ในอนาคต |
| [COMPONENTS.md](COMPONENTS.md) | ข้อกำหนด Header, FAB, Add Card, Save และพื้นที่แสดงรหัส |
| [VALIDATION.md](VALIDATION.md) | เกณฑ์ตรวจ ผลตรวจเอกสาร และสิ่งที่ยังต้องทดสอบบนอุปกรณ์ |

ให้ยึดข้อกำหนดผู้ใช้และ Product Specification v0.1 ก่อนเสมอ ตามด้วยข้อห้ามใน MASTER/COMPONENTS และค่าจาก TOKENS หากพบข้อขัดแย้งให้หยุดส่วนที่เกี่ยวข้องเพื่อขอทบทวน ห้ามเลือกค่าที่ทำให้ Header หรือระบบบันทึกเปลี่ยนโดยอัตโนมัติ

ทุก UI ใหม่หลังการอนุมัติต้องระบุ component variant และ token ที่ใช้ ไม่เพิ่มสี ฟอนต์ ความโค้ง หรือเงารายหน้าจอเอง หากขาด token ให้เสนอเพิ่มในเวอร์ชันถัดไป ข้อกำหนดนี้ยังไม่ได้ถูกใส่ใน AGENTS.md ตามคำสั่งผู้ใช้

## 2. bemem คืออะไร

**เปิดแอป → แตะบัตร → แสดงรหัส → ให้พนักงานสแกน**

ความเร็ว ความเรียบง่าย ความเป็นส่วนตัว และอิสระในการจัดกระเป๋าเป็นตัวตัดสินใจด้านภาพ การตกแต่งต้องไม่แย่งความสำคัญจากบัตร ชื่อบัตร และรหัส ไม่ใช้สีหรือภาพที่สื่อว่าเป็นแอปจ่ายเงิน ธนาคาร โซเชียล หรือเกม

แนวทางคือ **Minimalism + Selective Glassmorphism**:

- พื้นหลักเรียบ โทน slate อ่อน ตัวอักษร ink เข้ม และพื้นที่ว่างที่คุ้นเคยจาก bemem
- ความโค้งมน น้ำหนักโลโก้ และบัตรสี/ภาพเดิมยังเป็นเอกลักษณ์หลัก
- ใช้กระจกเฉพาะเครื่องมือที่ลอยเหนือเนื้อหา เช่น FAB, Add Card และ Save
- ไม่เพิ่มพื้นหลังสีจัดเพื่อให้เห็นกระจกชัดขึ้น และไม่ใส่ blur ให้บัตรทุกใบ
- กระจกเข้มเป็นชนิดผิวของปุ่ม ไม่ใช่การเปิดใช้ dark mode ทั้งแอป

## 3. ต้นฉบับและสิ่งที่รักษา

อ้างอิงเว็บไซต์เดิมแบบ Read-only: [styles.css](../../../pixel-perfect-replay-4296-main/src/styles.css), [หน้าหลัก](../../../pixel-perfect-replay-4296-main/src/routes/index.tsx), [ฟอนต์เว็บไซต์](../../../pixel-perfect-replay-4296-main/src/routes/__root.tsx) และ [หน้าบัตร](../../../pixel-perfect-replay-4296-main/src/components/CardDisplay.tsx) ไม่ได้ตรวจเทียบภาพเว็บที่เผยแพร่จริงในรอบนี้

| เรื่อง | ต้นฉบับ/สถานะปัจจุบัน | ข้อกำหนด v1.0 |
| --- | --- | --- |
| โลโก้ | bemem. ตัวหนา จุดสี muted | คงข้อความ ตัวพิมพ์ น้ำหนัก สัดส่วน และตำแหน่ง |
| Header | bemem. / Search / Create | ล็อกหน้าตาทั้ง Home/Create ไม่เปลี่ยน Create เป็น Add Card และไม่ทำ Header เป็นกระจก |
| สี | เว็บใช้ OKLCH; แอปมี hex baseline แล้ว | ใช้ hex ปัจจุบันเป็น baseline; ยังไม่อ้างว่าเทียบภาพได้ตรงทุกพิกเซล |
| ฟอนต์เว็บ | Plus Jakarta Sans + IBM Plex Sans Thai | รักษาคู่นี้เป็นเป้าหมาย ไม่เปลี่ยนแบรนด์ไปใช้ฟอนต์ที่ Skill สุ่มเสนอ |
| ฟอนต์แอป | ปัจจุบันเป็นฟอนต์ระบบ | ยังไม่บันเดิล/เปลี่ยนฟอนต์; Header ไม่รับการเปลี่ยนฟอนต์จาก global style |
| บัตร | มุมโค้ง 12, ภาพหรือสีไล่ระดับ, ชื่อหนา | ไม่ทำหน้าบัตรเป็น glass ไม่เปลี่ยนรูปทรงหรือพิกัดเพราะธีม |
| ปุ่ม | รูปทรงมน สีเข้ม เงาบาง | คง geometry ของ FAB/Save; เสนอเปลี่ยนเฉพาะผิวและสถานะในอนาคต |

สีที่มีอยู่ใน [bemem-theme.ts](../../src/constants/bemem-theme.ts) และ `existing.theme.values` ต้องเท่ากัน:

| บทบาทเดิม | ค่า |
| --- | --- |
| background | `#f1f5f9` |
| foreground | `#0f172a` |
| primary | `#14161f` |
| white | `#ffffff` |
| muted | `#64748b` |
| border | `#e2e8f0` |
| grid | `#cbd5e1` |
| error | `#b42318` |
| radius | `12` หน่วย RN |

ไม่แก้ไฟล์ theme เดิม ไม่เปลี่ยนชื่อหรือความหมายของ token ที่มีอยู่

## 4. การใช้ Skill และการคัดกรองคำแนะนำ

ใช้ [ui-ux-pro-max ที่ติดตั้งในโปรเจกต์](../../.agents/skills/ui-ux-pro-max/SKILL.md) ตาม [skills-lock.json](../../skills-lock.json) จาก commit `b7d5353e0130feb8c5574ef1251f8a1db1873ccb` รุ่น metadata 2.15.0

รัน `--design-system` โดยไม่ใช้ `--persist`/`--force` ด้วยคำค้น `membership wallet minimalism` แล้วลองจำกัดเป็น `offline loyalty card organizer` อีกครั้ง ผลยังเป็นหน้า Hero/Features/CTA พร้อม palette และฟอนต์ที่ไม่ตรง bemem จึง **ไม่ใช้ layout สี หรือฟอนต์จากผลสร้างอัตโนมัติ** และไม่บันทึกผลนั้นเป็นคู่มือ

ใช้ผลค้นเฉพาะเรื่องที่ตรวจว่าตรง: `glassmorphism buttons --domain style`, `reduced motion --domain ux` และ `accessibility performance --stack react-native` รวมกับ references ของ Skill คำแนะนำ CSS/hover/GSAP ถูกแปลงเป็นหลักการ native เท่านั้น ไม่เพิ่ม Tailwind, DOM, GSAP หรือ WebView

ข้อมูล stack ที่คืนมาระบุ React Native 0.86.x จึงไม่ใช้แทนเอกสาร API ของแอป 0.88.1 ค่า glass จากฐานข้อมูลที่โปร่งมากและข้อสรุปต้นทุนต่ำไม่ใช่หลักฐานด้าน contrast/ประสิทธิภาพบนโทรศัพท์ bemem ต้องผ่านการตรวจของเราเอง

## 5. วิธีอ่าน TOKENS.json

| Namespace | ความหมาย |
| --- | --- |
| `metadata` | สถานะ เวอร์ชัน หน่วย และนโยบาย; ไม่ใช่ style |
| `existing` | ค่าที่อ่านได้จริงจากแอป พร้อม source; ไม่ได้แปลว่าผ่าน accessibility ทุกข้อ |
| `webReference` | ฟอนต์และคุณลักษณะเว็บไซต์เดิม; ไม่ใช่ฟอนต์ที่ติดตั้งแล้วในแอป |
| `proposed` | ค่าที่เสนอสำหรับการนำไปใช้รอบถัดไป ทั้งหมดยังไม่ทำงานใน runtime |

JSON นี้เป็นสัญญา tokens ของ bemem ไม่อ้างว่าเป็น DTCG schema และยังไม่มี runtime loader ห้าม import ทั้งไฟล์แล้ว spread ใส่ StyleSheet โดยตรง

ตัวแปลงในอนาคตต้องแยก `backgroundColor/borderColor/borderWidth` ไปยัง View, `color` ไปยัง Text/Icon, geometry ไปยัง wrapper และแปลงชื่อ path เช่น `proposed.shadow.rest` เป็นค่าจริง ไม่ส่ง `status`, `interactive`, `shadow`, `blur`, `variant` หรือ metadata เป็น native props

ขนาดใช้ตัวเลข RN แบบ logical units ไม่ใช้ CSS px/rem ฟอนต์ใช้ตัวเลขและรองรับ text scaling; `fontWeight` เป็น string ที่ RN รองรับ ค่า familyTargets เป็นชื่อฟอนต์อ้างอิง ต้องกำหนด asset และชื่อที่ลงทะเบียนภายหลัง ไม่โหลดฟอนต์จากอินเทอร์เน็ตขณะเปิดบัตร

## 6. ข้อเสนอผิวกระจก

ทั้งสอง variant ใช้ tint overlay ที่กำหนดไว้ทับ material และวางข้อความ/ไอคอนอีกชั้นที่ opacity 1 ไม่ใช้ overall opacity ลดทั้งปุ่ม

| รายการ | Clear / กระจกฝ้าโทนสว่าง | Dark / กระจกเข้มโทน ink |
| --- | --- | --- |
| tint ปกติ | `rgba(255,255,255,0.90)` | `rgba(20,22,31,0.88)` |
| ความโปร่งใส | 10% (fill alpha 90%) | 12% (fill alpha 88%) |
| ข้อความ/ไอคอน | `#0f172a` | `#f8fafc` |
| ขอบ | ink alpha 56%, หนา 1 | white alpha 40%, หนา 1 |
| pressed | fill alpha 96%, เงาตื้นลง | fill alpha 96%, เงาตื้นลง |
| disabled | fill alpha 96%, ข้อความ `#475569`, ไม่มีเงา/blur | fill alpha 96%, ข้อความ `#94a3b8`, ไม่มีเงา/blur |
| saving | อ่านง่ายเท่า default, มีสถานะ busy, กดซ้ำไม่ได้ | อ่านง่ายเท่า default, มีสถานะ busy, กดซ้ำไม่ได้ |
| fallback | พื้นทึบขาว + ขอบ slate | พื้นทึบ `#14161f` + ขอบ slate อ่อน |

ชื่อ Clear หมายถึงกระจกฝ้าสว่าง ไม่ใช่ผิวที่ใสจนมองทะลุง่าย และไม่ใช่คำสั่งเลือก native glass style `clear` การใช้ fill alpha สูงเป็นข้อเสนอของ bemem เพื่อให้อ่านได้บนบัตรหลายสี ไม่ใช่การเปลี่ยนสีแบรนด์

เงา rest เสนอ offset `(0,4)`, blur radius `12`, สี ink alpha 16%; pressed ใช้ `(0,2)`, blur `8`, alpha 12% มีเพียงหนึ่งเงาต่อปุ่ม ถ้าใช้เงาระบบของ native glass ไม่ซ้อนเงากำหนดเอง

## 7. Android/iOS และ fallback

ก่อนอนุมัติ provider ให้ใช้ข้อกำหนด **opaque fallback** เป็นทางที่นำไปพิจารณาต่อได้ด้วย dependencies ปัจจุบัน ยังไม่มี glass ถูกเปิดใช้จากเอกสารนี้

| สภาพแวดล้อม | ทางเลือกสำหรับ implementation ในอนาคต |
| --- | --- |
| iOS 26+ และ capability checks ผ่าน | ประเมิน `expo-glass-effect` ที่มีอยู่แล้ว ใช้ regular material; ต้องพิสูจน์ว่าสอดคล้องกับ tint/contrast/geometry ที่กำหนด มิฉะนั้น fallback |
| iOS ที่ไม่รองรับ native glass | opaque fallback; BlurView เป็นทางเลือกได้ต่อเมื่ออนุมัติ dependency แยก |
| Android API 31+ | opaque fallback เป็นค่าเริ่มต้น; หากอนุมัติ expo-blur จึงทดลอง local BlurView กับ BlurTargetView |
| Android API 30 หรือต่ำกว่า | เลือก fallback ไม่บังคับใช้วิธี blur ที่แพง |
| Reduce Transparency / contrast หรือ frame budget ไม่ผ่าน | พื้นทึบ ไม่มี blur; ขนาด ข้อความ และ action คงเดิม |
| ระหว่างลากบัตร | fallback ที่คงที่ตลอด gesture ไม่จับภาพ/ปรับ blur ทุกเฟรม |

`GlassView` รองรับ iOS 26+ และต้องตรวจความพร้อม runtime/compiled app; material นี้ไม่มีค่า intensity แบบตัวเลขเดียวกับ BlurView ดู [Expo GlassEffect SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/glass-effect/)

หากอนุมัติ expo-blur ภายหลัง ค่าทดลองเริ่มต้นคือ iOS intensity 24, Android intensity 16/reductionFactor 4; ไม่ใช่ blur 24/16 พิกเซล Android ต้องกำหนด target และใช้วิธี `dimezisBlurViewSdk31Plus` เพื่อ fallback บน API เก่า ส่วน tint ของ provider มีชั้นสีอยู่แล้ว จึงต้องตรวจผลรวมกับ overlay ของ bemem [เอกสาร BlurView SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/) ไม่ถือว่าค่าคนละแพลตฟอร์มให้ภาพเท่ากัน

`expo-blur` ยังไม่ใช่ direct dependency ของแอป ห้ามติดตั้งในรอบเอกสารนี้ ห้ามแสดงพื้นโปร่งเป็นผล blur จริงถ้า provider ไม่ทำงาน ให้เรียกว่า fallback ตามจริง

## 8. Accessibility และความเร็ว

ข้อเสนอใหม่ใช้ `textSecondary=#475569` แทนการนำ muted เดิมไปใช้กับข้อความขนาดเล็กทุกจุด เพราะ `#64748b` บน `#f1f5f9` ได้ประมาณ 4.344:1 ค่านี้ยังคงอยู่ใน existing และ Header ตามเดิม ไม่แก้ให้เอง

กำหนดเป้าหมายข้อความปกติอย่างน้อย 4.5:1 และ icon/control ที่สื่อความหมายอย่างน้อย 3:1 โดยตรวจภาพหลัง compositing ไม่ตรวจเพียง hex ของ tint เป้าหมายอ้างอิง [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) ไม่ใช่คำรับรองว่าแอปผ่าน WCAG ทั้งชุด

พื้นที่แตะเป้าหมาย iOS 44×44 pt และ Android 48×48 dp; geometry ที่มองเห็นของ Header ยังล็อกอยู่ ต้องตรวจพื้นที่แตะที่ไม่ซ้อนกันแยกต่างหาก [Android touch targets](https://developer.android.com/guide/topics/ui/accessibility/apps#touch-targets) Header Search 44 และ Create minHeight 36 เป็นประเด็นตรวจ ไม่ใช่เหตุผลเปลี่ยนดีไซน์เงียบ ๆ

การลดแอนิเมชันใช้ native accessibility preferences ไม่ใช้ CSS media query; Reduce Motion และ Reduce Transparency เป็นคนละเงื่อนไข [React Native AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) ถ้าปิด motion ให้ feedback สถานะทันทีโดยไม่เพิ่มเวลารอเปิดบัตร

ไม่ animate blur, shadow, ขนาดปุ่ม หรือ geometry ระหว่างลาก ใช้เอฟเฟกต์เฉพาะจุดพร้อมกันไม่เกิน 2 จุด เป้าหมาย feedback ≤100ms และ warm card open p95 ≤150ms เป็นเป้าทดสอบที่เสนอ ยังไม่มีผล benchmark บนอุปกรณ์ รายละเอียดอยู่ใน VALIDATION

## 9. ขอบเขตที่ห้าม Design System เปลี่ยน

- Home ไม่มี grid/drag/edit; การเข้า Create และออกต้องทำงานเหมือนเดิม
- Saved กับ Draft แยกกัน; Save ยืนยันผลจริงเท่านั้น; Discard/Cancel และข้อผิดพลาดยังรักษาผังตามสเปก
- ไม่เปลี่ยนคอลัมน์ พิกัด การชนกัน ตัวรับ gesture หรือ schemaVersion ของไฟล์ Canvas
- ไม่เปลี่ยนตำแหน่ง FAB: Home ว่างขวา, Home มีบัตรซ่อน, Create ซ้าย
- ไม่เปิดระบบ Add Card จริงใน Phase 1 เพราะมี specification ของปุ่ม
- ไม่เพิ่มบัญชี Cloud, analytics, network fonts หรือการส่งข้อมูลบัตร
- พื้นรหัสและ quiet zone ต้องเป็นขาวทึบ รหัสดำ ไม่รับธีมกระจกหรือของตกแต่งใด ๆ

## 10. เตรียมทางสำหรับ Create PRO โดยไม่ออกแบบ PRO

สงวนแนวทาง namespace `future.pro` เท่านั้น ยังไม่มี token สี สติกเกอร์ กรอบ หรือหน้าจอ PRO ที่เลือกแล้ว หากพัฒนาในอนาคตให้ตกแต่งได้เฉพาะบริเวณที่กำหนดและแยกเลเยอร์จากบัตร/รหัส ไม่เปลี่ยน Header, touch targets, logic Canvas/Save, ความเป็นส่วนตัว หรือความสามารถเปิดบัตรออฟไลน์ ทุกส่วนขยายต้องผ่าน review เช่นเดียวกับ Free

## 11. การอนุมัติและเวอร์ชันถัดไป

1. ตรวจเอกสาร 4 ไฟล์นี้และอนุมัติค่าที่เสนอ; การแก้เอกสารเดิมในรอบถัดไปต้องได้รับอนุญาตตามข้อกำหนดผู้ใช้
2. อนุมัติขอบเขตนำไปใช้กับ UI เป็นงานแยก เลือก component ทีละตัว และตัดสิน provider/dependency ก่อนลงมือ
3. ทำตัวแปลง tokens โดยไม่แก้ `bemem-theme.ts` อัตโนมัติ และไม่ผูก DS version เข้ากับ Canvas schema
4. เปรียบเทียบก่อน/หลังและทดสอบ regression; ย้อนกลับได้ด้วย visual adapter โดยไม่ migrate ข้อมูลบัตร
5. หลังผู้ใช้อนุมัติจึงพิจารณาเพิ่มกฎใน AGENTS.md; ไม่แก้ Skill ต้นฉบับให้กลายเป็นกฎแบรนด์เฉพาะ bemem

ใช้ SemVer: patch สำหรับคำอธิบาย/แก้ข้อผิดพลาดที่ไม่เปลี่ยนภาพ, minor สำหรับ token เพิ่มแบบเข้ากันได้, major สำหรับเปลี่ยนสัญญาหรือภาพที่มีผลกว้าง เก็บ token เก่าระหว่าง deprecation อย่างน้อยหนึ่ง minor ที่นำไปใช้จริง และบันทึก mapping ในเอกสารเดิมเมื่อได้รับอนุญาตแล้ว หน้าเฉพาะหรือ PRO ไม่มีสิทธิ์ override ข้อห้าม Header/รหัส/การบันทึก แม้จะมีเอกสาร override ในอนาคต

ประวัติ: 1.0.0 — เอกสารเสนอครั้งแรก; ยังไม่อนุมัติค่าดีไซน์เพื่อใช้ใน runtime
