/* reports.js — รายงาน PDF (พิมพ์จากเบราว์เซอร์ หน้า A4 ฟอนต์ไทย) และภาพประกาศผล (Canvas → PNG/JPG) */
(function () {
  'use strict';
  var h = UI.h, R = App.route;
  var STAFF = ['ADMIN', 'TEACHER'];
  var CATS = ['saving', 'activity', 'special', 'duty'];

  function maskCode(c) { c = String(c || ''); return c.length <= 2 ? '**' : c.slice(0, 2) + '*'.repeat(Math.max(1, c.length - 3)) + c.slice(-1); }

  function header(d, title) {
    return h('div', { class: 'print-head' }, h('h1', null, title), h('p', null, (d.school || '') + ' · ' + (d.term ? d.term.name : '')),
      h('p', null, 'ห้อง ' + d.classroom.name + ' · ข้อมูล ณ ' + UI.thDate(d.snapshot ? d.snapshot.batch.cutoffDate : d.asOf) + ' · ออกรายงาน ' + UI.thDateTime(d.issuedAt)));
  }
  function sign(d) { return h('div', { class: 'print-sign' }, h('div', null, 'ลงชื่อ ..................................................', h('br'), '(' + (d.teachers[0] || '..................................................') + ')', h('br'), 'ครูประจำชั้น')); }
  function table(head, rows) {
    return h('table', null, h('thead', null, h('tr', null, head.map(function (x) { return h('th', null, x); }))), h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c, i) { var v = c === null || c === undefined ? '-' : String(c); return h('td', { class: i > 1 && /^[−+\-]?[\d.,]+( บาท)?$/.test(v) ? 'num' : '' }, v); })); })));
  }
  function scoreRows(d) {
    if (d.snapshot) return d.snapshot.students.map(function (s) { return { s: s, cats: s.categories || {}, total: s.total, grade: s.grade }; });
    return d.scores.students.map(function (s) { return { s: s, cats: s.categories, total: s.total, grade: s.grade }; });
  }
  function catCell(c) { return c ? (c.hasBasis ? UI.fmtNum(c.weighted) : 'ไม่มีฐาน') : '-'; }

  var BUILDERS = {
    classScore: function (d) {
      var rows = scoreRows(d);
      return [h('div', { class: 'print-page' }, header(d, 'รายงานผลการประเมินรายห้อง' + (d.snapshot ? '' : ' (คะแนนชั่วคราว)')),
        table(['เลขที่', 'ชื่อ-สกุล', 'เลขประจำตัว', 'ออมเงิน', 'กิจกรรม', 'กิจกรรมพิเศษ', 'เวร', 'รวม', 'ผลการประเมิน'],
          rows.map(function (r) { return [r.s.studentNo || '', r.s.name, r.s.studentCode, catCell(r.cats.saving), catCell(r.cats.activity), catCell(r.cats.special), catCell(r.cats.duty), UI.fmtNum(r.total), r.grade]; })),
        d.snapshot ? h('p', null, 'สถานะผล: ' + UI.STATUS[d.snapshot.batch.status][0]) : h('p', null, 'หมายเหตุ: คะแนนชั่วคราว ยังไม่ได้ยืนยัน/ล็อกผล'), sign(d))];
    },
    individual: function (d) {
      return scoreRows(d).map(function (r) {
        var c = r.cats;
        return h('div', { class: 'print-page' }, header(d, 'รายงานผลการประเมินรายบุคคล'),
          h('p', null, h('strong', null, 'ชื่อ-สกุล: '), r.s.name, '   ', h('strong', null, 'เลขประจำตัว: '), r.s.studentCode || '', '   ', h('strong', null, 'เลขที่: '), String(r.s.studentNo || '')),
          h('p', null, h('strong', null, 'ภาคเรียน/ปีการศึกษา: '), d.term ? d.term.semester + '/' + d.term.academicYear : ''),
          table(['หมวด', 'คะแนนดิบ', 'คะแนนเต็มดิบ', 'น้ำหนัก', 'คะแนนที่ได้'], CATS.map(function (k) { var x = c[k] || {}; return [window.CAT_LABEL[k], x.hasBasis ? UI.fmtNum(x.raw) : '-', x.hasBasis ? UI.fmtNum(x.full) : 'ยังไม่มีฐานประเมิน', x.weight, catCell(x)]; })
            .concat([['รวม', '', '', 100, UI.fmtNum(r.total)]])),
          h('p', { style: { fontSize: '14pt' } }, h('strong', null, 'ผลการประเมิน: ' + r.grade)), sign(d));
      });
    },
    saving: function (d) {
      return [h('div', { class: 'print-page' }, header(d, 'รายงานเงินออม'),
        table(['เลขที่', 'ชื่อ-สกุล', 'เงินออมสะสม', 'รอบที่ถึงกำหนด', 'ยอดที่ควรออม', 'ครบ (รอบ)', 'ยังไม่ครบ (รอบ)', 'ยังขาด', 'ล่วงหน้า'],
          d.students.map(function (s) { var v = s.saving; return [s.studentNo || '', s.name, UI.baht(v.totalPaidSatang), v.dueRounds, UI.baht(v.expectedSatang), v.paidRounds, v.unpaidRounds, UI.baht(v.shortfallSatang), UI.baht(v.advanceSatang)]; })),
        h('p', { style: { fontSize: '9pt' } }, 'เงินออมสะสม = ประวัติการส่งเงินเข้ากองกลางของห้อง ไม่ใช่เงินฝากที่ถอนได้'), sign(d))];
    },
    ledger: function (d) {
      var l = d.ledger;
      return [h('div', { class: 'print-page' }, header(d, 'รายงานรายรับ–รายจ่ายของห้อง'),
        h('p', null, 'ช่วง ' + UI.thDate(l.from) + ' – ' + UI.thDate(l.to) + ' · ยอดยกมา ' + UI.baht(l.openingSatang) + ' · รายรับ ' + UI.baht(l.rangeIncomeSatang) + ' · รายจ่าย ' + UI.baht(l.rangeExpenseSatang) + ' · คงเหลือ ' + UI.baht(l.closingSatang)),
        table(['วันที่', 'ยกมาต้นวัน', 'รายรับ', 'รายจ่าย', 'คงเหลือปลายวัน'], l.daily.map(function (x) { return [UI.thDate(x.date), UI.baht(x.openingSatang), UI.baht(x.incomeSatang), UI.baht(x.expenseSatang), UI.baht(x.closingSatang)]; })),
        h('h3', null, 'รายจ่ายและรายการปรับปรุง'),
        table(['วันที่', 'รายการ', 'หมวด', 'จำนวน', 'ผู้บันทึก', 'สถานะ'], l.entries.filter(function (e) { return e.type !== 'INCOME_SAVING'; }).map(function (e) { return [UI.thDate(e.date), e.description, e.category, (e.direction === 'IN' ? '+' : '−') + UI.baht(e.amountSatang), e.recordedBy, e.status === 'VOID' ? 'ยกเลิก: ' + e.voidReason : 'ปกติ']; })), sign(d))];
    },
    duty: function (d) {
      return [h('div', { class: 'print-page' }, header(d, 'รายงานการทำเวร'),
        table(['เลขที่', 'ชื่อ-สกุล', 'ผ่าน', 'ชดเชยแล้ว', 'รอตรวจ', 'ให้แก้ไข', 'ไม่ผ่าน', 'ยังไม่รายงาน', 'ยกเว้น'],
          d.students.map(function (s) { var x = s.duty; return [s.studentNo || '', s.name, x.PASSED, x.MAKEUP_DONE, x.PENDING, x.REVISE, x.FAILED, x.NOT_REPORTED, x.EXEMPT]; })),
        h('p', { style: { fontSize: '9pt' } }, '"ยังไม่รายงาน" หมายถึงยังไม่มีหลักฐานที่ระบุชื่อ ไม่ได้ยืนยันว่าไม่ทำเวร'), sign(d))];
    }
  };

  R('/t/reports', function (p, q) {
    var cid = App.needClass();
    var type = q.type || 'classScore';
    var useSnap = q.snap === '1';
    return API.call('report.class', { classroomId: cid, useSnapshot: useSnap }).then(function (d) {
      var pages = BUILDERS[type](d);
      var preview = h('div', { class: 'card', style: { overflowX: 'auto' } }, pages.map(function (pg) { return pg.cloneNode(true); }));
      var types = [['classScore', 'ผลประเมินรายห้อง'], ['individual', 'รายบุคคล (ทุกคน)'], ['saving', 'เงินออม'], ['ledger', 'รายรับ–รายจ่าย'], ['duty', 'การทำเวร']];
      var printBtn = h('button', { class: 'btn primary block', onclick: function () {
        var root = document.getElementById('print-root'); root.textContent = '';
        pages.forEach(function (pg) { root.appendChild(pg); });
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { window.print(); });
      } }, UI.icon('print'), 'พิมพ์ / บันทึกเป็น PDF (A4)');
      return h('div', null, UI.pageHead('รายงาน PDF · ' + d.classroom.name, '#/more'),
        h('div', { class: 'tabs' }, types.map(function (t) { return h('a', { href: '#/t/reports?type=' + t[0] + (useSnap ? '&snap=1' : ''), class: type === t[0] ? 'on' : '' }, t[1]); })),
        type === 'classScore' || type === 'individual' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: useSnap, onchange: function (e) { App.go('#/t/reports?type=' + type + (e.target.checked ? '&snap=1' : '')); } }), 'ใช้ผลที่ยืนยัน/ล็อกแล้ว (Snapshot)') : null,
        useSnap && !d.snapshot ? UI.alert('warn', 'ยังไม่มีผลที่ยืนยัน จึงแสดงคะแนนชั่วคราว') : null,
        UI.alert('info', 'กดพิมพ์แล้วเลือกปลายทาง "บันทึกเป็น PDF" ขนาด A4 (แนะนำ Chrome/Safari; เบราว์เซอร์ใน LINE อาจพิมพ์ไม่ได้ ให้เปิดด้วยเบราว์เซอร์ภายนอก)'),
        printBtn, h('h3', { style: { marginTop: '1rem' } }, 'ตัวอย่าง'), preview);
    });
  }, { roles: STAFF });

  /* ---------------- ภาพประกาศผล ---------------- */
  function loadMascotImage() {
    return new Promise(function (resolve) {
      var svg = UI.mascot('cheer'); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '300'); svg.setAttribute('height', '300');
      var img = new Image(); img.onload = function () { resolve(img); }; img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
  }
  function roundRect(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitText(ctx, text, maxW) { if (ctx.measureText(text).width <= maxW) return text; while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1); return text + '…'; }

  function drawAnnouncement(canvas, data, opt, mascotImg) {
    var W = 1080, list = data.rows;
    var rowH = opt.mode === 'individual' ? 0 : 64;
    var H = opt.mode === 'individual' ? 1350 : Math.max(1350, 470 + list.length * rowH + 140);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var ink = '#17323d';
    ctx.fillStyle = '#e6fcf5'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3ddbb4'; ctx.beginPath(); ctx.arc(W - 80, 90, 220, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(60, H - 60, 160, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = ink; ctx.fillStyle = '#fff';
    roundRect(ctx, 50, 50, W - 100, H - 100, 40); ctx.fill(); ctx.stroke();
    if (mascotImg) ctx.drawImage(mascotImg, W - 330, 70, 240, 240);
    ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 64px Mitr, "Noto Sans Thai", sans-serif'; ctx.fillText(opt.title || 'ประกาศผลพลเมืองดี', 100, 170);
    ctx.font = '400 34px "Noto Sans Thai", sans-serif';
    ctx.fillText(fitText(ctx, data.school + ' · ' + data.term, 640), 100, 225);
    ctx.fillText('ห้อง ' + data.classroom + (data.provisional ? ' · คะแนนชั่วคราว ณ ' : ' · ตัดยอด ') + data.date, 100, 272);
    if (opt.mode === 'individual') {
      var r = list[0]; if (!r) return;
      ctx.fillStyle = '#e7f5ff'; roundRect(ctx, 100, 340, W - 200, 820, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = '600 54px Mitr, sans-serif';
      if (opt.showName) ctx.fillText(fitText(ctx, r.name, W - 280), 140, 430);
      ctx.font = '400 34px "Noto Sans Thai", sans-serif';
      if (opt.showCode) ctx.fillText('เลขประจำตัว ' + (opt.maskCode ? maskCode(r.code) : r.code), 140, 485);
      var y = 570;
      if (opt.showCats) CATS.forEach(function (k) {
        var c = r.cats[k] || {};
        ctx.font = '400 36px "Noto Sans Thai", sans-serif'; ctx.fillText(window.CAT_LABEL[k], 140, y);
        ctx.textAlign = 'right'; ctx.fillText(c.hasBasis ? UI.fmtNum(c.weighted) + ' / ' + c.weight : 'ยังไม่มีฐานประเมิน', W - 140, y); ctx.textAlign = 'left';
        ctx.fillStyle = '#e6fcf5'; roundRect(ctx, 140, y + 18, W - 280, 22, 11); ctx.fill(); ctx.fillStyle = '#14a38b';
        if (c.weight) { roundRect(ctx, 140, y + 18, Math.max(22, (W - 280) * Math.min(1, (c.weighted || 0) / c.weight)), 22, 11); ctx.fill(); }
        ctx.fillStyle = ink; y += 100;
      });
      if (opt.showTotal) { ctx.font = '600 44px Mitr, sans-serif'; ctx.fillText('คะแนนรวม', 140, y + 30); ctx.font = '600 96px Mitr, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(UI.fmtNum(r.total), W - 140, y + 50); ctx.textAlign = 'left'; y += 120; }
      if (opt.showGrade) { ctx.fillStyle = '#ffd43b'; roundRect(ctx, 140, y, W - 280, 120, 30); ctx.fill(); ctx.stroke(); ctx.fillStyle = ink; ctx.font = '600 60px Mitr, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ผลการประเมิน ' + r.grade, W / 2, y + 82); ctx.textAlign = 'left'; }
    } else {
      var y0 = 340;
      ctx.fillStyle = '#14a38b'; roundRect(ctx, 90, y0, W - 180, 70, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '600 32px Mitr, sans-serif';
      var cols = [['ที่', 110]]; if (opt.showName) cols.push(['ชื่อ', 190]); if (opt.showCode) cols.push(['เลขประจำตัว', 600]);
      if (opt.showTotal) cols.push(['คะแนน', 770]); if (opt.showGrade) cols.push(['ผล', 905]);
      cols.forEach(function (c) { ctx.fillText(c[0], c[1], y0 + 47); });
      list.forEach(function (r, i) {
        var y = y0 + 70 + i * rowH;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#f3faf8'; ctx.fillRect(92, y, W - 184, rowH);
        ctx.fillStyle = ink; ctx.font = '400 30px "Noto Sans Thai", sans-serif';
        var yy = y + rowH * 0.66;
        ctx.fillText(String(r.no || i + 1), 110, yy);
        if (opt.showName) ctx.fillText(fitText(ctx, r.name, opt.showCode ? 390 : 560), 190, yy);
        if (opt.showCode) ctx.fillText(opt.maskCode ? maskCode(r.code) : r.code, 600, yy);
        if (opt.showTotal) ctx.fillText(UI.fmtNum(r.total), 770, yy);
        if (opt.showGrade) { ctx.font = '600 30px Mitr, sans-serif'; ctx.fillText(String(r.grade), 905, yy); }
      });
    }
    ctx.fillStyle = '#4a6370'; ctx.font = '400 26px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('พลเมืองดี · ทุกการกระทำดีมีความหมาย', W / 2, H - 80); ctx.textAlign = 'left';
  }

  R('/t/announce', function () {
    var cid = App.needClass();
    return Promise.all([API.call('report.class', { classroomId: cid, useSnapshot: true }), loadMascotImage(), document.fonts ? Promise.all([document.fonts.load('600 40px Mitr'), document.fonts.load('400 30px "Noto Sans Thai"')]).catch(function () { }) : null]).then(function (r) {
      var d = r[0], mimg = r[1];
      var rows = (d.snapshot ? d.snapshot.students : d.scores.students).map(function (s) { return { id: s.studentId, no: s.studentNo, name: s.name, code: s.studentCode || '', total: s.total, grade: s.grade, cats: s.categories || {} }; });
      var data = { school: d.school, term: d.term ? d.term.name : '', classroom: d.classroom.name, provisional: !d.snapshot, date: UI.thDate(d.snapshot ? d.snapshot.batch.cutoffDate : d.asOf), rows: rows };
      var opt = { mode: 'class', showName: true, showCode: false, maskCode: true, showTotal: true, showGrade: true, showCats: true, title: 'ประกาศผลพลเมืองดี' };
      var canvas = h('canvas', { class: 'canvas-preview', 'aria-label': 'ตัวอย่างภาพประกาศ' });
      var studentSel = UI.select(rows.map(function (s) { return { value: s.id, label: (s.no || '') + ' ' + s.name }; }), rows[0] && rows[0].id, { class: 'inp' });
      function redraw() {
        var dd = Object.assign({}, data, { rows: opt.mode === 'individual' ? rows.filter(function (x) { return x.id === studentSel.value; }) : rows });
        drawAnnouncement(canvas, dd, opt, mimg);
      }
      function toggle(key, label) { var cb = h('input', { type: 'checkbox', checked: opt[key], onchange: function () { opt[key] = cb.checked; redraw(); } }); return h('label', { class: 'check' }, cb, label); }
      var mode = UI.select([{ value: 'class', label: 'รายห้อง' }, { value: 'individual', label: 'รายบุคคล' }], 'class', { class: 'inp', onchange: function (e) { opt.mode = e.target.value; studentSel.classList.toggle('hidden', opt.mode !== 'individual'); redraw(); } });
      studentSel.classList.add('hidden'); studentSel.addEventListener('change', redraw);
      var title = h('input', { class: 'inp', value: opt.title, maxlength: '40', oninput: UI.debounce(function () { opt.title = title.value; redraw(); }, 300) });
      function download(type) {
        var a = document.createElement('a');
        a.href = canvas.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.92);
        a.download = 'ประกาศผล-' + data.classroom.replace(/[\\/]/g, '-') + (opt.mode === 'individual' ? '-' + studentSel.value : '') + '.' + type;
        document.body.appendChild(a); a.click(); a.remove();
      }
      redraw();
      return h('div', null, UI.pageHead('ภาพประกาศผล · ' + d.classroom.name, '#/more'),
        d.snapshot ? UI.alert('ok', 'ใช้ผลที่ยืนยันแล้ว (' + UI.STATUS[d.snapshot.batch.status][0] + ')') : UI.alert('warn', 'ยังไม่มีผลที่ยืนยัน ภาพจะระบุว่าเป็นคะแนนชั่วคราว'),
        h('div', { class: 'card' }, h('div', { class: 'grid two' }, UI.field('รูปแบบ', mode), UI.field('หัวข้อ', title)), studentSel,
          h('h3', { style: { marginTop: '.6rem' } }, 'ข้อมูลที่เปิดเผย'), toggle('showName', 'ชื่อ'), toggle('showCode', 'เลขประจำตัว'), toggle('maskCode', 'ปิดบังเลขประจำตัว (เช่น 05**1)'), toggle('showTotal', 'คะแนนรวม'), toggle('showGrade', 'ผลการประเมิน'), toggle('showCats', 'คะแนนรายหมวด (เฉพาะรายบุคคล)'),
          h('p', { class: 'tiny muted' }, 'ภาพไม่แสดงยอดเงินออมหรือยอดขาดออม เพื่อไม่ประจานนักเรียน')),
        h('div', { class: 'card' }, h('h3', null, 'ตัวอย่างก่อนดาวน์โหลด'), canvas, h('div', { class: 'grid two', style: { marginTop: '.8rem' } }, h('button', { class: 'btn primary', onclick: function () { download('png'); } }, UI.icon('download'), 'PNG'), h('button', { class: 'btn', onclick: function () { download('jpg'); } }, UI.icon('download'), 'JPG'))));
    });
  }, { roles: STAFF });

  window.drawAnnouncement = drawAnnouncement;
  window.REPORT_BUILDERS = BUILDERS;
})();
