# bemem Phase 1 — การพัฒนาและการตรวจรับ

สถานะ: เขียน Home/Create Canvas แล้ว พร้อมทดลองบน Expo Go SDK 58
ยังไม่ได้ตรวจรับบน Android จริงหรือ iOS เพราะไม่มีอุปกรณ์เชื่อมต่อกับสภาพแวดล้อมพัฒนา

## ขอบเขตที่ทำแล้ว

- Native React Native UI ใช้ Expo Router ไม่ใช้ WebView
- Header เดียวกันทั้งสองโหมด: bemem. / แว่นขยาย / Create
- Home ไม่มีกริดหรือการลาก แตะบัตรเปิดแผ่นข้อมูลตัวอย่างที่แจ้งชัดเจนว่ายังใช้สแกนไม่ได้
- Create มีกริดเครื่องหมาย + ลากแนวตั้ง/แนวนอน ยึดกริด ปฏิเสธตำแหน่งชนกัน และจำกัดขอบ Canvas
- ลากบนบัตรเพื่อจัดวาง เลื่อนจากพื้นที่ว่างเพื่อเข้าถึงส่วนล่าง ยังไม่มีการเลื่อนอัตโนมัติระหว่างลาก
- กด Create ซ้ำหรือโลโก้เพื่อออก; Android Back ออกจาก Create ได้เช่นกัน
- ผังที่แก้เป็น Draft เท่านั้น; Save จึงเขียนไฟล์และกลับ Home
- เมื่อออกขณะมีการเปลี่ยนแปลง: Save / Discard / Cancel
- เปิดแอปใหม่เริ่ม Home และอ่านผังที่บันทึกล่าสุด
- ค้นหาชื่อบัตรผ่านแว่นขยาย; คำค้นไม่เปลี่ยนผังหรือจำนวนบัตรที่ใช้ตัดสิน FAB
- FAB ล่างซ้ายใน Create; Home แสดง FAB ล่างขวาเฉพาะ fixture ที่ไม่มีบัตรทั้งหมดจริง ๆ
- FAB แจ้งว่ายังเพิ่มบัตรไม่ได้ ไม่สร้างข้อมูลหรือแสดงผลสำเร็จจำลอง

## การบันทึกในเครื่อง

ใช้ `File`, `Directory`, `Paths.document` ของ expo-file-system 58.0.13 ตาม SDK 58
ไม่มีการใช้ Cache, browser localStorage, Cloud หรือการอัปโหลดในโค้ด Phase 1

ตำแหน่งเชิงตรรกะ:

```text
Documents/bemem-phase1-canvas/layout-0000000001.json
Documents/bemem-phase1-canvas/layout-0000000002.json
```

ตัวอย่างโครงสร้าง:

```json
{
  "schemaVersion": 1,
  "dataset": "bemem-phase1-demo-v1",
  "revision": 1,
  "savedAt": "2026-11-06T12:00:00.000Z",
  "columns": 12,
  "layout": {
    "demo-coffee": { "col": 0, "row": 0 },
    "demo-everyday": { "col": 7, "row": 0 },
    "demo-travel": { "col": 0, "row": 5 },
    "demo-weekend": { "col": 7, "row": 7 }
  }
}
```

- พิกัดเริ่มที่ 0 เป็นหน่วยกริด ไม่ใช่พิกเซล; บัตรแนวนอน 6×4 และแนวตั้ง 4×6
- คำนวณขนาดหน่วยใหม่จากความกว้าง Canvas; ขยายแนวตั้งและเลื่อนได้ ไม่บีบให้ทุกบัตรอยู่จอเดียว
- Save เท่านั้นที่สร้างไดเรกทอรี/เขียนไฟล์: เขียน `.pending`, อ่านกลับเทียบข้อความ แล้ว move เป็นไฟล์ revision ใหม่โดยไม่ overwrite
- โหลด revision ล่าสุดที่ commit แล้ว; ไม่โหลด `.pending` ที่อาจค้างจากการปิดแอป
- ตรวจ schemaVersion, dataset, revision, วันเวลา, ID บัตร, พิกัด และการชนกันก่อนใช้
- ไฟล์ล่าสุดเสีย/อ่านไม่ได้/เป็น schema ที่ไม่รู้จัก: แจ้ง error, แสดง fixture พร้อมคำเตือน และปิดการบันทึก ไม่ย้อนใช้ไฟล์เก่าเงียบ ๆ หรือเขียนทับ
- การเขียนล้มเหลว: แจ้ง error, คง Draft และ Saved เดิมใน session, ไม่แสดง success
- เก็บ revision เก่าไว้ใน Phase 1 เพื่อไม่ทำลายไฟล์เดิม; ยังไม่มีระบบล้างประวัติหรือย้าย schema
- ไม่มีการเขียนตอนโหลด, ลาก, Cancel, Discard, ค้นหา หรือสลับโหมด

Expo Go เก็บไฟล์ในบริบทของโปรเจกต์ภายในแอป Expo Go ไม่ใช่แอป bemem ที่ติดตั้งแยก
ยังไม่ได้ยืนยันนโยบาย OS Auto Backup ของ standalone Android/iOS; ต้องตรวจและตั้งค่าก่อนเก็บข้อมูลผู้ใช้จริง
Phase 1 มีเฉพาะข้อมูลสมมติ และไม่มีระบบ export ไฟล์ให้ผู้ใช้

## เปิดทดสอบบน Android

ใช้ PowerShell:

```powershell
cd 'C:\ฉันจะทำเว็บไซด์\bemem-app'
npx.cmd expo start --lan
```

หากมี Metro เดิมอยู่ ให้หยุดด้วย Ctrl+C ใน terminal นั้นก่อนเริ่มใหม่หลังเพิ่ม dependency
โทรศัพท์และคอมพิวเตอร์ใช้ Wi-Fi เดียวกัน แล้วเปิดโปรเจกต์จาก QR ใน Expo Go SDK 58 ที่ใช้งานได้อยู่แล้ว
ไม่ต้องติดตั้งแพ็กเกจอื่น ไม่ต้อง Deploy ไม่ต้องเปลี่ยน Vercel

## ขั้นตอนตรวจรับบนโทรศัพท์ — ยังรอผลจริง

1. **Home:** เปิดโปรเจกต์ เห็นบัตรสมมติ 4 ใบ ไม่มีกริด/แท็บ Expo/FAB; ลากบัตรแล้วตำแหน่งต้องไม่เปลี่ยน
2. **เปิดบัตร:** แตะหนึ่งครั้ง ต้องเห็นข้อมูลตัวอย่างพร้อมข้อความว่ายังไม่มี QR/Code 128; Close กลับได้
3. **ค้นหา:** แตะแว่นขยาย ค้น `Coffee` แล้วลองคำที่ไม่ตรงบัตรใด ต้องไม่เกิด FAB เพิ่มบัตรบน Home; ปิดค้นหาแล้วผังเดิมไม่เปลี่ยน
4. **Create:** กด Create เห็นกริด +, Header และข้อความ Create บนปุ่มคงเดิม; FAB อยู่ล่างซ้าย
5. **ลาก:** ย้าย Coffee Club ลงพื้นที่ว่างด้านล่าง ให้ตำแหน่งต่างชัดเจน แล้วลองลากทับบัตรอื่น/ออกด้านข้าง ต้องปฏิเสธการชนและไม่หลุดขอบ
6. **Cancel:** แตะ Create ซ้ำ/โลโก้ หรือ Android Back เลือก Cancel ต้องยังอยู่ Create และรักษาตำแหน่งร่าง
7. **Discard:** ออกอีกครั้ง เลือก Discard ต้องกลับ Home ใช้ผังที่บันทึกก่อนหน้า; เข้า Create ใหม่ต้องไม่เหลือการย้ายที่ทิ้งไป
8. **Save ปุ่มหลัก:** ย้ายบัตรไปพื้นที่ว่าง กด Save ต้องกลับ Home และเห็นตำแหน่งใหม่ กรณี error ต้องยังอยู่ Create และมีข้อความผิดพลาด
9. **ปิด–เปิดจริง:** ปัด Expo Go ออกจาก Recent Apps ให้ process จบ แล้วเปิดโปรเจกต์เดิมอีกครั้ง (Metro ยังเปิดอยู่) ต้องเริ่ม Home พร้อมตำแหน่งจากข้อ 8 ไม่ใช่เพียง Fast Refresh หรือกลับจาก background
10. **Save ใน dialog:** ย้ายอีกครั้ง ออกแล้วเลือก Save ต้องได้ผลเหมือนปุ่ม Save หลัก แล้วปิด–เปิดซ้ำ
11. **ปิดโดยไม่ Save:** ย้ายใน Create แล้วปิด Expo Go โดยไม่กด Save เปิดใหม่ต้องเป็น Home ใช้ผังที่บันทึกสำเร็จครั้งล่าสุด
12. **Responsive:** หมุนจอ/ทดสอบอีกขนาดหน้าจอ บัตรต้องคงความสัมพันธ์และไม่ชนหรือหลุดด้านข้าง บัตรล่างเข้าถึงได้ด้วยการเลื่อน
13. **FAB ของกระเป๋าว่าง:** นักพัฒนาตั้ง `PREVIEW_EMPTY_WALLET = true` ใน `src/data/wallet-preview.ts` แล้ว Reload; Home มี FAB ขวา, Create มี FAB ซ้าย กดแล้วแจ้งว่ายังเพิ่มไม่ได้ ทดสอบเสร็จคืน `false`

Fixture ว่างใช้โฟลเดอร์ `bemem-phase1-empty-canvas` แยกจาก fixture 4 ใบ ไม่ล้างหรือเขียนทับผังเดิม
หากเปิดค้นหาหรือคีย์บอร์ดอยู่ Android Back อาจปิดคีย์บอร์ด/ค้นหาก่อน กดอีกครั้งจึงออกจาก Create
การนำผังไปอีกโทรศัพท์ยังไม่มีฟังก์ชันในแอป; Phase 1 ทดสอบ responsive กับ logical layout เดียวกันผ่านชุดทดสอบเท่านั้น

## ผลตรวจบนคอมพิวเตอร์

- TypeScript: `npx.cmd tsc --noEmit` ผ่าน
- ชุดทดสอบ: `node scripts/test-canvas.cjs` ผ่าน 12 กรณี
- ทดสอบบันทึกลงดิสก์แล้วอ่านจาก Node คนละ process ผ่าน (ไม่ใช่การปิด–เปิด Android)
- Android JavaScript bundle: `npx.cmd expo export --platform android --output-dir .expo/phase1-export --no-bytecode` ผ่าน
- `npm.cmd ls --depth=0` ไม่พบ dependency ขาด; `expo install --check` แบบ offline ผ่านตาม compatibility data ในเครื่อง ยังไม่ได้ตรวจ expo-doctor ผ่านเครือข่าย
- คำสั่ง `expo lint` ของ Starter ต้องติดตั้ง ESLint เพิ่ม จึงยังใช้คำสั่งปกตินี้ไม่ได้โดยไม่เพิ่ม dependencies
- ใช้ `node scripts/lint-readonly.cjs ../pixel-perfect-replay-4296-main` ตรวจไฟล์ TypeScript ที่สร้าง/แก้ใน Phase 1 ด้วย ESLint และ React Hooks rules ที่ติดตั้งอยู่แล้วในเว็บไซต์: ผ่าน 20 ไฟล์ ไม่มี error/warning
- lint fallback อ่านเครื่องมือจากเว็บไซต์เท่านั้น ไม่ใช้ config เว็บ ไม่เปิด cache ไม่เขียนแก้ไฟล์เว็บไซต์ และไม่มี dependency เพิ่มในแอป
- การ lint src ทั้งหมดด้วย recommended rules พบข้อจำกัดเดิมใน Starter ที่ยังไม่ใช้งาน (asset require และ unused props); ไม่ถือว่า full-project Expo lint ผ่าน
- ไม่มีผลทดสอบ Android/iOS จริง, การสแกนจริง หรือ Airplane Mode ในรอบนี้

ทดสอบอ่านจากคนละ process เพิ่มได้โดยรัน `node scripts/test-canvas.cjs --prepare-restart` แล้วนำ path ที่พิมพ์ออกมาใช้กับ `node scripts/test-canvas.cjs --verify-restart '<path>'`

## ความต่างจากเว็บไซต์และขอบเขตที่ยังไม่ทำ

- ยังใช้ฟอนต์ระบบ ไม่ได้บันเดิล Plus Jakarta Sans / IBM Plex Sans Thai จึงยังไม่ตรงตัวอักษรและความกว้างโลโก้ทั้งหมด
- บัตรเป็นชื่อ/สีสมมติ ไม่ใช้รูปหรือเลขสมาชิกของผู้ใช้
- สีจากเว็บแปลงเป็น sRGB; เงาและการเรนเดอร์ gradient เป็นของ React Native ต้องเทียบภาพจริงอีกครั้ง
- มีข้อความบอก Phase 1/สถานะ Draft ในพื้นที่ใต้ Header และมี FAB ตามสเปกแอป
- ปุ่ม Save แบ่งพื้นที่ด้านล่างกับ FAB; บัตรมีช่องไฟ 6 หน่วยเพื่อแยกพื้นที่แตะ
- ไม่ใช้กรอบโทรศัพท์จำลองของเว็บเดสก์ท็อป; ใช้ Safe Area และไม่มี Home/Explore tabs
- ตั้งโหมดสว่างและเปิดการหมุนจอเพื่อทดสอบ responsive; เปลี่ยนพื้นหลังสแปลชเป็นสี bemem แต่ app icon ยังเป็นของ Starter
- การตั้ง native splash/icon บางส่วนแสดงต่างใน Expo Go; ยังไม่มี standalone build ในระยะนี้
- ยังไม่ทำเพิ่ม/แก้ไข/ลบบัตรจริง, โฟลเดอร์, รูปบัตร, QR Code, Code 128, Share, PRO, บัญชี หรือ Cloud
- ยังไม่ได้เทียบภาพกับ www.bemem.app ที่เผยแพร่จริง; ใช้โค้ดเว็บไซต์ในเครื่องแบบ Read-only เป็นหลัก

## ไฟล์ที่เปลี่ยน

แก้ไข:

- `package.json`, `package-lock.json`: ประกาศ expo-file-system โดยตรง
- `app.json`: light theme, orientation, splash background
- `src/app/_layout.tsx`: ใช้ Stack และเอา UI Expo Starter ออกจากการเปิดแอป
- `src/app/index.tsx`: Home/Create และจุดเชื่อมส่วนต่าง ๆ
- `src/app/explore.tsx`: redirect deep link เก่ากลับ Home
- `src/components/app-tabs.web.tsx`: แยก ref ที่ชนกับ type ของ Pressable ใน SDK 58 เพื่อให้ TypeScript ผ่าน (ไม่ได้ใช้แท็บนี้บนหน้าหลัก)

สร้าง:

- `src/components/bemem/`: `BememIcon.tsx`, `HomeHeader.tsx`, `SearchField.tsx`, `MembershipCard.tsx`, `WalletCanvas.tsx`, `WalletEmptyState.tsx`, `CanvasActions.tsx`, `UnsavedChangesDialog.tsx`
- `src/constants/bemem-theme.ts`
- `src/data/wallet-preview.ts`
- `src/types/wallet-ui.ts`
- `src/hooks/use-wallet-canvas.ts`
- `src/lib/canvas-layout.ts`, `canvas-session.ts`, `canvas-repository.ts`, `canvas-storage.ts`
- `scripts/test-canvas.cjs`, `scripts/lint-readonly.cjs`
- `PHASE1.md`

ไม่มีการแก้ไขเว็บไซต์เดิม, Deploy, เปลี่ยน Vercel หรือใช้ข้อมูลผู้ใช้จริง
