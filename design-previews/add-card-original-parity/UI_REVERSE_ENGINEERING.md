# bemem — Original Add Card UI Reverse Engineering

สถานะ: Design reconstruction / รอผู้ใช้ตรวจ / ยังไม่อนุมัติ Native implementation

## ขอบเขตหลักฐาน

- ตรวจ Source เว็บเดิมแบบ Read-only จาก `pixel-perfect-replay-4296-main` ไม่ Build/รัน/Deploy เว็บไซต์
- ตรวจ Skill `.agents/skills/ui-ux-pro-max/SKILL.md` ซึ่งติดตั้งอยู่แล้ว พร้อมคำแนะนำ responsive layout และ native touch targets โดยไม่ให้คำแนะนำแทนที่ค่าจากต้นฉบับ
- ยังไม่มี Screenshot ที่ผู้ใช้อ้างถึงแนบในข้อความหรือระบุเป็นไฟล์ ภาพหน้าจอต้นฉบับและผล Native บน Samsung จึงยังไม่ได้วัด ไม่อ้าง pixel-perfect parity
- ภาพในโฟลเดอร์นี้เป็น HTML reconstruction ที่เรา render ใน Edge ไม่ใช่ Screenshot จากเว็บไซต์หรือ React Native
- ไม่ใช้ข้อมูล Wallet จริง หน้าเบื้องหลังเป็นการตกแต่งจำลองด้วย CSS ไม่ใช่ Home ของผู้ใช้

## เส้นทาง render ที่ตรวจจริง

1. `src/routes/index.tsx:16` ผูก Route `/` กับ `Index`
2. `index.tsx:441` สร้าง phone container ที่เป็น relative/overflow-hidden
3. `index.tsx:846` เมื่อ `adding` เป็นจริง render `<Sheet title="Add Card">`
4. `index.tsx:847` render `<CardForm submitLabel="Add Card" ...>` และ onSave เพิ่มบัตรก่อนปิด Sheet
5. `CardForm.tsx:127` form ประกอบด้วย Preview/tools, Size selectors, Country/Brand, ชื่อ, หมายเลข, expiration และ submit
6. `CardDisplay.tsx` เลือก `CardFace` หรือ `CardBack`; ใช้ `Face` เป็นพื้น gradient/ภาพ
7. `components/ui/button.tsx` กำหนดขนาด Button และ SVG defaults ผ่าน CVA/Tailwind merge
8. `routes/__root.tsx` ผูก `styles.css` และ Google Fonts; Tailwind ที่ติดตั้งคือ 4.3.3

เลขบรรทัดเป็น snapshot ของ Source ขณะตรวจ ค่าที่เป็น px ด้านล่างคำนวณ Tailwind spacing 0.25rem, root 16px และ **radius override** ใน styles.css:21–28: base radius10px → md8px / xl14px / 3xl22px ไม่ใช้ค่า default ของ Tailwind และไม่ใช่การวัด Screenshot

## ค่าที่พบจริงจาก Source

| ส่วน | Source / Classes | ค่าและพฤติกรรม |
| --- | --- | --- |
| Phone | index:441 `h-screen w-full`, `sm:h-[860px] sm:max-h-[92vh] sm:w-[400px]` | <640px เต็ม viewport; ≥640px กว้าง400 สูง860 ไม่เกิน92vh; rounded48 บน desktop |
| Overlay | index:35 `absolute inset-0 flex items-end bg-foreground/40 backdrop-blur-sm` | ครอบ phone container ไม่ใช่ browser ทั้ง desktop; scrim40%; blur-sm เทียบ Tailwind default 8px; click backdrop ปิด |
| Sheet | index:36 `max-h-[92%] w-full overflow-y-auto rounded-t-3xl bg-background p-5` | สูงตามเนื้อหา ไม่ใช่ height92% ตายตัว; cap92%; Padding20; Top radius22; Sheet ทั้งอัน scroll รวม Header |
| Header | index:37–43 `mb-4 ... gap-2`, `text-lg font-extrabold` | Margin bottom16; Gap8; H18/line28/weight800; X อยู่ขวา |
| X | Button icon + `rounded-full`, X `h-4 w-4` | Button36×36, Circle; SVG16×16; source default stroke2 จาก Lucide |
| Form | CardForm:127 `space-y-3` | ช่องว่างระหว่าง block12; Draft ใช้ flex gap12 และคง country row margin-top4 แบบ Source |
| Preview row | CardForm:128 `flex items-center gap-4` | Gap16, center แนวตั้ง |
| Landscape Preview | CardForm:129 `w-2/3` | 66.6667% ของ content width; ที่412px: (412−40)×2/3=248px; สูง248/1.586≈156.37px |
| Portrait Preview | CardForm:129 `w-36 shrink-0` | กว้าง144px; Card4x6 สูง216px; ไม่ใช้ native flex-basis200 |
| Tool rail | CardForm:132 `flex flex-col gap-3` | Gap12; Flip → Front/Back label → Gallery → Camera; ปุ่มแต่ละอัน36 ไม่ใช่ Text button ขนาดใหญ่ |
| Tool label | `text-[10px] ... -mt-2` | Font10, margin-top−8; line-heightตาม Tailwind normal ประมาณ15 |
| CardFace | CardDisplay:16–30 | Landscape aspect1.586; Portrait2/3; Voucher7/3; Boarding pass2/1; Vaccine5/7; radius14; shadow-card |
| Front contents | CardDisplay:27–28 `p-2`, `text-sm font-extrabold` | Name บนซ้าย Padding8; Font14/line20/weight800; ไม่แสดง Member Number บน Front |
| Back contents | CardDisplay:36–39 `bottom-3 left-3 right-3 ... text-xs font-mono` | Bottom/left/right12; Font12/line16; แสดงเลขด้านล่าง; source `fmtNum` จัดกลุ่มทุก4ตัว |
| Shade | CardDisplay:26 `from-foreground/40 ... to-foreground/50` | Foreground40% → transparent → foreground50% |
| Size wrapper | CardForm:161 `grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-1` | 2 คอลัมน์เท่ากัน, Gap8, Radius14, Padding4 |
| Active size | CardForm:166... select `h-9 ... rounded-md px-2 text-sm font-medium shadow-sm` | Height36, Radius8, Padding horizontal8, Font14/500; select มีขนาดพิเศษใน dropdown |
| Inactive axis | Button ghost/sm | Height32, Font12, Padding horizontal12; กด Portrait/Landscape เปลี่ยน selector ที่ active |
| Country+Brand | CardForm:206+ `flex ... gap-2 mt-1` | แถวเดียว Gap8, margin-top4; Thailand เป็น badge คงที่ ไม่ใช่ country dropdown |
| Thailand | `px-3 py-3 rounded-xl text-sm font-semibold whitespace-nowrap` | Padding12; Font14/line20/600; สูง44ตามการคำนวณ; Sourceใช้ emoji 📍 |
| Brand | `list="brand-list"`, inputCls+flex1 | Native HTML datalist; รายการที่ render จริง50รายการ; ไม่ใช่รายการ Chips6ปุ่ม; มี autoMatchPreset และ autofillชื่อ |
| Input | CardForm:75 `rounded-xl bg-card px-3 py-3 text-sm shadow-card` | Radius14, Padding12, Font14/line20; สูง44โดยคำนวณ; ไม่มี border; shadow-card; focus ring2 |
| Name | CardForm:293 | placeholder/aria-label `Card / Store name`; ไม่มีหัวข้อแยกที่เพิ่มความสูง |
| Number | CardForm:294–296 | Label12/line16/600; Input margin-top4, font-mono; ยังเป็น string ไม่ใช่ number |
| Expiration | CardForm:297–299 | Optional; HTML month picker, value YYYY-MM; labelเหมือน Number |
| Add action | CardForm:300 `h-11 w-full` | Height44, Full width, Button radius8, Font14/500; disabledเมื่อ name/numberว่างหรือกำลังอ่านรูป |
| Footer จริง | CardForm:300 | **ไม่ได้ sticky/fixed** ปุ่มอยู่ท้าย form ใน Sheet scroll container; Sticky ใน Draft เป็นการปรับตามคำขอ ไม่ใช่สิ่งที่ตรวจพบจาก Source |
| Motion | Sheet `animate-in fade-in slide-in-from-bottom`; styles:181 | Sourceมีเปิดแบบ slide/fade และ reduce-motion override; Draftไม่เพิ่ม motion เพื่อให้ตรวจภาพนิ่งง่าย |

## Colors / Assets / Fonts

- `styles.css:78+`: background `oklch(.968 .007 247.896)`, foreground `oklch(.129 .042 264.695)`, card white, primary `oklch(.2 .02 265)`
- `styles.css:155`: shadow-card `0 8px 20px -10px oklch(.2 .03 260 / 35%)`
- `styles.css:156–162`: Seven/The1/PTT/Lotus/Rose/Violet/Ink gradients ใช้ OKLCH; Draftคัดค่าตรง ไม่ประมาณเป็น hex
- Formเริ่ม preset=`ptt`; ไม่มีภาพเมื่อเปิดฟอร์มใหม่ จึงใช้ gradient ไม่ต้องย้ายรูปผู้ใช้
- `mcard` และ `bigc` อยู่ใน presets แต่ไม่พบ `--brand-mcard/--brand-bigc` ใน CSS ที่ตรวจ จึงไม่แต่ง Gradient ใหม่ให้; Draftไม่ auto-match สองแบบนี้และระบุเป็นข้อแตกต่าง
- Original Front/Back FlipHorizontal2, ImagePlus, Camera, X มาจาก lucide-react0.575.0; Draftถอด SVG path เดิมเป็น inline symbols16px พร้อม `LUCIDE-LICENSE.txt` ไม่ติดตั้ง icon package
- `routes/__root.tsx:91`: Plus Jakarta Sans400/600/700/800 + IBM Plex Sans Thai400/600/700 จาก Google Fonts. ไม่มี font file เดิมใน Source ที่ตรวจ
- Draftไม่โหลด font ทาง network จึงประกาศชื่อเดิมและใช้ Arial/sans-serif fallback เมื่อเครื่องไม่มี Fontนั้น **ยังไม่ถือว่า typography ตรงต้นฉบับ**; Manrope ของ nativeไม่ถูกใช้แทนแล้วอ้างว่าเป็นต้นฉบับ
- Public stickers และ cafe/receipt images ไม่ถูกใช้ใน Add Card เริ่มต้น ไม่คัดลอก Assets ที่ไม่จำเป็น

## Scroll และ Footer ที่สร้าง

`index.html` เป็น Draft ที่เพิ่ม CSS sticky footer ภายใน sheet-scroll แทนการเพิ่ม Action Rail ใหญ่; ปุ่มยัง44pxและไม่มี banner/technical paragraph.
`index.html?footer=source` เอา sticky/paddingเพิ่มออก เพื่อดู normal flow แบบ Source. ทั้งสองเป็น reconstruction ชุดเดียวกัน ไม่ใช่การรันเว็บเดิม.

Image/Camera disabled พร้อม accessible label/title Coming soon; Add Card disabledตลอดเพื่อไม่แสดงว่ามีการเพิ่มจริง. Flip, selectors, brand/name/number/month เป็นเพียง visual state ใน DOM. ไม่มี Local Storage, network, Wallet API, upload หรือ encoder. Draftไม่อ้างว่าเป็นการทดสอบ validationในแอป.

## ค่าที่ประมาณ / ยังยืนยันไม่ได้

| รายการ | สถานะ |
| --- | --- |
| ตำแหน่งเมื่อเทียบ Screenshot ของผู้ใช้ | ยังไม่มีภาพ จึงไม่เดาค่าหรืออ้าง pixel-diff |
| ภาพ Native ล่าสุดจริงบน Samsung | ไม่มี Screenshot; B ใน comparison วิเคราะห์โค้ดเท่านั้น |
| Font ที่ browser แสดงบนเว็บไซต์ของผู้ใช้ | Sourceระบุ Fontsได้ แต่ยังไม่มี computed-styleจากเว็บจริง; Draftใช้ fallback |
| Density/เดือน/รูปแบบ calendar control บน Samsung Internet | Native browser controls ต่างกันตาม OS/locale ต้องดูบนเครื่องจริง |
| Safe area / keyboard resize | Draftใช้100dvh และ footer safe-area; ไม่แทนการทดสอบ Samsung keyboard |
| Background หลัง Sheet | CSS placeholder เพื่อเห็น blur ไม่ใช่ Wallet จริง |
| สี Gradient | ถอด OKLCH ตรง; ความต่างจากScreenshotยังขึ้นกับbrowser/color management |

## สิ่งที่ต้องแปลงอย่างจำกัดเมื่อทำ Native ภายหลัง

1. แยกขนาดที่มองเห็นของ Icon36/16 ออกจาก native hit target48dp โดยไม่ขยาย Tool rail เป็นปุ่มข้อความ
2. คำนวณ landscape width=(sheetWidth−40)×2/3 และ portrait144; คง row gap16 ไม่ใช้ flexGrowที่เปลี่ยนสัดส่วน
3. คง CountryและBrandแถวเดียว; native brand popover/list ต้องไม่กินพื้นที่ฟอร์มเริ่มต้นเหมือน Chips
4. ใช้ Typography เดิมถ้าผู้ใช้อนุมัติ Font/Assets ภายหลัง; ยังไม่เปลี่ยน font/dependencyในรอบนี้
5. Month input, keyboard scrolling และ safe-area footer ต้องทำ Native โดยไม่เพิ่มย่อหน้าหรือความสูงที่ไม่จำเป็น
6. เก็บ raw member/code text แบบเดิม ห้ามนำการ trimตอนSubmitหรือ fmtNumมาทำลายต้นฉบับใน Model
7. Country/Brand/Expiry/gradient/front-back assets ยังต้องมี Model contractก่อนเชื่อม Save; ไม่แก้ schemaในรอบนี้
8. รองรับข้อความขนาดใหญ่ด้วย wrap/การเลื่อนและ hit-area ที่เหมาะสม; อาจต่างจาก Sourceเล็กน้อย ต้องขออนุมัติ visualก่อน

## วิธีเปิด

- คอมพิวเตอร์: เปิด `comparison.html` หรือ `index.html` โดยตรง (offline, ไม่ต้อง build)
- มือถือ Wi-Fi เดียวกัน: จาก bemem-app รัน `python -m http.server 8773 --bind 0.0.0.0 --directory design-previews/add-card-original-parity` แล้วเปิด `http://<computer-LAN-IP>:8773/` ใน Samsung browser
- นี่คือ HTML review ไม่ใช่ Expo Go route; ไม่เปลี่ยน `/dev-add-card` ของแอป

รอบนี้แก้เฉพาะโฟลเดอร์ `design-previews/add-card-original-parity/` ไม่มีการ Commit/Push/Deploy.
