# Lagoon Glass — Component Guidelines

Version 2.0.0-rc.1 · specification only · ดูค่าจริงใน [TOKENS.json](TOKENS.json)

## Geometry ร่วมทุกสี

| Component | Visual / minimum geometry | Material role | ตำแหน่ง |
| --- | --- | --- | --- |
| Search | 48×48, radius 18, icon 20 | utility | Header ด้านขวา ก่อน Create |
| Create | minHeight 48, padding H15, radius 18 | utility → action เมื่อ active | ขวาบน |
| FAB + | 56×56, radius 22, icon 24 | gel | Create ซ้ายล่าง / Home ว่างขวาล่าง |
| Save | minHeight 56, minWidth 128, padding H20, radius 20 | action | Action Rail ล่างขวา |
| Add Card แบบข้อความ | minHeight 48, padding H18, radius 20 | gel | ข้อกำหนดสำหรับฟังก์ชันในอนาคต ยังไม่เพิ่มเข้าหน้าจอจริง |

rail inset เสนอ 20 แนวนอนและ 24 จาก Safe Area ด้านล่าง ไม่ใช่จากขอบจอ physical ช่องว่าง controls อย่างน้อย 8 และ rail gap อย่างน้อย 16 ขนาด label คงจาก Core ทั้ง 6 สี

ใน Browser มีกรอบ/แถบระบบจำลองและระยะ bottom 31 เพื่อรวม simulated inset 7 ไม่ใช่การเปลี่ยน core bottomInset เป็น 31 ใน Native ต้องใช้ insets จริง ห้ามคัดตัวเลข framing ของ PNG ไปแทน Safe Area

## State model

ลำดับ resolution: **Busy → Disabled → Pressed → Active → Default** โดย Pressed เป็นการปรับผิวของ role ปัจจุบัน หาก Create active อยู่แล้วกด ให้กดบนผิว action ไม่กระโดดกลับ utility ห้ามเปลี่ยน label `Create` ตามโหมด

| State | ภาพลักษณ์ | พฤติกรรมที่คาดหวัง |
| --- | --- | --- |
| Default | แสงบนซ้าย rim สองชั้น เงาฐาน และสีของ role | รับการกดตามฟังก์ชันเดิม |
| Pressed | เติมผิวหนาแน่นขึ้น ลดแสงและความสูงเงา; ไม่ scale | feedback ทันที ไม่เปลี่ยน hit box/padding/ตำแหน่ง |
| Active / Selected | เปลี่ยน role หรือ border และ semantics ให้ทราบสถานะ | ใช้เฉพาะ Search และ Create; ไม่ทำ FAB/Save เป็น toggles |
| Disabled | inactive light surface, ข้อความสีเข้มอ่านได้ ไม่มี live blur/เงาลอย | disabled จริง ไม่มี action; ระบุเหตุผลเมื่อไม่ชัดเจน |
| Saving / Busy | ยังเป็น role เดิม label/progress ชัดและเต็ม opacity | ปิดการกดซ้ำจนได้ผลจริง ไม่ใช้ timer ยืนยันสำเร็จ |

ขอบและเงาเป็น feedback ไม่ใช่สถานะเพียงอย่างเดียว ให้ใช้ native role, accessibilityState และคำอธิบายประกอบตามบริบท ไม่มี shimmer, pulse หรือ glow animation

## Search

เป็น control ที่เบากว่า action หลัก ผิว utility ใช้ fill alpha .70; selected ใช้ .78 และ rim ชัดขึ้น สื่อ expanded state ได้และใช้ Close icon/accessible label ตามพฤติกรรมค้นหาเดิม ไม่สร้างระบบค้นหาใหม่จาก Theme System

ไม่รองรับ Busy ในสัญญานี้ เพราะเป็น local UI toggle; ไม่สร้าง spinner ปลอมสำหรับค้นหาบัตร ไม่มีการย้าย Search ไปกึ่งกลางหรือเพิ่ม search bar ถาวรโดยอัตโนมัติ

## Create

Home ใช้ utility, Create mode ใช้ action พร้อม selected semantics ชื่อยังเป็น `Create` ทิศทางสีเปลี่ยนตาม palette แต่สถานะใช้ Core ร่วมกัน เมื่อกดในโหมด Create ให้ใช้ exit flow เดิม และยังต้องถาม Save/Discard/Cancel เมื่อ Draft เปลี่ยน

การเลือกสีไม่ทำให้ mode กลับ Home หรือทำให้ dirty เปลี่ยน ไม่รองรับ Busy ของ Create เอง หากถูกล็อกจากการบันทึกให้แสดง disabled ตาม state ของระบบเดิม ไม่เปลี่ยน logic นั้นในงานแต่งภาพ

## FAB +

ใช้วัสดุ gel ที่มี top-left meniscus ใหญ่กว่า utility, ขอบบนชัดและ lower occlusion บาง คงพื้นสว่าง/เข้มพอให้เครื่องหมายบวกอ่านได้ ไม่เปลี่ยนเป็นไอคอนคนละความหมายตาม palette

- Home: ตรวจจำนวนบัตรทั้งหมดเป็นศูนย์จึงแสดงขวาล่าง ไม่ตรวจจากผลค้นหาที่กรองแล้ว
- Create: แสดงซ้ายล่างตามขอบเขตเดิม
- Home ที่มีบัตร: ไม่แสดง FAB
- ไม่เป็น toggle จึงไม่มี selected/active; ไม่มี Busy ปลอมสำหรับการเปิด UI เพิ่มบัตร
- ใน Phase 1 ปุ่มยังต้องบอกตามจริงว่ายังไม่เพิ่มบัตรใช้งานจริง การมี specification ไม่ได้อนุญาตให้สร้างฟังก์ชันเพิ่ม

## Save

ใช้วัสดุ action tint ของ palette, fill alpha .86, foreground ขาว opacity 1 ให้เป็น action ที่มั่นคงกว่าปุ่มสว่างข้างเคียง Save อยู่ล่างขวาและแสดงตาม dirty Draft เดิม ไม่ย้ายไป Header

เมื่อเริ่มบันทึกให้ใช้ label `Saving…` และ busy/disabled semantics กันพื้นที่ progress ไว้โดยไม่ทำให้ข้อความกระโดด ความกว้างขั้นต่ำไม่บังคับตัด label เมื่อ font scale สูง ให้ขยายจาก anchor หรือเสนอ layout ที่ไม่บังบัตรเพื่อ review

Success ต้องมาจาก wallet commit สำเร็จจริงเท่านั้น หากเขียนล้มเหลว ให้ error/Draft/Saved เป็นไปตามระบบเดิม ไม่มีการปิดหน้าเพราะเอฟเฟกต์เล่นจบ ไม่ใช้ Theme API เป็นตัวจัดการ persistence ของบัตร

Save ไม่มี selected state; active ในแถว specimen แสดง Create เพื่อไม่ทำให้เข้าใจว่า Save เป็น toggle

## Add Card แบบข้อความ

เป็น label + plus icon ใช้ gel role, geometry คงที่ทุก palette และอ่านง่ายกว่าตัวหนังสือบนภาพโฆษณา อาจใช้ Busy `Adding…` ได้เฉพาะเมื่อฟังก์ชันจริงในอนาคตกำลังทำงาน ไม่เริ่มฟอร์ม/สิทธิ์กล้อง/สแกนเนอร์ในรอบนี้

## Disabled และ Reduce Motion

ไม่ได้ลด wrapper opacity ทั้งก้อนจน label จมหาย ใช้ inactive material, ไม่มี blur/เงาลอย และแยก semantic `text.disabled` ไว้ซึ่งปัจจุบันเลือกสีเข้มเพื่อรักษาความอ่านได้ การไม่ interactive ต้องเกิดจาก native disabled semantics ไม่ใช่จากสีจางอย่างเดียว

เมื่อ Reduce Motion เปิดอยู่ใช้การเปลี่ยนสถานะทันทีและ busy label คงที่ได้ ไม่ต้องหยุดความจริงของ operation หรือซ่อน error เพื่อหลีกเลี่ยง animation

## Card / Canvas / Scan boundaries

ภาพบัตรจริงและ layout เป็นข้อมูลของ wallet ไม่ใช่ผลของ palette การเลือกใน Create ใช้ outline/handle ภายนอก artwork เท่านั้น ไม่เปลี่ยนขนาด container เพราะแสงหรือ border

Home พื้นเรียบ Create ใช้ dot grid สี semantic ที่ระยะของ grid เดิม ไม่เพิ่ม per-frame material ลง PanResponder หรือลูกบัตร การ switch สีต้องไม่ remount หรือเขียน positions

scan surface ในอนาคตเป็นขาวทึบ/รหัสดำ ไม่ใส่ gel gradient, blur, tint, rim highlight หรือ rounded clip รุก code/quiet zone ปุ่ม Close/Share ต้องอยู่นอกพื้นที่นั้น ไม่มี renderer รหัสถูกสร้างในรอบนี้
