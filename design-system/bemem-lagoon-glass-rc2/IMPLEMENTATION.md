# Pearl Gray — Phase 1 review

สถานะ: implemented for review; ยังไม่ยืนยันภาพ/ประสิทธิภาพบน Android หรือ iOS จริง

## สิ่งที่นำไปใช้

- พื้นหลัง Pearl Gray, Typography aliases, heading แบบกระชับและจำนวนบัตร
- GlassButton ร่วมสำหรับ Search, Back, Create, Create PRO, FAB และ Save
- ผิว fallback ทึบ, top highlight, inner rim, static gel curvature, bottom occlusion และ shadow
- ไม่มี blur, animation ใหม่ หรือ effect ที่อัปเดตตามนิ้วระหว่างลาก
- Save แสดงเฉพาะ dirty ตามระบบเดิม สีเข้มและข้อความ Saving… คงอยู่จนการบันทึกจริงเสร็จ
- พิกัดและขนาดเชิงตรรกะของบัตรใช้ระบบเดิม กริดเปลี่ยนเฉพาะรูปเส้นเป็นจุด

## ความต่างจาก Browser Preview โดยตั้งใจ

- Header ใช้ Back/Create PRO ตาม Navigation ล่าสุด ไม่ใช้ Search/Create ทั้งสองโหมดเหมือนภาพเก่า
- ไม่มี fake status bar, notch, phone frame, selected-card จำลอง หรือคำว่าบันทึกสำเร็จจำลอง
- Home ไม่มี FAB เมื่อมีบัตร; Create ไม่มี Save เมื่อยังไม่ dirty
- Artwork ใหม่ใช้เฉพาะ demo IDs ไม่ปรับข้อมูล fixture หรือ Saved Layout ให้ตรงภาพ
- Native gradient/shadow อาจต่างจาก CSS และไม่มี background blur; ผิวกระจกเป็น opaque fallback ตามนโยบาย rc.1
- ฟอนต์ใน assets เป็น variable TTF ชุดเดียวกับ Preview การแสดง weight และภาษาไทยต้องตรวจจริงบน Android/iOS; หากน้ำหนักต่างจาก Preview ให้แก้ด้วย static font assets ในรอบถัดไปโดยไม่ติดตั้ง package เอง

## ตรวจใน Expo Go

เปิด `npx.cmd expo start --clear` จาก bemem-app แล้วใช้ Expo Go SDK 58 สแกน QR

1. ตรวจ Home: Pearl Gray, ไม่มีกริด, แตะบัตรได้เร็ว, Search ใช้งานได้, ไม่มี FAB เมื่อมีบัตร
2. เข้า Create: มีกริดจุด, Back/Create PRO, FAB ล่างซ้าย; ลากแนวตั้ง/แนวนอนและตรวจ Saved ยังไม่เปลี่ยน
3. เปิด PRO แล้วกลับ: Draft คงเดิม ไม่มีการซื้อหรือเปิดสิทธิ์
4. กด Back/Android Back: Cancel คง Draft; Discard คืน Saved; Save ต้องสำเร็จก่อนกลับ Home
5. ปิด/เปิดแอป: เริ่ม Home และผังล่าสุดอยู่; ใช้ออฟไลน์หลัง bundle พร้อมใช้งาน
6. ตรวจจอเล็ก/แนวนอน, ขยายฟอนต์, TalkBack, ตัวหนังสือบนปุ่ม disabled/saving, เงา/gradient และเฟรมเรตระหว่างลาก

## อ้างอิง API

- [Expo Font SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/font/): useFonts และฟอนต์บรรจุในเครื่อง
- [React Native View Style Props](https://reactnative.dev/docs/view-style-props): backgroundImage และ boxShadow; ตรวจ rendering บนอุปกรณ์จริงเสมอ

พื้นที่ QR/Code 128 ในอนาคตต้องขาวทึบ รหัสดำ ไม่มี glass หรือ artwork ทับ พื้นที่สแกนยังไม่ได้พัฒนาใน Phase 1

## ผลตรวจในรอบ Implementation

- `npx.cmd tsc --noEmit`: ผ่าน
- `node scripts/lint-readonly.cjs ../pixel-perfect-replay-4296-main`: ผ่าน โดยอ่านเครื่องมือ lint ที่ติดตั้งอยู่แล้ว ไม่ติดตั้งหรือเขียนไฟล์ในเว็บไซต์เดิม
- `node scripts/test-canvas.cjs`: ผ่าน 16 รายการ (Node ไม่ใช่ native integration tests)
- `node scripts/test-lagoon.cjs`: ผ่าน 3 รายการ ตรวจ default/palette/reference/contrast ของพื้นทึบ ไม่ใช่การวัด contrast จากภาพ native จริง
- Android JS export ผ่าน รวมฟอนต์ local ทั้งสองไฟล์; การ export ไม่เท่ากับการเปิดทดสอบบน Android
- ตรวจ diff เทียบ baseline แล้ว lib, hooks, fixture, wallet schema, dependencies, app config, rc.1 และ Preview เดิมไม่เปลี่ยน
- ไม่มี Commit, Push หรือ Deploy งานธีมนี้ ต้องรอเจ้าของทดสอบ Android ก่อน
