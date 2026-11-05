/* views-admin.js — หน้าจอครูแอดมิน */
(function () {
  'use strict';
  var h = UI.h, R = App.route;
  var ADMIN = ['ADMIN'];
  var ROLE_TH = { ADMIN: 'ครูแอดมิน', TEACHER: 'ครู', STUDENT: 'นักเรียน' };
  var CLASSROLE_TH = { MEMBER: 'นักเรียน', LEADER: 'หัวหน้าห้อง', DEPUTY: 'รองหัวหน้าห้อง' };
  function err(e) { UI.toast(e.message, 'err'); }

  /* ---------- ผู้ใช้ ---------- */
  R('/a/users', function (p, q) {
    var role = q.role || 'STUDENT';
    return Promise.all([API.call('admin.users', { role: role }), API.call('admin.structure')]).then(function (r) {
      var users = r[0].users, st = r[1];
      var rooms = st.classrooms.filter(function (c) { return c.termId === st.currentTermId && c.status === 'ACTIVE'; });
      var search = h('input', { class: 'inp', placeholder: 'ค้นหาชื่อ/เลขประจำตัว', type: 'search' });
      var roomF = UI.select([{ value: '', label: 'ทุกห้อง' }].concat(rooms.map(function (c) { return { value: c.classroomId, label: c.name }; })), q.room || '');
      var list = h('ul', { class: 'list' });
      function draw() {
        list.textContent = '';
        var s = search.value.trim().toLowerCase();
        users.filter(function (u) { return (!s || (u.fullName + ' ' + u.username + ' ' + (u.nickname || '')).toLowerCase().indexOf(s) >= 0) && (!roomF.value || (u.enrollment && u.enrollment.classroomId === roomF.value)); })
          .sort(function (a, b) { return ((a.enrollment || {}).classroomName || '').localeCompare((b.enrollment || {}).classroomName || '') || ((a.enrollment || {}).studentNo || 999) - ((b.enrollment || {}).studentNo || 999); })
          .forEach(function (u) {
            var en = u.enrollment;
            list.appendChild(h('li', null, h('div', { class: 'row between' }, h('div', null, h('strong', null, u.fullName), h('div', { class: 'tiny muted' }, u.username + ' · ' + ROLE_TH[u.role] +
              (en ? ' · ' + en.classroomName + ' เลขที่ ' + (en.studentNo || '-') + (en.classRole !== 'MEMBER' ? ' · ' + CLASSROLE_TH[en.classRole] : '') : '') +
              (u.classrooms ? ' · ห้อง: ' + (u.classrooms.map(function (c) { return c.name; }).join(', ') || '-') : ''))),
              h('div', { class: 'row wrap' }, u.status !== 'ACTIVE' ? h('span', { class: 'status st-bad' }, '✕ ' + u.status) : null, u.mustChangePassword ? h('span', { class: 'status st-warn' }, '! ยังไม่เปลี่ยนรหัส') : null)),
              h('div', { class: 'row wrap', style: { marginTop: '.3rem' } },
                h('button', { class: 'btn small', onclick: function () { userModal(u, rooms); } }, 'แก้ไข'),
                u.role === 'STUDENT' ? h('button', { class: 'btn small', onclick: function () { enrollModal(u, rooms); } }, 'ห้อง/บทบาท/วันนับ') : h('button', { class: 'btn small', onclick: function () { assignModal(u, rooms); } }, 'มอบหมายห้อง'),
                h('button', { class: 'btn small ghost', onclick: function () { resetPw(u); } }, 'รีเซ็ตรหัสผ่าน'))));
          });
        if (!list.childNodes.length) list.appendChild(h('li', null, UI.empty('ไม่พบผู้ใช้')));
      }
      search.addEventListener('input', UI.debounce(draw, 200)); roomF.addEventListener('change', draw);
      draw();
      return h('div', null, UI.pageHead('ผู้ใช้และนักเรียน', '#/more'),
        st.currentTermId ? null : UI.alert('warn', 'ยังไม่มีภาคเรียนปัจจุบัน กรุณาสร้างที่ "ภาคเรียน/ห้อง/วันหยุด" ก่อนนำเข้านักเรียน'),
        h('div', { class: 'tabs' }, [['STUDENT', 'นักเรียน'], ['TEACHER', 'ครู'], ['ADMIN', 'ครูแอดมิน']].map(function (t) { return h('a', { href: '#/a/users?role=' + t[0], class: role === t[0] ? 'on' : '' }, t[1]); })),
        h('div', { class: 'grid two' }, h('button', { class: 'btn primary', onclick: function () { userModal(null, rooms, role); } }, UI.icon('plus'), 'เพิ่ม' + ROLE_TH[role]), role === 'STUDENT' ? h('button', { class: 'btn', onclick: function () { importModal(); } }, UI.icon('download'), 'นำเข้า CSV') : null),
        h('div', { class: 'card', style: { marginTop: '1rem' } }, h('div', { class: 'grid two' }, search, role === 'STUDENT' ? roomF : null), list));
    });
  }, { roles: ADMIN });

  function userModal(u, rooms, role) {
    role = u ? u.role : role;
    var prefix = h('input', { value: u ? u.prefix : '', maxlength: '20', placeholder: role === 'STUDENT' ? 'ด.ช./ด.ญ./นาย/นางสาว' : 'ครู/นาย/นาง' });
    var first = h('input', { value: u ? u.firstName : '', maxlength: '60' }), last = h('input', { value: u ? u.lastName : '', maxlength: '60' }), nick = h('input', { value: u ? u.nickname : '', maxlength: '30' });
    var code = h('input', { value: u ? u.studentCode : '', maxlength: '20', inputmode: 'numeric', disabled: !!u, placeholder: 'เช่น 05001' });
    var username = h('input', { value: u ? u.username : '', maxlength: '40', disabled: !!u, autocapitalize: 'none' });
    var temp = h('input', { type: 'password', autocomplete: 'new-password' });
    var status = UI.select([{ value: 'ACTIVE', label: 'ใช้งาน' }, { value: 'SUSPENDED', label: 'ระงับ' }, { value: 'LEFT', label: 'ออกแล้ว' }], u ? u.status : 'ACTIVE');
    var roleSel = UI.select(role === 'STUDENT' ? [{ value: 'STUDENT', label: 'นักเรียน' }] : [{ value: 'TEACHER', label: 'ครู' }, { value: 'ADMIN', label: 'ครูแอดมิน' }], role);
    var room = role === 'STUDENT' && !u ? UI.select(rooms.map(function (c) { return { value: c.classroomId, label: c.name }; }), rooms[0] && rooms[0].classroomId) : null;
    var no = role === 'STUDENT' && !u ? h('input', { type: 'number', min: '1' }) : null;
    var body = h('div', null, role === 'STUDENT' ? UI.field('เลขประจำตัวนักเรียน (เป็นชื่อผู้ใช้และรหัสผ่านเริ่มต้น)', code) : UI.field('ชื่อผู้ใช้', username),
      h('div', { class: 'grid two' }, UI.field('คำนำหน้า', prefix), UI.field('ชื่อเล่น', nick)), UI.field('ชื่อ', first), UI.field('นามสกุล', last),
      room ? h('div', { class: 'grid two' }, UI.field('ห้อง', room), UI.field('เลขที่', no)) : null,
      role !== 'STUDENT' && !u ? UI.field('รหัสผ่านชั่วคราว', temp, 'แจ้งครูทางช่องทางส่วนตัว ระบบบังคับเปลี่ยนเมื่อเข้าครั้งแรก') : null,
      u ? UI.field('สถานะ', status) : null, role !== 'STUDENT' ? UI.field('สิทธิ์', roleSel) : null);
    UI.modal(u ? 'แก้ไขผู้ใช้' : 'เพิ่ม' + ROLE_TH[role], body, [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.userSave', { userId: u ? u.userId : '', role: roleSel.value, studentCode: code.value, username: username.value, tempPassword: temp.value, prefix: prefix.value, firstName: first.value, lastName: last.value, nickname: nick.value, status: status.value })
        .then(function (r) { if (room && room.value) return API.call('admin.enrollSave', { studentId: r.userId, classroomId: room.value, studentNo: no.value, classRole: 'MEMBER' }); })
        .then(function () { UI.toast('บันทึกแล้ว'); App.render(); });
    }).catch(err);
  }

  function enrollModal(u, rooms) {
    var en = u.enrollment || {};
    var room = UI.select(rooms.map(function (c) { return { value: c.classroomId, label: c.name }; }), en.classroomId || (rooms[0] || {}).classroomId);
    var no = h('input', { type: 'number', min: '1', value: en.studentNo || '' });
    var role = UI.select(Object.keys(CLASSROLE_TH).map(function (k) { return { value: k, label: CLASSROLE_TH[k] }; }), en.classRole || 'MEMBER');
    var start = h('input', { type: 'date', value: en.countStartDate || '' }), end = h('input', { type: 'date', value: en.countEndDate || '' });
    var reason = h('input', { maxlength: '200' });
    UI.modal('ห้องและบทบาท: ' + u.fullName, h('div', null, UI.field('ห้องเรียน', room, 'ย้ายห้องระหว่างภาค: ระบบปิดการลงทะเบียนเดิมและเก็บประวัติ'), h('div', { class: 'grid two' }, UI.field('เลขที่', no), UI.field('บทบาทในห้อง', role)),
      h('div', { class: 'grid two' }, UI.field('เริ่มนับ (ย้ายเข้า)', start), UI.field('สิ้นสุดการนับ (ย้ายออก)', end)), h('p', { class: 'tiny muted' }, 'เว้นว่าง = นับตลอดภาคเรียน ใช้กับรอบออม/รอบเวร'), UI.field('เหตุผล (ถ้าเปลี่ยนบทบาท)', reason)),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.enrollSave', { studentId: u.userId, classroomId: room.value, studentNo: no.value, classRole: role.value, countStartDate: start.value, countEndDate: end.value, reason: reason.value }).then(function () { UI.toast('บันทึกแล้ว'); App.render(); });
    }).catch(err);
  }

  function assignModal(u, rooms) {
    var current = h('ul', { class: 'list' }, (u.classrooms || []).map(function (c) {
      return h('li', { class: 'row between' }, c.name, h('button', { class: 'btn small danger', onclick: function () { API.call('admin.teacherAssign', { remove: true, assignmentId: c.assignmentId }).then(function () { UI.toast('ถอนแล้ว'); App.render(); document.querySelector('.modal-back') && document.querySelector('.modal-back').remove(); }).catch(err); } }, 'ถอน'));
    }));
    var room = UI.select(rooms.map(function (c) { return { value: c.classroomId, label: c.name }; }), (rooms[0] || {}).classroomId);
    var role = UI.select([{ value: 'HOMEROOM', label: 'ครูประจำห้อง' }, { value: 'ASSISTANT', label: 'ครูร่วม' }], 'HOMEROOM');
    UI.modal('มอบหมายห้อง: ' + u.fullName, h('div', null, current, UI.field('เพิ่มห้อง', room), UI.field('บทบาท', role)), [{ label: 'ปิด', value: false, cls: 'ghost' }, { label: 'มอบหมาย', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.teacherAssign', { teacherId: u.userId, classroomId: room.value, role: role.value }).then(function () { UI.toast('มอบหมายแล้ว'); App.render(); });
    }).catch(err);
  }

  function resetPw(u) {
    if (u.role === 'STUDENT') {
      UI.confirm('รีเซ็ตรหัสผ่าน', u.fullName + '\nรหัสผ่านจะกลับเป็นเลขประจำตัว (' + u.studentCode + ') และต้องเปลี่ยนเมื่อเข้าสู่ระบบ · Session เดิมทั้งหมดจะถูกยกเลิก', 'รีเซ็ต', true).then(function (ok) {
        if (ok) return API.call('admin.resetPassword', { userId: u.userId }).then(function (r) { UI.toast(r.note); App.render(); });
      }).catch(err);
    } else {
      UI.prompt('รีเซ็ตรหัสผ่าน ' + u.fullName, 'รหัสผ่านชั่วคราวใหม่', { type: 'password', required: true, minLength: 8, danger: true, ok: 'รีเซ็ต' }).then(function (pw) {
        if (pw) return API.call('admin.resetPassword', { userId: u.userId, tempPassword: pw }).then(function (r) { UI.toast(r.note); App.render(); });
      }).catch(err);
    }
  }

  /** CSV: studentCode,prefix,firstName,lastName,nickname,classroom,studentNo,classRole */
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
    if (!rows.length) return [];
    var head = rows[0].map(function (x) { return x.trim(); });
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (k, i) { o[k] = (r[i] || '').trim(); }); return o; });
  }
  function importModal() {
    var file = h('input', { type: 'file', accept: '.csv,text/csv' });
    var preview = h('div');
    var parsed = [];
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      f.text().then(function (t) {
        parsed = parseCsv(t);
        preview.textContent = '';
        if (!parsed.length || !('studentCode' in parsed[0])) { preview.appendChild(UI.alert('err', 'ไม่พบคอลัมน์ studentCode กรุณาใช้ไฟล์ตัวอย่าง')); parsed = []; return; }
        preview.appendChild(h('p', null, 'พบ ' + parsed.length + ' แถว ตัวอย่าง:'));
        preview.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['เลขประจำตัว', 'ชื่อ', 'ห้อง', 'เลขที่', 'บทบาท'].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, parsed.slice(0, 8).map(function (r) { return h('tr', null, h('td', null, r.studentCode), h('td', null, (r.prefix || '') + r.firstName + ' ' + (r.lastName || '')), h('td', null, r.classroom), h('td', null, r.studentNo), h('td', null, r.classRole || 'MEMBER')); })))));
      });
    });
    UI.modal('นำเข้านักเรียนจาก CSV', h('div', null, h('p', { class: 'small' }, 'คอลัมน์: studentCode, prefix, firstName, lastName, nickname, classroom (ชื่อห้องเช่น ม.2/1), studentNo, classRole (MEMBER/LEADER/DEPUTY) · บันทึกไฟล์เป็น UTF-8 · เลขประจำตัวเก็บเป็นข้อความ เลข 0 ด้านหน้าไม่หาย'),
      h('p', { class: 'small' }, 'นำเข้าซ้ำได้: คนเดิมจะอัปเดตชื่อ/ห้อง โดยไม่รีเซ็ตรหัสผ่าน'), file, preview),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'นำเข้า', value: true, cls: 'primary', validate: function () { return parsed.length > 0; } }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.importStudents', { rows: parsed }).then(function (r) {
        UI.modal('ผลการนำเข้า', h('div', null, h('p', null, 'สร้างใหม่ ' + r.created + ' · อัปเดต ' + r.updated + ' · ลงทะเบียนห้อง ' + r.enrolled),
          r.errors.length ? h('div', null, UI.alert('warn', 'มีแถวที่ผิดพลาด ' + r.errors.length + ' แถว'), h('ul', { class: 'small' }, r.errors.map(function (e) { return h('li', null, 'บรรทัด ' + e.line + ': ' + e.message); }))) : UI.alert('ok', 'นำเข้าครบทุกแถว')));
        App.render();
      });
    }).catch(err);
  }

  /* ---------- โครงสร้าง ---------- */
  R('/a/structure', function () {
    return Promise.all([API.call('admin.structure'), API.call('admin.users', { role: '' })]).then(function (r) {
      var st = r[0];
      var terms = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'ภาคเรียน'), h('button', { class: 'btn small primary', onclick: termModal }, '+ ภาคเรียน')),
        st.terms.length ? h('ul', { class: 'list' }, st.terms.map(function (t) {
          return h('li', { class: 'row between' }, h('div', null, h('strong', null, t.name), h('div', { class: 'tiny muted' }, UI.thDate(t.startDate) + ' – ' + UI.thDate(t.endDate))),
            t.termId === st.currentTermId ? h('span', { class: 'status st-ok' }, '✓ ปัจจุบัน') : h('button', { class: 'btn small', onclick: function () {
              UI.confirm('ตั้งเป็นภาคเรียนปัจจุบัน', 'ทุกหน้าจะแสดงข้อมูลของ ' + t.name, 'ตั้งค่า').then(function (ok) { if (ok) return API.call('admin.termSave', { termId: t.termId, academicYear: t.academicYear, semester: t.semester, startDate: t.startDate, endDate: t.endDate, setCurrent: true }).then(function () { App.me = null; App.render(); }); }).catch(err);
            } }, 'ตั้งเป็นปัจจุบัน'));
        })) : UI.empty('ยังไม่มีภาคเรียน'));
      var rooms = st.classrooms.filter(function (c) { return c.termId === st.currentTermId; });
      var classes = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'ห้องเรียน (ภาคปัจจุบัน)'), st.currentTermId ? h('button', { class: 'btn small primary', onclick: function () { classModal(null); } }, '+ ห้อง') : null),
        rooms.length ? h('ul', { class: 'list' }, rooms.map(function (c) { return h('li', { class: 'row between' }, h('span', null, c.name + (c.status !== 'ACTIVE' ? ' (เก็บถาวร)' : '')), h('button', { class: 'btn small', onclick: function () { classModal(c); } }, 'แก้ไข')); })) : UI.empty('ยังไม่มีห้องเรียน'),
        h('p', { class: 'tiny muted' }, 'กำหนดครูประจำห้องที่เมนู ผู้ใช้ → ครู → มอบหมายห้อง · หัวหน้า/รองหัวหน้าที่ ผู้ใช้ → นักเรียน → ห้อง/บทบาท'));
      var date = h('input', { type: 'date', class: 'inp', value: App.me.today }), name = h('input', { class: 'inp', placeholder: 'ชื่อวันหยุด' });
      var scope = UI.select([{ value: 'ALL', label: 'ทุกห้อง' }].concat(rooms.map(function (c) { return { value: c.classroomId, label: c.name }; })), 'ALL', { class: 'inp' });
      var hol = h('div', { class: 'card' }, h('h3', null, 'วันหยุด (ไม่นับรอบออมและรอบเวร)'), h('div', { class: 'grid three' }, date, name, scope),
        h('button', { class: 'btn small primary', style: { marginTop: '.5rem' }, onclick: function () { API.call('admin.holiday', { date: date.value, name: name.value, scope: scope.value }).then(function () { UI.toast('เพิ่มวันหยุดแล้ว'); App.render(); }).catch(err); } }, 'เพิ่มวันหยุด'),
        h('ul', { class: 'list' }, st.holidays.filter(function (x) { return x.termId === st.currentTermId; }).map(function (x) {
          return h('li', { class: 'row between' }, h('span', null, UI.thDate(x.date, true) + ' · ' + x.name + (x.scope !== 'ALL' ? ' (' + ((rooms.filter(function (c) { return c.classroomId === x.scope; })[0] || {}).name || x.scope) + ')' : '')),
            h('button', { class: 'btn small ghost', onclick: function () { API.call('admin.holiday', { remove: true, holidayId: x.holidayId }).then(function () { App.render(); }).catch(err); } }, 'ลบ'));
        })));
      return h('div', null, UI.pageHead('ภาคเรียน ห้อง และวันหยุด', '#/more'), terms, classes, hol);
    });
  }, { roles: ADMIN });

  function termModal() {
    var y = h('input', { inputmode: 'numeric', maxlength: '4', placeholder: 'เช่น 2569' }), s = UI.select([{ value: '1', label: 'ภาคเรียนที่ 1' }, { value: '2', label: 'ภาคเรียนที่ 2' }, { value: '3', label: 'ภาคฤดูร้อน' }], '1');
    var a = h('input', { type: 'date' }), b = h('input', { type: 'date' }), cur = h('input', { type: 'checkbox', checked: true });
    UI.modal('เพิ่มภาคเรียน', h('div', null, UI.field('ปีการศึกษา (พ.ศ.)', y), UI.field('ภาคเรียน', s), h('div', { class: 'grid two' }, UI.field('เริ่ม', a), UI.field('สิ้นสุด', b)), h('label', { class: 'check' }, cur, 'ตั้งเป็นภาคเรียนปัจจุบัน')),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.termSave', { academicYear: y.value, semester: s.value, startDate: a.value, endDate: b.value, setCurrent: cur.checked }).then(function () { UI.toast('บันทึกแล้ว'); App.me = null; App.render(); });
    }).catch(err);
  }
  function classModal(c) {
    var name = h('input', { value: c ? c.name : '', placeholder: 'เช่น ม.2/1', maxlength: '40' }), lvl = h('input', { value: c ? c.gradeLevel : '', placeholder: 'เช่น ม.2', maxlength: '20' });
    var status = UI.select([{ value: 'ACTIVE', label: 'ใช้งาน' }, { value: 'ARCHIVED', label: 'เก็บถาวร' }], c ? c.status : 'ACTIVE');
    UI.modal(c ? 'แก้ไขห้อง' : 'เพิ่มห้อง', h('div', null, UI.field('ชื่อห้อง', name), UI.field('ระดับชั้น', lvl), c ? UI.field('สถานะ', status) : null), [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('admin.classSave', { classroomId: c ? c.classroomId : '', name: name.value, gradeLevel: lvl.value, status: status.value }).then(function () { UI.toast('บันทึกแล้ว'); App.me = null; App.render(); });
    }).catch(err);
  }

  /* ---------- ปฏิทินการออม ---------- */
  R('/a/rounds', function () {
    return Promise.all([API.call('admin.rounds', {}), API.call('admin.structure'), API.call('admin.settings', {})]).then(function (r) {
      var rounds = r[0].rounds, st = r[1];
      var term = st.terms.filter(function (t) { return t.termId === st.currentTermId; })[0];
      if (!term) return h('div', null, UI.pageHead('ปฏิทินการออม', '#/more'), UI.alert('warn', 'กรุณาสร้างภาคเรียนปัจจุบันก่อน'));
      var defAmt = Number((r[2].settings.filter(function (s) { return s.key === 'SAVING_DEFAULT_AMOUNT_SATANG'; })[0] || {}).value || 500);
      var from = h('input', { type: 'date', value: term.startDate }), to = h('input', { type: 'date', value: term.endDate });
      var amt = h('input', { type: 'number', min: '0.25', step: '0.25', value: defAmt / 100 });
      var scope = UI.select([{ value: '', label: 'ทุกห้อง' }].concat(st.classrooms.filter(function (c) { return c.termId === st.currentTermId; }).map(function (c) { return { value: c.classroomId, label: c.name }; })), '');
      var days = {}; [1, 2, 3, 4, 5].forEach(function (d) { days[d] = 1; });
      var dayBox = h('div', { class: 'row wrap' }, [1, 2, 3, 4, 5, 6, 7].map(function (d) { var b = h('button', { type: 'button', class: 'chip-btn' + (days[d] ? ' on' : ''), onclick: function () { if (days[d]) delete days[d]; else days[d] = 1; b.classList.toggle('on'); } }, UI.TH_DAY[d]); return b; }));
      var bG = h('button', { class: 'btn primary block', onclick: function () { App.action(bG, function () { return API.call('admin.roundsGenerate', { from: from.value, to: to.value, weekdays: Object.keys(days).map(Number), amountSatang: UI.toSatang(amt.value), classroomId: scope.value }).then(function (x) { UI.toast('สร้างรอบออม ' + x.created + ' รอบ (ข้ามวันหยุดและวันที่มีอยู่แล้ว)'); App.render(); }); }); } }, 'สร้างรอบออม');
      return h('div', null, UI.pageHead('ปฏิทินการออม', '#/more'),
        h('div', { class: 'card' }, h('h3', null, 'สร้างรอบออมตามวันเรียน'), UI.field('วันในสัปดาห์ที่ต้องออม', dayBox), h('div', { class: 'grid two' }, UI.field('ตั้งแต่', from), UI.field('ถึง', to)), h('div', { class: 'grid two' }, UI.field('บาทต่อรอบ', amt), UI.field('ใช้กับ', scope)),
          h('p', { class: 'tiny muted' }, 'เรียกซ้ำได้ ไม่สร้างวันซ้ำ · รอบที่ถึงกำหนดจะนับเมื่อถึงวันนั้นเท่านั้น · เพิ่มวันหยุดภายหลัง ระบบตัดรอบวันนั้นและจัดสรรเงินใหม่อัตโนมัติ'), bG),
        h('div', { class: 'card' }, h('h3', null, 'รอบออม ' + rounds.length + ' รอบ'), h('ul', { class: 'list small' }, rounds.map(function (x) {
          return h('li', { class: 'row between' }, h('span', null, UI.thDate(x.date, true) + ' · ' + UI.baht(x.amountSatang) + ' · ' + x.classroomName),
            h('button', { class: 'btn small ghost', onclick: function () { UI.prompt('ยกเลิกรอบ ' + UI.thDate(x.date), 'เหตุผล', { required: true, danger: true }).then(function (v) { if (v) return API.call('admin.roundCancel', { roundId: x.roundId, reason: v }).then(function () { App.render(); }); }).catch(err); } }, 'ยกเลิก'));
        }))));
    });
  }, { roles: ADMIN });

  /* ---------- เกณฑ์คะแนน ---------- */
  R('/a/policy', function () {
    return API.call('policy.get').then(function (d) {
      var a = d.active;
      var f = {};
      var fields = [['weightSaving', 'น้ำหนัก: ออมเงิน'], ['weightActivity', 'น้ำหนัก: กิจกรรมที่ครูกำหนด'], ['weightSpecial', 'น้ำหนัก: กิจกรรมพิเศษ'], ['weightDuty', 'น้ำหนัก: เวรประจำวัน']];
      var params = [['specialTargetRaw', 'เป้าหมายคะแนนดิบกิจกรรมพิเศษ'], ['specialMaxPerItem', 'คะแนนสูงสุดต่อผลงานพิเศษ 1 ชิ้น'], ['dutyPointsPerRound', 'คะแนนเต็มต่อรอบเวร'], ['extraDutyPoints', 'คะแนนสูงสุดต่อเวรเพิ่มเติม 1 ครั้ง'], ['extraDutyCapRaw', 'เพดานคะแนนดิบเวรเพิ่มเติมรวม'], ['decimals', 'จำนวนทศนิยม (ปัดครึ่งขึ้น)']];
      var sumEl = h('strong');
      function upd() { var s = fields.reduce(function (t, x) { return t + Number(f[x[0]].value || 0); }, 0); sumEl.textContent = 'รวม ' + s + ' / 100 ' + (s === 100 ? '✓' : '✕ ต้องเท่ากับ 100'); sumEl.style.color = s === 100 ? 'var(--green)' : 'var(--red)'; save.disabled = s !== 100; }
      fields.concat(params).forEach(function (x) { f[x[0]] = h('input', { type: 'number', min: '0', step: 'any', value: a[x[0]], oninput: function () { upd(); } }); });
      var reason = h('textarea', { maxlength: '500', placeholder: 'เหตุผลการเปลี่ยนเกณฑ์ (จำเป็นเมื่อเปลี่ยนระหว่างภาค)' });
      var save = h('button', { class: 'btn primary block', onclick: function () {
        var p = { reason: reason.value }; Object.keys(f).forEach(function (k) { p[k] = f[k].value; });
        App.action(save, function () { return API.call('policy.save', p, { mutate: true }).then(function (r) { UI.toast('เปิดใช้เกณฑ์รุ่น ' + r.version + ' แล้ว'); UI.modal('บันทึกแล้ว', h('p', null, r.note)); App.render(); }); });
      } }, 'บันทึกและเปิดใช้เกณฑ์รุ่นใหม่');
      upd();
      return h('div', null, UI.pageHead('เกณฑ์คะแนน', '#/more'),
        h('div', { class: 'card' }, h('h3', null, 'น้ำหนัก 4 หมวด (รวม 100)'), fields.map(function (x) { return UI.field(x[1], f[x[0]]); }), sumEl),
        h('div', { class: 'card' }, h('h3', null, 'พารามิเตอร์'), params.map(function (x) { return UI.field(x[1], f[x[0]]); }),
          h('p', { class: 'tiny muted' }, 'สูตร: คะแนนหมวด = min(1, คะแนนดิบ ÷ คะแนนเต็มดิบ) × น้ำหนัก · หมวดที่ไม่มีฐานประเมินได้ 0 และแจ้งเตือน · การเปลี่ยนเกณฑ์จะคำนวณคะแนนชั่วคราวใหม่ทันที ผลที่ล็อกแล้วไม่เปลี่ยน')),
        h('div', { class: 'card' }, UI.field('เหตุผล', reason), save),
        h('div', { class: 'card' }, h('h3', null, 'ประวัติรุ่นเกณฑ์'), d.history.length ? h('ul', { class: 'list small' }, d.history.map(function (x) {
          return h('li', null, h('strong', null, 'รุ่น ' + x.version), ' · ' + UI.thDateTime(x.createdAt) + ' · ' + x.weightSaving + '/' + x.weightActivity + '/' + x.weightSpecial + '/' + x.weightDuty, h('div', { class: 'tiny muted' }, x.reason));
        })) : h('p', { class: 'small muted' }, 'ใช้ค่าตั้งต้น (ยังไม่เคยบันทึก)')));
    });
  }, { roles: ADMIN });

  /* ---------- เกณฑ์ตัดเกรด ---------- */
  R('/a/grade-rules', function () {
    return API.call('grade.rules.get').then(function (d) {
      var rows = d.rules.map(function (r) { return { minScore: r.minScore, maxScore: r.maxScore, grade: r.grade, label: r.label || '' }; }).sort(function (a, b) { return b.minScore - a.minScore; });
      var box = h('div'); var msg = h('div');
      function validate() {
        var rs = rows.map(function (r) { return { min: Number(r.minScore), max: Number(r.maxScore), grade: String(r.grade).trim() }; }).sort(function (a, b) { return a.min - b.min; });
        var e = [];
        rs.forEach(function (r, i) { if (!(r.min < r.max)) e.push('ช่วง ' + r.min + '–' + r.max + ' ไม่ถูกต้อง'); if (!r.grade) e.push('ช่วง ' + r.min + ' ยังไม่ระบุผล'); if (i && rs[i - 1].max !== r.min) e.push(rs[i - 1].max > r.min ? 'ช่วงทับซ้อนที่ ' + r.min : 'มีช่องว่างระหว่าง ' + rs[i - 1].max + ' ถึง ' + r.min); });
        if (rs.length && rs[0].min !== 0) e.push('ต้องเริ่มที่ 0'); if (rs.length && rs[rs.length - 1].max !== 100) e.push('ต้องสิ้นสุดที่ 100');
        msg.textContent = ''; msg.appendChild(e.length ? UI.alert('err', e.join(' · ')) : UI.alert('ok', 'ช่วงคะแนนต่อเนื่อง ไม่ทับซ้อน'));
        save.disabled = !!e.length;
      }
      function draw() {
        box.textContent = '';
        rows.forEach(function (r, i) {
          function inp(k, type) { return h('input', { class: 'inp', type: type || 'number', value: r[k], 'aria-label': k, oninput: function (e) { r[k] = e.target.value; validate(); } }); }
          box.appendChild(h('div', { class: 'row', style: { marginBottom: '.4rem' } }, inp('minScore'), h('span', null, '≤ คะแนน <'), inp('maxScore'), h('span', null, '='), inp('grade', 'text'),
            h('button', { class: 'btn small ghost', onclick: function () { rows.splice(i, 1); draw(); } }, '×')));
        });
        validate();
      }
      var save = h('button', { class: 'btn primary block', onclick: function () { App.action(save, function () { return API.call('grade.rules.save', { rules: rows }).then(function () { UI.toast('บันทึกเกณฑ์ตัดเกรดแล้ว'); App.render(); }); }); } }, 'บันทึก');
      draw();
      return h('div', null, UI.pageHead('เกณฑ์ตัดเกรด', '#/more'), h('div', { class: 'card' }, h('p', { class: 'small' }, 'แต่ละช่วงคือ ต่ำสุด ≤ คะแนน < สูงสุด (ช่วงบนสุดรวม 100) ผลประเมินเป็นตัวเลขหรือข้อความก็ได้ เช่น ผ่าน/ไม่ผ่าน'),
        box, h('button', { class: 'btn small', onclick: function () { rows.push({ minScore: 0, maxScore: 0, grade: '' }); draw(); } }, '+ เพิ่มช่วง'), msg, save));
    });
  }, { roles: ADMIN });

  /* ---------- ตั้งค่าระบบ ---------- */
  R('/a/settings', function () {
    return API.call('admin.settings', {}).then(function (d) {
      var inputs = {};
      var save = h('button', { class: 'btn primary block', onclick: function () {
        var values = {}; Object.keys(inputs).forEach(function (k) { values[k] = inputs[k].type === 'checkbox' ? String(inputs[k].checked) : inputs[k].value; });
        App.action(save, function () { return API.call('admin.settings', { values: values }).then(function () { UI.toast('บันทึกแล้ว'); App.me = null; App.render(); }); });
      } }, 'บันทึกการตั้งค่า');
      return h('div', null, UI.pageHead('ตั้งค่าระบบ', '#/more'), UI.alert('info', 'ค่าลับ (LINE Token, Pepper) อยู่ใน Script Properties ของ Apps Script เท่านั้น ไม่แสดงที่นี่'),
        h('div', { class: 'card' }, d.settings.map(function (s) {
          var isBool = s.value === 'true' || s.value === 'false';
          var inp = isBool ? h('input', { type: 'checkbox', checked: s.value === 'true' }) : h('input', { value: s.value });
          inputs[s.key] = inp;
          return isBool ? h('label', { class: 'check', style: { marginBottom: '.8rem' } }, inp, h('span', null, h('strong', null, s.description), h('div', { class: 'tiny muted' }, s.key))) : UI.field(s.description, inp, s.key);
        }), save));
    });
  }, { roles: ADMIN });

  /* ---------- Audit ---------- */
  R('/a/audit', function (p, q) {
    return API.call('admin.audit', { action: q.action || '' }).then(function (d) {
      var filter = h('input', { class: 'inp', placeholder: 'กรองตามการกระทำ เช่น SAVING, REVIEW, GRADE', value: q.action || '', onchange: function () { App.go('#/a/audit?action=' + encodeURIComponent(filter.value.toUpperCase())); } });
      return h('div', null, UI.pageHead('ประวัติการเปลี่ยนแปลง', '#/more'), filter, h('div', { class: 'card', style: { marginTop: '1rem' } }, d.logs.length ? h('ul', { class: 'list small' }, d.logs.map(function (l) {
        return h('li', null, h('div', { class: 'row between' }, h('strong', null, l.action), h('span', { class: 'tiny muted' }, UI.thDateTime(l.at))), h('div', null, l.actor + ' · ' + l.entityType + ' ' + (l.entityId || '').slice(0, 40)),
          l.reason ? h('div', null, 'เหตุผล: ' + l.reason) : null, l.after ? h('div', { class: 'tiny muted pre' }, (l.before ? JSON.stringify(l.before) + ' → ' : '') + JSON.stringify(l.after).slice(0, 300)) : null);
      })) : UI.empty('ไม่มีประวัติ')));
    });
  }, { roles: ADMIN });

  R('/a/reconcile', function () {
    var out = h('div');
    function run(fix, btn) {
      App.action(btn, function () { return API.call('admin.reconcile', { fix: fix }).then(function (r) {
        out.textContent = '';
        out.appendChild(r.issues.length ? h('div', null, UI.alert(fix ? 'ok' : 'warn', (fix ? 'ซ่อมแล้ว ' : 'พบปัญหา ') + r.issues.length + ' รายการ'), h('ul', { class: 'small' }, r.issues.map(function (i) { return h('li', null, i.type + ' ' + (i.txId || i.entryId || i.refId)); }))) : UI.alert('ok', 'ข้อมูลออมเงินและบัญชีตรงกันทั้งหมด'));
      }); });
    }
    var b1 = h('button', { class: 'btn', onclick: function () { run(false, b1); } }, 'ตรวจสอบ'), b2 = h('button', { class: 'btn danger', onclick: function () { UI.confirm('ซ่อมแซม', 'ระบบจะสร้างรายรับที่ขาด ยกเลิกรายรับซ้ำ และคำนวณการจัดสรรรอบใหม่ (บันทึกใน Audit)', 'ซ่อมแซม', true).then(function (ok) { if (ok) run(true, b2); }); } }, 'ซ่อมแซม');
    return h('div', null, UI.pageHead('กระทบยอด', '#/more'), h('div', { class: 'card' }, h('p', { class: 'small' }, 'ใช้เมื่อสงสัยว่าการบันทึกเกิดขัดข้องกลางคัน: ตรวจว่ารายการออมทุกรายการมีรายรับในบัญชีห้องเพียง 1 รายการ และยอดตรงกัน'), h('div', { class: 'grid two' }, b1, b2), out));
  }, { roles: ADMIN });
})();
