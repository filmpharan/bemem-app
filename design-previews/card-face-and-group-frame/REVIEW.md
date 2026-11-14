# bemem — Card Face & Group Frame / Design Review

**14 November2026 · DESIGN PREVIEW ONLY · Awaiting owner selection**

เปิด [Offline Gallery](gallery/index.html) หรือดู [ภาพเปรียบเทียบ A/B/C](sheets/comparison.png) ได้ทันทีจากไฟล์ในเครื่อง ไม่มี CDN, remote image, fetch หรือขั้นตอนติดตั้ง เมื่อย้ายงานให้คงโครงสร้างทั้งโฟลเดอร์นี้ไว้

## สิ่งที่ออกแบบ

สามแนวทาง แต่ละแนวทางมี **6 colorways เท่านั้น**: Pink pastel, Brown pastel, Light green pastel, Soft yellow pastel, Soft blue pastel และ Soft lavender pastel รวม18 Master SVG/PNG แต่ไม่ใช่การเสนอให้เพิ่ม18 Templates เข้า Production

แต่ละแนวทางใช้ Composition เดียวกันสำหรับทุกสี มี Group Frame family เดียวกันอีก1ชุด แสดง Compact/Wide/Tall เพื่อพิจารณาความยืดหยุ่น ไม่ได้สร้างงานหน้าบัตรใหม่แยกตามขนาด

| Direction | บุคลิกและ Face | Group frame | จุดเด่น / Tradeoff |
| --- | --- | --- | --- |
| **A — Soft Pastel Minimal** | พื้นสีโปร่งสบายกับเส้นชั้นโค้ง มีพื้นที่ว่างมากที่สุด | **Pocket Stack**: เส้นกรอบเรียบ, ขอบบัตรซ้อนด้านหลัง, ป้ายรวมชุด | เหมาะกับ Default ที่ไม่แย่งข้อมูล; มีบุคลิกน้อยกว่า B และวัสดุเรียบกว่า C |
| **B — Cozy Cute** | พื้นกระดาษอุ่น ดอกไม้/ใบเล็กวาดด้วยเส้นโค้งออร์แกนิกและรอยเย็บบาง | **Keepsake Pocket**: กรอบกระดาษ, รอยเย็บ, Bookmark และป้ายชุด | อบอุ่นและเป็นส่วนตัวที่สุด; ดอกไม้ตั้งใจเป็น Accent เล็ก ใน Mini จะเห็นรายละเอียดน้อยกว่าใบใหญ่ |
| **C — Pearl Gray × Lagoon Glass Harmonized** | ลดความอิ่มตัวเล็กน้อย ใช้โค้งแสงแบบผิวพับโปร่งและ Rim บาง; ไม่ใช้ Blur | **Pearl Sleeve**: เส้นกรอบ Pearl, ขอบสะท้อนเบา, ชั้นบัตรและป้ายชุด | กลมกลืนกับ UI ปัจจุบันที่สุด; สีอ่อนมากจึงควรตรวจขอบแยกจาก Canvas โดยเฉพาะเหลือง/เทาอุ่นบนโทรศัพท์ |

## คำแนะนำ

แนะนำ **Direction C** ไปปรับรอบถัดไป เพราะเป็น Default ที่อยู่ร่วมกับ Pearl Gray controls และรูปจริงที่ผู้ใช้อัปโหลดได้ง่าย มีสีพอแยกบัตรแต่ไม่ทำตัวเป็น Merchant branding ส่วน A เหมาะถ้าต้องการเงียบที่สุด และ B เหมาะถ้าต้องการเพิ่มความอบอุ่นแบบสมุดส่วนตัว

คำแนะนำนี้ไม่ใช่การเลือกแทนผู้ใช้ ยังไม่มี Direction ใดได้รับการอนุมัติ Production

## Master / crop contract ที่ใช้ใน Preview

- Original SVG canvas และ PNG เป็น **1536×1536** ทุกสี ไม่มีชื่อบัตร หมายเลข โลโก้ร้าน หรือมุมโค้งฝังใน Master
- ใช้ centered `cover` crop เดียวกัน ไม่ยืดภาพและไม่ทำภาพเฉพาะแต่ละ Preset
- Gallery อ่านรายการ7 Presets จาก Manifest ที่ Build จาก Definitions ปัจจุบัน:3×2,6×4,7×3,8×4,2×3,4×6,5×7
- Crop board ใช้ Block Unit ร่วมกันทุกใบ, Paint inset .1 Block ต่อด้าน, CSS radius14px คงที่; Mini ไม่ถูกขยายจนเท่าบัตร6×4
- Crop ใช้อัตราส่วน **พื้นที่ Paint หลัง Inset** `(widthBlocks−.2)/(heightBlocks−.2)` จึงรวมกรณี Voucher และ Mini ที่ครอปต่างจากการใช้ชื่อ Preset อย่างเดียว
- สำหรับ Master สี่เหลี่ยมนี้ พื้นที่ร่วมของ7 center-crops อยู่ประมาณ **x274–1262, y452–1084** ใน1536px ดอกไม้หลักของ B อยู่ภายในขอบเขตนี้ ส่วนเส้น/สีที่ไหลไปขอบเป็น Bleed ที่ยอมให้ครอปได้ ไม่มีข้อความสำคัญอยู่ริมภาพ
- ป้ายขนาดและ Test Member ใน Gallery/ภาพ Review เป็น Overlay แยก ไม่อยู่ใน Artwork ดั้งเดิม
- PNG comparison sheets เป็นภาพ Review ขยาย ไม่ใช่หลักฐานการวัด dp จริงบน Samsung

Master เป็นพื้นทึบโดยตั้งใจ เพื่อเป็นหน้าบัตร Default; ไม่ใช่ Sticker โปร่งใส กลุ่ม Frame PNG มี Alpha จริงและช่องกลางโปร่งใส ไม่ได้ใส่พื้นขาวทับรูปบัตร

## Group frame มีหน้าที่อะไร

ทั้งสาม Family ใช้ **ขอบบัตรด้านหลัง + ขอบเขตร่วม + ป้ายชื่อ/จำนวนชุด** เพื่อสื่อว่าเป็นกลุ่ม ไม่ใช่ Border สุ่มตกแต่งบัตรใบเดียว

Frame SVG/PNG แยกจาก Card Face เสมอ และมี3สัดส่วน: Compact960×720, Wide1152×560, Tall800×1152 ช่องตรงกลางโปร่งใส จึงไม่เปลี่ยนสี/ภาพบนบัตร ตัวอย่างวาง2บัตรเป็นเพียง Composition review

นี่ไม่ใช่1×1 Decorate tile และไม่ใช่ระบบ Group ที่กลับมาใช้งานได้แล้ว ยังไม่ได้กำหนด Occupancy, touch target, collapse/expand, group membership, persistence หรือการชนกับ Grid กฎเหล่านั้นต้องวางแผนและอนุมัติแยกก่อนเขียน Runtime

หากเลือก Direction แล้ว แนะนำออกแบบการประกอบ Frame จากขอบ/มุมหรือ vector container ที่รักษาความหนาเส้น แทนยืด PNG ทั้งกรอบจน Stroke/Radii เปลี่ยน ตัวอย่าง3ขนาดนี้เป็นหลักฐานทางภาพเบื้องต้น ไม่ใช่9-slice implementation

## Gallery ทดลองอะไรได้

1. เปรียบเทียบ6สีของ A/B/C ด้วย Crop และตำแหน่งเดียวกัน
2. เลือก Direction และสี; ดูภาพ Master กับ Crop board ทั้ง7ขนาด
3. เปิด/ปิด Safe-zone guide และ Sample text overlay
4. ดู Group Frame แบบ Compact/Wide/Tall
5. เปิด PNG sheets, Master SVG และ Manifest แยกได้

เปิดบนคอมพิวเตอร์โดยดับเบิลคลิก `gallery/index.html` Browser QA ใช้ localhost เพราะเครื่องมือ Automation บล็อก `file:` protocol ไม่ใช่เพราะ Gallery ต้องพึ่ง Internet การทดสอบบน Samsung จริงยังไม่ได้ทำ

## ไฟล์และเครื่องมือ

| Path | เนื้อหา |
| --- | --- |
| [gallery/index.html](gallery/index.html) | Offline review entry; CSS/JS/Data อยู่ข้างกัน |
| masters/ |18 SVG editable sources +18 PNG1536×1536 |
| frames/ |9 SVG +9 PNG มี Transparency จริง;3 variants ต่อ Family |
| sheets/ |10 comparison/crop/frame PNGs และ4 Browser screenshots |
| [manifest.json](manifest.json) | IDs, สี, ขนาด, Crop-safe rectangle, Presets และ Frame variants |
| [VALIDATION.json](VALIDATION.json) | ผลตรวจ Asset decoding, dimensions, alpha และขนาดไฟล์ |
| tools/build_review.py | สร้าง/Export/Validate เฉพาะงาน Preview นี้ด้วย Inkscape/Pillow เดิม |
| tools/browser_check.js | Browser checks เฉพาะ Gallery นี้ ไม่ใช่ App test suite |

ใช้ mobile-design ตรวจ Mobile review/touch/responsive constraints, ui-ux-pro-max ตรวจลำดับชั้น/สี/ความสอดคล้อง และ bemem-illustrator กำกับความเป็น Original/ความชัดของงานเวกเตอร์/Source และ Alpha QA ไม่ใช้ข้อกำหนด192px/96-viewBox ของ Sticker1×1 มาบังคับ Card Masters ซึ่งเป็นคนละชนิดงานตามโจทย์นี้

งานเป็น **original vector artwork authored programmatically** และส่งออกด้วย Inkscape1.4.2, Pillow13.0.0 ใน Artwork venv เดิม ไม่อ้างว่าเป็นภาพวาดมือโดยนักวาด ไม่ใช้ Emoji, stock icon หรือคาแรกเตอร์เชิงพาณิชย์เป็นลายหน้าบัตร ไม่มีการติดตั้งโปรแกรมหรือ Dependency เพิ่ม

## Validation และความพร้อม

-18 Master PNG decode ได้และขนาดตรงกันทั้งหมด; XML ของ SVG parse ได้
-9 Frame PNG มี Alpha0..255 และจุดกลางโปร่งใสจริง
-10 comparison sheets decode ได้; ตรวจภาพรวมและตัวอย่าง Frame/Crop ด้วยสายตาแล้ว
-Browser checks: A/B/C ที่360/393/412px รวม9กรณี ตรวจ7ขนาดใช้ Unit/Inset เดียวกัน, radius14px, ไม่มี Horizontal overflow, Direction/color/guide/sample-label controls; บันทึก Mobile A/B/C และ Desktop comparison screenshots
-ไม่รัน App bundle/tests เพราะไม่ได้เปลี่ยน Runtime; ตรวจ Hash ของพื้นที่ Production และงานเดิมแทน

**พร้อมให้เลือกแนวทางและปรับรายละเอียดเพื่อส่งต่อ Implementation ภายหลัง** แต่ยังไม่ใช่ Production-ready approval ต้องเลือก1แนวทางก่อน แล้วตรวจ6สีที่เลือกในแอปจริง เรื่อง Contrast ของชื่อบัตร, แสงหน้าจอ, Crop, ขอบแยกจาก Canvas และขนาด/Format ไฟล์ที่เหมาะสม ส่วน Group logic/Schema/API ไม่อยู่ในงานรอบนี้

ไม่มีการแก้ Home/Create/Wallet/Grid/Decorate/History/Share/Scanner, ไม่มีการแทน Runtime assets, และไม่มี Commit/Push/Deploy
