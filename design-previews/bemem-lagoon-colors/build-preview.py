"""Generate new static artifacts only. No app APIs, user data, network or packages."""
from pathlib import Path
from html import escape
import json
from contract import ROOT, DS, load_contract, resolve_theme, rgba

D = load_contract()
FIXTURE = json.loads((ROOT / 'fixture.json').read_text(encoding='utf-8'))
IDS = D['metadata']['themeIds']
ICONS = {
 'search':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>',
 'check':'<path d="m5 12 4.5 4.5L19 7"/>',
 'lock':'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 'grip':'<path d="m9 3 3-2 3 2M9 21l3 2 3-2M3 9l-2 3 2 3M21 9l2 3-2 3"/>',
 'signal':'<path d="M4 18v2m5-6v6m5-11v11m5-16v16"/>',
 'wifi':'<path d="M2 8a17 17 0 0 1 20 0M5 12a12 12 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".7"/>',
}

def icon(name): return f'<svg aria-hidden="true"><use href="#i-{name}"/></svg>'
def defs(): return '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>'+''.join(f'<symbol id="i-{name}" viewBox="0 0 24 24">{shape}</symbol>' for name,shape in ICONS.items())+'</defs></svg>'

def gel(kind, active=False, busy=False, label=None):
    action = kind=='save' or kind=='create' and active
    names={'search':'','create':'Create','fab':'','save':'Save','add-card':'Add Card'}
    text=label if label is not None else names[kind]
    glyph={'search':'search','create':None,'fab':'plus','save':'check','add-card':'plus'}[kind]
    mark='<i class="busy-ring"></i>' if busy else icon(glyph) if glyph else ''
    if busy:text='Saving…' if kind=='save' else 'Adding…'
    return f'''<span class="gel {kind}{' action' if action else ''}{' selected' if active and kind=='search' else ''}">
      <span class="gel-depth"></span><span class="gel-specular"></span>
      <span class="gel-content">{mark}{f'<span>{text}</span>' if text else ''}</span></span>'''

def card(c,pos,mode):
    selected=mode=='create' and c['id']=='demo-coffee'
    style=f'--col:{pos["col"]};--row:{pos["row"]};--w:{c["cols"]};--h:{c["rows"]}'
    pin=f'<span class="drag-pin">{icon("grip")}</span>' if selected else ''
    return f'''<div class="card {c['short']} {c['orientation']}{' selected' if selected else ''}"
      data-card-id="{c['id']}" data-col="{pos['col']}" data-row="{pos['row']}" style="{style}">
      <div class="card-art"><i></i></div><span class="card-mark">{c['mark']}</span><span class="card-name">{c['name']}</span>{pin}</div>'''

def phone(theme,mode):
    p=D['palettes'][theme]; editing=mode=='create';layout=FIXTURE['draftLayout' if editing else 'savedLayout']
    title='Arrange your cards' if editing else 'Your cards'
    sub='Draft layout · not saved' if editing else 'A little pocket of everyday.'
    footer=f'''<span class="draft-note"><i></i>1 unsaved move</span><div class="action-rail">
      <span data-control="create-fab">{gel('fab')}</span><span data-control="save">{gel('save')}</span></div>''' if editing else f'<div class="home-note">{icon("lock")}<span>On this device. Always yours.</span></div>'
    return f'''<figure class="screen-wrap" data-theme="{theme}" data-mode="{mode}"><figcaption class="screen-caption"><b>{mode.title()}</b><span>{'Draft / sample' if editing else 'Saved / sample'}</span></figcaption>
      <div class="phone is-{mode}" role="img" aria-label="{p['name']} {mode}, fictional cards, static preview only">
      <div class="status-bar"><span>9:41</span><span class="island"></span><span class="system-icons">{icon('signal')}{icon('wifi')}<i class="battery"></i></span></div>
      <div class="app-header"><div class="wordmark">bemem<span>.</span></div><div class="header-controls">
      <span data-control="search">{gel('search')}</span><span data-control="create">{gel('create',active=editing)}</span></div></div>
      <div class="wallet-heading"><div><h3>{title}</h3><p>{sub}</p></div><span class="count-chip">04</span></div>
      <div class="canvas" data-layout="{'draft' if editing else 'saved'}">{'<div class="grid-layer"></div><div class="origin"></div>' if editing else ''}{''.join(card(c,layout[c['id']],mode) for c in FIXTURE['cards'])}</div>
      {footer}<span class="home-indicator"></span></div></figure>'''

def palette_title(theme,n):
    p=D['palettes'][theme];c=p['colors'];colors=[c['canvas']['base'],c['action']['primary'],c['action']['soft']]
    return f'''<div class="palette-title"><div><span class="number">COLOR {n:02d}{' / DEFAULT' if theme==IDS[0] else ''}</span><h2>{p['name']}</h2><p>{p['thaiName']} · {p['description']}</p></div><span class="swatches">{''.join(f'<i style="background:{x}"></i>' for x in colors)}</span></div>'''

def head(title):
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>{escape(title)}</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="palette-variables.css"></head>'''
def masthead():return '<header class="masthead"><div class="studio-logo">bemem<span>.</span><small>Lagoon Glass / color collection</small></div><div class="edition">2.0.0-RC.1 · DESIGN REVIEW<br>ONE LANGUAGE / SIX EXPRESSIONS</div></header>'
def footer():return '<footer class="footer"><span>bemem — Lagoon Glass · Static preview only · 7 Nov 2026</span><span>No application, wallet storage, previous previews or Design System files were changed.</span></footer>'
NOTICE='<div class="notice"><strong>Preview สำหรับตรวจดีไซน์เท่านั้น</strong> — ไม่มี Drag/Save หรือ Theme Picker ทำงานจริง บัตรและตำแหน่งเป็นข้อมูลสมมติชุดเดียวกันทุกสี ไม่อ่านหรือเขียนข้อมูลแอป</div>'
def nav():return '<nav class="nav" aria-label="Offline preview navigation"><a href="index.html">← เปรียบเทียบ 6 สี</a><a href="contact-sheet.html">ภาพรวม 12 หน้าจอ</a><a href="materials.html">Glass / รายละเอียดปุ่ม</a>'+''.join(f'<a class="palette-{key}" href="{key}.html"><i class="swatch-dot"></i>{D["palettes"][key]["name"]}</a>' for key in IDS)+'</nav>'

def expanded(theme):
    return f'''<div class="zoom-stage palette-{theme}"><div class="eyebrow">Soft Gel Glass / 2× material study · not touch dimensions</div>
      <div class="zoom-controls">{gel('search')}{gel('create',active=True)}{gel('fab')}{gel('save')}</div>
      <div class="zoom-legend"><div><strong>01 · Specular + rim</strong>แสงนิ่งด้านบนและขอบสองชั้น แยกจากเนื้อหาปุ่ม</div><div><strong>02 · Gel depth</strong>ส่วนโค้งภายในและเงาฐาน ไม่ใช่แค่สีโปร่ง</div><div><strong>03 · Independent content</strong>ข้อความ/ไอคอน opacity 1 ไม่ถูกแสงทับ</div></div></div>'''

def states(theme):
    return f'''<div class="state-table palette-{theme}">
      <div class="state-item">{gel('save')}<p>Default / Save</p></div>
      <div class="state-item state-pressed">{gel('save')}<p>Pressed / no movement</p></div>
      <div class="state-item state-active">{gel('create',active=True)}<p>Active / Create</p></div>
      <div class="state-item state-disabled">{gel('save')}<p>Disabled / unavailable</p></div>
      <div class="state-item state-busy">{gel('save',busy=True)}<p>Busy / sample only</p></div></div>'''

def empty(theme):
    return f'''<div class="empty-specimen palette-{theme}" data-scenario="home-empty"><h3>A little space for your first card.</h3><p>Home empty · ไม่มีบัตรเท่านั้น</p><span data-control="home-empty-fab">{gel('fab')}</span></div>'''

def scan():return '<div class="code-surface"><span class="code-box">QR / CODE 128</span><strong>White surface. Black code. No effects.</strong><p>ข้อกำหนดพื้นที่รหัสในอนาคต ไม่ใช่รหัสที่สแกนได้ ไม่มี glass/blur/gradient หรือของตกแต่งในสัญลักษณ์และ quiet zone</p></div>'

def index():
    groups=''
    for n,key in enumerate(IDS,1):
        p=D['palettes'][key]
        groups+=f'''<section class="palette-group palette-{key}" id="{key}">{palette_title(key,n)}{phone(key,'home')}{phone(key,'create')}<div class="palette-summary"><p>{p['description']}</p><a href="{key}.html">ดูคู่หน้าจอและวัสดุ {p['name']} →</a></div></section>'''
    rows=''.join(f'<tr><th>{p["name"]}</th><td>{p["description"]}</td><td>{p["colors"]["canvas"]["base"]}</td><td>{p["colors"]["action"]["primary"]}</td></tr>' for p in D['palettes'].values())
    return head('bemem — Lagoon Glass / six colors')+f'''<body>{defs()}<main class="page">{masthead()}<section class="intro"><div><div class="eyebrow">A chosen identity. A palette for every day.</div><h1>One glass language.<br><em>Six calm expressions.</em></h1></div><p>Lagoon Glass เป็น CI เดียวกันทั้ง 6 สี<br>คง Typography รูปทรง ระยะ และตำแหน่งปุ่ม<br>เปลี่ยนเฉพาะ UI palette — ไม่ย้อมบัตรสมาชิก</p></section>{NOTICE}{nav()}<div class="palette-grid">{groups}</div>
      <section class="comparison"><h2>Six colors. Not six different apps.</h2><div class="table-scroll"><table><thead><tr><th>Theme</th><th>บุคลิกของสี</th><th>Canvas</th><th>Primary action</th></tr></thead><tbody>{rows}</tbody></table></div>
      <p class="muted">Lagoon Mint เป็นค่าเริ่มต้น ไม่มี Peach Glow ในชุดใหม่ บัตร Weekend Club สี clay ในตัวอย่างเป็น artwork ของบัตรที่ตรึงไว้ ไม่ใช่สีธีมแอป</p><h2>Closer to the material.</h2>{expanded('lagoon-mint')}<p><a href="materials.html">ดูสถานะปุ่มและ fallback แบบไม่มี Blur →</a></p>{scan()}</section>{footer()}</main></body></html>'''

def individual(key):
    p=D['palettes'][key]
    return head('bemem — '+p['name'])+f'''<body class="palette-detail"><span id="capture"></span>{defs()}<main class="page">{masthead()}{nav()}<section class="intro"><div><div class="eyebrow">LAGOON GLASS / SHARED DESIGN SYSTEM{' / DEFAULT' if key==IDS[0] else ''}</div><h1>{p['name']}</h1></div><p>{p['thaiName']} · {p['description']}<br>Core, material geometry และข้อมูลบัตรเหมือนทุกสี</p></section>{NOTICE}
      <div class="two-screens palette-{key}">{phone(key,'home')}{phone(key,'create')}</div><p class="capture-material">Soft Gel Glass · shared geometry / fixed card artwork / local-only static preview · {p['name']}</p>
      <section class="material-panel"><h2>Glass, not just transparency.</h2>{expanded(key)}<h2 style="margin-top:25px">States / visual specimens only</h2>{states(key)}<p>Active ใช้กับ Create/Search เท่านั้น Saving แสดงเมื่อระบบกำลังบันทึกจริงในอนาคต ภาพนี้เป็น specimen ไม่ใช่ผลการบันทึก</p>
      <div class="fallback-grid"><div class="zoom-stage palette-{key} no-blur"><strong>No-blur embossed gel</strong><div class="zoom-controls" style="gap:16px">{gel('fab')}{gel('save')}</div><p>ผิวทึบยังมีแสง ขอบ ความลึก และเงานุ่ม แต่ไม่มี backdrop blur</p></div><div><h2>Add Card / future label</h2><div class="zoom-stage palette-{key}">{gel('add-card')}</div>{empty(key)}</div></div>{scan()}</section>{footer()}</main></body></html>'''

def contact():
    groups=''.join(f'<section class="palette-group palette-{key}">{palette_title(key,n)}{phone(key,"home")}{phone(key,"create")}</section>' for n,key in enumerate(IDS,1))
    return head('bemem Lagoon Glass — 12-screen contact sheet')+f'''<body class="contact">{defs()}<main class="page">{masthead()}<div class="contact-intro"><h1>Lagoon Glass.<br>One identity. Six colors.</h1><p>12 หน้าจอ · Home บน / Create ล่าง · layout และ artwork เดียวกัน<br>Static only: no theme switching, drag, save, or wallet storage access.<br><a href="index.html">← กลับหน้าเปรียบเทียบแบบ responsive</a></p></div><div class="contact-grid">{groups}</div>{footer()}</main></body></html>'''

def materials():
    rows=''.join(f'<section class="palette-group palette-{key}"><h2>{D["palettes"][key]["name"]}</h2>{states(key)}</section>' for key in IDS)
    return head('bemem Lagoon Glass — material study')+f'''<body>{defs()}<main class="page">{masthead()}{nav()}<section class="intro"><div><div class="eyebrow">Shared material recipe / all six palettes</div><h1>A softer kind<br>of <em>glass.</em></h1></div><p>ภาพขยายเพื่อดูผิวและแสง ไม่ใช่ขนาดพื้นที่แตะจริง<br>ไม่มี shimmer, glow pulse หรือแสงวิ่ง<br>Fallback ไม่มี blur แต่ยังรักษาบุคลิกวัสดุ</p></section>{NOTICE}{expanded('lagoon-mint')}
      <section class="material-panel"><h2>Default · pressed · active · disabled · busy</h2>{rows}<h2>Native blur is optional. Character is not.</h2><div class="fallback-grid"><div class="zoom-stage palette-lagoon-mint"><strong>Browser blur simulation</strong><div class="zoom-controls">{gel('fab')}{gel('save')}</div></div><div class="zoom-stage palette-lagoon-mint no-blur"><strong>Opaque gel fallback / no blur</strong><div class="zoom-controls">{gel('fab')}{gel('save')}</div></div></div><p>iOS ต้องตรวจ capability; Android ยังไม่เพิ่ม provider ในงานนี้ ค่า CSS blur ไม่เท่ากับ native intensity และไม่ใช่ผลทดสอบประสิทธิภาพบนโทรศัพท์</p>{scan()}</section>{footer()}</main></body></html>'''

def variables():
    blocks=[]
    for key in IDS:
        r=resolve_theme(key,D);s=r['semantic'];m=r['core']['materials']
        v={'canvas':s['canvas']['base'],'canvas-high':s['canvas']['high'],'canvas-low':s['canvas']['low'],'text':s['text']['primary'],'secondary':s['text']['secondary'],'disabled-text':s['text']['disabled'],'primary':s['action']['primary'],'deep':s['action']['deep'],'utility-fill':rgba(m['utility']['fill'],m['utility']['fillAlpha']),'gel-fill':rgba(m['gel']['fill'],m['gel']['fillAlpha']),'selected-fill':rgba(m['utilitySelected']['fill'],m['utilitySelected']['fillAlpha']),'action-fill':rgba(m['action']['fill'],m['action']['fillAlpha']),'action-pressed':rgba(m['action']['fill'],m['action']['pressedAlpha']),'inactive-fill':rgba(m['inactive']['fill'],m['inactive']['fillAlpha']),'rim-boundary':rgba(s['rim']['boundary'],.72),'rim-outer':rgba(s['rim']['outer'],.92),'rim-inner':rgba(s['rim']['inner'],.5),'action-rim':rgba(s['rim']['outer'],.76),'occlusion':rgba(s['action']['primary'],.12),'action-depth':rgba(s['action']['deep'],.35),'shadow':rgba(s['shadow']['tint'],.25),'grid':rgba(s['grid']['line'],.19),'fallback':s['surface']['reducedTransparency']}
        blocks.append(f'.palette-{key}'+'{'+''.join(f'--{name}:{value};' for name,value in v.items())+'}')
    return '/* Generated from the NEW Lagoon Glass TOKENS.json. No app import. */\n'+'\n'.join(blocks)+'\n'

def main():
    files={'index.html':index(),'contact-sheet.html':contact(),'materials.html':materials(),'palette-variables.css':variables()}
    files.update({f'{key}.html':individual(key) for key in IDS})
    for name,text in files.items():
        destination=ROOT/name
        if destination.is_symlink():raise RuntimeError('Refusing to follow symlink')
        destination.write_text(text,encoding='utf-8');print(name)

if __name__=='__main__':main()
