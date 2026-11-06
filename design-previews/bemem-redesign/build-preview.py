"""Build local static design artifacts only. No app/storage/network access or dependencies."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parent
TOKENS = json.loads((ROOT / "experimental-tokens.json").read_text(encoding="utf-8"))
FIXTURE = json.loads((ROOT / "preview-fixture.json").read_text(encoding="utf-8"))
THEMES = TOKENS["themes"]

ICONS = {
    "search": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "check": '<path d="m5 12 4.5 4.5L19 7"/>',
    "arrow": '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    "grip": '<path d="m9 3 3-2 3 2M9 21l3 2 3-2M3 9l-2 3 2 3M21 9l2 3-2 3"/>',
    "lock": '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    "signal": '<path d="M4 18v2m5-6v6m5-11v11m5-16v16"/>',
    "wifi": '<path d="M2 8a17 17 0 0 1 20 0M5 12a12 12 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".7"/>',
}


def icon(name):
    return f'<svg aria-hidden="true"><use href="#i-{name}"/></svg>'


def defs():
    return '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>' + ''.join(
        f'<symbol id="i-{name}" viewBox="0 0 24 24">{paths}</symbol>' for name, paths in ICONS.items()
    ) + '</defs></svg>'


def control(kind, text='', extra='', content=None):
    inner = content if content is not None else icon(kind)
    return f'<span class="control {extra}">{inner}{f"<span>{text}</span>" if text else ""}</span>'


def card_html(card, pos, mode):
    selected = mode == 'create' and card['id'] == 'demo-coffee'
    values = f'--col:{pos["col"]};--row:{pos["row"]};--w:{card["cols"]};--h:{card["rows"]}'
    pin = f'<span class="drag-pin">{icon("grip")}</span>' if selected else ''
    return f'''<div class="card {card['short']} {card['orientation']} {'selected' if selected else ''}"
        data-card-id="{card['id']}" data-col="{pos['col']}" data-row="{pos['row']}" style="{values}">
        <div class="art"><i></i></div>
        <div class="card-top"><span class="mark">{card['mark']}</span><span class="serial">{card['number']}</span></div>
        <div class="card-bottom"><span class="card-name">{card['name']}</span><span class="card-category">{card['category']}</span></div>{pin}
    </div>'''


def phone(theme, mode):
    t = THEMES[theme]
    editing = mode == 'create'
    layout = FIXTURE['draftLayout' if editing else 'savedLayout']
    header_text = t['createHeadline' if editing else 'headline']
    kicker = 'YOUR CANVAS / DRAFT' if editing else t['micro']
    rail = f'''<div class="action-rail" data-control="action-rail">
        <span data-control="create-fab">{control('plus', extra='fab')}</span>
        <span class="rail-message"><strong>Unsaved draft</strong><span>1 card moved</span></span>
        <span data-control="save">{control('check','Save',extra='save')}</span>
    </div>''' if editing else f'<div class="phone-bottom-note">{icon("lock")}<span>On your device. Always with you.</span></div>'
    caption = 'Draft / preview only' if editing else 'Saved layout'
    return f'''<figure class="screen-wrap" data-theme="{theme}" data-mode="{mode}">
      <figcaption class="screen-caption"><b>{'Create' if editing else 'Home'}</b><span>{caption}</span></figcaption>
      <div class="phone is-{mode}" role="img" aria-label="{t['name']} {mode}: four fictional cards; static visual only">
        <div class="status-bar"><span>9:41</span><span class="island"></span><span class="system-icons">{icon('signal')}{icon('wifi')}<span class="battery"></span></span></div>
        <div class="app-header"><div class="wordmark">bemem<span class="brand-point">.</span></div>
          <div class="header-controls"><span data-control="search">{control('search')}</span><span data-control="create">{control('plus','Create',extra='create',content='')}</span></div>
        </div>
        <div class="wallet-intro"><div class="kicker">{kicker}</div><h3>{header_text}</h3><div class="count"><span></span>04</div></div>
        <div class="canvas" data-layout="{'draft' if editing else 'saved'}">
          {'<div class="grid-layer"></div><div class="origin"></div>' if editing else ''}
          {''.join(card_html(c, layout[c['id']], mode) for c in FIXTURE['cards'])}
        </div>
        {rail}<span class="home-indicator"></span>
      </div>
    </figure>'''


def swatches(t):
    return '<span class="swatches" aria-label="Experimental palette">' + ''.join(
        f'<i style="background:{t["colors"][key]}"></i>' for key in ['canvas','ink','accent','secondary']
    ) + '</span>'


def theme_intro(key):
    t = THEMES[key]
    return f'''<div class="theme-intro" id="{key}"><div class="theme-name-line"><span class="theme-number">{t['number']}</span><h2>{t['name']}</h2></div>
      <p class="personality">{t['character']}</p><p class="thai">{t['thai']}</p>{swatches(t)}</div>'''


def masthead():
    return '<header class="masthead"><div class="studio-brand">bemem<span>visual exploration / 2026</span></div><div class="edition">THREE DIRECTIONS · ONE WALLET<br>EXPERIMENTAL / V0.1</div></header>'


def footer():
    return '<footer class="footer"><span>bemem / Full Visual Redesign · Static HTML + CSS · All card data is fictional.</span><span>Local files only. No app code, layout storage, or Design System v1.0 was changed.</span></footer>'


def head(title):
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light"><meta name="description" content="Three experimental bemem visual directions. Static, local, no real card data.">
    <title>{escape(title)}</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="theme-variables.css"></head>'''


NOTICE = '<div class="notice"><strong>Visual Preview เท่านั้น</strong> — ปุ่มบนภาพโทรศัพท์, Drag & Drop และ Save ไม่ทำงานจริง ไม่มีการอ่านหรือเขียนผังบัตร ใช้ข้อมูลสมมติชุดเดียวกันทั้ง 3 ธีม</div>'


def quiet_zone():
    return '''<div class="quiet-zone"><div class="code-contract">QR / CODE 128</div><p><strong>One invariant: the code comes first.</strong><br>พื้นที่รหัสในอนาคตเป็นขาวทึบ รหัสดำ ไม่มี glass, blur หรือแสงสะท้อนทับรหัส/quiet zone<br>กรอบนี้เป็นข้อกำหนด ไม่ใช่ QR/Barcode ที่สแกนได้ และไม่ใช่ฟีเจอร์ที่สร้างเพิ่ม</p></div>'''


def index_page():
    columns = ''
    for key, t in THEMES.items():
        columns += f'''<section class="theme-column theme-{key}" aria-label="{t['name']} theme">
        {theme_intro(key)}{phone(key,'home')}{phone(key,'create')}
        <div class="theme-summary"><span class="tag">{t['recommendation']}</span><h3>{t['material']['name']}</h3>
        <p>{t['strengths']}</p><p><a href="{key}.html">ดูวัสดุ ปุ่ม และสถานะของ {t['name']} →</a></p></div></section>'''
    rows = [
        ('บุคลิก','Minimal premium / warm editorial','Soft, welcoming / tactile','Futuristic / precise / dark'),
        ('สีและตัวอักษร','Ivory + brass · Instrument Serif / Manrope','Seafoam + deep teal · Manrope','Graphite + signal lime · Space Grotesk'),
        ('ชั้นวัสดุ','กระจกแชมเปญบางกับพื้นเซรามิก','กระจกน้ำนม ขอบนุ่มเหมือน gel','กระจก graphite ขอบเย็นและแสงแคบ'),
        ('ต้นทุนเมื่อทำ Native','ต่ำ–กลาง: ลด blur แล้วยังมีบุคลิก','กลาง: ต้องคุมผิวและเงานุ่ม','กลาง–สูง: ต้องคุม rim light และ contrast บนพื้นเข้ม'),
        ('จุดต้องทดสอบ','Serif เล็ก/บาง และ contrast ขอบปุ่ม','ภาพใต้กระจกและจอความสว่างต่ำ','แสงจ้าและการเปลี่ยนไปแผ่นรหัสขาว'),
        ('เหมาะเมื่อ','อยากเปิดใช้ทุกวันโดยไม่เหนื่อยสายตา','อยากให้ bemem เข้าถึงง่ายและเป็นมิตร','อยากได้บุคลิกที่จำได้ทันที'),
    ]
    table = '<div class="table-scroll"><table><thead><tr><th>มุมเปรียบเทียบ</th><th>01 Atelier</th><th>02 Lagoon</th><th>03 Ion</th></tr></thead><tbody>' + ''.join(
        '<tr>' + ''.join(f'<{("th" if i==0 else "td")}>{value}</{("th" if i==0 else "td")}>' for i,value in enumerate(row)) + '</tr>' for row in rows
    ) + '</tbody></table></div>'
    return head('bemem — Three visual directions') + f'''<body>{defs()}<main class="page">{masthead()}
      <section class="intro"><div><div class="eyebrow">A new identity, with room to choose.</div><h1>One wallet.<br><em>Three different worlds.</em></h1></div>
      <p class="intro-note">ออกแบบใหม่ทั้งหน้า ไม่ล็อก Header หรือ CI เดิม<br>แต่คงตำแหน่ง Search / Create / FAB / Save<br>และประสบการณ์ “เปิด → แตะบัตร → สแกน”</p></section>{NOTICE}
      <nav class="nav" aria-label="Preview navigation"><a href="#atelier">01 Atelier</a><a href="#lagoon">02 Lagoon</a><a href="#ion">03 Ion</a><a href="#comparison">เปรียบเทียบและคำแนะนำ</a><a href="contact-sheet.html">ดู 6 หน้าจอแบบแผ่นเดียว</a></nav>
      <div class="themes-grid">{columns}</div>
      <section class="comparison" id="comparison"><div class="eyebrow">The design decision</div><h2>Different personalities. The same job.</h2>{table}
      <div class="recommendation"><div><p class="lead">Atelier for the everyday.<br>Lagoon for the feeling.<br>Ion for the statement.</p><p>แนะนำ <strong>Atelier</strong> เป็นจุดเริ่มต้น เพราะอ่านง่ายและทำ fallback ได้โดยไม่เสียบุคลิก แต่ไม่ใช่ผลทดสอบผู้ใช้จริง หากต้องการแบรนด์ที่เป็นมิตรที่สุด เลือก Lagoon; หากต้องการความโดดเด่นที่สุด เลือก Ion</p></div>
      <div class="box"><strong>เปรียบเทียบบนข้อมูลเดียวกันจริง</strong><p>Home ทั้งหมดใช้ Saved Layout เดียวกัน ส่วน Create ใช้ Draft เดียวกันที่เลื่อน Coffee Club ลงหนึ่งช่อง เพื่อแสดงสถานะก่อน Save ไม่ได้เปิดแก้ layout ในเครื่อง</p><p>ไม่มีแถบแต้ม คะแนน โปรโมชั่น แท็บใหม่ หรือระบบบัญชีแฝงเข้ามา ทุกภาพคงฟังก์ชันเดิมและพื้นที่ควบคุมที่กำหนด</p></div></div>{quiet_zone()}</section>
      {footer()}</main></body></html>'''


def specimens(key):
    return f'''<div class="material-stage theme-{key}"><div class="eyebrow">Save / state specimens</div>
      <div class="state-row"><span class="state-label">Default</span>{control('check','Save',extra='save')}</div>
      <div class="state-row state-pressed"><span class="state-label">Pressed</span>{control('check','Save',extra='save')}</div>
      <div class="state-row state-disabled"><span class="state-label">Disabled</span>{control('check','Save',extra='save')}</div>
      <div class="state-row state-saving"><span class="state-label">Saving</span>{control('', 'Saving…', extra='save',content='<i class="spinner-static"></i>')}</div>
      <div class="eyebrow" style="margin-top:24px">Add Card / future labeled control</div>
      <div class="state-row">{control('plus','Add Card',extra='create')}</div>
    </div><div class="empty-specimen theme-{key}" data-scenario="home-empty"><p>A little space<br>for your first card.</p><small>Home empty / ไม่มีบัตรเท่านั้น</small><span data-control="home-empty-fab">{control('plus',extra='fab')}</span></div>'''


def detail_page(key):
    t = THEMES[key]; m = t['material']
    return head(f'bemem — {t["name"]}') + f'''<body class="theme-detail"><span id="capture"></span>{defs()}<main class="page">{masthead()}
      <nav class="nav"><a href="index.html">← เปรียบเทียบทั้ง 3 ธีม</a><a href="atelier.html">Atelier</a><a href="lagoon.html">Lagoon</a><a href="ion.html">Ion</a><a href="experimental-tokens.json">Experimental tokens</a></nav>
      <section class="intro"><div><div class="eyebrow">Direction {t['number']} / {t['character']}</div><h1>{t['name']}<em>.</em></h1></div><p class="intro-note">{t['thai']}<br>{t['suitability']}</p></section>{NOTICE}
      <div class="detail-layout"><div class="two-screens theme-{key}">{phone(key,'home')}{phone(key,'create')}</div>
      <aside class="material-panel"><span class="tag">{t['recommendation']}</span><h2>{m['name']}</h2><dl>
      <dt>Palette</dt><dd>{t['colors']['canvas']} / {t['colors']['ink']}<br>{t['accentName']} {t['colors']['accent']}</dd>
      <dt>Typography</dt><dd>{t['type']['display']} / {t['type']['body']}<br>Thai: Noto Sans Thai</dd>
      <dt>Glass material</dt><dd>{m['depth']}<br>Browser blur {m['cssBlurPx']}px · fill alpha {m['fillAlpha']}</dd>
      <dt>Specular / rim light</dt><dd>{m['highlight']}<br>{m['rim']}</dd>
      <dt>Fallback / no blur</dt><dd>Opaque surface {m['fallback']}<br>คง contrast, ขอบ และตำแหน่งปุ่ม</dd></dl>{specimens(key)}</aside></div>
      <p class="capture-material">{m['name']} / blur simulation {m['cssBlurPx']}px / {t['type']['display']} + {t['type']['body']} / Home + Create · fictional data only</p>
      <section class="detail-notes"><h2>What this direction changes</h2><p>เสนอ CI, wordmark, typography, พื้นหลัง, วัสดุกริด, ภาพบัตร และ controls ใหม่ทั้งหมด ภาพบัตรเป็นงาน vector/CSS ของบัตรสมมติ ไม่ใช่รูปแบรนด์หรือข้อมูลสมาชิกจริง</p>
      <div class="control-map"><div><strong>รักษาตำแหน่ง</strong>Search ใน Header ขวา, Create ขวาบน, Create FAB ซ้ายล่าง, Save ขวาล่าง และ Home FAB ขวาล่างเฉพาะกระเป๋าว่าง</div><div><strong>รักษาฟังก์ชัน</strong>Home ไม่มี drag; Create มีผังร่าง; Saved/Draft และ Save/Discard/Cancel ไม่เปลี่ยน ไม่อ่านหรือเขียน storage จากหน้า Preview</div></div>
      <h2>ข้อดี / ข้อควรระวัง</h2><p><strong>ข้อดี:</strong> {t['strengths']}</p><p><strong>ข้อควรระวัง:</strong> {t['risks']}</p>
      <h2>Micro-interactions / proposed, not running</h2><p>Pressed feedback {t['motion']['pressMs']}ms, release {t['motion']['releaseMs']}ms และการเปลี่ยนแผ่นข้อมูลไม่เกิน {t['motion']['entryMs']}ms เป็นค่าทดลองเท่านั้น เปลี่ยนสี/opacity โดยไม่ย้ายปุ่ม ไม่มีการรอ animation ก่อนเปิดรหัส Reduce Motion = 0ms</p>
      <h2>Android / iOS translation</h2><p>CSS backdrop blur เป็นภาพจำลองใน Browser ไม่ใช่หลักฐานว่า Native ทำเหมือนกันได้ทันที iOS ประเมิน provider ที่รองรับและ capability checks; Android ใช้ opaque fallback ก่อนจนอนุมัติ provider และทดสอบ frame budget แยก ไม่ animate blur/แสงสะท้อนระหว่างลาก ไม่เพิ่ม dependency ในงานนี้</p>
      <h2>Draft and persistence</h2><p>เส้นประคือ Saved origin ของ Coffee Club ภาพ Create เลื่อนบัตรลงหนึ่งช่องเท่ากันทุกธีม Save และปุ่มในภาพเป็นตัวอย่างเท่านั้น ไม่มีการจำลองผลสำเร็จหรือแก้ข้อมูลจริง</p>{quiet_zone()}</section>{footer()}</main></body></html>'''


def contact_sheet():
    columns=''.join(f'<section class="theme-column theme-{key}">{theme_intro(key)}{phone(key,"home")}{phone(key,"create")}</section>' for key in THEMES)
    return head('bemem — Six-screen contact sheet') + f'''<body class="sheet">{defs()}<main class="page">{masthead()}
      <div class="contact-intro"><h1>Three directions.<br>One everyday wallet.</h1><p>Home + Create · ข้อมูลและพิกัดเดียวกันทุกธีม<br>Static preview only — no actual drag, save, or real member data.<br><a href="index.html">← กลับหน้าเปรียบเทียบ</a></p></div>
      <div class="themes-grid">{columns}</div>{footer()}</main></body></html>'''


def variable_css():
    blocks=[]
    for key,t in THEMES.items():
        c=t['colors'];g=t['geometry'];ty=t['type'];m=t['material']
        values={
            'canvas':c['canvas'],'ink':c['ink'],'muted':c['muted'],'accent':c['accent'],'on-accent':c['onAccent'],
            'glass':c['glass'],'glass-border':c['glassBorder'],'secondary':c['secondary'],'grid':c['grid'],
            'coffee':c['cardCoffee'],'everyday':c['cardEveryday'],'travel':c['cardTravel'],'weekend':c['cardWeekend'],
            'card-white':c['cardInk'],'card-dark':c['lightCardInk'],'tracking':f"{ty['letterSpacing']}px",
            'logo-size':f"{ty['logoSize']}px",'heading-size':f"{ty['headingSize']}px",'card-weight':ty['cardWeight'],
            'control-radius':f"{g['controlRadius']}px",'fab-radius':f"{g['fabRadius']}px",'save-radius':f"{g['saveRadius']}px",'card-radius':f"{g['cardRadius']}px",
            'material-shadow':m['shadow'],'blur':f"{m['cssBlurPx']}px",'fallback':m['fallback'],
        }
        blocks.append(f'.theme-{key}'+'{'+''.join(f'--{k}:{v};' for k,v in values.items())+'}')
    return '/* Experimental, generated from experimental-tokens.json. Not imported by the app. */\n'+'\n'.join(blocks)+'\n'


def main():
    files={'index.html':index_page(),'contact-sheet.html':contact_sheet(),'theme-variables.css':variable_css()}
    files.update({f'{key}.html':detail_page(key) for key in THEMES})
    for name,content in files.items():
        destination=ROOT/name
        if destination.is_symlink(): raise RuntimeError('Refusing to follow symlink: '+str(destination))
        destination.write_text(content,encoding='utf-8')
        print(name)


if __name__=='__main__': main()
