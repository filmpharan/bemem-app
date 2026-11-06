# bemem — Design direction review

Lead Product / Visual Design workflow: **ui-ux-pro-max** + การสังเคราะห์ตามโจทย์ bemem ล่าสุด

สถานะ: การสำรวจ 3 แนวทาง ไม่ใช่ CI หรือ Design System ที่อนุมัติแล้ว ผลเลือกที่แนะนำเป็นความเห็นเชิงออกแบบ ไม่ใช่ผล usability study หรือ benchmark จากผู้ใช้จริง

## 1. Brief ใหม่และข้อจำกัดที่คงอยู่

งานนี้เป็น Full Visual Redesign: เปลี่ยน Header, wordmark, palette, type, grid, card artwork, control geometry และวัสดุได้ โดยไม่ใช้ข้อห้าม Header lock หรือ palette เดิมใน Design System v1.0 เป็นกฎของ Preview

คงเฉพาะความสัมพันธ์ของ control zones และหน้าที่การใช้งาน:

| Zone | ข้อกำหนดที่ทุกธีมรักษา |
| --- | --- |
| ขวาของ Header | Search ก่อน Create; Create อยู่ขวาบน |
| Create ล่างซ้าย | FAB + สำหรับเพิ่มบัตร |
| Create ล่างขวา | Save อยู่ใน Action Rail เดิม |
| Home ว่าง | FAB + อยู่ล่างขวา |
| Home มีบัตร | ไม่มี FAB แม้ค้นหาไม่พบ |

Home เป็นพื้นที่ดู/เปิดบัตร Create เป็นพื้นที่จัดวาง Draft Save/Discard/Cancel และ storage ต้องคงเดิม ทุกธีมใช้บัตรแนวตั้ง/แนวนอนและพิกัดเดียวกันต่อ mode ตาม preview-fixture.json ไม่เรียงบัตรใหม่เพื่อทำให้ธีมใดดูสวยกว่า

## 2. การใช้ Skill จริง

อ่าน SKILL.md, pro-rules และค้นฐานข้อมูลของ `ui-ux-pro-max` ที่ติดตั้งในโปรเจกต์ ก่อนกำหนดแนวทาง:

- `mobile wallet glassmorphism premium --design-system`: ได้แนว Liquid Glass และโทน premium แต่ composition เป็น storytelling/marketing
- ลองจำกัดเป็น `mobile utility membership wallet --design-system` อีกครั้ง: composition ยังเป็น Hero/Features/CTA และ palette แบบ community ที่ไม่ตรงกับเครื่องมือเก็บบัตร
- จึงไม่ใช้ composition/สี/ฟอนต์จาก generator โดยอัตโนมัติ ไม่มีการ persist ลง Design System จริง
- `soft glassmorphism --domain style`: พบ Glassmorphism ใช้ประกอบแนวทาง Lagoon และส่วนควบคุมร่วม
- `liquid glass --domain style`: พบ Liquid Glass ที่เน้น system controls และต้องตรวจ accessibility/performance ใช้แยกวัสดุออกจากเนื้อหาบัตร
- `futuristic dark minimal --domain style`: พบ Minimalism & Swiss Style ไม่ได้ให้ Ion สำเร็จรูป จึงสังเคราะห์ Ion จากโครงสร้างเรียบและความแม่นยำของ optical materials
- `luxury editorial serif --domain typography` และ `rounded friendly geometric --domain typography`: ใช้พิจารณาอารมณ์ serif/rounded แต่เลือก font จริงและ hierarchy ให้เหมาะกับชื่อบัตรและ Native ไม่ยึด triple-serif ของผลค้นโดยตรง
- คำค้น typography แนว technical ไม่ได้ใช้เป็นข้ออ้างว่ามีผลจับคู่ที่ยืนยันสำหรับ Ion การเลือก Space Grotesk เป็นการตัดสินใจเชิงภาพของงานนี้

Skill เป็นแนวทาง ไม่ใช่ agent แยกที่รันอัตโนมัติ และคำแนะนำฐานข้อมูลไม่ใช่ผลทดสอบอุปกรณ์ ข้อมูล stack บางส่วนของ Skill อ้างอิง RN 0.86 แต่โปรเจกต์เป็น 0.88.1/Expo 58 จึงไม่คัดลอก API หรือ dependency จากคำแนะนำเก่า

## 3. Direction 01 — Atelier

**แนวคิด:** quiet luxury ที่ยังเป็นเครื่องมือใช้ทุกวัน ไม่ทำให้การเปิดบัตรกลายเป็นพิธีการ

- CI: พื้น ivory/ceramic, ink อุ่น, antique brass เป็น action accent ไม่ใช้ gold glow เต็มหน้า
- Wordmark: Instrument Serif italic ให้ลายเซ็นที่ต่างจากโลโก้ sans เดิม; หัวเรื่อง serif, ส่วนใช้การจริงเป็น Manrope
- Hierarchy: ควบคุมอยู่ขวาบน หัวเรื่องรองลงมา บัตรเด่นก่อนผิวเครื่องมือ ไม่มีหมวดโปรโมชั่น/แต้ม/บัญชีเพิ่ม
- Cards: สีแบบวัสดุพิมพ์ งานเส้นโค้ง/arch/ลายปั๊ม คงรูปทรงและพิกัดต่างแนวร่วมกัน ไม่ใช้ภาพบัตรสมาชิกจริง
- Create grid: จุดเล็กสม่ำเสมอในโทนอุ่น เส้นประเพียง origin ของบัตรที่ย้าย ไม่ทำ grid สว่างแย่งสายตา
- Material: Champagne-cut glass; reflection กว้างจากซ้ายบน ขอบขาวและเงานุ่มต่ำ ใช้กับ controls; ไม่ใช้ live blur กับบัตร
- Controls: Search กลม, Create/Save capsule และ FAB กลม; Create active ใช้ brass, Home control ใช้ผิวสว่าง
- ความเสี่ยง: serif บางบนจอเล็ก ใช้เฉพาะชื่อแบรนด์/หัวเรื่อง อย่าใช้กับเลขสมาชิกหรือปุ่ม; สีข้อความบนบัตรโทนกลางต้องเข้มพอ

**ข้อดี:** เหนื่อยสายตาน้อยและทำ opaque fallback ได้โดยบุคลิกไม่หาย เหมาะกับ Free ที่ต้องเปิดเร็วและออฟไลน์

**ข้อเสีย:** ไม่โดดเด่นด้วยสีเท่า Lagoon/Ion ต้องรักษาคุณภาพ typography และ spacing จึงจะไม่กลายเป็น UI สีครีมทั่วไป

## 4. Direction 02 — Lagoon

**แนวคิด:** กระเป๋าที่เป็นมิตร แสงผ่านน้ำและวัสดุ gel สื่อความเบาสบาย ไม่ใช้ความสดใสแบบเกม

- CI: seafoam อ่อน + deep teal + สีบัตร moss/sky/clay; มี saturation พอให้จำได้โดยไม่ต้องใช้พื้นหลัง neon
- Typography: Manrope หัวเรื่องและ controls น้ำหนักชัด, Noto Sans Thai สำหรับข้อความไทย ทรงคำสั้นและกระชับกว่า Atelier
- Background: แสงสว่างด้านซ้ายบนและแอ่งสี teal จาง ๆ ด้านขวา ไม่ใช้ animation ของแสงเป็นค่าเริ่มต้น
- Cards: ผิวมี volume คล้ายก้อนแก้ว/pebble แต่ artwork สร้างเป็นภาพนิ่ง; ชื่อบัตรยังเป็นชั้นทึบชัด
- Create grid: จุดมนโทน teal ที่สัมพันธ์กับระยะเดียวกับ fixture ไม่เปลี่ยน snapping ของระบบจริง
- Material: Sea-glass gel; ขอบสว่างสองชั้นและ occlusion ด้านล่าง ขอบ controls ทรง rounded square แยกจาก capsule ของ Atelier
- Controls: teal Save/Create active, Search/ปุ่มเพิ่มแบบสว่าง มี rim light ของผิวน้ำ ไม่ทำปุ่มเด้งจนขยับตำแหน่ง
- ความเสี่ยง: translucent surface อาจกลืนกับบัตรสีอ่อน ต้องเพิ่มพื้น tint หรือใช้ opaque fallback เมื่ออ่านไม่ชัด; การใส่ pebble เพิ่มมากเกินไปจะดูเป็นของเล่น

**ข้อดี:** เป็นมิตรที่สุด เหมาะกับตลาดสมาชิกทั่วไป เห็นชื่อบัตรและ action ชัด มีบุคลิกจากสีและทรง แม้ลด blur

**ข้อเสีย:** ต้องคุมจำนวนเงาและแสงกับ Android ที่กำลังลากบัตร; บัตรทุกใบไม่ควรกลายเป็น live material

## 5. Direction 03 — Ion

**แนวคิด:** precision tool บน graphite glass มี signal lime เพียงสีเดียวที่บอก action สำคัญ ไม่ทำเป็นหน้าจอ sci-fi ที่มีข้อมูลเกินงาน

- CI: graphite/navy, ice rim, lime action; บัตรยังมีสีประจำตัวเพื่อหาเร็ว ไม่ย้อมบัตรทุกใบเป็นสีเดียว
- Typography: Space Grotesk, tracking กระชับ, ตัวเลข/serial เป็นรายละเอียดภาพ ไม่สร้างสถานะระบบหรือฟีเจอร์ใหม่
- Background: แสงเย็นตรงขวาบนและ depth ต่ำ กำหนดให้อยู่ไกลจากตัวอักษร/รหัส ไม่ใช้แสงกระพริบ
- Cards: optical planes, etched linework, มุมค่อนข้างตรงกว่าสองแบบแรก; ไม่เอาลายเส้นไปทับรหัสในอนาคต
- Create grid: เส้นตารางบางบนพื้นเข้ม มีขอบเลือก lime; Home ไม่แสดง grid
- Controls: Search เป็นแผ่น glass เข้ม; active Create, FAB และ Save เป็น signal control มีขอบสะท้อนแคบ ไม่มี bloom หลัง label
- ความเสี่ยง: จอเข้มในแสงแดด และความแตกต่างกับพื้นที่สแกนขาว ต้องทดสอบอุปกรณ์จริง; native refraction อาจให้บุคลิกต่างจาก CSS

**ข้อดี:** เอกลักษณ์แรงที่สุดและเห็น action ทันที เหมาะเมื่ออยากให้ bemem เป็นเครื่องมือที่มีภาพจำชัด

**ข้อเสีย:** ความเสี่ยงการทดสอบและรักษาความสม่ำเสมอข้ามแพลตฟอร์มสูงกว่า และอาจให้ภาพใกล้ tech/fintech มากกว่ากระเป๋าสมาชิกทั่วไป

## 6. Glass / light / tokens ที่เสนอ

ค่าของแต่ละธีมอยู่ใน `experimental-tokens.json` และสร้าง CSS variables แยก `theme-variables.css` ไม่ import เข้าแอปหรือ Design System v1.0

| ค่าเริ่มต้นทดลอง | Atelier | Lagoon | Ion |
| --- | --- | --- | --- |
| canvas | `#eee9e1` | `#dff1ec` | `#10171d` |
| primary text | `#302b25` | `#123f3d` | `#edf5f4` |
| action accent | `#745b36` | `#0b625b` | `#d1f281` |
| local glass fill alpha | .78 | .72 | .86 |
| Browser blur | 16px | 22px | 14px |
| control shape | capsule/circle | rounded square | precise soft rectangle |
| card radius | 15 | 23 | 12 |
| opaque fallback | `#fffaf2` | `#f0fcf7` | `#23333c` |

ทุกธีมมี full-opacity label, top highlight, rim และ soft shadow แต่ไม่ใช้ dynamic lensing/refraction จริงใน Browser นี้ ภาพสวยของ CSS ไม่ได้ยืนยันว่าใช้ค่าพิกเซลเดียวกันกับ RN ได้

States: default, pressed ที่ไม่ย้ายปุ่ม, disabled ที่ลด emphasis และไม่รับการกด, saving ที่แสดง label/busy แต่ไม่ยืนยันสำเร็จเอง ภาพ state บนหน้าธีมเป็นภาพนิ่ง Micro-interactions ใน tokens เป็นข้อเสนอ 70–180ms, Reduce Motion = 0ms และไม่มี delay ก่อนแสดงรหัส

Card title ใช้ 12px ใน Browser Preview ส่วน serial/category ที่เล็กกว่าเป็นงานตกแต่งในตัวอย่าง ไม่ใช่ข้อมูลสำคัญของแอป Native; รอบ implementation ต้องลบหรือขยายรายละเอียดที่ต้องอ่านจริง และทดสอบ font scale 200% โดยไม่เปลี่ยนพิกัดควบคุมหลัก

## 7. Android/iOS และ performance

ข้อเสนอเชิง implementation หลังเลือกธีมเท่านั้น:

- วาง card artwork/gradient เป็นวัสดุภาพนิ่ง และใช้ local blur เฉพาะ controls ไม่เกิน 2 จุดพร้อมกัน
- ขณะ drag ห้าม animate blur/refraction/specular highlight หรือ recapture Canvas ทุกเฟรม ใช้ fallback คงที่ โดยไม่เขียน gesture/storage ใหม่
- iOS ประเมิน `expo-glass-effect` ที่มีอยู่ พร้อม capability checks และการอ่าน Reduce Transparency; ไม่สัญญาว่า material ระบบเท่ากับ CSS ดู [Expo GlassEffect SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/glass-effect/)
- Android ใช้ opaque fallback เป็นฐาน หากต้องการ blur จริงต้องขออนุมัติ provider/dependency ก่อน แล้วตรวจตาม [Expo BlurView SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/) แยกตาม OS/ประสิทธิภาพ ไม่ใช้ CSS backdrop-filter เป็น RN prop
- ต้องมี contrast ปกติ ≥4.5:1, meaningful icons ≥3:1, target iOS ≥44pt / Android ≥48dp และ reduced-motion fallback เป็นเป้าหมาย ไม่ใช่ผล certify แล้ว
- พื้นที่แสดงรหัสทั้งสามธีมเหมือนกัน: white/black, opacity 1, ไม่มีเอฟเฟกต์หรือของตกแต่งทับสัญลักษณ์/quiet zone; การเปลี่ยนพื้นไม่หน่วงการเปิดรหัส
- ไม่เพิ่ม network font หรือ Cloud; การเปิดบัตรและ layout offline เดิมต้องคงอยู่

Native provider, touch/gesture latency และการสแกนจริงยังไม่ทดสอบในรอบ Preview นี้

## 8. ข้อเสนอเลือกธีม

แนะนำ **Atelier** เป็นฐานสำหรับการพัฒนาต่อ หากเป้าหมายหลักยังเป็นความสงบ อ่านง่าย และใช้งานได้ทุกวัน โดยต้องทดสอบ serif hierarchy กับผู้ใช้และจอจริง ไม่ยึดคำแนะนำนี้เป็นการอนุมัติให้ใช้ธีม

เลือก **Lagoon** หากให้น้ำหนักความเป็นมิตรและความสดใหม่มากกว่า minimal premium ส่วน **Ion** เหมาะถ้าต้องการความโดดเด่นที่จำได้ทันที และยอมรับงานทดสอบ contrast/แสงจริงที่มากขึ้น

ไม่แนะนำผสมสาม palette/รูปทรงทั้งหมดเข้าด้วยกันในรอบแรก ให้เลือกทิศทางหลักหนึ่งแบบ แล้วปรับรายละเอียดเฉพาะที่ผู้ใช้เลือก เพื่อให้ bemem มี CI เดียวที่ชัดเจน

## 9. สิ่งที่ไม่ได้เปลี่ยน

ไม่ได้แก้ source แอปจริง, Header จริง, Design System v1.0, AGENTS.md, Skill, Drag & Drop, Saved/Draft, Save/Discard/Cancel, storage schema หรือผังผู้ใช้ ไม่ติดตั้ง dependencies ไม่แก้เว็บไซต์เดิม ไม่ Deploy/Push

ทุกไฟล์ใหม่อยู่ใน `design-previews/bemem-redesign/`; โปรไฟล์ browser สำหรับตรวจภาพแยกอยู่ใน cache `.expo/` ซึ่งไม่ใช่โปรไฟล์จริง ผู้ใช้ต้องเลือกและอนุมัติก่อนมีงานออกแบบระบบจริงหรือ implementation
