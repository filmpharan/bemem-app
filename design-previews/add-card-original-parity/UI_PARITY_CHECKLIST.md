# UI parity checklist — Original Add Card

สถานะ: **Draft only / ยังรออนุมัติ**

## เปรียบเทียบ A / B / C

| ด้าน | A: Original Source | B: React Native ปัจจุบัน (ไม่ได้แก้) | C: Reconstruction |
| --- | --- | --- | --- |
| Layout | Preview/tools → size → Country/Brand → name → number → month → Add | Preview/tools → size → Country → brand buttons → fields → advanced; มี banner | คืนลำดับตาม A, ไม่มี bannerหรือคำอธิบายเทคนิคในฟอร์ม |
| Proportions | Landscape2/3, Portrait144px | Preview flex-basis200/flexGrow + tools text | Landscape2/3, Portrait144px, rail36px |
| Typography | Jakarta + Plex Thai; heading18/800; form14 | Manrope; heading20; inputs16 | กำหนดชื่อ Fontsเดิมและขนาดเดิม แต่ fallbackArial ยังไม่ใช่ Font parity |
| Card | OKLCH brand gradients; frontname/backnumber | Hex approximate gradients, dynamic card height | ใช้ OKLCHจากSource; aspect1.586 / 2:3; title14/800 |
| Radius | base10, xl14, md8, 3xl22 ผ่าน CSS override | Nativeใช้ค่า DS เดิมและcard12 | ถอดค่า overrideจริง: card/input14, button8, sheet22 |
| Icons | Lucide16, button36 | ปุ่มข้อความ48pxขึ้นไป | InlineSVG pathsเดิม16/36; licenseรวมแล้ว |
| Form density | Gap12, inputs≈44, labels12 | Gap14, inputs52, helper paragraphs | Gap12, inputs44, labels12 |
| Country / Brand | แถวเดียว; datalist50 options | หลายแถว + 6 chips | แถวเดียว + datalist50 optionsจากSource |
| Scroll | Sheetทั้งหมดรวมheaderเลื่อน; max92% | Header/footerอยู่นอก scrollbody | Sheet scrollตามSource; ใช้100dvhสำหรับviewportปัจจุบัน |
| Footer | ปุ่ม normal flow; h44 | Footerแยกจากscrollbody | Stickyตามคำขอ; มี `?footer=source` ดู normal flow |
| Responsive | <640 full viewport; ≥640 phone400×860/max92vh | max600 และ flex wrap | breakpoint640 และphone400×860/max92vhตามSource |

## ตรวจตรงจาก Source แล้ว

- [x] ไล่ Route → Index → adding → Sheet → CardForm → CardFace/CardBack → Button → CSS overrides
- [x] ไม่แทนไอคอนเครื่องมือด้วยปุ่มข้อความขนาดใหญ่
- [x] Previewกะทัดรัด ไม่ขยายเต็มฟอร์ม
- [x] รักษา landscape/portrait และ size dropdown ตามลำดับเดิม
- [x] Country/Brand อยู่แถวเดียว; labels/placeholderตามต้นฉบับ
- [x] ปุ่ม Add44px อยู่ท้าย; Stickyเป็นข้อปรับที่ระบุไว้ ไม่อ้างว่า Sourceมีอยู่แล้ว
- [x] คัด OKLCH gradients และLucide pathsจริง ไม่ออกแบบแบรนด์ใหม่
- [x] ไม่มี QR/Barcode จำลองหรือการ Save สำเร็จ

## ผล Browser ที่ตรวจจริง

ใช้ Playwright CLI ที่มีอยู่ใน npm cache + Edge ที่ติดตั้งอยู่ ไม่ติดตั้ง dependency/browser เพิ่ม ใช้ session แยก ไม่ใช้ browser profileส่วนตัว และเปิดเฉพาะ localhost.

| ตรวจ | ผล |
| --- | --- |
| 412×915 landscape | Card248×156.36px; Tool36px/SVG16px; footer sticky |
| 360×800 landscape | สร้าง PNG; source footer static เทียบ draft sticky |
| 360×800 portrait | Card144×216px; ไม่มี horizontal overflow |
| 320×740 landscape | Page width320 ตรงviewport; Card186.66×117.69; Tool36/SVG16 |
| 360×500 | มีvertical scroll; footer top424/bottom500 อยู่ล่างviewport |
| Comparison page | ภาพ 1440px wide; Browser console0 errors/0 warnings ขณะตรวจหน้าสุดท้าย |

นี่คือ CSS viewport ใน desktop Edge ไม่ใช่การทดสอบ Samsung/Android จริง ไม่ทดสอบ IME, status bars หรือ touch ด้วยภาพเหล่านี้.

## ยังต่าง / ต้องได้รับหลักฐานหรืออนุมัติ

- [ ] ยังไม่ได้รับ Screenshot Original Add Card/Card Detail ที่ผู้ใช้กล่าวถึง จึงยังไม่มี overlay/pixel-diff หรือความคลาดเคลื่อนที่วัดจากภาพจริง
- [ ] ไม่มีภาพ Nativeล่าสุดจากSamsung; BเปรียบเทียบเฉพาะSource ไม่อ้างเป็นScreenshot
- [ ] ต้องยืนยัน Fontเดิม: ไม่มี PlusJakarta/PlexThai assetในโฟลเดอร์เว็บที่ตรวจ Draftofflineจึง fallback ไม่โหลด Google Fonts
- [ ] Sticky footerเป็นการเปลี่ยนจาก AddCard Source; ต้องให้ผู้ใช้ยืนยัน spacingที่เพิ่ม
- [ ] Input monthหน้าตา/localeและdatalistขึ้นกับbrowser อาจต่างจากSamsung Internet/Chrome
- [ ] Gallery/Camera disabledในDraft แต่ต้นฉบับเรียก file input/capture จริง; ยังไม่ขอ permissionหรือรองรับรูป
- [ ] Add Card disabledตลอด ต่างจากSourceที่เปิดหลังกรอกครบ เพราะรอบนี้ไม่เพิ่มบัตรจริง
- [ ] Back previewรักษาrawtext ไม่จัดกลุ่มทุก4ตัวแบบSource เพื่อไม่ทำให้เข้าใจผิดว่า payloadถูกแปลง
- [ ] MCard/BigCไม่มีCSS gradientในชุดที่พบ Draftไม่สร้างbrandartworkเอง
- [ ] Backgroundเป็นCSS placeholder ไม่ใช่Wallet/Homeจริง
- [ ] Specialsize/flipในDraftเป็น visual interactionเท่านั้น ไม่ได้ขยายModel/Canvas
- [ ] ยังไม่ตรวจ font scaling200% หรือ accessibilityด้วยscreen readerบนอุปกรณ์จริง

## ต้องแก้เมื่อทำ React Native หลังอนุมัติเท่านั้น

1. คง visual16/36 แต่เพิ่ม hit targetแบบไม่เปลี่ยนสัดส่วน (Android48dp/iOS44pt); หลีกเลี่ยง hit-areaซ้อนกัน
2. คืน layoutและsizesตามค่าที่ถอดได้ ไม่ยึด formที่ไม่ผ่านอนุมัติเป็นต้นแบบ
3. ทำBrand searchเป็น overlay/listที่เหมาะกับNative ไม่แสดงchipsถาวรเพิ่มความสูง
4. Keyboard-aware sheet + safe-area footer ต้องตรวจSamsungจริง ไม่ใช้HTML screenshotเป็นหลักฐานว่าNativeผ่าน
5. รองรับlarge textโดยไม่ใช้ellipsisและไม่ทำชื่อ/actionถูกตัด; ปรับเฉพาะที่จำเป็น พร้อมเทียบภาพอีกครั้ง
6. รักษา Model validationและ exact payloadจากงานPhase2; ห้ามยก trim/formatจากเว็บมาเปลี่ยนข้อมูลต้นฉบับ
7. ต้องอนุมัติModelCountry/Brand/Expiry/Images/Gradientsก่อนSave; ห้ามทิ้งค่าที่กรอกเงียบ ๆ
8. ไม่แก้Storage/Coordinator/Migration/Home/Createเพื่อให้งานvisualนี้ผ่าน

## Card Detail — reference สำหรับภายหลัง

- Source `index.tsx:824` เรียก ScanViewในSheetของบัตรที่เปิด
- Code panelพื้นขาว padding24/radius18, barcode110px (container h112) หรือQR176×176; toggleขวาล่าง8px
- ด้านล่างเป็นexpiry64pxกว้าง, cardpreview, Front/Back, membernumber20pxmono, history action
- Shareอยู่ในSheet header; EditเฉพาะcreateMode
- Sticky railที่ `index.tsx:825` เป็นของ **Card Detail** ไม่ใช่ Add Card ต้องไม่สับสนในการย้อนSource
- รอบนี้ไม่ได้สร้างCardDetailหรือรหัสจริงใด ๆ

## การรักษางานเดิม

ตรวจ Git statusก่อนเริ่ม; ไม่สร้างcommit. เปลี่ยนเฉพาะโฟลเดอร์Previewใหม่นี้.
ตรวจ SHA-256 aggregate ของ app `src/`, `scripts/` และwebsite `src/` ก่อน/หลัง เพื่อยืนยันว่าเหมือนเดิม รวมงานPhase2ที่ยังไม่Commit.
ไม่รันTypeScript/Lint/AndroidBundleซ้ำเพราะไม่มีการแก้appsource; ผลรอบนี้เป็นการตรวจHTMLและBrowser ไม่ใช่ผลทดสอบNative.
