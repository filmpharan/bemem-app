> **HISTORICAL / SUPERSEDED - CI Phase5 documentation notice (2026-11-13).**
> This preserved document describes an earlier design/implementation state, not current production instructions.
> Read the [Current-Approved CI Master](../bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md) first; its owner-approved working-tree specification takes precedence.
> Original contents follow unchanged. Historical token files may still have runtime consumers; this notice does not authorize changing them.

# bemem — Lagoon Glass

**Version 2.0.0-rc.1 · 7 พฤศจิกายน 2026 · รออนุมัติรายละเอียดก่อน Implementation**

เจ้าของผลิตภัณฑ์เลือก Lagoon เป็น CI หลักแล้ว แต่การเลือกนี้ยังไม่ใช่การอนุมัติให้นำ tokens หรือ Theme Provider ไปใช้กับแอป เอกสารและ Preview ชุดนี้เป็น candidate สำหรับตรวจอีกครั้ง

## เอกสารในระบบ

| ไฟล์ | หน้าที่ |
| --- | --- |
| [CI.md](CI.md) | อัตลักษณ์ Visual Principles และพาเลต 6 สี |
| [TOKENS.json](TOKENS.json) | สัญญา tokens: Core / Semantic / Palettes / Components / Platform Policy |
| [COMPONENTS.md](COMPONENTS.md) | Search, Create, FAB, Save และ Add Card พร้อม states |
| [MATERIALS.md](MATERIALS.md) | ชั้นกระจก gel แสง ขอบ เงา และการแสดงผลบนแต่ละแพลตฟอร์ม |
| [THEME-API.md](THEME-API.md) | API และการเก็บ preference ออฟไลน์สำหรับอนาคต ไม่ได้สร้างจริง |
| [VALIDATION.md](VALIDATION.md) | เกณฑ์ตรวจ ผลที่ตรวจได้ และรายการที่ยังรออุปกรณ์จริง |

เปิด [Preview เปรียบเทียบ 6 สี](../../design-previews/bemem-lagoon-colors/index.html), [แผ่นรวม 12 หน้าจอ](../../design-previews/bemem-lagoon-colors/contact-sheet.html) และ [ภาพขยายวัสดุ](../../design-previews/bemem-lagoon-colors/materials.html) ได้แบบออฟไลน์

## หลักตัดสินใจ

ประสบการณ์หลักยังเป็น **เปิด → แตะบัตร → แสดงรหัส → สแกน** UI ต้องสบายตาและช่วยให้หา/แตะบัตรเร็ว กระจกทำให้เครื่องมือมีบุคลิก แต่ไม่มีสิทธิ์เพิ่มขั้นตอน โหลดจากเครือข่าย หรือเปลี่ยนข้อมูลผู้ใช้

หนึ่ง Visual Language ประกอบด้วย Soft Glass, Gel-like Material, Minimalism, Friendly & Calm, Light Reflection และ Premium but Approachable ทั้ง 6 ธีมเปลี่ยนได้เฉพาะสีของ UI ไม่เปลี่ยนรูปทรง ฟอนต์ ตำแหน่งปุ่ม หรือภาพบัตร

## ข้อกำหนดที่คงอยู่

- Search อยู่ขวาของ Header ก่อน Create; Create อยู่ขวาบนและชื่อยังเป็น `Create` ทุกโหมด
- FAB อยู่ซ้ายล่างใน Create, ขวาล่างใน Home ว่าง และไม่ปรากฏใน Home ที่มีบัตร แม้ค้นหาไม่พบ
- Save อยู่ขวาล่างตาม Action Rail ไม่ย้ายเข้า Header
- เปิดแอปเข้า Home; Home ไม่มีกริด/drag/edit; Create มีกริดและจัดวาง Draft
- Saved/Draft แยกกัน; Save/Discard/Cancel และการรับมือ read/write failure คงเดิม
- การเปลี่ยนสีไม่จัดเรียงบัตรใหม่ ไม่ remount Canvas ไม่เปลี่ยน grid units และไม่เขียนไฟล์ layout
- ไม่ recolor/filter/crop รูปบัตรจริงตามธีม เปลี่ยนได้เฉพาะ selection outline ภายนอกบัตรตามสถานะ
- QR/Code 128 ในอนาคตใช้ขาวทึบ/ดำ ไม่มี effect หรือของตกแต่งทับสัญลักษณ์และ quiet zone

Header เดิมไม่ได้ถูกล็อกรูปลักษณ์อีกต่อไปตามคำสั่งล่าสุด แต่ตำแหน่งควบคุมและความหมายการใช้งานยังคงอยู่ หลีกเลี่ยงหัวเรื่องใหญ่หรือคำโปรยในจอที่แย่งพื้นที่บัตร Preview ใหม่จึงใช้หัวเรื่องสั้น 22 แทน marketing headline เดิม

## สถานะของต้นฉบับ

อ้างอิง [Lagoon HTML](../../design-previews/bemem-redesign/lagoon.html), [Lagoon PNG](../../design-previews/bemem-redesign/lagoon.png), [experimental tokens](../../design-previews/bemem-redesign/experimental-tokens.json) และ [design review](../../design-previews/bemem-redesign/DESIGN-REVIEW.md) เป็นหลัก

อ่าน Design System v1.0 ครบทั้ง [MASTER](../bemem/MASTER.md), [TOKENS](../bemem/TOKENS.json), [COMPONENTS](../bemem/COMPONENTS.md), [VALIDATION](../bemem/VALIDATION.md) เพื่อรับรู้บริบท/ข้อจำกัด ไม่บังคับ Header lock หรือ palette ของระบบเดิมกับงานนี้ และไม่แก้ไขไฟล์เดิมเหล่านั้น

## Architecture ของ tokens

```text
core ───────────── geometry / typography / materials / states / motion
palettes[id].colors ──> virtual palette ──> semantic ──> components
platformRendering ─────────────────────────> rendering adapter (future)
themeApiContract ──> local preference only (future); never wallet storage
```

`lagoon-mint` เป็นค่าเริ่มต้น IDs เป็น kebab-case และต้องตรงกันใน JSON/API/Preview: `lagoon-mint`, `blush-pink`, `warm-beige`, `lilac-dream`, `sky-blue`, `pearl-gray` ไม่มี Peach Glow

Semantic references ใช้รูป `{palette.canvas.base}` หรือ `{semantic.text.primary}` โดย `palette` คือสีของ themeId ที่เลือก ไม่ใช่การ duplicate Core ให้ครบ 6 ชุด รายละเอียด resolver และ API อยู่ใน THEME-API ส่วน helper Python ของ Preview ใช้ตรวจสัญญานี้เท่านั้น ไม่ใช่ Theme Provider ในแอป

JSON นี้เป็นรูปแบบของ bemem ไม่อ้างว่าเป็น DTCG schema โดยตรง หน่วย geometry เป็น logical RN units, durations เป็น ms, alpha เป็น 0–1, native blur intensity ไม่ใช่ CSS px ห้าม spread metadata/material recipe ทั้งก้อนเข้า View props

## การแยก version

- `version: 2.0.0-rc.1` คือรุ่นดีไซน์ candidate ใหม่; rc ไม่ใช่ release ของแอป
- `schemaVersion: 1` ใน tokens เป็นสัญญาการอ่าน tokens เท่านั้น
- schemaVersion ของ preference ในอนาคตเป็นอีกสัญญาหนึ่ง และไม่เกี่ยวกับ Canvas schemaVersion
- เปลี่ยน DS version ไม่ต้อง migrate card/layout data ห้ามผูกสีเข้ากับข้อมูลตำแหน่งบัตร

หลังอนุมัติให้เปลี่ยนสถานะเอกสารเป็น approved โดยไม่อ้างว่า runtime เปลี่ยนแล้ว งาน implementation ต้องระบุ component และ provider ที่อนุมัติแยก การเปลี่ยน namespace/ความหมาย token แบบ breaking ต้องเปลี่ยน major และมี deprecation mapping ไม่ลบชื่อเก่าเงียบ ๆ

## การเปลี่ยนธีมในอนาคต

ผู้ใช้เลือกสีได้โดยไม่สมัครบัญชี จำ themeId ไว้ใน Documents ส่วน preference ของแอป อ่านสีเดิมเมื่อเปิดใหม่ ใช้ Mint เมื่อยังไม่มีค่า ส่วนไฟล์เสียหรือ schema ไม่รู้จักต้องเก็บต้นฉบับไว้และรายงาน error ไม่เขียนทับเอง รายละเอียดนี้เป็น **API contract เท่านั้น** ยังไม่มี Theme Picker, Provider หรือ preference file ถูกสร้าง

## ขอบเขตการอนุมัติ

อำนาจตัดสินใจเรียงจากข้อกำหนดผู้ใช้ → MASTER/CI/COMPONENTS → ค่าตัวเลขใน TOKENS → MATERIALS/platform policy → คำแนะนำ Skill หากเอกสารขัดกันให้เสนอแก้ก่อนใช้ ไม่เลือกคำแนะนำอัตโนมัติมาเปลี่ยนแบรนด์

ทุก UI ที่นำระบบใหม่นี้ไปใช้ในอนาคตต้องอ้างอิง tokens กลาง ไม่เพิ่ม hex/radius/shadow รายหน้าโดยไม่ review รอบนี้ไม่แก้ AGENTS.md, bemem-theme.ts, Skill หรือ source แอปจริง และไม่อนุญาตให้ generator persist ทับ DS/Preview เก่า

ประวัติ: 2.0.0-rc.1 — นำ Lagoon ที่เลือกมาเป็น master language, เพิ่ม 6 palettes, วัสดุ gel และสัญญา theme preference; รอตรวจและยังไม่ใช้ใน runtime
