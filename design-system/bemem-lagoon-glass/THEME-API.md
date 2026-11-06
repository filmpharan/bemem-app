# Lagoon Glass — Theme API & Offline Preference Contract

Version 2.0.0-rc.1 · **API design only** · ไม่มี Theme Provider, Picker หรือ preference persistence ใน source แอปจริง

## Token contract

ชื่อ top-level ที่เสถียร: `core`, `semantic`, `palettes`, `components`, `platformRendering`, `themeApiContract`, `validationTargets` โดย metadata ระบุเวอร์ชันและสถานะ

| Layer | ข้อมูล | สิ่งที่ห้ามปน |
| --- | --- | --- |
| Core | ฟอนต์ spacing radius geometry material alpha motion states | สีเฉพาะหนึ่ง palette, card positions |
| Semantic | บทบาทสีของ canvas/text/action/glass/rim/highlight/shadow | ชื่อหน้าจอหรือ component เฉพาะที่ทำให้ role ซ้ำ |
| Palette colors | ค่าสีตาม semantic roles ที่เลือก | geometry, ฟอนต์, interaction behavior |
| Component | geometry refs, role/state mapping, labels และข้อจำกัด | callback Save, layout reducer, storage implementation |
| Platform policy | capability/fallback และ budget | platform-dependent theme identity หรือ wallet schema |

คีย์ใช้ lowerCamelCase สำหรับ property และ kebab-case สำหรับ themeId ไม่ใส่ชื่อสีตรง ๆ ใน API ของ component เช่นใช้ `semantic.action.primary` ไม่ใช้ `mintButtonGreen`

## Resolve algorithm

1. ตรวจ `themeId` กับ metadata.themeIds และ palettes
2. สร้าง virtual namespace `palette = palettes[themeId].colors`
3. Resolve alias ที่ตรงทั้งสตริง `{path.to.value}` ผ่าน context root; ปฏิเสธ alias ที่ไม่มีอยู่หรือเป็นวงจร
4. อ่าน Core เดียวกันทุกธีม Resolve Semantic และ Component จากสีที่เลือก ไม่สร้าง Core อีก 6 ชุด
5. เลือก material role จาก state และ platform policy; resolve สี + alpha เป็น rgba และ geometry เป็น native style numbers
6. คืน tokens/renderingPolicy สำหรับ view adapter เท่านั้น ไม่คืน cards/positions/Saved/Draft

ตัวอย่าง alias: `{palette.canvas.base}` → selected palette canvas; `{semantic.text.primary}` → foreground ที่แก้แล้ว; `{core.geometry.fab}` → object ร่วม 56×56 radius 22

ห้ามส่ง alias string, `fillAlpha`, `roles`, `interactive`, provider names หรือ metadata เป็น RN style โดยตรง ตัวแปลงในอนาคตต้องแยก background/border ไป View, foreground ไป Text/Icon และ shadow ไป renderer เดียว

Preview มี `contract.py` เพื่อ resolve/ตรวจเอกสารและสร้าง static HTML ไม่ใช่ runtime Theme Provider และไม่ถูก import โดย Expo

## Proposed public API

ตัวอย่าง TypeScript ต่อไปนี้เป็นเอกสารสัญญา ไม่ใช่ไฟล์ .ts ที่สร้างในแอป:

```ts
type ThemeId =
  | 'lagoon-mint' | 'blush-pink' | 'warm-beige'
  | 'lilac-dream' | 'sky-blue' | 'pearl-gray';

type PreferenceStatus = 'loading' | 'default' | 'ready' | 'saving' | 'error-readonly';
type ThemeChangeResult =
  | { ok: true; themeId: ThemeId }
  | { ok: false; code: 'INVALID_THEME' | 'PREFERENCE_READ_ONLY' | 'WRITE_FAILED' };

// RenderingEnvironment, ResolvedTheme and RenderingPolicy follow the JSON contract.
// Pure resolution: no wallet or layout input.
declare function resolveTheme(themeId: ThemeId, environment: RenderingEnvironment): ResolvedTheme;

// Future hook, not implemented in this task. Provider name: BememThemeProvider.
declare function useBememTheme(): {
  themeId: ThemeId;
  tokens: ResolvedTheme;
  renderingPolicy: RenderingPolicy;
  preferenceStatus: PreferenceStatus;
  setColorTheme(id: ThemeId): Promise<ThemeChangeResult>;
};
```

`ResolvedTheme`/`RenderingPolicy` เป็นผลตาม algorithm ข้างบน ไม่ใช่การอ้างว่ามี TS interfaces หรือ dependency เหล่านี้แล้ว การเลือก provider abstraction นี้ยังรออนุมัติงาน implementation

## Boot contract

- themeId เริ่มต้นคือ `lagoon-mint` ถ้าไม่มี preference
- ในอนาคตโหลด preference ขนาดเล็กก่อน first themed screen โดยทำงานร่วมกับ local startup ที่จำเป็น ไม่ต่อคิวหลัง network/font download/blur animation
- เปิดแอปใหม่ต้องเข้า Home ตามเดิม แม้ครั้งก่อนเลือกสีขณะอยู่ Create
- Read success: ใช้ themeId ที่บันทึกแล้ว ไม่คืน Draft หรือ Create mode จาก preference
- ไม่มีไฟล์: ใช้ Mint ในหน่วยความจำ ไม่สร้างไฟล์เพียงเพราะเปิดแอป
- Read failure/JSON เสีย: ใช้ Mint ในหน่วยความจำพร้อม error-readonly เก็บไฟล์เดิม ไม่เขียนทับเมื่อ boot และไม่ทำให้บัตรอ่านไม่ได้
- ไม่รู้จัก schema: block preference writes จนมี migration/recovery ที่อนุมัติ; ห้ามเดา schema
- themeId ไม่รองรับ รวม `peach-glow`: ใช้ Mint ในหน่วยความจำ ไม่ map ไปสีอื่นหรือ rewrite ไฟล์อัตโนมัติ การเลือกสีใหม่โดยผู้ใช้ภายหลังต้องเป็น operation ที่ชัดเจน

## Preference data shape

ตัวอย่าง **ในเอกสารเท่านั้น** เสนอเก็บแยกที่ Documents `bemem/preferences/theme.v1.json`:

```json
{ "schemaVersion": 1, "themeId": "lagoon-mint" }
```

ไม่เก็บ resolved tokens, component states, cards, images, account IDs, positions, Saved/Draft, theme preview artifacts หรือ DS version ที่บังคับย้าย wallet ข้อมูลที่จำเป็นมีเพียง preference schema และ themeId

ใช้พื้นที่ Documents ของแอปในอนาคต ไม่ใช้ cache หรือ browser localStorage และไม่อัปโหลด Cloud/ต้องสมัครบัญชี [Expo FileSystem SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) เป็นแนวทาง API แต่รอบนี้ไม่มีการสร้างไฟล์ preference หรือเรียกเขียน Documents

OS Auto Backup/reinstall เป็นอีกเรื่องจาก app-local storage ต้องยืนยันนโยบาย standalone Android/iOS ก่อน release ไม่สัญญาว่า preference หรือข้อมูลบัตรจะรอดการถอนติดตั้ง

## setColorTheme contract

1. ตรวจ ID และสถานะ read-only ก่อนเริ่ม
2. Serialize preference writes เพื่อไม่ให้ผลเขียนเก่าย้อนทับตัวเลือกล่าสุด
3. เขียน/ตรวจ preference ด้วย staged commit ที่รักษา last confirmed value เมื่อเกิดข้อผิดพลาด; ต้องตรวจ crash/recovery บนอุปกรณ์จริง ไม่สมมติว่า move ทุกกรณี atomic
4. Publish สีใหม่และคืน ok เมื่อ commit preference สำเร็จแล้ว ในขณะที่ Canvas ไม่กำลังอยู่กลาง gesture หากต้องรอ idle ไม่เพิ่มงานต่อเฟรมของ gesture
5. หาก write fail ให้สี/ค่าที่บันทึกล่าสุดคงอยู่ คืน WRITE_FAILED และ error ที่อ่านได้ ไม่แสดงผลจำสีสำเร็จปลอม
6. เปลี่ยนเฉพาะ resolved semantic colors/paint ไม่ remount Canvas ไม่ reset state ไม่เปลี่ยน logical geometry/card artwork

Preference commit และ wallet Save เป็นสอง operation ที่ไม่ผูกกัน การเลือกสีขณะมี dirty Draft ไม่ยืนยัน Draft และการ Discard ผังไม่ยกเลิกสีที่ผู้ใช้บันทึกสำเร็จแยกไว้

## การอัปเดตและ rollback

DS minor เพิ่ม semantic key หรือ palette ได้แบบเข้ากันได้; ลบ/เปลี่ยนความหมาย themeId ต้องมี explicit preference migration ที่รักษาไฟล์เดิม ส่วน wallet schema ไม่เปลี่ยนตาม DS major

หากเลือก rendering fallback ไม่เปลี่ยน themeId ที่จำไว้ เพราะ capability เป็นเรื่องอุปกรณ์ ไม่ใช่ความชอบของผู้ใช้ การ rollback visual adapter ต้องไม่ลบ preference หรือข้อมูลบัตร

## สิ่งที่ไม่สร้างในรอบนี้

ไม่มี UI Theme Picker, Provider/Context/hook จริง, settings route, preference writer, migration, analytics หรือ account API ไม่มีการแก้ Storage/Canvas เดิม และไม่ได้เพิ่มฟังก์ชัน switch ธีมให้ Expo App จากเอกสารนี้
