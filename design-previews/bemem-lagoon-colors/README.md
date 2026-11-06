# bemem — Lagoon Glass / Six Color Preview

Version **2.0.0-rc.1** · 7 พฤศจิกายน 2026 · รายละเอียดดีไซน์รออนุมัติ ยังไม่ใช้กับ Expo App

## เปิด Preview ออฟไลน์

ดับเบิลคลิก **[index.html](index.html)** เปิดด้วย Edge/Chrome/Safari รุ่นปัจจุบัน ไม่ต้องเปิด Expo หรือ server และไม่ต้องติดตั้ง dependencies ฟอนต์ทั้งหมดอยู่ในโฟลเดอร์นี้

```powershell
Invoke-Item 'C:\ฉันจะทำเว็บไซด์\bemem-app\design-previews\bemem-lagoon-colors\index.html'
```

ดูทั้ง 12 หน้าจอพร้อมกันที่ **[contact-sheet.html](contact-sheet.html)** หรือเปิด **[comparison.png](comparison.png)** แล้ว zoom ดูแต่ละสีได้ Contact sheet เป็นแผ่นกว้างโดยตั้งใจ ส่วน index และหน้าแต่ละสี responsive สำหรับมือถือ

## หน้าและภาพแต่ละสี

| สี | HTML / Home + Create | PNG |
| --- | --- | --- |
| Lagoon Mint — Default | [lagoon-mint.html](lagoon-mint.html) | [lagoon-mint.png](lagoon-mint.png) |
| Blush Pink | [blush-pink.html](blush-pink.html) | [blush-pink.png](blush-pink.png) |
| Warm Beige | [warm-beige.html](warm-beige.html) | [warm-beige.png](warm-beige.png) |
| Lilac Dream | [lilac-dream.html](lilac-dream.html) | [lilac-dream.png](lilac-dream.png) |
| Sky Blue | [sky-blue.html](sky-blue.html) | [sky-blue.png](sky-blue.png) |
| Pearl Gray | [pearl-gray.html](pearl-gray.html) | [pearl-gray.png](pearl-gray.png) |

แต่ละ HTML มีปุ่มขยาย States, Add Card แบบข้อความ, ตัวอย่าง Home ว่าง และ fallback ให้ดูเพิ่ม ส่วน PNG คู่ภาพมุ่งที่ Home/Create

**[materials.html](materials.html)** และ **[materials.png](materials.png)** แสดงวัสดุขยาย 2×, Default/Pressed/Active/Disabled/Busy ทั้ง 6 สี และการเปรียบเทียบ Browser Blur กับ opaque gel ที่ไม่มี Blur

## Design System ใหม่

อยู่แยกใน `../../design-system/bemem-lagoon-glass/`:

- [MASTER.md](../../design-system/bemem-lagoon-glass/MASTER.md)
- [CI.md](../../design-system/bemem-lagoon-glass/CI.md)
- [TOKENS.json](../../design-system/bemem-lagoon-glass/TOKENS.json)
- [COMPONENTS.md](../../design-system/bemem-lagoon-glass/COMPONENTS.md)
- [MATERIALS.md](../../design-system/bemem-lagoon-glass/MATERIALS.md)
- [THEME-API.md](../../design-system/bemem-lagoon-glass/THEME-API.md)
- [VALIDATION.md](../../design-system/bemem-lagoon-glass/VALIDATION.md)

ไม่มีการเขียนทับ `design-system/bemem/` หรือ `design-previews/bemem-redesign/`

## ทำอะไร / ไม่ทำอะไร

- เป็น HTML/CSS Static ไม่มี scripts ในหน้า ไม่มี Theme Picker, Drag & Drop, Save หรือ preference persistence ทำงานจริง
- ลิงก์สีด้านนอกภาพโทรศัพท์เป็น navigation ระหว่างเอกสาร Preview ไม่ใช่ Theme Picker ของแอป ไม่จำค่าการเลือกใน Browser
- ทั้ง 6 สีใช้ Core และ markup เดียวกัน Home ใช้ Saved fixture เดียวกัน Create ใช้ Draft fixture เดียวกันที่ Coffee Club ลงหนึ่งแถว
- เส้นประใน Create เป็น origin ของบัตรที่ย้าย ไม่ใช่บัตรเพิ่ม ไม่มีการอ่านหรือเขียนผังผู้ใช้จริง
- ภาพ/สี/gradient/radius/shadow ของบัตรถูกตรึงเหมือนกันทุกธีม Selection outline ภายนอกเปลี่ยนสีได้โดยไม่แตะ artwork
- สี clay ของ Weekend Club ยังอยู่ในทุกภาพเพราะเป็นสีบัตร ไม่ได้คืน Peach Glow เป็นธีมแอป
- ชื่อหน้าในโทรศัพท์เล็กลงจาก Lagoon reference เดิม เพื่อเพิ่มพื้นที่บัตร ไม่เปลี่ยน function หรือ positions
- label/progress ของปุ่มแยกจากชั้นแสง Saving… ใน specimen เป็นภาพนิ่งที่ระบุว่า sample ไม่ใช่ผลสำเร็จจริง
- QR/Code 128 เป็นเพียงข้อกำหนดพื้นที่ขาว/ดำ ไม่มีรหัสจริงและไม่มีเอฟเฟกต์บัง
- Native Blur/capability/performance ยังไม่ผ่านการตรวจรับบนโทรศัพท์ CSS และ PNG ไม่ใช่หลักฐานว่าระบบ Native ทำเหมือนกันทันที

## รายการไฟล์ประกอบทั้งหมด

นอกจาก HTML/PNG ที่ลิงก์ด้านบนและ README นี้:

| ไฟล์ | หน้าที่ |
| --- | --- |
| `styles.css` | รูปทรง วัสดุ และ typography ร่วมทั้ง 6 สี |
| `palette-variables.css` | ค่าสีที่ generate จาก TOKENS ใหม่ |
| `fixture.json` | ข้อมูลสมมติและผังเดียวกันทั้ง 6 สี |
| `contract.py` | ตัวอ่าน/resolve tokens สำหรับ build และ validation เท่านั้น |
| `build-preview.py` | สร้าง Static HTML/CSS ในโฟลเดอร์นี้ |
| `review-preview.cjs` | Edge + Node built-in CDP สำหรับตรวจ Browser/จับภาพ ไม่ติดตั้ง npm package |
| `validate.py` | ตรวจ JSON/alias/contrast/ไฟล์/ลิงก์ ด้วย Python standard library |
| [browser-review.json](browser-review.json) | หลักฐาน page/viewport checks ใน Edge |
| [validation-report.json](validation-report.json) | ผลตรวจ tokens, contrast model และ artifacts |
| `fonts/manrope.ttf`, `fonts/noto-sans-thai.ttf` | ฟอนต์ Preview ที่คัดลอกจาก asset OFL เดิม ไม่ติดตั้งเข้าระบบ/แอป |
| `fonts/OFL-manrope.txt`, `fonts/OFL-noto-sans-thai.txt` | License ของฟอนต์ |

## ผลตรวจและข้อจำกัด

- ผ่าน Browser review 16 กรณี: contact sheet, หน้า 6 สีที่ desktop/375px, materials และ index desktop/375px
- ตรวจ structural HTML ของ phone แต่ละ mode เหมือนกันทุกสี และ computed artwork styles ไม่เปลี่ยน
- ตรวจตำแหน่ง Search/Create/FAB/Save, เงื่อนไข Home ว่าง/มีบัตร, card bounds และการไม่บัง rail
- JSON duplicate/non-finite checks, aliases ทั้ง 6 ID, palette shapes และ Core fingerprints ตรวจใน validation-report
- Contrast เป็นแบบจำลอง sRGB + tint และ label-band limit ไม่ใช่ native compositor/screen reader certification
- ไม่มีการทดสอบเปิด–ปิดแอปจริง การจำสีจริง หรือสแกนจริงในรอบนี้ เพราะไม่ได้สร้าง implementation เหล่านั้น

ตัวตรวจ Browser ใช้ Edge โปรไฟล์ใหม่ใน `.expo/bemem-lagoon-browser-*` ไม่ใช้โปรไฟล์ผู้ใช้จริง ไม่อ่านข้อมูลบัตร และไม่มีการติดตั้ง browser หรือ Playwright CLI เพิ่ม

## สร้างซ้ำเมื่อได้รับอนุญาตให้แก้ Preview

```powershell
cd 'C:\ฉันจะทำเว็บไซด์\bemem-app'
python -X utf8 -B design-previews/bemem-lagoon-colors/build-preview.py
node design-previews/bemem-lagoon-colors/review-preview.cjs
python -X utf8 -B design-previews/bemem-lagoon-colors/validate.py
```

ไม่ต้องรันคำสั่งเหล่านี้เพื่อเปิดดู คำสั่งจะเขียน HTML/CSS/PNG/report ของงานใหม่เอง จึงควรใช้หลังอนุมัติการแก้ artifacts ไม่เขียน source แอปหรือระบบเดิม

หลังเจ้าของตรวจรายละเอียดแล้วจึงค่อยอนุมัติการแก้ Design System status และ Implementation แยก ไม่มีการนำ tokens ไป import ใน Expo App จากงานนี้
