# bemem — Full Visual Redesign / three directions

Experimental preview v0.1 · 6 พฤศจิกายน 2026 · ยังไม่ได้เลือกธีมหรืออนุมัติให้นำไปใช้กับแอป

## เปิดดู

ดับเบิลคลิก **[index.html](index.html)** แล้วเปิดด้วย Edge, Chrome หรือ Safari รุ่นปัจจุบัน ไม่ต้องเปิด Expo, ใช้ server, ติดตั้ง dependencies หรือเชื่อมอินเทอร์เน็ต ฟอนต์และไฟล์ประกอบอยู่ในโฟลเดอร์นี้ทั้งหมด

เปิดจาก PowerShell บนเครื่องนี้ได้ด้วย:

```powershell
Invoke-Item 'C:\ฉันจะทำเว็บไซด์\bemem-app\design-previews\bemem-redesign\index.html'
```

| ไฟล์ | ใช้ดูอะไร |
| --- | --- |
| [index.html](index.html) | หน้าเปรียบเทียบ 3 ธีม มี Home/Create ครบ 6 ภาพ และคำแนะนำ |
| [atelier.html](atelier.html) | Atelier: คู่หน้าจอ วัสดุ ปุ่ม/สถานะ และตัวอย่าง Home ว่าง |
| [lagoon.html](lagoon.html) | Lagoon: คู่หน้าจอ วัสดุ ปุ่ม/สถานะ และตัวอย่าง Home ว่าง |
| [ion.html](ion.html) | Ion: คู่หน้าจอ วัสดุ ปุ่ม/สถานะ และตัวอย่าง Home ว่าง |
| [contact-sheet.html](contact-sheet.html) | ดู Home/Create ทั้ง 3 ธีมบนแผ่นเดียว เน้นการเทียบหน้าจอ; เป็นแผ่นกว้างสำหรับเดสก์ท็อป |
| [comparison.png](comparison.png) | ภาพรวม 6 หน้าจอ ขนาด 1600×1900 |
| [atelier.png](atelier.png), [lagoon.png](lagoon.png), [ion.png](ion.png) | ภาพแต่ละธีม Home + Create ขนาด 1440×1120 |
| [DESIGN-REVIEW.md](DESIGN-REVIEW.md) | เหตุผล CI, ข้อดี/ข้อเสีย, ข้อควรทดสอบ และคำแนะนำ |
| [experimental-tokens.json](experimental-tokens.json) | สี typography geometry material motion และ platform policy ฉบับทดลอง แยกจาก DS จริง |
| [preview-fixture.json](preview-fixture.json) | บัตรสมมติและ Saved/Draft Layout ชุดเดียวกันสำหรับทุกธีม |
| [browser-review.json](browser-review.json) | ผลตรวจ geometry/ตำแหน่งปุ่มและ responsive ใน Edge |
| styles.css / theme-variables.css | CSS ร่วมและ variables ที่สร้างจาก experimental tokens |
| build-preview.py / review-preview.cjs | ตัวสร้าง Static HTML และเครื่องมือทบทวนใน Browser ใช้เฉพาะ Python/Node ที่มีอยู่ |
| fonts/ | ฟอนต์ OFL พร้อม license ไม่ใช่ npm packages หรือฟอนต์ที่ติดตั้งเข้าระบบ |

## ขอบเขตของ Preview

- เป็น HTML/CSS แบบ Static ไม่มี JavaScript ทำงานในหน้า ไม่มี onClick, Drag & Drop, Save หรือระบบเพิ่มบัตรจริง
- ปุ่มบนภาพโทรศัพท์เป็นภาพจำลอง ส่วนลิงก์เปลี่ยนหน้า/เลื่อนหน้าในเว็บเปรียบเทียบใช้งานได้จริง
- ไม่เรียก API ไม่ใช้ browser storage ไม่อ่านไฟล์ผังใน Documents และไม่ใช้ข้อมูลผู้ใช้จริง
- ข้อความ Saving… ใน state specimens เป็นภาพตัวอย่างที่ติดป้ายชัดเจน ไม่ใช่ผลของการบันทึก
- Header และ CI เดิมถูกปลดล็อกสำหรับงานนี้ตามโจทย์ล่าสุด Design System v1.0 เป็นข้อมูลอ้างอิง ไม่บังคับรูปลักษณ์ของ Preview และไม่ได้ถูกแก้ไข
- ตำแหน่ง Search/Create/FAB/Save และเงื่อนไขการแสดง FAB ยังคงเดิม
- Home ใช้ Saved Layout ตัวอย่าง ส่วน Create แสดง Draft ที่เลื่อน Coffee Club ลง 1 แถวเหมือนกันทุกธีม เพื่ออธิบายการแก้ที่ยังไม่ Save
- เส้นประใน Create คือ Saved origin ของ Coffee Club ไม่ใช่บัตรเพิ่มอีกใบ ไม่มีการเขียนตำแหน่งลงแอปจริง
- ลักษณะรหัสถูกอธิบายเป็นพื้นที่ขาว/ดำที่ไม่มีเอฟเฟกต์ ไม่สร้าง QR/Barcode ปลอมหรือฟีเจอร์แสดงรหัสเพิ่ม

## Typography และ asset provenance

Preview บันเดิลฟอนต์จาก [Google Fonts repository](https://github.com/google/fonts) ภายใต้ SIL Open Font License และเก็บ license ใน fonts/:

| ฟอนต์ | แหล่งไฟล์ | ใช้ใน Preview |
| --- | --- | --- |
| Instrument Serif regular/italic | [ofl/instrumentserif](https://github.com/google/fonts/tree/main/ofl/instrumentserif) | wordmark และหัวเรื่อง Atelier |
| Manrope variable | [ofl/manrope](https://github.com/google/fonts/tree/main/ofl/manrope) | UI Atelier และ Lagoon |
| Space Grotesk variable | [ofl/spacegrotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) | Ion |
| Noto Sans Thai variable | [ofl/notosansthai](https://github.com/google/fonts/tree/main/ofl/notosansthai) | ภาษาไทยในทุกธีม |

ยังไม่มีการนำ asset เหล่านี้เข้า Expo หรือ register font ในแอป การเลือกและบันเดิลบน Native เป็นงานแยกหลังผู้ใช้เลือกธีม

## วิธีสร้างซ้ำโดยไม่ติดตั้งอะไร

ถ้าต้องการปรับเฉพาะสำเนา Preview ของงานนี้หลังได้รับอนุญาต:

```powershell
cd 'C:\ฉันจะทำเว็บไซด์\bemem-app'
python -B design-previews/bemem-redesign/build-preview.py
node design-previews/bemem-redesign/review-preview.cjs
```

คำสั่งแรกเขียนเฉพาะ HTML/CSS ที่สร้างจาก tokens ในโฟลเดอร์ Preview จึงไม่จำเป็นต้องรันเพื่อเปิดดู คำสั่งที่สองต้องมี Microsoft Edge ติดตั้งอยู่แล้วที่ path ในสคริปต์ และระบบอนุญาตให้เปิด browser process ได้ จะสร้าง PNG และ browser-review.json ใหม่ของ Preview เอง

ตัวตรวจใช้ Node built-in WebSocket/CDP เพราะไม่มี Playwright CLI พร้อมใช้ในสภาพแวดล้อมนี้ ไม่ดาวน์โหลด npm package หรือ browser เพิ่ม เปิด Edge headless ด้วยโปรไฟล์ทดสอบใหม่ใน `.expo/bemem-redesign-browser-*` และปิด browser ของโปรไฟล์นั้นเมื่อจบ ไม่ใช้โปรไฟล์หรือข้อมูล browser จริงของผู้ใช้

## ผลตรวจรอบนี้

- สร้าง PNG จริงจาก Edge และตรวจภาพครบ 3 ธีม
- ผ่าน 9 กรณี page/viewport: contact sheet, คู่ภาพแต่ละธีม, แต่ละธีมที่ 375px, index ที่ 1440px และ 375px
- ตรวจว่าไฟล์ HTML ไม่มี runtime scripts หรือ external assets, ฟอนต์โหลดในเครื่อง, ชื่อบัตรไม่ต่ำกว่า 12px ใน Preview
- ตรวจตำแหน่งปุ่มหลัก, Home ที่มีบัตรไม่มี FAB, Home ว่างมี FAB ขวาล่าง, บัตรไม่ทับกันและไม่ถูก Action Rail บัง
- ตรวจบัตรและพิกัดตรงกับ fixture เดียวกันทุกธีม; ไม่ตรวจจากผังผู้ใช้
- ตรวจ JSON และลิงก์ไฟล์ในเครื่อง พร้อมเปรียบเทียบ hash เพื่อยืนยันว่า source แอป, Design System v1.0, Skill, AGENTS.md และเว็บไซต์เดิมไม่เปลี่ยน
- ตรวจคู่สีพื้นทึบของข้อความหลัก/รอง ปุ่มหลัก และชื่อบัตรทุกธีมให้ได้อย่างน้อย 4.5:1 ในแบบจำลองสี; ยังต้องตรวจผล composite ของ glass, ภาพบัตร และแสงบนจอ Native จริงอีกครั้ง
- TypeScript ของแอปเดิมและ lint แบบ Read-only ของ Phase 1 ผ่าน โดยไม่ได้แก้ source หรือใช้ผลนั้นอ้างว่า Native redesign ผ่านแล้ว
- ยังไม่ใช่การทดสอบ Native, ความเร็วบนโทรศัพท์จริง, screen reader ทั้งระบบ หรือการสแกนจริง

Contact sheet ออกแบบเป็นแผ่นกว้างเพื่อเทียบ 6 หน้าจอ ส่วน index และหน้าธีมแต่ละหน้า responsive สำหรับเปิดจากมือถือได้

## ขั้นตอนต่อไป

ผู้ใช้เลือกธีมและส่วนที่อยากปรับก่อน จากนั้นจึงอนุมัติงาน Design System ใหม่และ UI implementation แยกกัน ห้ามคัดลอก CSS backdrop blur ไปใช้เป็น RN props หรือเริ่มแก้ Header/Canvas/storage จากการมี Preview นี้เพียงอย่างเดียว
