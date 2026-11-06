# Lagoon Glass — CI & Visual Principles

Version 2.0.0-rc.1 · รายละเอียดรออนุมัติ · Master language เดียวสำหรับทุกสี

## บุคลิกแบรนด์

bemem เป็นกระเป๋าที่เบาสบายและไว้ใจได้ ไม่ใช่แอปธนาคาร เกม หรือ dashboard การตลาด วัสดุควรให้ความรู้สึกเหมือน gel ใสที่มีความหนา มีแสงคงที่ตกจากซ้ายบน ไม่ใช่สี่เหลี่ยมสี alpha ต่ำที่ข้อความจมหายไปกับพื้นหลัง

หลักภาพ 6 ข้อ:

1. **Soft:** มุมต่อเนื่อง ขอบมีความโค้ง ทรง control นุ่มแต่ไม่บวมจนเปลืองพื้นที่
2. **Calm:** แสงคงที่ ไม่มี shimmer/pulse/แสงวิ่ง ไม่มี glow หลังข้อความ
3. **Tactile:** เห็นผิวบน ขอบบาง ความลึกภายใน และเงาฐาน สื่อว่าสัมผัสได้โดยไม่ต้องทำปุ่มเด้ง
4. **Minimal:** บัตรมาก่อนคำโปรย Header กระชับ ไม่มี tabs/แต้ม/โปรโมชั่น/บัญชีใหม่แฝงในดีไซน์
5. **Readable:** แยก label และ icon เป็นชั้น opacity 1; ไม่ใช้ความโปร่งใสเป็นตัวลดความสำคัญของข้อความทั้งก้อน
6. **Personal:** ผู้ใช้เลือกสี UI ได้โดยไม่ย้อม artwork ของบัตรสมาชิกตามสีแอป

## ชื่อและ wordmark

ชื่อแสดง `bemem.` ใช้ Manrope weight 800, ขนาดอ้างอิง 30, lineHeight 38, tracking -1.2 จุดรับสี action ของ palette ได้ ห้ามใช้จุดเป็นสถานะ sync/ออนไลน์ที่ไม่มีฟังก์ชันจริง รูปลักษณ์นี้สืบต่อ Lagoon ที่เลือก ไม่ใช่ Header เดิมที่เคยล็อก

## Typography

| บทบาท | ค่าเสนอร่วมทุกสี |
| --- | --- |
| Latin | Manrope |
| Thai | Noto Sans Thai |
| Wordmark | 30 / 38, 800 |
| หัวเรื่องหน้า | 22 / 28, 700 |
| Body | 14 / 22, 400 |
| คำอธิบายรอง | 12 / 18, 500 |
| ปุ่ม | 14 / 20, 700 |
| ชื่อบัตรตัวอย่าง | 13 / 18, 700 |

ขนาดเป็นค่าเริ่มต้นและต้องรองรับ font scaling ไม่ใช่เหตุผล cap ข้อความสำคัญทิ้ง ใช้ minHeight สำหรับปุ่มข้อความ; ขยายจาก anchor เดิมเมื่อจำเป็น ชื่อบัตรจริง/เลขสมาชิกต้องไม่ถูกบังคับให้เป็นงานตกแต่งขนาดจิ๋ว

ใน Native ต้องลงทะเบียนฟอนต์ในงานที่อนุมัติแล้วและเลือก family ตามข้อความ/ภาษาที่รองรับ ไม่ส่ง fontFamily เป็น array แบบ CSS และไม่โหลดฟอนต์จาก Google Fonts ตอนเปิดบัตร Preview ใช้ฟอนต์ OFL ที่คัดลอกในโฟลเดอร์ใหม่เพื่อเปิดออฟไลน์ ไม่มีการ register ใน Expo รอบนี้

## Palette ทั้ง 6

| ID / ชื่อ | Canvas | Primary action | Text primary | บุคลิก |
| --- | --- | --- | --- | --- |
| `lagoon-mint` · Lagoon Mint | `#e1f3ed` | `#0b625b` | `#123f3d` | มิ้นต์สงบ สดชื่น; Default |
| `blush-pink` · Blush Pink | `#f8e8ef` | `#843654` | `#4d263b` | ชมพูอ่อน โทน rose ที่คุมความหวาน |
| `warm-beige` · Warm Beige | `#f2ecdf` | `#70502f` | `#473827` | เบจอุ่น เป็นกลาง และอ่านง่าย |
| `lilac-dream` · Lilac Dream | `#eee8f8` | `#604090` | `#35294f` | ลาเวนเดอร์นุ่ม ไม่ใช้ purple glow |
| `sky-blue` · Sky Blue | `#e3f0fa` | `#235c83` | `#203d52` | โปร่ง สะอาด สีฟ้าที่ไม่จางจนไร้ hierarchy |
| `pearl-gray` · Pearl Gray | `#eceff1` | `#405764` | `#263943` | เทาสว่าง ให้ artwork บัตรเป็นตัวเด่น |

สี high/low, secondary text, tint, rim, highlight และ shadow tint อยู่ใน TOKENS แต่ละชุดมี semantic roles เหมือนกันทุกคีย์ ไม่ใช้ palette เป็นที่เก็บ geometry/typography overrides และไม่สร้าง layout ใหม่ตามสี

**Peach Glow ถูกยกเลิก** ไม่เป็น themeId หรือ alias ของธีมใหม่ สี clay/peach บน Weekend Club ในตัวอย่างยังคงอยู่เพราะเป็น artwork ของบัตร ไม่ใช่สี UI และเป็นหลักฐานว่าการเปลี่ยนธีมไม่ย้อมบัตร

## สิ่งที่ร่วมกัน / สิ่งที่เปลี่ยนได้

| ร่วมกันเสมอ | เปลี่ยนได้เฉพาะค่าของสี |
| --- | --- |
| รูปทรง control, card frame, radius | Canvas base/high/low |
| spacing, Safe Area policy และ button zones | Primary/deep/soft, text primary/secondary |
| ฟอนต์และลำดับตัวอักษร | Glass tint, rim, border และ highlight color |
| state model และ material alpha/แสง/เงาขนาดเดียวกัน | Shadow tint และ grid line color |
| motion, touch targets และ accessibility thresholds | Selection outline ภายนอกบัตร |
| ภาพ/สี/อัตราส่วนบัตรจริงและ Saved/Draft positions | ไม่เปลี่ยน artwork หรือ wallet layout |

## แสงและการจัดชั้น

แสงหลักอยู่บนซ้ายเสมอ ไม่เปลี่ยนทิศทางตาม palette, orientation ของบัตร หรือจุดที่นิ้วลาก พื้นหลังใช้ wash แบบนิ่ง มีพื้นที่สว่างและสีต่ำอย่างนุ่ม ไม่สร้างวงแสงเคลื่อนไหวหลังบัตร

Header อยู่ชั้น control, ชื่อหน้าและบัตรอยู่ชั้น content, Action Rail อยู่ชั้นเครื่องมือ การตกแต่งไม่รับสัมผัสและไม่บัง focus รหัสในอนาคตเป็นชั้นที่ไม่มีวัสดุตกแต่งใด ๆ รับเข้ามา

## Card policy

สำหรับบัตรจริงให้คง image/preset/orientation ที่ผู้ใช้เลือก ห้าม hue-rotate, tint, multiply, theme gradient overlay หรือเปลี่ยนรูปทรงตาม palette การเลือกบัตรใน Create ใช้ outline/handle ที่อยู่นอก artwork ได้โดยไม่แก้ข้อมูลบัตร

ตัวอย่าง 4 ใบใน Preview ใช้สีและ gel artwork ของ Lagoon เดิมเหมือนกันทุกสี เงาบัตรเป็นค่า neutral คงที่ ไม่เปลี่ยน shadow tint ของบัตรตามธีม ข้อเสนอ shadow tint ใน palette ใช้กับ app controls เท่านั้น

## วิธีใช้ Skill

ใช้ ui-ux-pro-max ที่ติดตั้งในโปรเจกต์ และอ่าน reference/pro-rules รวมกับ Design System เดิม ผล `soft glass mobile utility --design-system` ยังเสนอ Hero/Features/CTA และสีที่ไม่ตรงกับเครื่องมือสมาชิก จึงไม่นำ layout/palette นั้นมาแทน Lagoon ที่เจ้าของเลือก

ผลค้น `glassmorphism frosted controls` พบ Glassmorphism; `gel soft glass` และ `reduced transparency glass` พบ Liquid Glass ใช้เป็นหลักการจัดชั้นและลด effect ไม่ใช่คำสั่งเปิด material ทุกที่ คำค้น reduced transparency ใน UX คืน Reduced Motion ซึ่งไม่ตรงประเด็น จึงใช้เอกสาร AccessibilityInfo ยืนยันสอง preference แยกกัน ไม่อ้างว่า Skill ให้ API Native ที่ตรงทั้งหมด

ผล stack ยังอ้าง RN 0.86 จึงตรวจ API กับ Expo SDK 58/RN 0.88 ประกอบตาม MATERIALS ไม่ติดตั้งแพ็กเกจหรือเปลี่ยน Skill ตามผลค้น
