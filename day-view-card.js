/**
 * day-view-card  v3.0
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE custom elements — all configured via the Lovelace GUI editor (✏ icon):
 *
 *   custom:day-view-card       — standalone popup day view
 *   custom:week-day-nav-card   — Mon-Sun strip that opens the popup
 *
 * Plus auto-patches custom:week-planner-card (add  day_popup:  key to config).
 *
 * Install:  copy to  /config/www/day-view-card.js
 *           add resource  /local/day-view-card.js  (type: module)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Shared helpers ──────────────────────────────────────────────────────────

const MONTHS_LONG  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS_LONG    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const fmt12 = iso => {
  const d = new Date(iso); let h = d.getHours(), m = d.getMinutes();
  const ap = h>=12?'pm':'am'; h=h%12||12;
  return `${h}:${String(m).padStart(2,'0')}${ap}`;
};
const fmt24 = iso => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const minsFrom0 = iso => { const d=new Date(iso); return d.getHours()*60+d.getMinutes(); };
const isAllDay  = ev => !!(ev.start?.date && !ev.start?.dateTime);
const dKey      = d =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const rndColor  = i => `hsl(${(i*67+197)%360},55%,62%)`;

function normCals(list=[]) {
  return list.map((c,i) => ({
    entity: c.entity || '',
    name:   c.name   || (c.entity||'').replace('calendar.','').replace(/_/g,' '),
    color:  c.color  || rndColor(i),
  }));
}

function layoutTimed(events) {
  const sorted=[...events].sort((a,b)=>new Date(a.start.dateTime)-new Date(b.start.dateTime));
  const cols=[],placed=[];
  for(const ev of sorted){
    const s=+new Date(ev.start.dateTime),e=+new Date(ev.end.dateTime);
    let ci=0;
    while((cols[ci]||[]).some(pe=>s<+new Date(pe.end.dateTime)&&e>+new Date(pe.start.dateTime)))ci++;
    (cols[ci]=cols[ci]||[]).push(ev); placed.push({ev,ci});
  }
  return placed.map(({ev,ci})=>{
    const s=+new Date(ev.start.dateTime),e=+new Date(ev.end.dateTime);
    const span=Math.max(...placed
      .filter(({ev:pe})=>s<+new Date(pe.end.dateTime)&&e>+new Date(pe.start.dateTime))
      .map(p=>p.ci))+1;
    return {ev,col:ci,span};
  });
}

// ─── CSS builders (config-driven so editor changes apply live) ────────────────

function buildDayCSS(c={}) {
  const bg=c.color_bg||'#1a1a1a', sf=c.color_surface||'#252525',
        sf2=c.color_surface2||'#2e2e2e', bd=c.color_border||'#3a3a3a',
        tx=c.color_text||'#f0f0f0', mu=c.color_muted||'#888',
        dm=c.color_dim||'#555', ac=c.color_accent||'#6a4fa0',
        nw=c.color_now_line||'#ef5350',
        ff=c.font_family||'Nunito', fm=c.font_mono||'JetBrains Mono',
        hp=c.hour_height||64, rr=c.border_radius||16;
  return `
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(ff)}:wght@300;400;600;700&family=${encodeURIComponent(fm)}:wght@400;500&display=swap');
:host{display:flex;flex-direction:column;height:100%;font-family:'${ff}',sans-serif;
  --bg:${bg};--sf:${sf};--sf2:${sf2};--bd:${bd};--tx:${tx};--mu:${mu};--dm:${dm};
  --ac:${ac};--nw:${nw};--hp:${hp}px;--rr:${rr}px;}
*{box-sizing:border-box;margin:0;padding:0;}
.root{background:var(--bg);display:flex;flex-direction:column;height:100%;border-radius:var(--rr);overflow:hidden;}
.hdr{display:flex;align-items:center;gap:12px;padding:14px 18px 12px;border-bottom:1px solid var(--bd);flex-shrink:0;background:var(--sf);}
.nav-btn{background:var(--sf2);border:1px solid var(--bd);color:var(--mu);width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s;flex-shrink:0;font-family:inherit;}
.nav-btn:hover{background:var(--bd);color:var(--tx);}
.date-badge{display:flex;flex-direction:column;align-items:center;min-width:48px;}
.date-badge .num{font-size:28px;font-weight:300;color:var(--tx);width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;}
.date-badge.is-today .num{background:var(--ac);color:#fff;font-size:22px;font-weight:700;}
.hdr-info{flex:1;min-width:0;}
.hdr-info .full-date{font-size:15px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hdr-info .ev-count{font-size:11px;color:var(--mu);margin-top:2px;}
.close-btn{background:var(--sf2);border:1px solid var(--bd);color:var(--mu);width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s;flex-shrink:0;font-family:inherit;}
.close-btn:hover{background:#5a1a1a;color:#ff6b6b;border-color:#5a1a1a;}
.allday{display:flex;border-bottom:1px solid var(--bd);flex-shrink:0;min-height:34px;background:var(--sf);}
.allday-label{width:56px;flex-shrink:0;border-right:1px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--dm);font-weight:600;}
.allday-pills{flex:1;padding:5px 10px;display:flex;flex-wrap:wrap;gap:4px;align-content:center;}
.allday-pill{border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;}
.grid-wrap{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--bd) transparent;background:var(--bg);}
.grid-wrap::-webkit-scrollbar{width:5px;}
.grid-wrap::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px;}
.grid{position:relative;display:flex;}
.time-gutter{width:56px;flex-shrink:0;border-right:1px solid var(--bd);position:relative;background:var(--sf);}
.time-label{position:absolute;right:8px;font-size:9px;font-family:'${fm}',monospace;color:var(--dm);transform:translateY(-50%);white-space:nowrap;pointer-events:none;}
.events-col{flex:1;position:relative;background:var(--bg);}
.h-line{position:absolute;left:0;right:0;height:1px;background:var(--bd);opacity:.6;pointer-events:none;}
.hh-line{position:absolute;left:0;right:0;border-top:1px dashed var(--bd);opacity:.25;pointer-events:none;}
.now-line{position:absolute;left:0;right:0;height:2px;background:var(--nw);z-index:20;pointer-events:none;}
.now-dot{position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:var(--nw);}
.ev{position:absolute;border-radius:10px;padding:4px 8px;overflow:hidden;cursor:default;border-left:4px solid transparent;transition:filter .12s,transform .1s;box-shadow:0 2px 8px rgba(0,0,0,.4);}
.ev:hover{filter:brightness(1.2);transform:translateX(1px);z-index:50!important;}
.ev-title{font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
.ev-time{font-family:'${fm}',monospace;font-size:9px;opacity:.8;white-space:nowrap;margin-top:1px;}
.ev-cal{font-size:9px;opacity:.65;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;}
.legend{display:flex;gap:4px;padding:8px 14px;border-top:1px solid var(--bd);flex-wrap:wrap;flex-shrink:0;background:var(--sf);}
.leg-item{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:var(--mu);cursor:pointer;padding:3px 8px;border-radius:8px;border:1px solid transparent;transition:background .12s,color .12s,border-color .12s;}
.leg-item:hover{background:var(--sf2);color:var(--tx);border-color:var(--bd);}
.leg-item.off{opacity:.28;}
.leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.loading{display:flex;align-items:center;justify-content:center;height:120px;color:var(--mu);font-size:13px;gap:10px;}
.spinner{width:16px;height:16px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}`;
}

function buildNavCSS(c={}) {
  const bg=c.color_bg||'#1a1a1a', sf=c.color_surface||'#252525',
        sf2=c.color_surface2||'#2e2e2e', bd=c.color_border||'#3a3a3a',
        tx=c.color_text||'#f0f0f0', mu=c.color_muted||'#888',
        ac=c.color_accent||'#6a4fa0',
        ff=c.font_family||'Nunito', rr=c.border_radius||16;
  return `
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(ff)}:wght@300;400;600;700&display=swap');
:host{display:block;font-family:'${ff}',sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
.outer{background:${sf};border-radius:${rr}px;padding:10px 12px 8px;border:1px solid ${bd};}
.month-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${mu};text-align:center;margin-bottom:6px;font-weight:700;}
.row{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.day-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:12px;cursor:pointer;border:1px solid transparent;background:none;transition:background .13s,border-color .13s,transform .1s;-webkit-tap-highlight-color:transparent;}
.day-btn:hover{background:${sf2};border-color:${bd};}
.day-btn:active{transform:scale(.93);}
.day-btn.today .num{background:${ac};color:#fff;}
.num{font-size:20px;font-weight:600;color:${tx};width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:background .13s,color .13s;}
.dots{display:flex;gap:2px;height:5px;align-items:center;justify-content:center;}
.dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
dialog{border:none;padding:0;background:transparent;width:min(700px,96vw);height:min(85vh,900px);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.8);}
dialog::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(6px);}
dialog day-view-card{display:block;width:100%;height:100%;}`;
}

// ─── Shared editor styles ─────────────────────────────────────────────────────

const EDITOR_CSS = `
:host{display:block;font-family:var(--primary-font-family,sans-serif);}
.st{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    color:var(--secondary-text-color);margin:18px 0 8px;padding-bottom:4px;
    border-bottom:1px solid var(--divider-color);}
.st:first-child{margin-top:0;}
.row{display:flex;gap:8px;flex-wrap:wrap;}
.row>*{flex:1;min-width:140px;}
.f{margin-bottom:10px;}
.f label{display:block;font-size:12px;color:var(--secondary-text-color);margin-bottom:4px;font-weight:600;}
.f input[type=text],.f input[type=number],.f select{
  width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--divider-color);
  background:var(--card-background-color);color:var(--primary-text-color);
  font-size:13px;font-family:inherit;box-sizing:border-box;}
.f input[type=color]{width:44px;height:34px;padding:2px;border-radius:8px;
  border:1px solid var(--divider-color);cursor:pointer;background:none;}
.cr{display:flex;gap:8px;align-items:center;} .cr input[type=text]{flex:1;}
.tr{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.tr label{font-size:13px;color:var(--primary-text-color);cursor:pointer;flex:1;}
.cal-list{display:flex;flex-direction:column;gap:6px;}
.ci{border:1px solid var(--divider-color);border-radius:10px;padding:10px 12px;
    background:var(--secondary-background-color);}
.ci-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.ci-head .cin{flex:1;font-size:13px;font-weight:700;color:var(--primary-text-color);}
.ci-head button{background:none;border:none;cursor:pointer;color:var(--error-color,#ef5350);
  font-size:16px;padding:2px 6px;border-radius:6px;}
.ci-head button:hover{background:rgba(239,83,80,.12);}
.add-btn{padding:8px 16px;border-radius:10px;border:1px dashed var(--divider-color);
  background:none;color:var(--primary-color);cursor:pointer;font-size:13px;
  width:100%;font-family:inherit;margin-top:4px;transition:background .12s;}
.add-btn:hover{background:rgba(103,80,164,.12);}
`;

// helper to quickly build form fragments
const cf = (key,label,val) => `
  <div class="f"><label>${label}</label><div class="cr">
    <input type="color" data-k="${key}" value="${val}">
    <input type="text"  data-k="${key}" value="${val}" placeholder="#rrggbb">
  </div></div>`;
const tf = (key,label,val) => `
  <div class="f"><label>${label}</label>
    <input type="text" data-k="${key}" value="${val||''}">
  </div>`;
const nf = (key,label,val,mn=0,mx=256) => `
  <div class="f"><label>${label}</label>
    <input type="number" data-k="${key}" value="${val}" min="${mn}" max="${mx}">
  </div>`;
const sf = (key,label,opts,cur) => `
  <div class="f"><label>${label}</label><select data-k="${key}">
    ${opts.map(o=>`<option value="${o.v}"${cur==o.v?' selected':''}>${o.l}</option>`).join('')}
  </select></div>`;


// ═══════════════════════════════════════════════════════════════════════════════
//  DAY-VIEW-CARD
// ═══════════════════════════════════════════════════════════════════════════════

class DayViewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass=null; this._config={}; this._events=[];
    this._hidden=new Set(); this._built=false; this._cals=[];
    this._date=new Date(); this._date.setHours(0,0,0,0);
  }

  setConfig(config) {
    this._config = {...config};
    this._cals   = normCals(config.calendars||[]);
    if (config.date) this._date = new Date(config.date+'T00:00:00');
    if (this._built) {
      this.shadowRoot.querySelector('style').textContent = buildDayCSS(config);
    }
  }

  set hass(h) {
    const first=!this._hass; this._hass=h;
    if (!this._built) this._build();
    if (first) this._load();
  }
  get hass() { return this._hass; }

  getCardSize() { return 8; }

  static getConfigElement() { return document.createElement('day-view-card-editor'); }
  static getStubConfig() {
    return { calendars:[], color_accent:'#6a4fa0', color_bg:'#1a1a1a', hour_height:64, use_24h:false };
  }

  connectedCallback()    { this._tmr=setInterval(()=>this._nowLine(),60000); }
  disconnectedCallback() { clearInterval(this._tmr); }

  goToDate(ds) { this._date=new Date(ds+'T00:00:00'); this._load(); }

  _build() {
    this._built=true;
    const r=this.shadowRoot; r.innerHTML='';
    const s=document.createElement('style'); s.textContent=buildDayCSS(this._config); r.appendChild(s);
    const w=document.createElement('div'); w.className='root';
    w.innerHTML=`
      <div class="hdr">
        <button class="nav-btn" id="prev">&#8249;</button>
        <div class="date-badge" id="badge"><span class="num" id="daynum"></span></div>
        <div class="hdr-info">
          <div class="full-date" id="fulldate"></div>
          <div class="ev-count" id="evcount"></div>
        </div>
        <button class="close-btn" id="close">&#x2715;</button>
        <button class="nav-btn" id="next">&#8250;</button>
      </div>
      <div class="allday">
        <div class="allday-label">all&#8209;day</div>
        <div class="allday-pills" id="pills"></div>
      </div>
      <div class="grid-wrap" id="wrap">
        <div class="grid" id="grid">
          <div class="time-gutter" id="gut"></div>
          <div class="events-col" id="col"></div>
        </div>
      </div>
      <div class="legend" id="leg"></div>`;
    r.appendChild(w);
    r.getElementById('prev').onclick  = ()=>this._shift(-1);
    r.getElementById('next').onclick  = ()=>this._shift(+1);
    r.getElementById('close').onclick = ()=>
      this.dispatchEvent(new CustomEvent('day-view-close',{bubbles:true,composed:true}));
  }

  _shift(d) { this._date.setDate(this._date.getDate()+d); this._load(); }

  async _load() {
    if (!this._hass) return;
    const col=this.shadowRoot.getElementById('col');
    if (col) col.innerHTML=`<div class="loading"><div class="spinner"></div>Loading…</div>`;
    const s=new Date(this._date); s.setHours(0,0,0,0);
    const e=new Date(this._date); e.setHours(23,59,59,999);
    try {
      const res=await Promise.all(this._cals.map(cal=>
        this._hass.callApi('GET',
          `calendars/${cal.entity}?start=${s.toISOString()}&end=${e.toISOString()}`
        ).then(ev=>ev.map(x=>({...x,_cal:cal}))).catch(()=>[])
      ));
      this._events=res.flat();
    } catch(e){this._events=[];}
    this._render(); this._scrollFirst();
  }

  _render() {
    this._renderHdr(); this._renderAllDay(); this._renderGrid(); this._renderLeg();
  }

  _fmt(iso) { return this._config.use_24h ? fmt24(iso) : fmt12(iso); }

  _renderHdr() {
    const r=this.shadowRoot, d=this._date;
    const today=d.toDateString()===new Date().toDateString();
    r.getElementById('daynum').textContent=d.getDate();
    r.getElementById('badge').className='date-badge'+(today?' is-today':'');
    r.getElementById('fulldate').textContent=
      `${DOWS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const vis=this._vis();
    const t=vis.filter(e=>!isAllDay(e)).length, a=vis.filter(isAllDay).length;
    r.getElementById('evcount').textContent=
      `${t} event${t!==1?'s':''}${a?` · ${a} all‑day`:''}`;
  }

  _renderAllDay() {
    const c=this.shadowRoot.getElementById('pills'); if(!c) return;
    c.innerHTML='';
    this._vis().filter(isAllDay).forEach(ev=>{
      const el=document.createElement('div'); el.className='allday-pill';
      el.textContent=ev.summary;
      el.style.cssText=`background:${ev._cal.color}22;color:${ev._cal.color};border:1px solid ${ev._cal.color}44`;
      c.appendChild(el);
    });
  }

  _renderGrid() {
    const HP=Number(this._config.hour_height)||64;
    const gut=this.shadowRoot.getElementById('gut');
    const col=this.shadowRoot.getElementById('col');
    const grid=this.shadowRoot.getElementById('grid');
    if(!gut||!col||!grid) return;
    gut.innerHTML=''; col.innerHTML='';
    grid.style.height=(HP*24)+'px';

    for(let h=0;h<24;h++){
      const top=h*HP;
      const ln=document.createElement('div'); ln.className='h-line'; ln.style.top=top+'px'; col.appendChild(ln);
      const hl=document.createElement('div'); hl.className='hh-line'; hl.style.top=(top+HP/2)+'px'; col.appendChild(hl);
      if(h>0){
        const lb=document.createElement('div'); lb.className='time-label'; lb.style.top=top+'px';
        lb.textContent=this._config.use_24h?`${String(h).padStart(2,'0')}:00`:h<12?`${h}am`:h===12?'12pm':`${h-12}pm`;
        gut.appendChild(lb);
      }
    }
    this._nowLine(true);

    layoutTimed(this._vis().filter(e=>!isAllDay(e))).forEach(({ev,col:ci,span})=>{
      const color=ev._cal.color;
      const topPx=(minsFrom0(ev.start.dateTime)/60)*HP;
      const hPx=Math.max((+new Date(ev.end.dateTime)-+new Date(ev.start.dateTime))/60000/60*HP,18);
      const colW=95/span, leftP=ci*colW+(ci>0?1:0);
      const el=document.createElement('div'); el.className='ev';
      el.style.cssText=`top:${topPx}px;height:${hPx}px;left:${leftP}%;width:${colW-1}%;`+
        `background:${color}20;border-left-color:${color};color:${color};z-index:${5+ci}`;
      const ti=document.createElement('div'); ti.className='ev-title'; ti.textContent=ev.summary; el.appendChild(ti);
      if(hPx>=30){const t=document.createElement('div');t.className='ev-time';t.textContent=`${this._fmt(ev.start.dateTime)} – ${this._fmt(ev.end.dateTime)}`;el.appendChild(t);}
      if(hPx>=46){const c=document.createElement('div');c.className='ev-cal';c.textContent=ev._cal.name;el.appendChild(c);}
      col.appendChild(el);
    });
  }

  _nowLine(force=false) {
    const col=this.shadowRoot?.getElementById('col'); if(!col) return;
    let ln=col.querySelector('.now-line');
    if(this._date.toDateString()!==new Date().toDateString()){ln?.remove();return;}
    if(!ln||force){
      ln?.remove(); ln=document.createElement('div'); ln.className='now-line';
      const dot=document.createElement('div'); dot.className='now-dot'; ln.appendChild(dot); col.appendChild(ln);
    }
    const HP=Number(this._config.hour_height)||64, now=new Date();
    ln.style.top=((now.getHours()*60+now.getMinutes())/60*HP)+'px';
  }

  _renderLeg() {
    const leg=this.shadowRoot.getElementById('leg'); if(!leg) return;
    leg.innerHTML='';
    this._cals.forEach(cal=>{
      const el=document.createElement('div');
      el.className='leg-item'+(this._hidden.has(cal.entity)?' off':'');
      el.innerHTML=`<span class="leg-dot" style="background:${cal.color}"></span>${cal.name}`;
      el.onclick=()=>{this._hidden.has(cal.entity)?this._hidden.delete(cal.entity):this._hidden.add(cal.entity);this._render();};
      leg.appendChild(el);
    });
  }

  _scrollFirst() {
    const wrap=this.shadowRoot?.getElementById('wrap'); if(!wrap) return;
    const first=this._vis().filter(e=>!isAllDay(e)).map(e=>minsFrom0(e.start.dateTime)).sort((a,b)=>a-b)[0];
    const HP=Number(this._config.hour_height)||64;
    wrap.scrollTop=first!=null?Math.max(0,(first/60*HP)-40):7*HP;
  }

  _vis() { return this._events.filter(e=>!this._hidden.has(e._cal.entity)); }
}

customElements.define('day-view-card', DayViewCard);


// ═══════════════════════════════════════════════════════════════════════════════
//  DAY-VIEW-CARD  EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

class DayViewCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._cfg={}; }

  setConfig(c) { this._cfg={...c}; this._render(); }
  set hass(h)  { this._hass=h; }

  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed',
      {detail:{config:this._cfg},bubbles:true,composed:true}));
  }
  _set(k,v) { this._cfg={...this._cfg,[k]:v}; this._emit(); this._render(); }
  _setCal(i,k,v) {
    const c=[...(this._cfg.calendars||[])]; c[i]={...c[i],[k]:v};
    this._set('calendars',c);
  }

  _render() {
    const r=this.shadowRoot, cfg=this._cfg, cals=cfg.calendars||[];
    r.innerHTML='';
    const s=document.createElement('style'); s.textContent=EDITOR_CSS; r.appendChild(s);
    const root=document.createElement('div');
    root.innerHTML=`
      <div class="st">📅 Calendars</div>
      <div class="cal-list" id="clist"></div>
      <button class="add-btn" id="addcal">＋ Add calendar</button>

      <div class="st">🎨 Colours</div>
      <div class="row">
        ${cf('color_accent','Accent / today highlight',cfg.color_accent||'#6a4fa0')}
        ${cf('color_now_line','Now-line',cfg.color_now_line||'#ef5350')}
      </div>
      <div class="row">
        ${cf('color_bg','Background',cfg.color_bg||'#1a1a1a')}
        ${cf('color_surface','Surface (header/legend)',cfg.color_surface||'#252525')}
      </div>
      <div class="row">
        ${cf('color_surface2','Surface 2 (hover)',cfg.color_surface2||'#2e2e2e')}
        ${cf('color_border','Border / grid lines',cfg.color_border||'#3a3a3a')}
      </div>
      <div class="row">
        ${cf('color_text','Primary text',cfg.color_text||'#f0f0f0')}
        ${cf('color_muted','Muted text',cfg.color_muted||'#888888')}
      </div>

      <div class="st">✏️ Typography &amp; layout</div>
      <div class="row">
        ${tf('font_family','Heading font (Google Fonts name)',cfg.font_family||'Nunito')}
        ${tf('font_mono','Mono font (Google Fonts name)',cfg.font_mono||'JetBrains Mono')}
      </div>
      <div class="row">
        ${nf('hour_height','Hour height px',cfg.hour_height||64,32,128)}
        ${nf('border_radius','Corner radius px',cfg.border_radius||16,0,32)}
      </div>

      <div class="st">🕐 Time format</div>
      <div class="tr">
        <input type="checkbox" id="use24" ${cfg.use_24h?'checked':''}>
        <label for="use24">Use 24-hour time (default: 12-hour am/pm)</label>
      </div>`;
    r.appendChild(root);

    // Calendar rows
    const list=r.getElementById('clist');
    cals.forEach((cal,i)=>{
      const item=document.createElement('div'); item.className='ci';
      item.innerHTML=`
        <div class="ci-head">
          <span style="width:10px;height:10px;border-radius:50%;background:${cal.color||'#888'};display:inline-block;flex-shrink:0"></span>
          <span class="cin">${cal.name||cal.entity||'(new calendar)'}</span>
          <button id="rm${i}">✕</button>
        </div>
        <div class="f"><label>Entity (calendar.xxx)</label>
          <input type="text" id="ce${i}" value="${cal.entity||''}" placeholder="calendar.example">
        </div>
        <div class="f"><label>Display name</label>
          <input type="text" id="cn${i}" value="${cal.name||''}" placeholder="Name">
        </div>
        <div class="f"><label>Colour</label><div class="cr">
          <input type="color" id="cc${i}" value="${cal.color||'#888888'}">
          <input type="text"  id="cct${i}" value="${cal.color||'#888888'}" placeholder="#rrggbb">
        </div></div>`;
      list.appendChild(item);
      r.getElementById(`ce${i}`).onchange=e=>this._setCal(i,'entity',e.target.value.trim());
      r.getElementById(`cn${i}`).onchange=e=>this._setCal(i,'name',e.target.value);
      const cp=r.getElementById(`cc${i}`), ct=r.getElementById(`cct${i}`);
      cp.oninput=e=>{ct.value=e.target.value;this._setCal(i,'color',e.target.value);};
      ct.onchange=e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)){cp.value=e.target.value;this._setCal(i,'color',e.target.value);}};
      r.getElementById(`rm${i}`).onclick=()=>{const c=[...cals];c.splice(i,1);this._set('calendars',c);};
    });
    r.getElementById('addcal').onclick=()=>this._set('calendars',[...(cfg.calendars||[]),{entity:'',name:'',color:rndColor(cals.length)}]);

    // Color pickers
    r.querySelectorAll('input[type=color][data-k]').forEach(el=>{
      el.oninput=e=>{
        const t=r.querySelector(`input[type=text][data-k="${e.target.dataset.k}"]`);
        if(t) t.value=e.target.value;
        this._set(e.target.dataset.k, e.target.value);
      };
    });
    r.querySelectorAll('input[type=text][data-k]').forEach(el=>{
      el.onchange=e=>{
        const p=r.querySelector(`input[type=color][data-k="${e.target.dataset.k}"]`);
        if(p&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)) p.value=e.target.value;
        this._set(e.target.dataset.k, e.target.value);
      };
    });
    r.querySelectorAll('input[type=number][data-k]').forEach(el=>{
      el.onchange=e=>this._set(e.target.dataset.k, Number(e.target.value));
    });
    r.getElementById('use24').onchange=e=>this._set('use_24h',e.target.checked);
  }
}

customElements.define('day-view-card-editor', DayViewCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:'day-view-card', name:'Day View Card',
  description:'Outlook-style day popup — click a date to see all events.',
});


// ═══════════════════════════════════════════════════════════════════════════════
//  WEEK-DAY-NAV-CARD
// ═══════════════════════════════════════════════════════════════════════════════

class WeekDayNavCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass=null; this._cfg={}; this._evMap={}; this._built=false; this._cals=[];
  }

  setConfig(c) {
    this._cfg=c; this._cals=normCals(c.calendars||[]);
    this._sow=c.start_of_week??1; this._showMon=c.show_month!==false;
    if(this._built){
      this.shadowRoot.querySelector('style').textContent=buildNavCSS(c);
      this._renderDays();
    }
  }

  set hass(h) {
    const first=!this._hass; this._hass=h;
    if(!this._built) this._build();
    const dv=this.shadowRoot.querySelector('day-view-card');
    if(dv) dv.hass=h;
    if(first) this._loadWeek();
  }

  getCardSize() { return 2; }
  static getConfigElement()  { return document.createElement('week-day-nav-card-editor'); }
  static getStubConfig() {
    return {calendars:[],start_of_week:1,show_month:true,color_accent:'#6a4fa0'};
  }

  _build() {
    this._built=true;
    const r=this.shadowRoot; r.innerHTML='';
    const s=document.createElement('style'); s.textContent=buildNavCSS(this._cfg); r.appendChild(s);
    const outer=document.createElement('div'); outer.className='outer';
    if(this._showMon){
      const ml=document.createElement('div'); ml.className='month-label'; ml.id='ml'; outer.appendChild(ml);
    }
    const row=document.createElement('div'); row.className='row'; row.id='row'; outer.appendChild(row);
    r.appendChild(outer);

    const dlg=document.createElement('dialog'); dlg.id='dlg';
    const dv=document.createElement('day-view-card');
    // Pass colour/format settings through to popup
    dv.setConfig({calendars:this._cals,...this._popupCfg()});
    if(this._hass) dv.hass=this._hass;
    dv.addEventListener('day-view-close',()=>dlg.close());
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
    dlg.addEventListener('cancel',()=>dlg.close());
    dlg.appendChild(dv); r.appendChild(dlg);
    this._renderDays();
  }

  _popupCfg() {
    const k=['color_accent','color_bg','color_surface','color_surface2',
             'color_border','color_text','color_muted','color_dim',
             'color_now_line','font_family','font_mono','hour_height',
             'border_radius','use_24h'];
    return Object.fromEntries(k.filter(k=>this._cfg[k]!=null).map(k=>[k,this._cfg[k]]));
  }

  _weekDays() {
    const t=new Date(); t.setHours(0,0,0,0);
    const s=new Date(t); s.setDate(t.getDate()-((t.getDay()-this._sow+7)%7));
    return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d;});
  }

  _renderDays() {
    const r=this.shadowRoot, row=r.getElementById('row'); if(!row) return;
    row.innerHTML='';
    const days=this._weekDays(), today=new Date(); today.setHours(0,0,0,0);
    const ml=r.getElementById('ml');
    if(ml){
      const mos=days.map(d=>d.getMonth());
      const dom=[...mos].sort((a,b)=>mos.filter(m=>m===b).length-mos.filter(m=>m===a).length)[0];
      ml.textContent=`${MONTHS_SHORT[dom]} ${days.find(d=>d.getMonth()===dom).getFullYear()}`;
    }
    days.forEach(d=>{
      const key=dKey(d), isT=d.toDateString()===today.toDateString(), dots=this._evMap[key]||[];
      const btn=document.createElement('button');
      btn.className='day-btn'+(isT?' today':'');
      btn.setAttribute('aria-label',d.toDateString());
      btn.innerHTML=`<span class="num">${d.getDate()}</span><div class="dots"></div>`;
      const de=btn.querySelector('.dots');
      [...new Map(dots.map(e=>[e.color,e])).values()].slice(0,3).forEach(({color})=>{
        const dot=document.createElement('div');dot.className='dot';dot.style.background=color;de.appendChild(dot);
      });
      btn.addEventListener('click',()=>this._open(key));
      row.appendChild(btn);
    });
  }

  async _loadWeek() {
    if(!this._hass||!this._cals.length) return;
    const days=this._weekDays();
    const s=new Date(days[0]); s.setHours(0,0,0,0);
    const e=new Date(days[6]); e.setHours(23,59,59,999);
    try{
      const res=await Promise.all(this._cals.map(cal=>
        this._hass.callApi('GET',`calendars/${cal.entity}?start=${s.toISOString()}&end=${e.toISOString()}`)
          .then(ev=>ev.map(x=>({...x,_c:cal.color}))).catch(()=>[])
      ));
      this._evMap={};
      res.flat().forEach(ev=>{
        const ed=ev.start?.date?new Date(ev.start.date+'T00:00:00'):new Date(ev.start.dateTime);
        const k=dKey(ed);
        if(!this._evMap[k]) this._evMap[k]=[];
        this._evMap[k].push({color:ev._c});
      });
    }catch(e){}
    this._renderDays();
  }

  _open(ds) {
    const r=this.shadowRoot, dlg=r.getElementById('dlg'), dv=dlg.querySelector('day-view-card');
    if(this._hass) dv.hass=this._hass;
    dv.goToDate(ds); dlg.showModal();
  }
}

customElements.define('week-day-nav-card', WeekDayNavCard);


// ═══════════════════════════════════════════════════════════════════════════════
//  WEEK-DAY-NAV-CARD  EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

class WeekDayNavCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._cfg={}; }
  setConfig(c) { this._cfg={...c}; this._render(); }
  set hass(h)  { this._hass=h; }

  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed',
      {detail:{config:this._cfg},bubbles:true,composed:true}));
  }
  _set(k,v) { this._cfg={...this._cfg,[k]:v}; this._emit(); this._render(); }
  _setCal(i,k,v) {
    const c=[...(this._cfg.calendars||[])]; c[i]={...c[i],[k]:v};
    this._set('calendars',c);
  }

  _render() {
    const r=this.shadowRoot, cfg=this._cfg, cals=cfg.calendars||[];
    r.innerHTML='';
    const s=document.createElement('style'); s.textContent=EDITOR_CSS; r.appendChild(s);
    const root=document.createElement('div');
    root.innerHTML=`
      <div class="st">📅 Calendars</div>
      <div class="cal-list" id="clist"></div>
      <button class="add-btn" id="addcal">＋ Add calendar</button>

      <div class="st">📆 Week settings</div>
      <div class="row">
        ${sf('start_of_week','Start of week',[{v:1,l:'Monday'},{v:0,l:'Sunday'}],cfg.start_of_week??1)}
        <div class="f"></div>
      </div>
      <div class="tr">
        <input type="checkbox" id="showmon" ${cfg.show_month!==false?'checked':''}>
        <label for="showmon">Show month label above buttons</label>
      </div>

      <div class="st">🎨 Colours (apply to nav bar &amp; popup)</div>
      <div class="row">
        ${cf('color_accent',  'Accent / today',   cfg.color_accent  ||'#6a4fa0')}
        ${cf('color_bg',      'Background',        cfg.color_bg      ||'#1a1a1a')}
      </div>
      <div class="row">
        ${cf('color_surface', 'Surface',           cfg.color_surface ||'#252525')}
        ${cf('color_border',  'Border',            cfg.color_border  ||'#3a3a3a')}
      </div>
      <div class="row">
        ${cf('color_text',    'Text',              cfg.color_text    ||'#f0f0f0')}
        ${cf('color_muted',   'Muted text',        cfg.color_muted   ||'#888888')}
      </div>
      <div class="row">
        ${cf('color_now_line','Now-line (popup)',  cfg.color_now_line||'#ef5350')}
        <div class="f"></div>
      </div>

      <div class="st">✏️ Font &amp; layout</div>
      <div class="row">
        ${tf('font_family','Heading font (Google Fonts)',cfg.font_family||'Nunito')}
        ${nf('border_radius','Corner radius px',cfg.border_radius||16,0,32)}
      </div>

      <div class="st">🕐 Popup grid</div>
      <div class="row">
        ${nf('hour_height','Hour height px (popup)',cfg.hour_height||64,32,128)}
        <div class="f"></div>
      </div>
      <div class="tr">
        <input type="checkbox" id="use24" ${cfg.use_24h?'checked':''}>
        <label for="use24">Use 24-hour time in popup</label>
      </div>`;
    r.appendChild(root);

    // Calendar rows
    const list=r.getElementById('clist');
    cals.forEach((cal,i)=>{
      const item=document.createElement('div'); item.className='ci';
      item.innerHTML=`
        <div class="ci-head">
          <span style="width:10px;height:10px;border-radius:50%;background:${cal.color||'#888'};display:inline-block;flex-shrink:0"></span>
          <span class="cin">${cal.name||cal.entity||'(new)'}</span>
          <button id="rm${i}">✕</button>
        </div>
        <div class="f"><label>Entity (calendar.xxx)</label>
          <input type="text" id="ce${i}" value="${cal.entity||''}" placeholder="calendar.example">
        </div>
        <div class="f"><label>Display name</label>
          <input type="text" id="cn${i}" value="${cal.name||''}" placeholder="Name">
        </div>
        <div class="f"><label>Colour</label><div class="cr">
          <input type="color" id="cc${i}" value="${cal.color||'#888888'}">
          <input type="text"  id="cct${i}" value="${cal.color||'#888888'}" placeholder="#rrggbb">
        </div></div>`;
      list.appendChild(item);
      r.getElementById(`ce${i}`).onchange=e=>this._setCal(i,'entity',e.target.value.trim());
      r.getElementById(`cn${i}`).onchange=e=>this._setCal(i,'name',e.target.value);
      const cp=r.getElementById(`cc${i}`), ct=r.getElementById(`cct${i}`);
      cp.oninput=e=>{ct.value=e.target.value;this._setCal(i,'color',e.target.value);};
      ct.onchange=e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)){cp.value=e.target.value;this._setCal(i,'color',e.target.value);}};
      r.getElementById(`rm${i}`).onclick=()=>{const c=[...cals];c.splice(i,1);this._set('calendars',c);};
    });
    r.getElementById('addcal').onclick=()=>
      this._set('calendars',[...(cfg.calendars||[]),{entity:'',name:'',color:rndColor(cals.length)}]);

    // Generic bindings
    r.querySelectorAll('input[type=color][data-k]').forEach(el=>{
      el.oninput=e=>{
        const t=r.querySelector(`input[type=text][data-k="${e.target.dataset.k}"]`);
        if(t) t.value=e.target.value;
        this._set(e.target.dataset.k,e.target.value);
      };
    });
    r.querySelectorAll('input[type=text][data-k]').forEach(el=>{
      el.onchange=e=>{
        const p=r.querySelector(`input[type=color][data-k="${e.target.dataset.k}"]`);
        if(p&&/^#[0-9a-fA-F]{6}$/.test(e.target.value)) p.value=e.target.value;
        this._set(e.target.dataset.k,e.target.value);
      };
    });
    r.querySelectorAll('input[type=number][data-k]').forEach(el=>
      el.onchange=e=>this._set(e.target.dataset.k,Number(e.target.value)));
    r.querySelectorAll('select[data-k]').forEach(el=>
      el.onchange=e=>this._set(e.target.dataset.k,Number(e.target.value)));
    r.getElementById('showmon').onchange=e=>this._set('show_month',e.target.checked);
    r.getElementById('use24').onchange=e=>this._set('use_24h',e.target.checked);
  }
}

customElements.define('week-day-nav-card-editor', WeekDayNavCardEditor);

window.customCards.push({
  type:'week-day-nav-card', name:'Week Day Nav Card',
  description:'Mon–Sun strip with event dots — opens the Day View popup on click.',
});


// ═══════════════════════════════════════════════════════════════════════════════
//  WEEK-PLANNER-CARD AUTO-PATCH
//  Add  day_popup: { calendars: […] }  inside your week-planner-card config.
//  All colour / format keys from day_popup are forwarded to the day-view popup.
// ═══════════════════════════════════════════════════════════════════════════════

(function patchWeekPlannerCard() {
  function inject(card) {
    if (card.__dvInjected) return;
    card.__dvInjected = true;
    const pc = card._config?.day_popup;
    if (!pc?.calendars?.length) return;

    const dvCfg = {
      calendars: normCals(pc.calendars),
      ...(pc.color_accent   ? {color_accent:   pc.color_accent}   : {}),
      ...(pc.color_bg       ? {color_bg:        pc.color_bg}       : {}),
      ...(pc.color_surface  ? {color_surface:   pc.color_surface}  : {}),
      ...(pc.color_surface2 ? {color_surface2:  pc.color_surface2} : {}),
      ...(pc.color_border   ? {color_border:    pc.color_border}   : {}),
      ...(pc.color_text     ? {color_text:      pc.color_text}     : {}),
      ...(pc.color_muted    ? {color_muted:     pc.color_muted}    : {}),
      ...(pc.color_now_line ? {color_now_line:  pc.color_now_line} : {}),
      ...(pc.font_family    ? {font_family:     pc.font_family}    : {}),
      ...(pc.hour_height    ? {hour_height:     pc.hour_height}    : {}),
      ...(pc.use_24h        ? {use_24h:         pc.use_24h}        : {}),
    };

    const dlg = document.createElement('dialog');
    dlg.style.cssText='border:none;padding:0;background:transparent;'+
      'width:min(700px,96vw);height:min(85vh,900px);border-radius:16px;overflow:hidden;'+
      'box-shadow:0 24px 80px rgba(0,0,0,.8);';
    const bs=document.createElement('style');
    bs.textContent='dialog::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(6px);}'+
      'day-view-card{display:block;width:100%;height:100%;}';
    dlg.appendChild(bs);

    const dv=document.createElement('day-view-card');
    dv.setConfig(dvCfg);
    if(card.hass) dv.hass=card.hass;
    dv.addEventListener('day-view-close',()=>dlg.close());
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
    dlg.addEventListener('cancel',()=>dlg.close());
    dlg.appendChild(dv);
    (card.shadowRoot||card).appendChild(dlg);
    card.__dvDlg=dlg; card.__dvCard=dv;

    setInterval(()=>{if(card.hass&&card.__dvCard)card.__dvCard.hass=card.hass;},5000);
    if(card.hass) dv.hass=card.hass;

    bindDays(card);
    if(card.shadowRoot){
      new MutationObserver(()=>bindDays(card))
        .observe(card.shadowRoot,{childList:true,subtree:true});
    }
  }

  function bindDays(card) {
    const sh=card.shadowRoot; if(!sh) return;
    sh.querySelectorAll('.day[data-date]').forEach(el=>{
      if(el.__dvBound) return; el.__dvBound=true;
      const de=el.querySelector('.date'); if(!de) return;
      de.style.cursor='pointer'; de.title='Open day view';
      de.addEventListener('click',e=>{
        e.stopPropagation();
        const ds=`${el.dataset.year}-${String(el.dataset.month).padStart(2,'0')}-${String(el.dataset.date).padStart(2,'0')}`;
        if(!card.__dvDlg) return;
        if(card.hass) card.__dvCard.hass=card.hass;
        card.__dvCard.goToDate(ds); card.__dvDlg.showModal();
      });
    });
  }

  function scan(root) {
    if(!root) return;
    root.querySelectorAll('week-planner-card').forEach(c=>{
      if(!c._config){setTimeout(()=>scan(root),300);return;}
      inject(c);
    });
    root.querySelectorAll('*').forEach(el=>{if(el.shadowRoot)scan(el.shadowRoot);});
  }

  setTimeout(()=>scan(document.body),1500);
  new MutationObserver(()=>scan(document.body))
    .observe(document.body,{childList:true,subtree:true});
})();
