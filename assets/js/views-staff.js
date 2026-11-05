/* views-staff.js — หน้าจอครู/แอดมิน และหน้าที่หัวหน้า/รองหัวหน้าใช้ร่วม (รับเงินออม บัญชีห้อง) */
(function () {
  'use strict';
  var h = UI.h, R = App.route;
  var STAFF = ['ADMIN', 'TEACHER'];

  /* ================= รับเงินออม (หัวหน้า/รอง/ครู) ================= */
  function collectView(classroomId, date) {
    return API.call('saving.class', { classroomId: classroomId, date: date }).then(function (d) {
      var sel = {}; // studentId -> สตางค์
      var defAmt = d.defaultAmountSatang;
      var listBox = h('div');
      var totalEl = h('strong'); var countEl = h('span');
      var filter = 'all';
      function refreshFoot() {
        var ids = Object.keys(sel); var tot = ids.reduce(function (a, k) { return a + (sel[k] || 0); }, 0);
        countEl.textContent = 'เลือก ' + ids.length + ' คน'; totalEl.textContent = UI.baht(tot);
        saveBtn.disabled = !ids.length;
      }
      function row(s) {
        var sm = s.summary;
        var st = sm.shortfallSatang === 0 ? h('span', { class: 'status st-ok' }, '✓ ครบแล้ว') : h('span', { class: 'status st-warn' }, '◐ ขาด ' + UI.baht(sm.shortfallSatang));
        var cb = h('input', { type: 'checkbox', 'aria-label': 'เลือก ' + s.name, checked: !!sel[s.studentId] });
        var amt = h('input', { class: 'amt', type: 'number', inputmode: 'decimal', min: '0.25', step: '0.25', value: sel[s.studentId] ? sel[s.studentId] / 100 : defAmt / 100, 'aria-label': 'จำนวนเงิน (บาท)' });
        var item = h('div', { class: 'collect-item' + (sel[s.studentId] ? ' selected' : '') });
        function setAmt(satang) { amt.value = satang / 100; cb.checked = true; sel[s.studentId] = satang; item.classList.add('selected'); refreshFoot(); }
        cb.addEventListener('change', function () {
          if (cb.checked) { var v = UI.toSatang(amt.value); if (!(v > 0)) v = defAmt; setAmt(v); }
          else { delete sel[s.studentId]; item.classList.remove('selected'); refreshFoot(); }
        });
        amt.addEventListener('input', function () { var v = UI.toSatang(amt.value); if (v > 0) { sel[s.studentId] = v; cb.checked = true; item.classList.add('selected'); } else { delete sel[s.studentId]; cb.checked = false; item.classList.remove('selected'); } refreshFoot(); });
        var quick = h('div', { class: 'quick' }, [500, 1000, 2000].map(function (v) { return h('button', { class: 'chip-btn', type: 'button', onclick: function () { setAmt(v); } }, (v / 100) + ' บาท'); }),
          sm.shortfallSatang > 0 ? h('button', { class: 'chip-btn on', type: 'button', onclick: function () { setAmt(sm.shortfallSatang); } }, 'ชดเชยครบ ' + UI.baht(sm.shortfallSatang)) : null);
        item.appendChild(cb);
        item.appendChild(h('div', null, h('div', { class: 'title' }, (s.studentNo ? s.studentNo + '. ' : '') + s.name + (s.nickname ? ' (' + s.nickname + ')' : '')),
          h('div', { class: 'row wrap tiny' }, st, s.recordedOnDate ? h('span', { class: 'status st-wait' }, '● บันทึกวันนี้แล้ว ' + UI.baht(s.recordedOnDate)) : null)));
        item.appendChild(amt);
        item.appendChild(quick);
        return item;
      }
      function draw() {
        listBox.textContent = '';
        d.students.filter(function (s) {
          if (filter === 'short') return s.summary.shortfallSatang > 0;
          if (filter === 'today') return s.recordedOnDate > 0;
          return true;
        }).forEach(function (s) { listBox.appendChild(row(s)); });
        if (!listBox.childNodes.length) listBox.appendChild(UI.empty('ไม่มีรายชื่อในตัวกรองนี้'));
      }
      var dateInp = h('input', { type: 'date', class: 'inp', value: d.date, max: App.me.today, onchange: function () { App.go(location.hash.split('?')[0] + '?date=' + dateInp.value + (location.hash.indexOf('tab=') > 0 ? '&tab=collect' : '')); } });
      var note = h('input', { class: 'inp', maxlength: '300', placeholder: 'หมายเหตุ (ถ้ามี)' });
      var filters = h('div', { class: 'tabs' }, [['all', 'ทั้งหมด'], ['short', 'ยังไม่ครบ'], ['today', 'บันทึกวันนี้แล้ว']].map(function (f) {
        var b = h('button', { type: 'button', class: f[0] === filter ? 'on' : '', onclick: function () { filter = f[0]; Array.prototype.forEach.call(filters.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); draw(); } }, f[1]);
        return b;
      }));
      var saveBtn = h('button', { class: 'btn sun', type: 'button', disabled: true, onclick: confirmSave }, 'ตรวจสอบและยืนยัน');
      var requestId = UI.rid(); // ใช้รหัสเดิมจนกว่าบันทึกสำเร็จ → กดซ้ำ/เน็ตหลุดไม่บันทึกซ้ำ
      function confirmSave() {
        var ids = Object.keys(sel);
        var byId = {}; d.students.forEach(function (s) { byId[s.studentId] = s; });
        var tot = ids.reduce(function (a, k) { return a + sel[k]; }, 0);
        var body = h('div', null, h('p', null, 'วันที่รับเงินจริง: ', h('strong', null, UI.thDate(dateInp.value))),
          h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'นักเรียน'), h('th', { class: 'num' }, 'จำนวน'))),
            h('tbody', null, ids.map(function (k) { return h('tr', null, h('td', null, byId[k].name), h('td', { class: 'num' }, UI.baht(sel[k]))); })))),
          h('p', null, 'รวม ' + ids.length + ' คน ', h('strong', null, UI.baht(tot))), note.value ? h('p', { class: 'small' }, 'หมายเหตุ: ' + note.value) : null);
        UI.modal('ยืนยันการรับเงิน', body, [{ label: 'แก้ไข', value: false, cls: 'ghost' }, { label: 'ยืนยันบันทึก', value: true, cls: 'primary' }]).then(function (ok) {
          if (!ok) return;
          App.action(saveBtn, function () {
            return API.call('saving.record', { classroomId: classroomId, receivedDate: dateInp.value, note: note.value, items: ids.map(function (k) { return { studentId: k, amountSatang: sel[k] }; }) }, { requestId: requestId })
              .then(function (r) { UI.toast((r.duplicate ? 'รายการนี้บันทึกไปแล้ว ' : 'บันทึกแล้ว ') + r.count + ' คน รวม ' + UI.baht(r.totalSatang)); App.render(); });
          });
        });
      }
      draw(); refreshFoot();
      return h('div', null,
        h('div', { class: 'card' }, h('div', { class: 'grid two' }, UI.field('วันที่รับเงินจริง', dateInp), UI.field('หมายเหตุ', note)),
          d.isRoundDay ? null : UI.alert('info', 'วันที่เลือกไม่ใช่วันรอบออม (ยังรับเงินชดเชยหรือล่วงหน้าได้)'),
          h('div', { class: 'row wrap' }, h('button', { class: 'btn small', type: 'button', onclick: function () {
            d.students.forEach(function (s) { if (s.summary.shortfallSatang > 0 && !s.recordedOnDate) sel[s.studentId] = defAmt; }); draw(); refreshFoot();
          } }, 'เลือกคนที่ยังไม่ครบ (' + UI.baht(defAmt) + ')'), h('button', { class: 'btn small ghost', type: 'button', onclick: function () { sel = {}; draw(); refreshFoot(); } }, 'ล้างที่เลือก'))),
        filters, h('div', { class: 'card' }, listBox),
        h('div', { class: 'sticky-foot' }, h('div', { class: 'grow', style: { flex: '1' } }, countEl, h('div', null, 'รวม ', totalEl)), saveBtn));
    });
  }

  function historyView(classroomId) {
    return API.call('saving.history', { classroomId: classroomId, from: UI.addDays(App.me.today, -30) }).then(function (rows) {
      return h('div', { class: 'card' }, h('h3', null, 'ประวัติรายการออม 30 วันล่าสุด'), rows.length ? h('ul', { class: 'list' }, rows.map(function (t) {
        var acts = h('div', { class: 'row wrap' });
        if (t.canVoid) {
          acts.appendChild(h('button', { class: 'btn small', onclick: function () {
            UI.prompt('ปรับปรุงจำนวนเงิน', 'จำนวนเงินที่ถูกต้อง (บาท)', { type: 'number', value: t.amountSatang / 100 }).then(function (v) {
              if (v === null) return; var s = UI.toSatang(v); if (!(s > 0)) return UI.toast('จำนวนเงินต้องมากกว่า 0', 'err');
              return UI.prompt('เหตุผลการปรับปรุง', 'เหตุผล', { required: true, minLength: 3 }).then(function (reason) {
                if (!reason) return;
                return API.call('saving.adjust', { txId: t.txId, amountSatang: s, reason: reason }, { mutate: true }).then(function () { UI.toast('ปรับปรุงแล้ว'); App.render(); });
              });
            }).catch(function (e) { UI.toast(e.message, 'err'); });
          } }, 'ปรับปรุง'));
          acts.appendChild(h('button', { class: 'btn small danger', onclick: function () {
            UI.prompt('ยกเลิกรายการ ' + UI.baht(t.amountSatang) + ' ของ ' + t.studentName, 'เหตุผล (บันทึกในประวัติ)', { required: true, minLength: 3, danger: true, ok: 'ยกเลิกรายการ', help: 'ระบบจะปรับยอดออม การจัดสรรรอบ และบัญชีห้องพร้อมกัน' }).then(function (reason) {
              if (!reason) return;
              return API.call('saving.void', { txId: t.txId, reason: reason }, { mutate: true }).then(function (r) { UI.toast('ยกเลิกแล้ว'); if (r.balanceWarning) UI.toast('คำเตือน: ยอดคงเหลือของห้องติดลบ', 'err'); App.render(); });
            }).catch(function (e) { UI.toast(e.message, 'err'); });
          } }, 'ยกเลิก'));
        }
        return h('li', { class: t.status === 'VOID' ? 'muted' : '' }, h('div', { class: 'row between' }, h('strong', null, t.studentName), h('span', null, UI.baht(t.amountSatang))),
          h('div', { class: 'tiny' }, 'รับ ' + UI.thDate(t.receivedDate) + ' · บันทึก ' + UI.thDateTime(t.recordedAt) + ' โดย ' + t.recordedBy + (t.note ? ' · ' + t.note : '')),
          t.status === 'VOID' ? h('div', { class: 'tiny' }, UI.status('VOID'), ' ' + t.voidReason) : null, t.replacesTxId ? h('div', { class: 'tiny muted' }, 'ปรับปรุงจากรายการเดิม') : null, acts);
      })) : UI.empty('ยังไม่มีรายการ'));
    });
  }

  /* ================= บัญชีห้อง ================= */
  function ledgerView(classroomId, q) {
    var term = App.me.term || {};
    var today = App.me.today;
    var preset = q.range || 'month';
    var from = q.from || (preset === 'today' ? today : preset === 'term' ? term.startDate : today.slice(0, 8) + '01');
    var to = q.to || today;
    return API.call('ledger.summary', { classroomId: classroomId, from: from, to: to }).then(function (d) {
      var base = location.hash.split('?')[0];
      var keep = (q.tab ? 'tab=' + q.tab + '&' : '');
      var fromI = h('input', { type: 'date', class: 'inp', value: d.from }), toI = h('input', { type: 'date', class: 'inp', value: d.to });
      var filters = h('div', { class: 'card' }, h('div', { class: 'tabs' }, [['today', 'วันนี้'], ['month', 'เดือนนี้'], ['term', 'ภาคเรียนนี้']].map(function (p) {
        return h('a', { href: base + '?' + keep + 'range=' + p[0], class: preset === p[0] && !q.from ? 'on' : '' }, p[1]);
      })), h('div', { class: 'grid two' }, UI.field('ตั้งแต่', fromI), UI.field('ถึง', toI)),
        h('button', { class: 'btn small', onclick: function () { App.go(base + '?' + keep + 'from=' + fromI.value + '&to=' + toI.value); } }, 'ดูช่วงนี้'));
      var summary = h('div', { class: 'card mint' }, h('h3', null, 'สรุปช่วง ' + UI.thDate(d.from) + ' – ' + UI.thDate(d.to)),
        h('div', { class: 'grid two' }, UI.stat('ยอดยกมาต้นช่วง', UI.baht(d.openingSatang)), UI.stat('รายรับในช่วง', UI.baht(d.rangeIncomeSatang)),
          UI.stat('รายจ่ายในช่วง', UI.baht(d.rangeExpenseSatang)), UI.stat('ยอดคงเหลือปลายช่วง', UI.baht(d.closingSatang))),
        h('div', { class: 'grid three', style: { marginTop: '.6rem' } }, UI.stat('รายรับสะสม', UI.baht(d.cumulativeIncomeSatang)), UI.stat('รายจ่ายสะสม', UI.baht(d.cumulativeExpenseSatang)), UI.stat('ยอดคงเหลือของห้อง (สะสม)', UI.baht(d.cumulativeBalanceSatang))),
        h('p', { class: 'tiny muted' }, 'ยอดคงเหลือปลายวัน = ยอดยกมาต้นวัน + รายรับวันนี้ − รายจ่ายวันนี้ · ยอดของห้องไม่ใช่เงินออมรายคน'));
      var daily = h('div', { class: 'card' }, h('h3', null, 'รายวัน'), d.daily.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['วันที่', 'ยกมาต้นวัน', 'รายรับ', 'รายจ่าย', 'คงเหลือปลายวัน'].map(function (x, i) { return h('th', { class: i ? 'num' : '' }, x); }))),
        h('tbody', null, d.daily.map(function (r) { return h('tr', null, h('td', null, UI.thDate(r.date)), h('td', { class: 'num' }, UI.baht(r.openingSatang)), h('td', { class: 'num' }, UI.baht(r.incomeSatang)), h('td', { class: 'num' }, UI.baht(r.expenseSatang)), h('td', { class: 'num' }, UI.baht(r.closingSatang))); })))) : UI.empty('ไม่มีรายการในช่วงนี้'));
      var entries = h('div', { class: 'card' }, h('h3', null, 'รายการ'), d.entries.length ? h('ul', { class: 'list' }, d.entries.map(function (l) {
        return h('li', { class: l.status === 'VOID' ? 'muted' : '' }, h('div', { class: 'row between' }, h('span', null, (l.direction === 'IN' ? '➕ ' : '➖ ') + l.description), h('strong', null, (l.direction === 'IN' ? '+' : '−') + UI.baht(l.amountSatang))),
          h('div', { class: 'tiny' }, UI.thDate(l.date) + ' · ' + l.category + ' · ' + l.recordedBy + (l.note ? ' · ' + l.note : '')),
          l.status === 'VOID' ? h('div', { class: 'tiny' }, UI.status('VOID'), ' ' + l.voidReason) : null,
          l.receiptFileIds.length ? App.gallery(l.receiptFileIds) : null,
          l.canVoid ? h('button', { class: 'btn small danger', style: { marginTop: '.3rem' }, onclick: function () {
            UI.prompt('ยกเลิกรายการ', 'เหตุผล', { required: true, minLength: 3, danger: true, ok: 'ยกเลิกรายการ' }).then(function (reason) {
              if (!reason) return;
              return API.call('ledger.void', { entryId: l.entryId, reason: reason }, { mutate: true }).then(function () { UI.toast('ยกเลิกแล้ว'); App.render(); });
            }).catch(function (e) { UI.toast(e.message, 'err'); });
          } }, 'ยกเลิก') : null);
      })) : UI.empty('ไม่มีรายการ'));
      var addBtn = h('button', { class: 'btn primary block', onclick: function () { expenseModal(classroomId, d.categories); } }, UI.icon('plus'), 'บันทึกรายจ่าย');
      var adminBtn = App.isAdmin() ? h('button', { class: 'btn block', style: { marginTop: '.5rem' }, onclick: function () { adjustModal(classroomId); } }, 'ยอดยกมา / ปรับปรุงยอด (แอดมิน)') : null;
      return h('div', null, addBtn, adminBtn, h('div', { style: { height: '1rem' } }), filters, summary, daily, entries);
    });
  }

  function expenseModal(classroomId, categories) {
    var date = h('input', { type: 'date', max: App.me.today, value: App.me.today });
    var cat = UI.select(categories.map(function (c) { return { value: c, label: c }; }), categories[0]);
    var desc = h('input', { maxlength: '200' }); var amt = h('input', { type: 'number', inputmode: 'decimal', min: '0.01', step: '0.01' });
    var note = h('input', { maxlength: '300' });
    var up = App.uploader([], { label: 'แนบภาพใบเสร็จ (ถ้ามี)', classroomId: classroomId });
    var requestId = UI.rid();
    UI.modal('บันทึกรายจ่าย', h('div', null, h('div', { class: 'grid two' }, UI.field('วันที่', date), UI.field('หมวดหมู่', cat)), UI.field('รายการ', desc), UI.field('จำนวนเงิน (บาท)', amt), UI.field('หมายเหตุ', note), up.el),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary', validate: function () {
        if (up.busy()) { UI.toast('รออัปโหลดภาพ', 'err'); return false; }
        if (!(UI.toSatang(amt.value) > 0)) { UI.toast('จำนวนเงินต้องมากกว่า 0', 'err'); return false; }
        if (!desc.value.trim()) { UI.toast('กรุณากรอกรายการ', 'err'); return false; }
        return true;
      } }]).then(function (ok) {
      if (!ok) return;
      return API.call('ledger.expense', { classroomId: classroomId, date: date.value, category: cat.value, description: desc.value, amountSatang: UI.toSatang(amt.value), note: note.value, receiptFileIds: up.getIds() }, { requestId: requestId })
        .then(function () { UI.toast('บันทึกรายจ่ายแล้ว'); App.render(); });
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }
  function adjustModal(classroomId) {
    var type = UI.select([{ value: 'OPENING', label: 'ยอดยกมา' }, { value: 'ADJUST', label: 'ปรับปรุงยอด' }], 'OPENING');
    var dir = UI.select([{ value: 'IN', label: 'เพิ่มยอด' }, { value: 'OUT', label: 'ลดยอด' }], 'IN');
    var date = h('input', { type: 'date', value: App.me.today }); var amt = h('input', { type: 'number', min: '0.01', step: '0.01' }); var reason = h('textarea', { maxlength: '300' });
    UI.modal('ยอดยกมา / ปรับปรุงยอด', h('div', null, UI.field('ประเภท', type), UI.field('ทิศทาง (เฉพาะปรับปรุง)', dir), UI.field('วันที่', date), UI.field('จำนวนเงิน (บาท)', amt), UI.field('เหตุผล (จำเป็น)', reason)),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary', validate: function () { return reason.value.trim().length >= 3 && UI.toSatang(amt.value) > 0; } }]).then(function (ok) {
      if (!ok) return;
      return API.call('ledger.adjust', { classroomId: classroomId, type: type.value, direction: dir.value, date: date.value, amountSatang: UI.toSatang(amt.value), reason: reason.value }, { mutate: true }).then(function () { UI.toast('บันทึกแล้ว'); App.render(); });
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  // หัวหน้า/รองหัวหน้า
  R('/saving/collect', function (p, q) {
    if (!App.me.isOfficer) throw new Error('เฉพาะหัวหน้าห้องและรองหัวหน้าห้อง');
    var cid = App.me.enrollment.classroomId;
    return Promise.all([collectView(cid, q.date), historyView(cid)]).then(function (v) { return h('div', null, UI.pageHead('รับเงินออม'), window.officerTabs('#/saving/collect'), v[0], v[1]); });
  }, { roles: ['STUDENT'] });
  R('/ledger', function (p, q) {
    if (!App.me.isOfficer) throw new Error('เฉพาะหัวหน้าห้องและรองหัวหน้าห้อง');
    return ledgerView(App.me.enrollment.classroomId, q).then(function (v) { return h('div', null, UI.pageHead('บัญชีห้อง'), window.officerTabs('#/ledger'), v); });
  }, { roles: ['STUDENT'] });
  // ครู/แอดมิน
  R('/t/saving', function (p, q) {
    var cid = App.needClass(); var tab = q.tab || 'collect';
    var tabs = h('div', { class: 'tabs' }, [['collect', 'รับเงิน'], ['ledger', 'บัญชีห้อง'], ['history', 'ประวัติ/ยกเลิก'], ['rounds', 'รอบออม']].map(function (t) { return h('a', { href: '#/t/saving?tab=' + t[0], class: tab === t[0] ? 'on' : '' }, t[1]); }));
    var view = tab === 'ledger' ? ledgerView(cid, q) : tab === 'history' ? historyView(cid) : tab === 'rounds' ? roundsView(cid) : collectView(cid, q.date);
    return view.then(function (v) { return h('div', null, UI.pageHead('ออมเงิน · ' + App.className()), tabs, v); });
  }, { roles: STAFF });

  function roundsView(cid) {
    return API.call('admin.rounds', { classroomId: cid }).then(function (d) {
      return h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'รอบออมทั้งหมด ' + d.rounds.length + ' รอบ'), App.isAdmin() ? h('a', { class: 'btn small', href: '#/a/rounds' }, 'จัดการ') : null),
        d.rounds.length ? h('div', { class: 'dots' }, d.rounds.map(function (r) { return h('span', { class: r.date <= App.me.today ? 'PAID' : 'UNPAID future', title: UI.thDate(r.date) + ' · ' + UI.baht(r.amountSatang) + ' · ' + r.classroomName }, r.date.slice(8)); })) : UI.empty('ยังไม่มีรอบออม แอดมินต้องสร้างรอบก่อน'));
    });
  }

  /* ================= หน้าแรกครู ================= */
  R('/t/home', function () {
    return API.call('dashboard.teacher').then(function (d) {
      var u = App.me.user;
      return h('div', null,
        h('div', { class: 'card mint' }, h('div', { class: 'hero' }, UI.mascot('wave'), h('div', null, h('div', { class: 'small muted' }, UI.thDate(d.today, true)), h('h1', null, 'สวัสดี ' + u.fullName), h('div', { class: 'small' }, App.isAdmin() ? 'ครูแอดมิน' : 'ครู')))),
        App.me.term ? null : UI.alert('warn', 'ยังไม่ได้ตั้งภาคเรียนปัจจุบัน (แอดมิน: เมนู → โครงสร้างโรงเรียน)'),
        h('a', { class: 'card sun', href: '#/review', style: { display: 'block', textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'card-title' }, UI.icon('inbox'), h('h2', null, 'รอตรวจ ' + d.queue.length + ' รายการ')),
          d.queue.length ? h('ul', { class: 'list' }, d.queue.slice(0, 5).map(function (i) { return h('li', null, h('strong', null, i.title || ''), h('div', { class: 'tiny muted' }, i.studentName + ' · ' + i.classroom)); })) : h('div', { class: 'muted' }, 'ไม่มีงานค้างตรวจ 🎉')),
        d.classes.length ? d.classes.map(function (c) {
          return h('div', { class: 'card' }, h('div', { class: 'card-title' }, UI.icon('users'), h('h2', null, c.name), h('span', { class: 'small muted' }, c.students + ' คน')),
            h('div', { class: 'grid two' }, UI.stat('รอตรวจ', String(c.pending)), UI.stat('ยอดคงเหลือของห้อง', UI.baht(c.balanceSatang)), UI.stat('รับเงินออมวันนี้', c.todaySavingCount + ' รายการ', UI.baht(c.todaySavingSatang)),
              UI.stat('เวรวันนี้', c.duty.holiday ? 'วันหยุด' : c.duty.duties.length + ' กลุ่ม')),
            c.duty.duties && c.duty.duties.length ? h('ul', { class: 'list small' }, c.duty.duties.map(function (x) { return h('li', null, h('strong', null, x.groupName + ' · ' + x.area), h('div', { class: 'row wrap' }, x.members.map(function (m) { return h('span', null, m.name + ' ', UI.status(m.status)); }))); })) : null,
            h('div', { class: 'row wrap', style: { marginTop: '.5rem' } }, h('button', { class: 'btn small', onclick: function () { App.setClass(c.classroomId); App.go('#/t/saving'); } }, 'ออมเงิน'), h('button', { class: 'btn small', onclick: function () { App.setClass(c.classroomId); App.go('#/t/scores'); } }, 'คะแนน')));
        }) : UI.empty('ยังไม่ได้รับมอบหมายห้องเรียน'));
    });
  }, { roles: STAFF });

  /* ================= ตรวจงาน ================= */
  R('/review', function () {
    return API.call('review.queue', {}).then(function (d) {
      var href = { activity: function (i) { return '#/review/activity/' + i.id; }, special: function (i) { return '#/special/' + i.id; }, duty: function (i) { return '#/duty-report/' + i.id; } };
      var icon = { activity: 'flag', special: 'star', duty: 'broom' };
      var label = { activity: 'กิจกรรม', special: 'กิจกรรมพิเศษ', duty: 'รายงานเวร' };
      return h('div', null, UI.pageHead('ตรวจงาน'), h('div', { class: 'card' }, d.items.length ? h('ul', { class: 'list' }, d.items.map(function (i) {
        return h('li', null, h('a', { class: 'list-link', href: href[i.kind](i) }, UI.icon(icon[i.kind]), h('div', { class: 'grow' }, h('div', { class: 'title' }, i.title || ''),
          h('div', { class: 'tiny muted' }, label[i.kind] + ' · ' + i.studentName + ' · ' + i.classroom + ' · ' + UI.thDateTime(i.at))), UI.status('PENDING')));
      })) : UI.empty('ไม่มีงานรอตรวจ เยี่ยมมาก!', 'cheer')));
    });
  }, { roles: STAFF });

  function reviewBox(opts) {
    // opts: max, current {status, score, feedback}, onSubmit(decision, score, feedback, reason)
    var score = h('input', { type: 'number', min: '0', max: String(opts.max), step: '0.5', inputmode: 'decimal', value: opts.current && opts.current.draftScore !== null && opts.current.draftScore !== undefined && opts.current.draftScore !== '' ? opts.current.draftScore : '' });
    var fb = h('textarea', { maxlength: '2000', placeholder: 'ข้อเสนอแนะ (จำเป็นเมื่อส่งกลับหรือไม่อนุมัติ)' }); fb.value = (opts.current && opts.current.feedback) || '';
    var wasApproved = opts.current && opts.current.status === 'APPROVED';
    function go(decision, btn) {
      var p = Promise.resolve(null);
      if (wasApproved && decision !== 'APPROVE') p = UI.prompt('ถอนอนุมัติ', 'เหตุผลการถอนอนุมัติ (บันทึกในประวัติ)', { required: true, minLength: 3, danger: true });
      p.then(function (reason) {
        if (wasApproved && decision !== 'APPROVE' && !reason) return;
        App.action(btn, function () { return opts.onSubmit(decision, score.value, fb.value, reason || ''); });
      });
    }
    var bA = h('button', { class: 'btn primary', type: 'button', onclick: function () { go('APPROVE', bA); } }, '✓ อนุมัติ');
    var bR = h('button', { class: 'btn sun', type: 'button', onclick: function () { go('REVISE', bR); } }, '↺ ให้แก้ไข');
    var bX = h('button', { class: 'btn danger', type: 'button', onclick: function () { go('REJECT', bX); } }, '✕ ไม่อนุมัติ');
    return h('div', { class: 'card sun' }, h('h3', null, 'ผลการตรวจ'), UI.field('คะแนน (0–' + opts.max + ')', score), UI.field('ข้อเสนอแนะ', fb), h('div', { class: 'grid three' }, bA, bR, bX));
  }

  R('/review/activity/:subId', function (p) {
    return API.call('activity.submission', { submissionId: p.subId }).then(function (d) { return submissionReview(d.activity, d.student, '#/review'); });
  }, { roles: STAFF });

  function submissionReview(a, st, back) {
    var s = st.submission;
    return h('div', null, UI.pageHead('ตรวจกิจกรรม', back),
      h('div', { class: 'card sky' }, h('h2', null, a.title), h('div', { class: 'small' }, 'คะแนนเต็ม ' + a.maxScore + ' · หลักฐาน: ' + ({ IMAGE: 'รูปภาพ', SUMMARY: 'สรุป', BOTH: 'รูปภาพ+สรุป' })[a.evidenceType]), a.rubric ? h('div', { class: 'small' }, 'แนวทาง: ' + a.rubric) : null),
      h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, st.name), UI.status(s.status)), h('div', { class: 'tiny muted' }, 'ส่งเมื่อ ' + UI.thDateTime(s.submittedAt) + ' · ฉบับที่ ' + s.version),
        s.summary ? h('p', { class: 'pre' }, s.summary) : null, App.gallery(s.fileIds)),
      s.status === 'DRAFT' ? UI.alert('info', 'นักเรียนยังไม่ได้ส่งตรวจ') : reviewBox({ max: a.maxScore, current: s, onSubmit: function (dec, score, fb, reason) {
        return API.call('review.activity', { submissionId: s.submissionId, decision: dec, score: score, feedback: fb, reason: reason }, { mutate: true }).then(function () { UI.toast('บันทึกผลตรวจแล้ว'); history.back(); });
      } }));
  }

  window.staffSpecialReview = function (s) {
    return API.call('policy.get').then(function (pol) {
      return h('div', null, UI.pageHead('ตรวจกิจกรรมพิเศษ', '#/review'),
        h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', null, s.title), UI.status(s.status)),
          h('dl', { class: 'kv' }, h('dt', null, 'นักเรียน'), h('dd', null, s.studentName), h('dt', null, 'วันที่'), h('dd', null, UI.thDate(s.activityDate)), h('dt', null, 'ประเภท'), h('dd', null, s.category), h('dt', null, 'บทบาท'), h('dd', null, s.role || '-')),
          h('h3', null, 'รายละเอียด'), h('p', { class: 'pre' }, s.detail), h('h3', null, 'สิ่งที่ได้เรียนรู้'), h('p', { class: 'pre' }, s.learning), App.gallery(s.fileIds)),
        s.status === 'DRAFT' ? UI.alert('info', 'ยังเป็นฉบับร่าง') : reviewBox({ max: pol.active.specialMaxPerItem, current: s, onSubmit: function (dec, score, fb, reason) {
          return API.call('review.special', { submissionId: s.submissionId, decision: dec, score: score, feedback: fb, reason: reason }, { mutate: true }).then(function () { UI.toast('บันทึกผลตรวจแล้ว'); history.back(); });
        } }));
    });
  };

  window.dutyReviewForm = function (d) {
    var r = d.report;
    var rows = d.members.map(function (m) {
      var cb = h('input', { type: 'checkbox', checked: r.status === 'APPROVED' ? m.certified : false,'aria-label': 'รับรอง ' + m.name });
      var sc = h('input', { class: 'amt', type: 'number', min: '0', max: String(d.maxScore), step: '0.5', value: m.score !== null && m.score !== '' ? m.score : d.maxScore, 'aria-label': 'คะแนน' });
      return { m: m, cb: cb, sc: sc, el: h('div', { class: 'collect-item' }, cb, h('div', null, h('div', { class: 'title' }, m.name), m.alreadyCredited ? h('div', { class: 'tiny' }, UI.status('PASSED', 'ได้รับรองจากรายงานอื่นแล้ว (จะได้ 0 คะแนน)')) : null), sc) };
    });
    var comment = h('textarea', { maxlength: '1000', placeholder: 'ความคิดเห็นถึงนักเรียน' }); comment.value = r.teacherComment || '';
    function go(decision, btn) {
      App.action(btn, function () {
        return API.call('review.duty', { reportId: r.reportId, decision: decision, comment: comment.value, members: rows.map(function (x) { return { studentId: x.m.studentId, certified: x.cb.checked, score: x.sc.value }; }) }, { mutate: true })
          .then(function () { UI.toast('บันทึกผลตรวจและแจ้งเตือนแล้ว'); App.render(); });
      });
    }
    var bA = h('button', { class: 'btn primary', onclick: function () { go('APPROVE', bA); } }, '✓ ผ่าน'), bR = h('button', { class: 'btn sun', onclick: function () { go('REVISE', bR); } }, '↺ ให้แก้ไข'), bX = h('button', { class: 'btn danger', onclick: function () { go('REJECT', bX); } }, '✕ ไม่ผ่าน');
    return h('div', { class: 'card sun' }, h('h3', null, 'ตรวจและรับรองรายคน'), h('p', { class: 'small' }, 'ติ๊กเฉพาะคนที่ทำเวรจริง ให้คะแนนได้สูงสุด ' + d.maxScore + ' ต่อคน'),
      rows.map(function (x) { return x.el; }), UI.field('ความคิดเห็น', comment), h('div', { class: 'grid three' }, bA, bR, bX));
  };

  /* ================= กิจกรรม (ครู) ================= */
  R('/t/activities', function () {
    var cid = App.needClass();
    return API.call('activity.list', { classroomId: cid }).then(function (d) {
      return h('div', null, UI.pageHead('กิจกรรม · ' + App.className()), h('div', { class: 'grid two' }, h('a', { class: 'btn primary', href: '#/t/activity-edit/new' }, UI.icon('plus'), 'สร้างกิจกรรม'), h('a', { class: 'btn', href: '#/t/special' }, UI.icon('star'), 'กิจกรรมพิเศษ')),
        h('div', { style: { height: '1rem' } }), h('div', { class: 'card' }, d.activities.length ? h('ul', { class: 'list' }, d.activities.map(function (a) {
          return h('li', null, h('a', { class: 'list-link', href: '#/t/activity/' + a.activityId }, UI.icon('flag'), h('div', { class: 'grow' }, h('div', { class: 'title' }, a.title),
            h('div', { class: 'tiny muted' }, 'ปิดรับ ' + UI.thDate(a.dueDate) + ' · รอตรวจ ' + a.stats.pending + ' · อนุมัติ ' + a.stats.approved + '/' + a.stats.students)), a.status === 'OPEN' ? h('span', { class: 'status st-ok' }, 'เปิด') : h('span', { class: 'status st-none' }, 'ปิด')));
        })) : UI.empty('ยังไม่มีกิจกรรม')));
    });
  }, { roles: STAFF });

  R('/t/activity-edit/:id', function (p) {
    var load = p.id === 'new' ? Promise.resolve(null) : API.call('activity.get', { activityId: p.id, classroomId: App.classroomId }).then(function (d) { return d.activity; });
    return load.then(function (a) {
      var title = h('input', { maxlength: '150', value: a ? a.title : '' }), desc = h('textarea', { maxlength: '3000' }); desc.value = a ? a.description : '';
      var ev = h('input', { type: 'date', value: a ? a.eventDate : App.me.today }), due = h('input', { type: 'date', value: a ? a.dueDate : UI.addDays(App.me.today, 7) });
      var evidence = UI.select([{ value: 'IMAGE', label: 'รูปภาพ' }, { value: 'SUMMARY', label: 'สรุปองค์ความรู้' }, { value: 'BOTH', label: 'ทั้งสองอย่าง' }], a ? a.evidenceType : 'BOTH');
      var max = h('input', { type: 'number', min: '1', value: a ? a.maxScore : 10 }), rubric = h('textarea', { maxlength: '3000' }); rubric.value = a ? a.rubric : '';
      var status = UI.select([{ value: 'OPEN', label: 'เปิดรับ' }, { value: 'CLOSED', label: 'ปิดรับ' }, { value: 'ARCHIVED', label: 'เก็บถาวร (ซ่อน)' }], a ? a.status : 'OPEN');
      var chosen = {}; (a ? a.classroomIds : [App.classroomId]).forEach(function (c) { chosen[c] = 1; });
      var rooms = h('div', null, App.me.classrooms.map(function (c) { var cb = h('input', { type: 'checkbox', checked: !!chosen[c.classroomId], onchange: function () { if (cb.checked) chosen[c.classroomId] = 1; else delete chosen[c.classroomId]; } }); return h('label', { class: 'check' }, cb, c.name); }));
      var btn = h('button', { class: 'btn primary block', onclick: function () {
        App.action(btn, function () {
          return API.call('activity.save', { activityId: a ? a.activityId : '', title: title.value, description: desc.value, classroomIds: Object.keys(chosen), eventDate: ev.value, dueDate: due.value, evidenceType: evidence.value, maxScore: max.value, rubric: rubric.value, status: status.value })
            .then(function (r) { UI.toast('บันทึกกิจกรรมแล้ว'); App.go('#/t/activity/' + r.activityId); });
        });
      } }, 'บันทึก');
      return h('div', null, UI.pageHead(a ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม', '#/t/activities'), h('div', { class: 'card' }, UI.field('ชื่อกิจกรรม', title), UI.field('รายละเอียด', desc), UI.field('ห้องเรียนเป้าหมาย', rooms),
        h('div', { class: 'grid two' }, UI.field('วันจัด', ev), UI.field('วันปิดรับ', due)), h('div', { class: 'grid two' }, UI.field('รูปแบบหลักฐาน', evidence), UI.field('คะแนนเต็ม', max)), UI.field('แนวทางประเมิน', rubric), UI.field('สถานะ', status), btn));
    });
  }, { roles: STAFF });

  R('/t/activity/:id', function (p, q) {
    return API.call('activity.get', { activityId: p.id, classroomId: App.classroomId }).then(function (d) {
      if (q.student) { var st = d.students.filter(function (s) { return s.studentId === q.student; })[0]; if (st && st.submission) return submissionReview(d.activity, st, '#/t/activity/' + p.id); }
      var a = d.activity;
      return h('div', null, UI.pageHead(a.title, '#/t/activities', h('a', { class: 'btn small', href: '#/t/activity-edit/' + a.activityId }, 'แก้ไข')),
        h('div', { class: 'card sky' }, a.description ? h('p', { class: 'pre' }, a.description) : null, h('div', { class: 'small' }, 'ปิดรับ ' + UI.thDate(a.dueDate) + ' · เต็ม ' + a.maxScore)),
        h('div', { class: 'card' }, h('h3', null, 'นักเรียน (' + App.className(d.classroomId) + ')'), h('ul', { class: 'list' }, d.students.map(function (s) {
          return h('li', null, h('a', { class: 'list-link', href: s.submission ? '#/t/activity/' + a.activityId + '?student=' + s.studentId : null },
            h('div', { class: 'grow' }, h('div', { class: 'title' }, (s.studentNo ? s.studentNo + '. ' : '') + s.name), s.submission && s.submission.score !== null ? h('div', { class: 'tiny' }, 'คะแนน ' + s.submission.score) : null), UI.status(s.status)));
        }))));
    });
  }, { roles: STAFF });

  R('/t/special', function (p, q) {
    var cid = App.needClass();
    return API.call('special.list', { classroomId: cid, status: q.status || '' }).then(function (d) {
      return h('div', null, UI.pageHead('กิจกรรมพิเศษ · ' + App.className(), '#/t/activities'),
        h('div', { class: 'tabs' }, [['', 'ทั้งหมด'], ['PENDING', 'รอตรวจ'], ['APPROVED', 'อนุมัติ'], ['REVISE', 'ให้แก้ไข']].map(function (t) { return h('a', { href: '#/t/special' + (t[0] ? '?status=' + t[0] : ''), class: (q.status || '') === t[0] ? 'on' : '' }, t[1]); })),
        h('div', { class: 'card' }, d.items.length ? h('ul', { class: 'list' }, d.items.map(function (s) {
          return h('li', null, h('a', { class: 'list-link', href: '#/special/' + s.submissionId }, UI.icon('star'), h('div', { class: 'grow' }, h('div', { class: 'title' }, s.title), h('div', { class: 'tiny muted' }, s.studentName + ' · ' + s.category + (s.score !== null ? ' · ' + s.score + ' คะแนน' : ''))), UI.status(s.status)));
        })) : UI.empty('ไม่มีรายการ')));
    });
  }, { roles: STAFF });

  /* ================= เมนูเพิ่มเติม ================= */
  R('/more', function () {
    var items = [['#/t/scores', 'chart', 'คะแนน'], ['#/t/grades', 'trophy', 'ตัดเกรด'], ['#/t/reports', 'print', 'รายงาน PDF'], ['#/t/announce', 'image', 'ภาพประกาศผล'],
      ['#/t/duty', 'broom', 'ตารางเวร'], ['#/t/line', 'line', 'ตั้งค่า LINE']];
    var admin = [['#/a/users', 'users', 'ผู้ใช้และนักเรียน'], ['#/a/structure', 'calendar', 'ภาคเรียน/ห้อง/วันหยุด'], ['#/a/rounds', 'piggy', 'ปฏิทินการออม'], ['#/a/policy', 'chart', 'เกณฑ์คะแนน'],
      ['#/a/grade-rules', 'trophy', 'เกณฑ์ตัดเกรด'], ['#/a/settings', 'gear', 'ตั้งค่าระบบ'], ['#/a/audit', 'doc', 'ประวัติการเปลี่ยนแปลง'], ['#/a/reconcile', 'shield', 'กระทบยอด']];
    function grid(list) { return h('div', { class: 'grid two' }, list.map(function (i) { return h('a', { class: 'btn btn-big', href: i[0] }, UI.icon(i[1]), i[2]); })); }
    return h('div', null, UI.pageHead('เมนู'), grid(items), App.isAdmin() ? h('div', null, h('h2', { style: { marginTop: '1.5rem' } }, 'ครูแอดมิน'), grid(admin)) : null,
      h('div', { class: 'grid two', style: { marginTop: '1.5rem' } }, h('a', { class: 'btn', href: '#/change-password' }, UI.icon('lock'), 'เปลี่ยนรหัสผ่าน'), h('button', { class: 'btn danger', onclick: App.logout }, UI.icon('logout'), 'ออกจากระบบ')));
  }, { roles: STAFF });

  /* ================= คะแนน ================= */
  R('/t/scores', function (p, q) {
    var cid = App.needClass(); var asOf = q.asOf || App.me.today;
    if (q.student) return API.call('score.student', { studentId: q.student, asOf: asOf }).then(function (sc) { return h('div', null, UI.pageHead('ที่มาของคะแนน', '#/t/scores'), window.scoreBreakdown(sc)); });
    return API.call('score.class', { classroomId: cid, asOf: asOf }).then(function (d) {
      var dt = h('input', { type: 'date', class: 'inp', value: asOf, onchange: function () { App.go('#/t/scores?asOf=' + dt.value); } });
      var warn = Object.keys(d.warnings).length ? UI.alert('warn', 'ยังไม่มีฐานประเมิน: ' + Object.keys(d.warnings).map(function (k) { return window.CAT_LABEL[k] + ' (' + d.warnings[k] + ' คน)'; }).join(', ') + ' — หมวดนั้นได้ 0 ชั่วคราว') : null;
      var p0 = d.policy;
      return h('div', null, UI.pageHead('คะแนน · ' + d.classroom.name), h('div', { class: 'card' }, UI.field('วันอ้างอิง', dt), h('div', { class: 'small muted' }, 'เกณฑ์รุ่น ' + p0.version + ': ออม ' + p0.weightSaving + ' · กิจกรรม ' + p0.weightActivity + ' · พิเศษ ' + p0.weightSpecial + ' · เวร ' + p0.weightDuty)), warn,
        h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['เลขที่', 'ชื่อ', 'ออม', 'กิจกรรม', 'พิเศษ', 'เวร', 'รวม', 'เกรด'].map(function (x, i) { return h('th', { class: i > 1 ? 'num' : '' }, x); }))),
          h('tbody', null, d.students.map(function (s) {
            function c(k) { var x = s.categories[k]; return h('td', { class: 'num', title: 'ดิบ ' + x.raw + '/' + x.full }, x.hasBasis ? UI.fmtNum(x.weighted) : '—'); }
            return h('tr', null, h('td', null, String(s.studentNo || '')), h('td', null, h('a', { href: '#/t/scores?student=' + s.studentId + '&asOf=' + asOf }, s.name)), c('saving'), c('activity'), c('special'), c('duty'), h('td', { class: 'num' }, h('strong', null, UI.fmtNum(s.total))), h('td', { class: 'num' }, s.grade));
          })))), h('p', { class: 'tiny muted' }, '— = ยังไม่มีฐานประเมิน · แตะชื่อเพื่อดูคะแนนดิบ/เต็มดิบ/ถ่วงน้ำหนัก'));
    });
  }, { roles: STAFF });

  /* ================= ตัดเกรด ================= */
  R('/t/grades', function (p, q) {
    var cid = App.needClass(); var cutoff = q.cutoff || App.me.today;
    return API.call('grade.preview', { classroomId: cid, cutoffDate: cutoff }).then(function (d) {
      var cur = d.current;
      var dt = h('input', { type: 'date', class: 'inp', value: cutoff, onchange: function () { App.go('#/t/grades?cutoff=' + dt.value); } });
      var steps = ['ตรวจคะแนน', 'แสดงตัวอย่างผล', 'ยืนยันผล', 'ล็อกผล', 'เผยแพร่'];
      var stage = !cur ? 1 : cur.status === 'CONFIRMED' ? 2 : cur.status === 'LOCKED' ? 3 : 4;
      var stepper = h('div', { class: 'row wrap small' }, steps.map(function (s, i) { return h('span', { class: 'status ' + (i <= stage ? 'st-ok' : 'st-none') }, (i <= stage ? '✓ ' : (i + 1) + '. ') + s); }));
      var warnings = Object.keys(d.warnings);
      var ack = h('input', { type: 'checkbox' });
      var actions = h('div', { class: 'grid two' });
      if (!cur || cur.status === 'CONFIRMED') {
        var bC = h('button', { class: 'btn primary', onclick: function () {
          if (warnings.length && !ack.checked) return UI.toast('กรุณาติ๊กรับทราบหมวดที่ยังไม่มีฐานประเมินก่อน', 'err');
          App.action(bC, function () { return API.call('grade.confirm', { classroomId: cid, cutoffDate: cutoff, acknowledgeWarnings: ack.checked }, { mutate: true }).then(function () { UI.toast('ยืนยันผลแล้ว (บันทึก Snapshot)'); App.render(); }); });
        } }, cur ? 'ยืนยันผลใหม่ (แทนชุดเดิม)' : 'ยืนยันผล');
        actions.appendChild(bC);
      }
      if (cur && cur.status === 'CONFIRMED') { var bL = h('button', { class: 'btn sun', onclick: function () { UI.confirm('ล็อกผล', 'หลังล็อกจะแก้ไขผลไม่ได้จนกว่าแอดมินปลดล็อก', 'ล็อกผล').then(function (ok) { if (ok) App.action(bL, function () { return API.call('grade.lock', { batchId: cur.batchId }).then(function () { App.render(); }); }); }); } }, UI.icon('lock'), 'ล็อกผล'); actions.appendChild(bL); }
      if (cur && cur.status === 'LOCKED') { var bP = h('button', { class: 'btn primary', onclick: function () { UI.confirm('เผยแพร่ผล', 'นักเรียนจะเห็นผลประเมินของตนเอง', 'เผยแพร่').then(function (ok) { if (ok) App.action(bP, function () { return API.call('grade.publish', { batchId: cur.batchId }).then(function () { App.render(); }); }); }); } }, 'เผยแพร่'); actions.appendChild(bP); }
      if (cur && (cur.status === 'LOCKED' || cur.status === 'PUBLISHED') && App.isAdmin()) {
        actions.appendChild(h('button', { class: 'btn danger', onclick: function () { UI.prompt('ปลดล็อกผล', 'เหตุผล (จำเป็น บันทึกในประวัติ)', { required: true, minLength: 5, danger: true, ok: 'ปลดล็อก' }).then(function (r) { if (r) return API.call('grade.unlock', { batchId: cur.batchId, reason: r }).then(function () { App.render(); }); }).catch(function (e) { UI.toast(e.message, 'err'); }); } }, 'ปลดล็อก (แอดมิน)'));
      }
      return h('div', null, UI.pageHead('ตัดเกรด · ' + d.classroom.name), h('div', { class: 'card' }, stepper,
        cur ? h('p', { class: 'small' }, 'ชุดผลล่าสุด: ', UI.status(cur.status), ' ตัดยอด ' + UI.thDate(cur.cutoffDate) + (cur.unlockReason ? ' · ปลดล็อกเพราะ: ' + cur.unlockReason : '')) : h('p', { class: 'small muted' }, 'ยังไม่เคยยืนยันผล'),
        UI.field('วันตัดยอด (ใช้รายการถึงวันนี้)', dt)),
        warnings.length ? h('div', null, UI.alert('warn', 'หมวดที่ยังไม่มีฐานประเมิน: ' + warnings.map(function (k) { return window.CAT_LABEL[k] + ' ' + d.warnings[k] + ' คน'; }).join(', ') + ' ระบบให้ 0 ในหมวดนั้น ไม่ให้คะแนนเต็มอัตโนมัติ'), h('label', { class: 'check' }, ack, 'รับทราบและยืนยันสรุปผล')) : null,
        h('div', { class: 'card' }, h('h3', null, 'ตัวอย่างผล (ยังไม่บันทึก)'), h('div', { class: 'row wrap small' }, Object.keys(d.distribution).sort().reverse().map(function (g) { return h('span', { class: 'status st-wait' }, 'เกรด ' + g + ': ' + d.distribution[g] + ' คน'); })),
          h('div', { class: 'table-wrap', style: { marginTop: '.6rem' } }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'เลขที่'), h('th', null, 'ชื่อ'), h('th', { class: 'num' }, 'รวม'), h('th', { class: 'num' }, 'เกรด'))),
            h('tbody', null, d.students.map(function (s) { return h('tr', null, h('td', null, String(s.studentNo || '')), h('td', null, s.name + (s.missingBasis.length ? ' ⚠' : '')), h('td', { class: 'num' }, UI.fmtNum(s.total)), h('td', { class: 'num' }, s.grade)); }))))),
        actions);
    });
  }, { roles: STAFF });

  /* ================= ตารางเวร ================= */
  R('/t/duty', function (p, q) {
    var cid = App.needClass();
    return Promise.all([API.call('duty.schedule.list', { classroomId: cid }), API.call('duty.assignments', { classroomId: cid, from: q.from, to: q.to })]).then(function (r) {
      var sch = r[0], asg = r[1];
      var byDay = {}; sch.schedules.forEach(function (s) { (byDay[s.weekday] = byDay[s.weekday] || []).push(s); });
      var schedCard = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'ตารางเวร (รุ่นปัจจุบันและประวัติ)'), h('button', { class: 'btn small primary', onclick: function () { scheduleModal(cid, sch.students); } }, '+ เพิ่ม/แก้กลุ่ม')),
        sch.schedules.length ? [1, 2, 3, 4, 5, 6, 7].filter(function (d) { return byDay[d]; }).map(function (d) {
          return h('div', { style: { marginBottom: '.6rem' } }, h('strong', null, 'วัน' + UI.TH_DAY[d]), h('ul', { class: 'list small' }, byDay[d].map(function (s) {
            return h('li', null, h('div', null, h('strong', null, s.groupName), ' · ' + s.area), h('div', null, s.memberNames.join(', ')), h('div', { class: 'tiny muted' }, 'มีผล ' + UI.thDate(s.effectiveFrom) + ' – ' + (s.effectiveTo ? UI.thDate(s.effectiveTo) : 'ปัจจุบัน')),
              !s.effectiveTo ? h('button', { class: 'btn small ghost', onclick: function () { UI.prompt('สิ้นสุดตารางกลุ่มนี้', 'วันสุดท้ายที่มีผล', { type: 'date', value: App.me.today }).then(function (v) { if (v) return API.call('duty.schedule.end', { scheduleId: s.scheduleId, effectiveTo: v }).then(function () { App.render(); }); }).catch(function (e) { UI.toast(e.message, 'err'); }); } }, 'สิ้นสุด') : null);
          })));
        }) : UI.empty('ยังไม่มีตารางเวร'));
      var from = h('input', { type: 'date', class: 'inp', value: App.me.today }), to = h('input', { type: 'date', class: 'inp', value: UI.addDays(App.me.today, 30) }); var regen = h('input', { type: 'checkbox' });
      var bG = h('button', { class: 'btn sun', onclick: function () { App.action(bG, function () { return API.call('duty.generate', { classroomId: cid, from: from.value, to: to.value, regenerateFuture: regen.checked }).then(function (x) { UI.toast('สร้างรอบเวร ' + x.created + ' รอบ' + (x.cancelled ? ' ยกเลิกรอบอนาคตเดิม ' + x.cancelled : '')); App.render(); }); }); } }, 'สร้างรอบเวรจากตาราง');
      var genCard = h('div', { class: 'card sky' }, h('h3', null, 'สร้างรอบเวรจริง'), h('p', { class: 'small' }, 'รอบที่สร้างแล้วจะคัดลอกรายชื่อ ณ วันนั้น การแก้ตารางภายหลังไม่เปลี่ยนรอบเก่า (ข้ามวันหยุดอัตโนมัติ เรียกซ้ำได้ไม่สร้างซ้ำ)'),
        h('div', { class: 'grid two' }, UI.field('ตั้งแต่', from), UI.field('ถึง', to)), h('label', { class: 'check' }, regen, 'สร้างรอบอนาคตใหม่ตามตารางล่าสุด (เฉพาะรอบที่ยังไม่มีรายงาน)'), bG);
      var listCard = h('div', { class: 'card' }, h('h3', null, 'รอบเวร ' + UI.thDate(asg.from) + ' – ' + UI.thDate(asg.to)), asg.duties.length ? h('ul', { class: 'list' }, asg.duties.map(function (d) {
        return h('li', null, h('div', { class: 'row between' }, h('strong', null, UI.thDate(d.date, true) + ' · ' + d.groupName), d.status === 'EXEMPT' ? UI.status('EXEMPT') : null), h('div', { class: 'tiny muted' }, d.area + (d.note ? ' · ' + d.note : '')),
          h('div', { class: 'row wrap small' }, d.members.map(function (m) { return h('span', null, m.name + ' ', UI.status(m.status)); })),
          h('button', { class: 'btn small ghost', onclick: function () { UI.prompt(d.status === 'EXEMPT' ? 'ยกเลิกการยกเว้น' : 'ยกเว้นเวรรอบนี้', 'เหตุผล', { required: true }).then(function (v) { if (v) return API.call('duty.exempt', { dutyId: d.dutyId, reason: v, undo: d.status === 'EXEMPT' }).then(function () { App.render(); }); }).catch(function (e) { UI.toast(e.message, 'err'); }); } }, d.status === 'EXEMPT' ? 'ยกเลิกการยกเว้น' : 'ยกเว้นรอบนี้'));
      })) : UI.empty('ยังไม่มีรอบเวรในช่วงนี้'));
      return h('div', null, UI.pageHead('ตารางเวร · ' + App.className(), '#/more'), schedCard, genCard, listCard);
    });
  }, { roles: STAFF });

  function scheduleModal(cid, students) {
    var wd = UI.select([1, 2, 3, 4, 5, 6, 7].map(function (d) { return { value: d, label: 'วัน' + UI.TH_DAY[d] }; }), 1);
    var group = h('input', { maxlength: '60', placeholder: 'เช่น กลุ่มจันทร์' }), area = h('input', { maxlength: '150' }), eff = h('input', { type: 'date', value: App.me.today });
    var chosen = {}; var box = h('div', { style: { maxHeight: '40vh', overflow: 'auto' } }, students.map(function (s) { var cb = h('input', { type: 'checkbox', onchange: function () { if (cb.checked) chosen[s.studentId] = 1; else delete chosen[s.studentId]; } }); return h('label', { class: 'check' }, cb, (s.studentNo || '') + ' ' + s.name); }));
    UI.modal('กลุ่มเวร', h('div', null, UI.field('วัน', wd), UI.field('ชื่อกลุ่ม', group, 'ใช้ชื่อเดิมเพื่อสร้างรุ่นใหม่ของกลุ่มเดิม (รุ่นเก่าจะสิ้นสุดก่อนวันเริ่ม)'), UI.field('พื้นที่รับผิดชอบ', area), UI.field('เริ่มมีผล', eff), UI.field('สมาชิก', box)),
      [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: 'บันทึก', value: true, cls: 'primary' }]).then(function (ok) {
      if (!ok) return;
      return API.call('duty.schedule.save', { classroomId: cid, weekday: wd.value, groupName: group.value, area: area.value, effectiveFrom: eff.value, memberIds: Object.keys(chosen) }).then(function () { UI.toast('บันทึกตารางแล้ว อย่าลืมกด "สร้างรอบเวร"'); App.render(); });
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  /* ================= LINE ================= */
  R('/t/line', function () {
    var cid = App.needClass();
    return API.call('line.bindings', { classroomId: cid }).then(function (d) {
      var purpose = UI.select([{ value: 'ALL', label: 'ทุกการแจ้งเตือน' }, { value: 'DUTY', label: 'เฉพาะรายงาน/ผลตรวจเวร' }, { value: 'SUMMARY', label: 'เฉพาะสรุปประจำวัน' }], 'ALL');
      var codeBox = h('div');
      var bCode = h('button', { class: 'btn primary', onclick: function () { App.action(bCode, function () { return API.call('line.bindCode', { classroomId: cid, purpose: purpose.value }).then(function (r) {
        codeBox.textContent = ''; codeBox.appendChild(h('div', { class: 'card sun center' }, h('div', { class: 'small' }, 'รหัสใช้ครั้งเดียว หมดอายุ ' + UI.thDateTime(r.expiresAt)), h('div', { style: { fontSize: '2rem', fontFamily: 'var(--font-head)', letterSpacing: '.2em' } }, r.code), h('p', { class: 'small' }, r.instruction)));
      }); }); } }, 'สร้างรหัสผูกห้อง');
      return h('div', null, UI.pageHead('ตั้งค่า LINE · ' + App.className(), '#/more'),
        d.lineEnabled ? UI.alert('ok', 'เปิดใช้ LINE แล้ว') : UI.alert('warn', 'ยังไม่เปิดใช้ LINE: แอดมินต้องตั้ง LINE_CHANNEL_ACCESS_TOKEN ใน Script Properties และเปิด LINE_ENABLED ในตั้งค่าระบบ'),
        h('div', { class: 'card' }, h('h3', null, 'ผูกกลุ่ม LINE หรือบัญชีครู'), h('ol', { class: 'small' }, h('li', null, 'เพิ่ม LINE OA ของโรงเรียนเข้ากลุ่ม (หรือเพิ่มเพื่อนเพื่อรับแบบส่วนตัว)'), h('li', null, 'กดสร้างรหัสด้านล่าง'), h('li', null, 'พิมพ์ "ผูกห้อง รหัส" ในกลุ่ม/แชตนั้นภายใน 30 นาที')),
          UI.field('ประเภทการแจ้งเตือน', purpose), bCode, codeBox),
        h('div', { class: 'card' }, h('h3', null, 'ปลายทางที่ผูกแล้ว'), d.bindings.length ? h('ul', { class: 'list' }, d.bindings.map(function (b) {
          return h('li', { class: 'row between' }, h('div', null, h('div', null, (b.targetType === 'group' ? 'กลุ่ม ' : b.targetType === 'user' ? 'ผู้ใช้ ' : '') + (b.targetMasked || '(รอผูก)')), h('div', { class: 'tiny muted' }, b.purpose + (b.boundAt ? ' · ผูกเมื่อ ' + UI.thDateTime(b.boundAt) : ''))),
            h('div', { class: 'row' }, UI.status(b.status), b.status !== 'REVOKED' ? h('button', { class: 'btn small danger', onclick: function () { UI.confirm('ยกเลิกการผูก', 'หยุดส่งแจ้งเตือนไปยังปลายทางนี้', 'ยกเลิกการผูก', true).then(function (ok) { if (ok) return API.call('line.unbind', { bindingId: b.bindingId }).then(function () { App.render(); }); }); } }, 'ยกเลิก') : null));
        })) : UI.empty('ยังไม่ได้ผูก')),
        h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'ประวัติการส่ง'), h('button', { class: 'btn small', onclick: function () { API.call('line.retry', { classroomId: cid }).then(function (r) { UI.toast('ส่งใหม่ ' + r.requeued + ' รายการ'); App.render(); }).catch(function (e) { UI.toast(e.message, 'err'); }); } }, 'ส่งรายการที่ล้มเหลวใหม่')),
          d.queue.length ? h('ul', { class: 'list small' }, d.queue.map(function (n) { return h('li', null, h('div', { class: 'row between' }, h('span', null, n.kind + ' · ' + UI.thDateTime(n.createdAt)), UI.status(n.status === 'FAILED' ? 'FAILED_Q' : n.status)), n.lastError ? h('div', { class: 'tiny muted' }, 'ครั้งที่ ' + n.attempts + ': ' + n.lastError) : null); })) : UI.empty('ยังไม่มีการส่ง'),
          h('p', { class: 'tiny muted' }, 'การส่งซ้ำใช้ Retry Key เดิม LINE จะไม่ส่งข้อความซ้ำถ้าเคยรับไปแล้ว · ข้อความ push นับโควตาตามแพ็กเกจ LINE OA (นับตามจำนวนผู้รับในกลุ่ม)')));
    });
  }, { roles: STAFF });
})();
