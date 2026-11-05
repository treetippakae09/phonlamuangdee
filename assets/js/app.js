/* app.js — สถานะแอป เส้นทาง (hash router) โครงหน้า และคอมโพเนนต์ที่ใช้ร่วมกัน */
(function (W) {
  'use strict';
  var h = UI.h;
  var RETURN_KEY = 'pmd_return';
  var CLASS_KEY = 'pmd_class';

  var App = W.App = {
    me: null, // ข้อมูลจาก auth.me
    routes: [],
    classroomId: null,
    route: function (pattern, handler, opts) {
      var keys = [];
      var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
      App.routes.push({ re: re, keys: keys, handler: handler, opts: opts || {} });
    },
    go: function (hash) { if (location.hash === hash) App.render(); else location.hash = hash; },
    role: function () { return App.me && App.me.user.role; },
    isStaff: function () { return App.role() === 'ADMIN' || App.role() === 'TEACHER'; },
    isAdmin: function () { return App.role() === 'ADMIN'; },
    homeHash: function () { return App.isStaff() ? '#/t/home' : '#/home'; }
  };

  /* ---------- เส้นทาง ---------- */
  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var q = {}; var i = raw.indexOf('?');
    var path = i >= 0 ? raw.slice(0, i) : raw;
    if (i >= 0) raw.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
    return { path: path, query: q };
  }

  var renderSeq = 0;
  App.render = function () {
    var seq = ++renderSeq;
    var loc = parseHash();
    var token = API.Auth.get();
    if (loc.path === '/login') return showLogin();
    if (!token) { rememberReturn(); return App.go('#/login'); }
    var ready = App.me ? Promise.resolve() : API.call('auth.me').then(function (me) { App.me = me; pickDefaultClass(); });
    ready.then(function () {
      if (seq !== renderSeq) return;
      if (App.me.user.mustChangePassword && loc.path !== '/change-password') { rememberReturn(); return App.go('#/change-password'); }
      if (loc.path === '/' || loc.path === '') return App.go(consumeReturn() || App.homeHash());
      var match = null, params = {};
      App.routes.some(function (r) {
        var m = r.re.exec(loc.path); if (!m) return false;
        match = r; r.keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); }); return true;
      });
      if (!match) return App.go(App.homeHash());
      if (match.opts.roles && match.opts.roles.indexOf(App.role()) < 0) { UI.toast('คุณไม่มีสิทธิ์เข้าหน้านี้', 'err'); return App.go(App.homeHash()); }
      var main = layout(loc.path, match.opts);
      main.appendChild(UI.loading());
      Promise.resolve().then(function () { return match.handler(params, loc.query); }).then(function (view) {
        if (seq !== renderSeq) return;
        main.textContent = '';
        if (view) main.appendChild(view);
        W.scrollTo(0, 0);
      }).catch(function (e) {
        if (seq !== renderSeq) return;
        main.textContent = '';
        main.appendChild(UI.errorBox(e, function () { App.render(); }));
      });
    }).catch(function (e) {
      if (seq !== renderSeq) return;
      var root = document.getElementById('app'); root.textContent = '';
      root.appendChild(h('div', { class: 'login-wrap' }, UI.errorBox(e, function () { App.render(); }),
        h('button', { class: 'btn block', onclick: logout }, 'ออกจากระบบ')));
    });
  };

  function rememberReturn() {
    var hsh = location.hash;
    if (hsh && hsh !== '#/login' && hsh !== '#/change-password' && hsh !== '#/') { try { sessionStorage.setItem(RETURN_KEY, hsh); } catch (e) { } }
  }
  function consumeReturn() { try { var r = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); return r; } catch (e) { return null; } }

  function pickDefaultClass() {
    var rooms = App.me.classrooms || [];
    var saved = null; try { saved = localStorage.getItem(CLASS_KEY); } catch (e) { }
    if (App.me.enrollment) App.classroomId = App.me.enrollment.classroomId;
    else if (rooms.some(function (r) { return r.classroomId === saved; })) App.classroomId = saved;
    else App.classroomId = rooms.length ? rooms[0].classroomId : null;
  }
  App.setClass = function (id) { App.classroomId = id; try { localStorage.setItem(CLASS_KEY, id); } catch (e) { } App.render(); };
  App.className = function (id) { var r = (App.me.classrooms || []).filter(function (c) { return c.classroomId === (id || App.classroomId); })[0]; return r ? r.name : ''; };

  API.onAuthError(function (e) {
    if (e.code === 'PASSWORD_CHANGE_REQUIRED') { if (App.me) App.me.user.mustChangePassword = true; rememberReturn(); App.go('#/change-password'); return; }
    App.me = null; API.Auth.clear(); rememberReturn();
    UI.toast(e.message, 'err');
    App.go('#/login');
  });

  function logout() {
    API.call('auth.logout').catch(function () { }).then(function () { App.me = null; API.Auth.clear(); App.go('#/login'); });
  }
  App.logout = logout;

  /* ---------- โครงหน้า ---------- */
  function navItems() {
    if (App.isStaff()) return [['#/t/home', 'home', 'หน้าแรก'], ['#/review', 'inbox', 'ตรวจงาน'], ['#/t/saving', 'piggy', 'ออมเงิน'], ['#/t/activities', 'flag', 'กิจกรรม'], ['#/more', 'menu', 'เมนู']];
    return [['#/home', 'home', 'หน้าแรก'], ['#/saving', 'piggy', 'ออมเงิน'], ['#/activities', 'flag', 'กิจกรรม'], ['#/duty', 'broom', 'เวร'], ['#/me', 'user', 'ฉัน']];
  }
  function layout(path, opts) {
    var root = document.getElementById('app');
    root.textContent = '';
    var classPicker = null;
    if (App.isStaff() && (App.me.classrooms || []).length) {
      classPicker = UI.select(App.me.classrooms.map(function (c) { return { value: c.classroomId, label: c.name }; }), App.classroomId,
        { 'aria-label': 'เลือกห้องเรียน', onchange: function (e) { App.setClass(e.target.value); } });
    }
    var brand = h('div', { class: 'brand' }, UI.mascot('happy', ''), h('span', null, 'พลเมืองดี'));
    var top = h('header', { class: 'topbar' }, brand, classPicker,
      !App.isStaff() && App.me.enrollment ? h('span', { class: 'small' }, App.me.enrollment.classroomName) : null);
    var main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
    var nav = h('nav', { class: 'bottomnav', 'aria-label': 'เมนูหลัก' }, navItems().map(function (n) {
      var active = ('#' + path).indexOf(n[0]) === 0 || (n[0] === '#/more' && /^\/(a\/|t\/(scores|grades|reports|announce|duty|line|rounds))/.test(path));
      return h('a', { href: n[0], class: active ? 'active' : '', 'aria-current': active ? 'page' : null }, UI.icon(n[1]), h('span', null, n[2]));
    }));
    root.appendChild(top); root.appendChild(main);
    if (!opts.noNav) root.appendChild(nav);
    return main;
  }

  /* ---------- เข้าสู่ระบบ ---------- */
  function showLogin() {
    var root = document.getElementById('app'); root.textContent = '';
    if (API.Auth.get() && App.me) return App.go(App.homeHash());
    var user = h('input', { autocomplete: 'username', autocapitalize: 'none', inputmode: 'text', required: true });
    var pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    var remember = h('input', { type: 'checkbox' });
    var msg = h('div');
    var btn = h('button', { class: 'btn primary block', type: 'submit' }, 'เข้าสู่ระบบ');
    var form = h('form', { onsubmit: function (e) {
      e.preventDefault(); msg.textContent = '';
      btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
      API.call('auth.login', { username: user.value, password: pw.value }).then(function (d) {
        API.Auth.set(d.token, remember.checked);
        App.me = null; pw.value = '';
        App.go(d.user.mustChangePassword ? '#/change-password' : (consumeReturn() || '#/'));
      }).catch(function (err) {
        msg.textContent = ''; msg.appendChild(UI.alert('err', err.message));
        btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
      });
    } },
      UI.field('ชื่อผู้ใช้ / เลขประจำตัวนักเรียน', user),
      UI.field('รหัสผ่าน', pw, 'นักเรียนเข้าครั้งแรก: รหัสผ่านคือเลขประจำตัวนักเรียน'),
      h('label', { class: 'check' }, remember, 'จดจำฉันบนเครื่องนี้ (ไม่แนะนำบนเครื่องส่วนรวม)'), msg, btn);
    var ret = null; try { ret = sessionStorage.getItem(RETURN_KEY); } catch (e) { }
    root.appendChild(h('div', { class: 'login-wrap' },
      h('div', { class: 'center' }, UI.mascot('wave', 'mascot-login')),
      h('h1', { class: 'center' }, 'พลเมืองดี'),
      h('div', { class: 'speech center', style: { marginBottom: '1rem' } }, 'สวัสดี! วันนี้มาเป็นพลเมืองดีกันนะ'),
      ret ? UI.alert('info', 'เข้าสู่ระบบเพื่อเปิดหน้าที่ต้องการต่อ') : null,
      h('div', { class: 'card' }, form)));
    var m = root.querySelector('.mascot-login'); if (m) { m.style.width = '130px'; m.style.height = '130px'; }
    user.focus();
  }

  App.route('/change-password', function () {
    var forced = App.me.user.mustChangePassword;
    var min = (App.me.settings || {}).passwordMinLength || 8;
    var oldPw = h('input', { type: 'password', autocomplete: 'current-password' });
    var nw = h('input', { type: 'password', autocomplete: 'new-password', minlength: String(min) });
    var nw2 = h('input', { type: 'password', autocomplete: 'new-password' });
    var msg = h('div');
    var btn = h('button', { class: 'btn primary block', type: 'submit' }, 'บันทึกรหัสผ่านใหม่');
    return h('div', null, UI.pageHead('เปลี่ยนรหัสผ่าน', forced ? null : '#/me'),
      forced ? UI.alert('warn', 'เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน (ห้ามใช้เลขประจำตัว)') : null,
      h('form', { class: 'card', onsubmit: function (e) {
        e.preventDefault(); msg.textContent = '';
        if (nw.value !== nw2.value) { msg.appendChild(UI.alert('err', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')); return; }
        if (nw.value.length < min) { msg.appendChild(UI.alert('err', 'รหัสผ่านต้องมีอย่างน้อย ' + min + ' ตัวอักษร')); return; }
        btn.disabled = true;
        API.call('auth.changePassword', { oldPassword: oldPw.value, newPassword: nw.value }, { mutate: true }).then(function () {
          UI.toast('เปลี่ยนรหัสผ่านเรียบร้อย');
          App.me = null; App.go(consumeReturn() || '#/');
        }).catch(function (err) { btn.disabled = false; msg.appendChild(UI.alert('err', err.message)); });
      } }, UI.field(forced ? 'รหัสผ่านปัจจุบัน (ครั้งแรกคือเลขประจำตัว)' : 'รหัสผ่านปัจจุบัน', oldPw), UI.field('รหัสผ่านใหม่', nw, 'อย่างน้อย ' + min + ' ตัวอักษร ผสมตัวเลขหรือสัญลักษณ์จะปลอดภัยขึ้น'),
        UI.field('ยืนยันรหัสผ่านใหม่', nw2), msg, btn),
      forced ? h('button', { class: 'btn ghost block', onclick: logout }, 'ออกจากระบบ') : null);
  }, { noNav: true });

  /* ---------- คอมโพเนนต์ภาพ ---------- */
  /** แสดงภาพจาก fileId (โหลดผ่าน Backend ที่ตรวจสิทธิ์) */
  App.gallery = function (fileIds) {
    var box = h('div', { class: 'thumbs' });
    (fileIds || []).forEach(function (id) {
      var t = h('div', { class: 'thumb', role: 'button', tabindex: '0', 'aria-label': 'ดูภาพ' }, h('div', { class: 'spinner' }));
      box.appendChild(t);
      API.fileUrl(id).then(function (src) {
        t.textContent = ''; t.appendChild(h('img', { src: src, alt: 'ภาพหลักฐาน', loading: 'lazy' }));
        t.onclick = function () { UI.viewer(src); };
        t.onkeydown = function (e) { if (e.key === 'Enter') UI.viewer(src); };
      }).catch(function () { t.textContent = 'โหลดไม่ได้'; });
    });
    if (!(fileIds || []).length) box.appendChild(h('span', { class: 'muted small' }, 'ไม่มีภาพ'));
    return box;
  };

  /** ตัวเลือกและอัปโหลดภาพ: ย่อก่อนส่ง ตรวจจำนวน/ขนาด คืน { el, getIds(), busy() } */
  App.uploader = function (initialIds, opts) {
    opts = opts || {};
    var max = (App.me.settings || {}).maxImages || 4;
    var maxBytes = (App.me.settings || {}).maxImageBytes || 1500000;
    var ids = (initialIds || []).slice();
    var pending = 0;
    var thumbs = h('div', { class: 'thumbs' });
    var input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, class: 'sr-only', 'aria-label': 'เลือกรูปภาพ' });
    var info = h('div', { class: 'help' });
    function refreshInfo() { info.textContent = 'แนบแล้ว ' + ids.length + '/' + max + ' รูป' + (pending ? ' · กำลังอัปโหลด ' + pending + ' รูป…' : ''); }
    function addThumb(id, src) {
      var t = h('div', { class: 'thumb' });
      var x = h('button', { class: 'x', type: 'button', 'aria-label': 'ลบภาพ', onclick: function (e) { e.stopPropagation(); ids = ids.filter(function (i) { return i !== id; }); t.remove(); refreshInfo(); } }, '×');
      if (src) t.appendChild(h('img', { src: src, alt: 'ภาพที่แนบ' }));
      else API.fileUrl(id).then(function (s) { t.insertBefore(h('img', { src: s, alt: 'ภาพที่แนบ' }), x); }).catch(function () { });
      t.appendChild(x);
      thumbs.appendChild(t);
    }
    ids.forEach(function (id) { addThumb(id); });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (ids.length + pending + files.length > max) { UI.toast('แนบได้ไม่เกิน ' + max + ' รูป', 'err'); files = files.slice(0, Math.max(0, max - ids.length - pending)); }
      files.forEach(function (f) {
        pending++; refreshInfo();
        UI.resizeImage(f, maxBytes).then(function (dataUrl) {
          return API.upload(dataUrl, opts.classroomId).then(function (r) { ids.push(r.fileId); addThumb(r.fileId, dataUrl); });
        }).catch(function (e) { UI.toast(e.message, 'err'); }).then(function () { pending--; refreshInfo(); });
      });
    });
    refreshInfo();
    var el = h('div', null, h('label', { class: 'uploader' }, input, UI.icon('camera'), h('div', null, opts.label || 'ถ่ายรูปหรือเลือกรูป'), h('div', { class: 'tiny muted' }, 'ระบบย่อภาพอัตโนมัติก่อนส่ง')), info, thumbs);
    var cam = el.querySelector('.uploader svg'); if (cam) { cam.style.width = '36px'; cam.style.height = '36px'; }
    return { el: el, getIds: function () { return ids.slice(); }, busy: function () { return pending > 0; } };
  };

  /** ปุ่มที่ป้องกันกดซ้ำระหว่างรอผล */
  App.action = function (btn, fn) {
    if (btn.disabled) return Promise.resolve();
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    return Promise.resolve().then(fn).catch(function (e) { UI.toast(e.message, 'err'); throw e; })
      .then(function (r) { btn.disabled = false; btn.textContent = label; return r; }, function () { btn.disabled = false; btn.textContent = label; });
  };

  App.needClass = function () {
    if (!App.classroomId) throw new Error('ยังไม่มีห้องเรียนที่ได้รับมอบหมาย กรุณาติดต่อครูแอดมิน');
    return App.classroomId;
  };

  App.start = function () {
    W.addEventListener('hashchange', App.render);
    App.render();
  };
})(window);
