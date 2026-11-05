/* ui.js — ตัวช่วยสร้างหน้าจอแบบปลอดภัยจาก XSS (ใช้ textContent เสมอ ไม่ใช้ innerHTML กับข้อมูลผู้ใช้) */
(function (W) {
  'use strict';

  /** สร้าง element: h('div', {class:'x', onclick:fn}, 'ข้อความ', child) */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style[s] = v[s]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else if (k === 'html') throw new Error('ห้ามใช้ html');
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (c instanceof Node) el.appendChild(c); else el.appendChild(document.createTextNode(String(c)));
  }

  /* ---------- ไอคอน SVG (วาดเองสำหรับโปรเจกต์นี้ ใช้ได้อิสระ) ---------- */
  var IC = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    piggy: '<path d="M5 11c0-3.3 3.1-6 7-6s7 2.7 7 6c0 1.6-.7 3-1.9 4.1V19h-3v-2h-4v2H7v-3.6C5.8 14.4 5 12.8 5 11z"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M19 10h2M10 5.5l1-2.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    broom: '<path d="M14 3l-4 9M7 12h8l2 9H5z"/><path d="M8 16v5M11 16v5M14 16v5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M4 12l16-8-6 16-3-6z"/><path d="M11 14l9-10"/>',
    wallet: '<path d="M4 7h15v12H4zM4 7l11-3v3"/><circle cx="16" cy="13" r="1.2" fill="currentColor"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    line: '<path d="M4 11c0-4 3.6-7 8-7s8 3 8 7-3.6 7-8 7c-.8 0-1.6-.1-2.3-.3L6 20v-3.4C4.8 15.3 4 13.3 4 11z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.3 0 4 1.2 4.5 4"/>',
    logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    print: '<path d="M7 9V4h10v5M7 17H4v-7h16v7h-3"/><path d="M7 14h10v6H7z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>'
  };
  function wrapSvg(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = IC[name] || IC.info; // เนื้อหาคงที่ของระบบ ไม่ใช่ข้อมูลผู้ใช้
    return svg;
  }

  /** มาสคอต "น้องพลเมืองดี" (SVG ต้นฉบับของโปรเจกต์) mood: happy | wave | think | cheer */
  function mascot(mood, cls) {
    var mouth = mood === 'think' ? '<path d="M44 67q6-3 12 0" stroke="#17323d" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<path d="M40 64q10 10 20 0" stroke="#17323d" stroke-width="3.5" fill="#ff8787" stroke-linejoin="round"/>';
    var arm = mood === 'wave' || mood === 'cheer' ? '<path d="M80 52q12-10 10-24" stroke="#17323d" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="90" cy="26" r="6" fill="#3ddbb4" stroke="#17323d" stroke-width="3"/>'
      : '<path d="M80 60q10 4 12 12" stroke="#17323d" stroke-width="4" fill="none" stroke-linecap="round"/>';
    var svg = '<svg viewBox="0 0 100 100" class="' + (cls || 'mascot') + '" role="img" aria-label="น้องพลเมืองดี">' +
      '<ellipse cx="50" cy="94" rx="26" ry="4" fill="#17323d" opacity=".15"/>' +
      '<path d="M50 10c22 0 34 16 34 38 0 24-14 40-34 40S16 72 16 48c0-22 12-38 34-38z" fill="#3ddbb4" stroke="#17323d" stroke-width="4"/>' +
      '<path d="M30 20q20-14 40 0" fill="#ffd43b" stroke="#17323d" stroke-width="3.5"/>' +
      '<circle cx="38" cy="46" r="7" fill="#fff" stroke="#17323d" stroke-width="3"/><circle cx="62" cy="46" r="7" fill="#fff" stroke="#17323d" stroke-width="3"/>' +
      '<circle cx="39.5" cy="47" r="3.2" fill="#17323d"/><circle cx="63.5" cy="47" r="3.2" fill="#17323d"/>' +
      '<circle cx="30" cy="58" r="4" fill="#ffa8a8" opacity=".8"/><circle cx="70" cy="58" r="4" fill="#ffa8a8" opacity=".8"/>' + mouth +
      '<path d="M20 60q-10 4-10 12" stroke="#17323d" stroke-width="4" fill="none" stroke-linecap="round"/>' + arm +
      '<path d="M44 76l6-3 6 3v6c0 2-3 4-6 5-3-1-6-3-6-5z" fill="#1c7ed6" stroke="#17323d" stroke-width="2.5"/>' +
      '<path d="M47 80l2 2 4-4" stroke="#fff" stroke-width="2" fill="none"/>' +
      (mood === 'cheer' ? '<path d="M8 20l4 2M14 10l2 4M92 46l-4 1" stroke="#ffd43b" stroke-width="3.5" stroke-linecap="round"/>' : '') +
      '</svg>';
    var t = document.createElement('template'); t.innerHTML = svg; // สตริงคงที่ของระบบ
    return t.content.firstChild;
  }

  function medal(iconName, earned) {
    var colors = { piggy: '#ffd43b', heart: '#ff8787', shield: '#74c0fc', star: '#3ddbb4' };
    var wrap = h('div', { class: 'medal' });
    var t = document.createElement('template');
    t.innerHTML = '<svg viewBox="0 0 64 64"><path d="M22 2l10 14 10-14" fill="#1c7ed6" stroke="#17323d" stroke-width="3"/><circle cx="32" cy="38" r="22" fill="' + (colors[iconName] || '#ffd43b') + '" stroke="#17323d" stroke-width="3.5"/><circle cx="32" cy="38" r="15" fill="#fff" stroke="#17323d" stroke-width="2.5"/></svg>';
    var svg = t.content.firstChild;
    var ic = wrapSvg(iconName); ic.setAttribute('x', '22'); ic.setAttribute('y', '28'); ic.setAttribute('width', '20'); ic.setAttribute('height', '20');
    svg.appendChild(ic);
    wrap.appendChild(svg);
    return wrap;
  }

  /** วงแหวนคะแนน */
  function ring(value, max, label) {
    var pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    var c = 2 * Math.PI * 46;
    var t = document.createElement('template');
    t.innerHTML = '<svg viewBox="0 0 120 120" class="ring" role="img"><circle cx="60" cy="60" r="46" fill="#fff" stroke="#17323d" stroke-width="3"/><circle cx="60" cy="60" r="46" fill="none" stroke="#e6fcf5" stroke-width="12"/>' +
      (pct > 0 ? '<circle cx="60" cy="60" r="46" fill="none" stroke="#14a38b" stroke-width="12" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="' + (c * pct).toFixed(1) + ' ' + c.toFixed(1) + '"/>' : '') +
      '<text x="60" y="62" text-anchor="middle" font-size="26" fill="#17323d"></text><text x="60" y="82" text-anchor="middle" font-size="11" fill="#4a6370"></text></svg>';
    var svg = t.content.firstChild;
    svg.querySelectorAll('text')[0].textContent = fmtNum(value);
    svg.querySelectorAll('text')[1].textContent = label || ('จาก ' + max);
    svg.setAttribute('aria-label', (label || 'คะแนน') + ' ' + value + ' จาก ' + max);
    return svg;
  }

  /* ---------- การจัดรูปแบบ ---------- */
  var TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_DAY = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  function baht(satang) { var n = Number(satang || 0) / 100; return n.toLocaleString('th-TH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' บาท'; }
  function fmtNum(n, d) { if (n === null || n === undefined || isNaN(n)) return '-'; return Number(n).toLocaleString('th-TH', { maximumFractionDigits: d === undefined ? 2 : d }); }
  function thDate(s, withDay) {
    if (!s) return '-';
    var p = String(s).slice(0, 10).split('-'); if (p.length < 3) return s;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var wd = d.getUTCDay() || 7;
    return (withDay ? TH_DAY[wd] + ' ' : '') + (+p[2]) + ' ' + TH_MONTH[+p[1] - 1] + ' ' + (+p[0] + 543);
  }
  function thDateTime(s) { if (!s) return '-'; return thDate(s) + ' ' + String(s).slice(11, 16) + ' น.'; }
  function todayStr() { var d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  var STATUS = {
    NOT_SUBMITTED: ['ยังไม่ส่ง', 'st-none', '○'], DRAFT: ['ฉบับร่าง', 'st-draft', '✎'], PENDING: ['รอตรวจ', 'st-wait', '⏳'],
    REVISE: ['ให้แก้ไข', 'st-warn', '↺'], APPROVED: ['อนุมัติ', 'st-ok', '✓'], REJECTED: ['ไม่อนุมัติ', 'st-bad', '✕'],
    UPCOMING: ['ยังไม่ถึงวัน', 'st-none', '…'], NOT_REPORTED: ['ยังไม่รายงาน', 'st-none', '○'], PASSED: ['ผ่าน', 'st-ok', '✓'],
    FAILED: ['ไม่ผ่าน', 'st-bad', '✕'], MAKEUP_DONE: ['ชดเชยแล้ว', 'st-ok', '⟲✓'], EXEMPT: ['ยกเว้น', 'st-none', '–'],
    PAID: ['ครบ', 'st-ok', '✓'], PARTIAL: ['บางส่วน', 'st-warn', '◐'], UNPAID: ['ยังไม่ครบ', 'st-none', '○'],
    ACTIVE: ['ใช้งาน', 'st-ok', '✓'], VOID: ['ยกเลิกแล้ว', 'st-bad', '✕'], SENT: ['ส่งแล้ว', 'st-ok', '✓'], FAILED_Q: ['ส่งไม่สำเร็จ', 'st-bad', '!'],
    RETRY: ['รอส่งใหม่', 'st-warn', '↺'], SENDING: ['กำลังส่ง', 'st-wait', '⏳'], WAITING: ['รอผูก', 'st-wait', '⏳'], REVOKED: ['ยกเลิกแล้ว', 'st-none', '–'],
    CONFIRMED: ['ยืนยันแล้ว', 'st-wait', '✓'], LOCKED: ['ล็อกแล้ว', 'st-warn', '🔒'], PUBLISHED: ['เผยแพร่แล้ว', 'st-ok', '📣']
  };
  function status(code, override) {
    var s = STATUS[code] || [code, 'st-none', '•'];
    return h('span', { class: 'status ' + s[1] }, s[2] + ' ' + (override || s[0]));
  }

  /* ---------- แจ้งเตือน ---------- */
  function toast(msg, type) {
    var box = document.getElementById('toast');
    var el = h('div', { class: 'toast ' + (type || 'ok') }, wrapSvg(type === 'err' ? 'warn' : 'check'), h('span', null, msg));
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, type === 'err' ? 6000 : 3200);
  }

  function modal(title, body, actions) {
    return new Promise(function (resolve) {
      var back = h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
      function close(v) { back.remove(); document.removeEventListener('keydown', esc); resolve(v); }
      function esc(e) { if (e.key === 'Escape') close(null); }
      var btns = (actions || [{ label: 'ตกลง', value: true, cls: 'primary' }]).map(function (a) {
        return h('button', { class: 'btn ' + (a.cls || ''), type: 'button', onclick: function () {
          if (a.validate && !a.validate()) return; close(a.value);
        } }, a.label);
      });
      back.appendChild(h('div', { class: 'modal' }, h('div', { class: 'row between' }, h('h2', null, title),
        h('button', { class: 'back', type: 'button', 'aria-label': 'ปิด', onclick: function () { close(null); } }, wrapSvg('x'))),
        body, h('div', { class: 'row wrap', style: { marginTop: '1rem', justifyContent: 'flex-end' } }, btns)));
      back.addEventListener('click', function (e) { if (e.target === back) close(null); });
      document.addEventListener('keydown', esc);
      document.body.appendChild(back);
      var f = back.querySelector('input,textarea,select'); if (f) f.focus();
    });
  }
  function confirmBox(title, text, okLabel, danger) {
    return modal(title, h('p', { class: 'pre' }, text), [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: okLabel || 'ยืนยัน', value: true, cls: danger ? 'danger' : 'primary' }]);
  }
  /** ถามข้อความ (เช่น เหตุผล) คืน null ถ้ายกเลิก */
  function prompt(title, label, opts) {
    opts = opts || {};
    var inp = h(opts.multiline ? 'textarea' : 'input', { value: opts.value || '', placeholder: opts.placeholder || '', type: opts.type || 'text' });
    var f = h('label', { class: 'field' }, h('span', null, label), inp, opts.help ? h('div', { class: 'help' }, opts.help) : null);
    return modal(title, f, [{ label: 'ยกเลิก', value: null, cls: 'ghost' }, { label: opts.ok || 'บันทึก', cls: opts.danger ? 'danger' : 'primary', value: 'ok',
      validate: function () { var ok = !opts.required || inp.value.trim().length >= (opts.minLength || 1); f.classList.toggle('invalid', !ok); return ok; } }])
      .then(function (v) { return v === 'ok' ? inp.value.trim() : null; });
  }

  function loading(text) { return h('div', { class: 'loading' }, h('div', { class: 'spinner' }), text || 'กำลังโหลด…'); }
  function empty(text, mood) { return h('div', { class: 'empty' }, mascot(mood || 'think', 'empty-mascot'), h('div', null, text)); }
  function errorBox(err, retry) {
    return h('div', { class: 'alert err', role: 'alert' }, wrapSvg('warn'), h('div', null, h('strong', null, 'เกิดข้อผิดพลาด'), h('div', null, err && err.message || String(err)),
      retry ? h('button', { class: 'btn small', style: { marginTop: '.5rem' }, onclick: retry }, 'ลองใหม่') : null));
  }
  function alertBox(type, text) { return h('div', { class: 'alert ' + type }, wrapSvg(type === 'ok' ? 'check' : type === 'info' ? 'info' : 'warn'), h('div', null, text)); }

  function field(label, input, help) { return h('label', { class: 'field' }, h('span', null, label), input, help ? h('div', { class: 'help' }, help) : null); }
  function select(options, value, attrs) {
    var s = h('select', attrs || {});
    options.forEach(function (o) { var opt = h('option', { value: o.value }, o.label); if (String(o.value) === String(value)) opt.selected = true; s.appendChild(opt); });
    return s;
  }
  function pageHead(title, backHref, extra) {
    return h('div', { class: 'page-head' }, backHref ? h('a', { class: 'back', href: backHref, 'aria-label': 'กลับ' }, wrapSvg('back')) : null, h('h1', null, title), extra || null);
  }
  function progress(value, max, cls) {
    var pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    var bar = h('div', { class: 'progress ' + (cls || ''), role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value) });
    var i = h('i'); i.style.width = pct + '%'; bar.appendChild(i);
    return bar;
  }
  function stat(label, value, hint) { return h('div', { class: 'stat' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), hint ? h('div', { class: 'hint' }, hint) : null); }

  /* ---------- ภาพ ---------- */
  /** ย่อภาพเป็น JPEG ไม่เกิน maxSide px และไม่เกิน maxBytes */
  function resizeImage(file, maxBytes) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) { reject(new Error('รองรับเฉพาะไฟล์ภาพ JPG, PNG, WEBP')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('ไฟล์ใหญ่เกิน 25 MB')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var side = 1600, q = 0.82, data;
        for (var attempt = 0; attempt < 6; attempt++) {
          var scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          data = c.toDataURL('image/jpeg', q);
          if (data.length * 0.75 <= maxBytes) { resolve(data); return; }
          side = Math.round(side * 0.8); q = Math.max(0.6, q - 0.06);
        }
        reject(new Error('ย่อภาพให้เล็กพอไม่ได้ กรุณาเลือกภาพอื่น'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('เปิดไฟล์ภาพไม่ได้ (ถ้าเป็น HEIC ให้ตั้งกล้องเป็น JPG)')); };
      img.src = url;
    });
  }
  function viewer(src) {
    var v = h('div', { class: 'viewer', role: 'dialog', 'aria-label': 'ดูภาพ', onclick: function () { v.remove(); } }, h('img', { src: src, alt: 'ภาพหลักฐาน' }));
    document.body.appendChild(v);
  }

  function rid() { var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  /** แปลง "12.50" บาท → 1250 สตางค์ */
  function toSatang(v) { var n = Number(String(v).replace(/,/g, '')); if (!isFinite(n)) return NaN; return Math.round(n * 100); }

  W.UI = { h: h, icon: wrapSvg, mascot: mascot, medal: medal, ring: ring, baht: baht, fmtNum: fmtNum, thDate: thDate, thDateTime: thDateTime, todayStr: todayStr, addDays: addDays,
    status: status, STATUS: STATUS, toast: toast, modal: modal, confirm: confirmBox, prompt: prompt, loading: loading, empty: empty, errorBox: errorBox, alert: alertBox,
    field: field, select: select, pageHead: pageHead, progress: progress, stat: stat, resizeImage: resizeImage, viewer: viewer, rid: rid, debounce: debounce, toSatang: toSatang, TH_DAY: TH_DAY };
})(window);
