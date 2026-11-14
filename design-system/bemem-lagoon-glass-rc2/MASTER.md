> **HISTORICAL / SUPERSEDED - CI Phase5 documentation notice (2026-11-13).**
> This preserved document describes an earlier design/implementation state, not current production instructions.
> Read the [Current-Approved CI Master](BEMEM-CI-CURRENT-APPROVED.md) first; its owner-approved working-tree specification takes precedence.
> Original contents follow unchanged. Historical token files may still have runtime consumers; this notice does not authorize changing them.

# bemem — Lagoon Glass

**2.0.0-rc.2 · Phase 1 implementation · รอตรวจบน Android**

ฉบับนี้เปลี่ยน Default Theme เป็น **Pearl Gray** ตามการอนุมัติของเจ้าของผลิตภัณฑ์ โดยใช้ [v2.0.0-rc.1](../bemem-lagoon-glass/MASTER.md) เป็น Master Visual Language เดิม เอกสารทั้งชุดและ Preview เดิมคงไว้โดยไม่เขียนทับ

อ่าน CI, Materials, Accessibility และ Platform Policy จากฉบับ rc.1 ประกอบ โดยข้อกำหนดใหม่ด้านล่างมีผลเหนือข้อความที่ขัดกัน:

- Default/fallback คือ `pearl-gray` แทน `lagoon-mint` เก็บพาเลตทั้ง 6 ชุดเดิม ไม่มี Peach Glow
- [TOKENS.json](TOKENS.json) คือสัญญาใหม่: Core / Semantic / Palettes / Component / Platform; ไม่มีการเปลี่ยน Canvas schema
- Navigation ตาม baseline `41f07eac91f97aa571a794b6283ff1cd89a95f96`: Home = Search + Create; Create = Back + Create PRO
- ห้ามใช้ข้อความ Create คงที่ทุกโหมดของ rc.1 มาทับ Navigation ที่ผ่านการทดสอบแล้ว
- ใช้ fallback ผิวทึบโทนกระจก + gradient แบบคงที่ + specular บนขอบ + inner rim + soft shadow ไม่เปิด Native Blur ในระยะนี้
- White action text ต้องอยู่บนผิวเข้มทึบทั้ง default, disabled และ saving ลดเงา/แสงเมื่อ disabled โดยไม่ลดความชัดของข้อความ
- บัตรตัวอย่างมี artwork คงที่ตาม Preview ไม่เปลี่ยนตามพาเลต ส่วนบัตรจริงในอนาคตต้องคง artwork ต้นฉบับ
- ไม่สร้าง Theme Picker, preference storage หรือสิทธิ์ PRO

Tokens rc.1 และ rc.2 ไม่เกี่ยวกับ schemaVersion ของข้อมูลบัตร การใช้ธีมไม่เขียนไฟล์ Canvas และไม่เปลี่ยนพิกัด Saved/Draft

## ขอบเขตการนำไปใช้

ใช้ React Native UI และ API ที่มีอยู่แล้วใน Expo SDK 58/RN 0.88.1 ไม่ติดตั้ง dependency เพิ่ม ฟอนต์ Manrope และ Noto Sans Thai จาก Preview ถูกบรรจุใน assets พร้อม OFL ใช้งานออฟไลน์ผ่าน expo-font เดิม หากโหลดฟอนต์ไม่ได้ต้องยังเปิดบัตรได้ด้วย system fallback

Theme adapter ใน `src/constants/lagoon-theme.ts` รองรับพาเลตผ่าน ID ทั้ง 6 ชุด โดยระยะนี้เลือก Pearl Gray แบบคงที่ ยังไม่มี runtime Theme Provider การเปลี่ยนสีในอนาคตต้องทำให้ styles subscribe ต่อ provider ไม่ใช่เขียนค่า preference ลง Canvas

รายละเอียดและรายการตรวจอุปกรณ์จริงอยู่ใน [IMPLEMENTATION.md](IMPLEMENTATION.md)
