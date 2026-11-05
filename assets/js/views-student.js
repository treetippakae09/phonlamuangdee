/* views-student.js — หน้าจอนักเรียน (รวมหัวหน้า/รองหัวหน้า) และหน้ารายงานเวรที่ใช้ร่วมกัน */
(function () {
  'use strict';
  var h = UI.h, R = App.route;
  var CAT_LABEL = { saving: 'ออมเงิน', activity: 'กิจกรรมที่ครูกำหนด', special: 'กิจกรรมพิเศษ', duty: 'เวรประจำวัน' };
  var CAT_ICON = { saving: 'piggy', activity: 'flag', special: 'star', duty: 'broom' };
  var EVIDENCE = { IMAGE: 'รูปภาพ', SUMMARY: 'สรุปองค์ความรู้', BOTH: 'รูปภาพ + สรุปองค์ความรู้' };
  window.CAT_LABEL = CAT_LABEL; window.CAT_ICON = CAT_ICON;

  function cardTitle(iconName, title, extra) { return h('div', { class: 'card-title' }, UI.icon(iconName), h('h2', null, title), extra || null); }

  /* ---------------- หน้าแรกนักเรียน ---------------- */
  R('/home', function () {
    return API.call('dashboard.student').then(function (d) {
      if (!d.enrolled) return h('div', null, UI.empty('ยังไม่ได้ลงทะเบียนในห้องเรียนของภาคเรียนนี้ กรุณาติดต่อครู'));
      var u = App.me.user, g = d.game;
      var mood = d.score.total >= 70 ? 'cheer' : 'wave';
      var hero = h('div', { class: 'card mint' },
        h('div', { class: 'hero' }, UI.mascot(mood),
          h('div', { style: { flex: '1', minWidth: '0' } },
            h('div', { class: 'small muted' }, 'สวัสดี'),
            h('h1', null, (u.nickname || u.firstName) + ' 👋'),
            h('div', { class: 'row' }, h('strong', null, 'เลเวล ' + g.level), h('span', { class: 'small muted' }, g.levelXp + ' / ' + g.levelNeed + ' XP')),
            UI.progress(g.levelXp, g.levelNeed, 'sun'),
            h('div', { class: 'tiny muted', style: { marginTop: '.3rem' } }, 'XP เป็นคะแนนเกม แยกจากคะแนนประเมิน 100 คะแนน'))));

      var scoreCard = h('a', { href: '#/me', class: 'card', style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
        cardTitle('chart', 'คะแนนรวม (ชั่วคราว)'),
        h('div', { class: 'row' }, UI.ring(d.score.total, 100, 'จาก 100'),
          h('div', { style: { flex: '1' } }, Object.keys(d.score.categories).map(function (k) {
            var c = d.score.categories[k];
            return h('div', { style: { marginBottom: '.35rem' } }, h('div', { class: 'row between small' }, h('span', null, CAT_LABEL[k]),
              h('strong', null, c.hasBasis ? UI.fmtNum(c.weighted) + '/' + c.weight : 'ยังไม่มีฐานประเมิน')), UI.progress(c.weighted, c.weight));
          }))),
        h('div', { class: 'tiny muted' }, 'ข้อมูล ณ ' + UI.thDate(d.asOf) + ' · แตะเพื่อดูที่มาของคะแนน'));

      var s = d.saving;
      var savingCard = h('a', { href: '#/saving', class: 'card sun', style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
        cardTitle('piggy', 'ออมเงิน'),
        h('div', { class: 'grid two' }, UI.stat('เงินออมสะสม', UI.baht(s.totalPaidSatang)), UI.stat('ยังขาด', UI.baht(s.shortfallSatang), s.unpaidRounds + ' รอบที่ยังไม่ครบ')),
        h('div', { style: { marginTop: '.5rem' } }, UI.progress(s.allocatedDueSatang, s.expectedSatang)),
        h('div', { class: 'tiny muted' }, 'ออมครบ ' + s.paidRounds + ' จาก ' + s.dueRounds + ' รอบที่ถึงกำหนด'));

      var next = d.duty.next;
      var dutyCard = h('div', { class: 'card sky' }, cardTitle('broom', 'เวรของฉัน'),
        next ? h('div', null, h('div', { class: 'value', style: { fontFamily: 'var(--font-head)', fontSize: '1.15rem' } }, (next.date === App.me.today ? 'วันนี้! ' : '') + UI.thDate(next.date, true)),
          h('div', null, next.groupName + ' · ' + next.area)) : h('div', { class: 'muted' }, 'ยังไม่มีเวรครั้งถัดไป'),
        d.duty.today.length ? h('div', { class: 'small', style: { marginTop: '.4rem' } }, 'วันนี้เวรของ: ' + d.duty.today.map(function (x) { return x.members.map(function (m) { return m.nickname || m.name; }).join(', '); }).join(' / ')) : null);

      var quick = h('div', { class: 'grid two' },
        h('a', { class: 'btn btn-big primary', href: '#/activities' }, UI.icon('send'), 'ส่งงาน'),
        h('a', { class: 'btn btn-big sky', href: '#/duty/report' }, UI.icon('broom'), 'รายงานเวร'));

      var todo = h('div', { class: 'card' }, cardTitle('flag', 'ภารกิจที่ต้องทำ', h('span', { class: 'status st-wait' }, '⏳ รอตรวจ ' + d.pendingReview)),
        d.revise ? UI.alert('warn', 'มี ' + d.revise + ' รายการที่ครูให้แก้ไข') : null,
        d.todo.length ? h('ul', { class: 'list' }, d.todo.slice(0, 6).map(function (a) {
          return h('li', null, h('a', { class: 'list-link', href: '#/activity/' + a.activityId }, UI.icon('flag'),
            h('div', { class: 'grow' }, h('div', { class: 'title' }, a.title), h('div', { class: 'tiny muted' }, 'ปิดรับ ' + UI.thDate(a.dueDate))), UI.status(a.myStatus)));
        })) : UI.empty('ส่งงานครบแล้ว เยี่ยมมาก!', 'cheer'));

      var badges = h('div', { class: 'card' }, cardTitle('trophy', 'เหรียญตรา'), h('div', { class: 'badges' }, g.badges.map(function (b) {
        return h('div', { class: 'badge' + (b.earned ? '' : ' locked'), title: b.hint }, UI.medal(b.icon, b.earned), h('div', null, b.name), h('div', { class: 'tiny muted' }, b.earned ? '✓ ได้แล้ว' : b.hint));
      })));
      var board = d.leaderboard ? h('div', { class: 'card' }, cardTitle('users', 'อันดับ XP ในห้อง'), h('ol', null, d.leaderboard.map(function (x) {
        return h('li', { style: { fontWeight: x.me ? '700' : '400' } }, x.name + ' · เลเวล ' + x.level + ' (' + x.xp + ' XP)' + (x.me ? ' ← ฉัน' : ''));
      }))) : null;
      var pub = d.published ? UI.alert('ok', 'ประกาศผลแล้ว: คะแนน ' + UI.fmtNum(d.published.total) + ' ผลการประเมิน ' + d.published.grade) : null;
      return h('div', null, hero, pub, quick, h('div', { style: { height: '1rem' } }), scoreCard, savingCard, dutyCard, todo, badges, board);
    });
  }, { roles: ['STUDENT'] });

  /* ---------------- ออมเงิน (นักเรียน) ---------------- */
  function savingSummary(s) {
    return h('div', { class: 'grid two' },
      UI.stat('เงินออมสะสม', UI.baht(s.totalPaidSatang), 'ประวัติการส่งเงินทั้งหมด'),
      UI.stat('รอบที่ถึงกำหนด', s.dueRounds + ' รอบ'),
      UI.stat('ยอดที่ควรออม', UI.baht(s.expectedSatang), 'ถึงวันนี้'),
      UI.stat('รอบที่ชำระครบ', s.paidRounds + ' รอบ'),
      UI.stat('รอบที่ยังไม่ครบ', s.unpaidRounds + ' รอบ'),
      UI.stat('เงินที่ยังขาด', UI.baht(s.shortfallSatang)),
      UI.stat('ชำระแล้วบางส่วน', UI.baht(s.partialSatang), 'ของรอบที่ยังไม่ครบ'),
      UI.stat('ชำระล่วงหน้า', UI.baht(s.advanceSatang), 'ยังไม่ถึงรอบ ไม่นับคะแนน'));
  }
  window.savingSummary = savingSummary;

  function officerTabs(active) {
    if (!App.me.isOfficer) return null;
    return h('div', { class: 'tabs' }, [['#/saving', 'ของฉัน'], ['#/saving/collect', 'รับเงิน'], ['#/ledger', 'บัญชีห้อง']].map(function (t) {
      return h('a', { href: t[0], class: t[0] === active ? 'on' : '' }, t[1]);
    }));
  }
  window.officerTabs = officerTabs;

  R('/saving', function () {
    return API.call('saving.my').then(function (d) {
      var dots = h('div', { class: 'dots' }, d.rounds.map(function (r) {
        return h('span', { class: r.status + (r.due ? '' : ' future'), title: UI.thDate(r.date) + ' · ' + UI.STATUS[r.status][0] + (r.paidSatang ? ' ' + UI.baht(r.paidSatang) : '') }, r.date.slice(8));
      }));
      return h('div', null, UI.pageHead('ออมเงิน'), officerTabs('#/saving'),
        h('div', { class: 'card sun' }, h('div', { class: 'card-title' }, UI.icon('piggy'), h('h2', null, 'สรุปการออมของฉัน')), savingSummary(d.summary),
          h('p', { class: 'tiny muted' }, 'เงินออมคือเงินเข้ากองกลางของห้อง ยอดสะสมนี้เป็นประวัติการส่งเงิน ไม่ใช่เงินฝากที่ถอนได้')),
        h('div', { class: 'card' }, h('h3', null, 'รอบออม'), dots,
          h('div', { class: 'row wrap tiny', style: { marginTop: '.5rem' } }, UI.status('PAID'), UI.status('PARTIAL'), UI.status('UNPAID'), h('span', { class: 'muted' }, 'กรอบประ = ยังไม่ถึงกำหนด'))),
        h('div', { class: 'card' }, h('h3', null, 'ประวัติการส่งเงิน'), d.history.length ? h('ul', { class: 'list' }, d.history.map(function (t) {
          return h('li', null, h('div', { class: 'row between' }, h('strong', null, UI.baht(t.amountSatang)), t.status === 'VOID' ? UI.status('VOID') : null),
            h('div', { class: 'small' }, 'รับเงิน ' + UI.thDate(t.receivedDate) + ' · บันทึกโดย ' + t.recordedBy),
            t.allocations.length ? h('div', { class: 'tiny muted' }, 'จัดสรรเข้ารอบ: ' + t.allocations.map(function (a) { return UI.thDate(a.roundDate) + (a.amountSatang < 500 ? ' (' + UI.baht(a.amountSatang) + ')' : ''); }).join(', ')) : null,
            t.voidReason ? h('div', { class: 'tiny muted' }, 'เหตุผลยกเลิก: ' + t.voidReason) : null);
        })) : UI.empty('ยังไม่มีรายการ')));
    });
  }, { roles: ['STUDENT'] });

  /* ---------------- กิจกรรม ---------------- */
  R('/activities', function (p, q) {
    var tab = q.tab || 'teacher';
    var tabs = h('div', { class: 'tabs' }, h('a', { href: '#/activities', class: tab === 'teacher' ? 'on' : '' }, 'กิจกรรมจากครู'),
      h('a', { href: '#/activities?tab=special', class: tab === 'special' ? 'on' : '' }, 'กิจกรรมพิเศษ'));
    if (tab === 'special') {
      return API.call('special.list').then(function (d) {
        return h('div', null, UI.pageHead('กิจกรรม'), tabs,
          h('a', { class: 'btn primary block', href: '#/special/new' }, UI.icon('plus'), 'บันทึกกิจกรรมพิเศษ'),
          h('p', { class: 'small muted' }, 'ส่งได้ไม่จำกัด คะแนนหมวดนี้นับไม่เกินเป้าหมาย ' + d.policy.specialTargetRaw + ' คะแนนดิบ'),
          h('div', { class: 'card' }, d.items.length ? h('ul', { class: 'list' }, d.items.map(function (s) {
            return h('li', null, h('a', { class: 'list-link', href: '#/special/' + s.submissionId }, UI.icon('star'),
              h('div', { class: 'grow' }, h('div', { class: 'title' }, s.title), h('div', { class: 'tiny muted' }, s.category + ' · ' + UI.thDate(s.activityDate) + (s.score !== null ? ' · ได้ ' + s.score + ' คะแนน' : ''))), UI.status(s.status)));
          })) : UI.empty('ยังไม่มีกิจกรรมพิเศษ ลองบันทึกผลงานแรกดูสิ!', 'wave')));
      });
    }
    return API.call('activity.list').then(function (d) {
      return h('div', null, UI.pageHead('กิจกรรม'), tabs, h('div', { class: 'card' }, d.activities.length ? h('ul', { class: 'list' }, d.activities.map(function (a) {
        return h('li', null, h('a', { class: 'list-link', href: '#/activity/' + a.activityId }, UI.icon('flag'),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, a.title), h('div', { class: 'tiny muted' }, 'ปิดรับ ' + UI.thDate(a.dueDate) + (a.overdue ? ' (ปิดแล้ว)' : '') + ' · เต็ม ' + a.maxScore + (a.myScore !== null ? ' · ได้ ' + a.myScore : ''))),
          UI.status(a.myStatus)));
      })) : UI.empty('ยังไม่มีกิจกรรม')));
    });
  }, { roles: ['STUDENT'] });

  R('/activity/:id', function (p) {
    return API.call('activity.get', { activityId: p.id }).then(function (d) {
      var a = d.activity, s = d.submission;
      var st = s ? s.status : 'NOT_SUBMITTED';
      var editable = ['NOT_SUBMITTED', 'DRAFT', 'REVISE'].indexOf(st) >= 0 && (st === 'REVISE' || (a.status === 'OPEN' && a.dueDate >= App.me.today));
      var info = h('div', { class: 'card sky' }, h('h2', null, a.title), a.description ? h('p', { class: 'pre' }, a.description) : null,
        h('dl', { class: 'kv' }, h('dt', null, 'วันจัด'), h('dd', null, UI.thDate(a.eventDate)), h('dt', null, 'ปิดรับ'), h('dd', null, UI.thDate(a.dueDate)),
          h('dt', null, 'หลักฐาน'), h('dd', null, EVIDENCE[a.evidenceType]), h('dt', null, 'คะแนนเต็ม'), h('dd', null, String(a.maxScore))),
        a.rubric ? h('div', { class: 'small', style: { marginTop: '.5rem' } }, h('strong', null, 'แนวทางประเมิน: '), a.rubric) : null);
      var statusCard = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'สถานะ'), UI.status(st)),
        s && s.score !== null ? h('div', null, 'คะแนน: ', h('strong', null, s.score + ' / ' + a.maxScore)) : null,
        s && s.feedback ? UI.alert(st === 'APPROVED' ? 'ok' : 'warn', 'ข้อเสนอแนะครู: ' + s.feedback) : null,
        s && s.submittedAt ? h('div', { class: 'tiny muted' }, 'ส่งล่าสุด ' + UI.thDateTime(s.submittedAt)) : null);
      if (!editable) {
        return h('div', null, UI.pageHead('กิจกรรม', '#/activities'), info, statusCard,
          s ? h('div', { class: 'card' }, h('h3', null, 'ผลงานที่ส่ง'), s.summary ? h('p', { class: 'pre' }, s.summary) : null, App.gallery(s.fileIds)) : UI.alert('info', 'กิจกรรมปิดรับแล้ว'));
      }
      var needImg = a.evidenceType !== 'SUMMARY', needSum = a.evidenceType !== 'IMAGE';
      var up = needImg ? App.uploader(s ? s.fileIds : []) : null;
      var sum = h('textarea', { maxlength: '5000', placeholder: 'สรุปสิ่งที่ได้เรียนรู้ อย่างน้อย 20 ตัวอักษร' }); sum.value = s ? s.summary : '';
      var count = h('div', { class: 'help' });
      function upd() { count.textContent = sum.value.trim().length + ' ตัวอักษร'; }
      sum.addEventListener('input', upd); upd();
      function save(submit, btn) {
        if (up && up.busy()) { UI.toast('รอให้อัปโหลดภาพเสร็จก่อน', 'err'); return; }
        App.action(btn, function () {
          return API.call('activity.submit', { activityId: a.activityId, summary: sum.value, fileIds: up ? up.getIds() : [], submit: submit }, { mutate: true }).then(function () {
            UI.toast(submit ? 'ส่งตรวจเรียบร้อย รอครูตรวจนะ' : 'บันทึกร่างแล้ว');
            App.render();
          });
        });
      }
      var bDraft = h('button', { class: 'btn', type: 'button', onclick: function () { save(false, bDraft); } }, 'บันทึกร่าง');
      var bSend = h('button', { class: 'btn primary', type: 'button', onclick: function () { save(true, bSend); } }, UI.icon('send'), 'ส่งตรวจ');
      return h('div', null, UI.pageHead('กิจกรรม', '#/activities'), info, statusCard,
        h('div', { class: 'card' }, h('h3', null, st === 'REVISE' ? 'แก้ไขและส่งใหม่' : 'ส่งผลงาน'),
          up ? UI.field('รูปภาพหลักฐาน' + (needImg ? ' (ต้องมี)' : ''), up.el) : null,
          needSum ? UI.field('สรุปองค์ความรู้ (ต้องมี)', sum, null) : null, needSum ? count : null,
          h('div', { class: 'grid two', style: { marginTop: '.8rem' } }, bDraft, bSend)));
    });
  }, { roles: ['STUDENT'] });

  /* ---------------- กิจกรรมพิเศษ: ฟอร์ม ---------------- */
  function specialForm(item) {
    var cats = App.me.settings.specialCategories || [];
    var locked = item && item.status === 'PENDING';
    var title = h('input', { maxlength: '150', value: item ? item.title : '' });
    var date = h('input', { type: 'date', max: App.me.today, value: item ? item.activityDate : App.me.today });
    var cat = UI.select(cats.map(function (c) { return { value: c, label: c }; }), item ? item.category : cats[0]);
    var role = h('input', { maxlength: '100', value: item ? item.role : '', placeholder: 'เช่น ผู้เข้าแข่งขัน, ผู้ช่วย, หัวหน้าทีม' });
    var detail = h('textarea', { maxlength: '3000' }); detail.value = item ? item.detail : '';
    var learning = h('textarea', { maxlength: '3000' }); learning.value = item ? item.learning : '';
    var up = App.uploader(item ? item.fileIds : []);
    function save(submit, btn) {
      if (up.busy()) { UI.toast('รอให้อัปโหลดภาพเสร็จก่อน', 'err'); return; }
      if (submit && item && item.status === 'APPROVED') {
        return UI.confirm('แก้ไขผลงานที่อนุมัติแล้ว', 'คะแนนเดิมจะถูกถอนจนกว่าครูจะตรวจใหม่ ต้องการดำเนินการต่อหรือไม่?', 'ส่งตรวจใหม่').then(function (ok) { if (ok) doSave(); });
      }
      doSave();
      function doSave() {
        App.action(btn, function () {
          return API.call('special.save', { submissionId: item ? item.submissionId : '', title: title.value, activityDate: date.value, category: cat.value, role: role.value,
            detail: detail.value, learning: learning.value, fileIds: up.getIds(), submit: submit }, { mutate: true }).then(function (r) {
            UI.toast(submit ? 'ส่งตรวจเรียบร้อย' : 'บันทึกร่างแล้ว');
            App.go('#/special/' + r.submissionId); if (item) App.render();
          });
        });
      }
    }
    var bDraft = h('button', { class: 'btn', type: 'button', onclick: function () { save(false, bDraft); } }, 'บันทึกร่าง');
    var bSend = h('button', { class: 'btn primary', type: 'button', onclick: function () { save(true, bSend); } }, UI.icon('send'), 'ส่งตรวจ');
    if (locked) return h('div', { class: 'card' }, UI.alert('info', 'ผลงานกำลังรอตรวจ แก้ไขไม่ได้ชั่วคราว'));
    return h('div', { class: 'card' }, UI.field('ชื่อกิจกรรม', title), h('div', { class: 'grid two' }, UI.field('วันที่', date), UI.field('ประเภท', cat)),
      UI.field('บทบาท', role), UI.field('รายละเอียด', detail), UI.field('สิ่งที่ได้เรียนรู้', learning), UI.field('รูปภาพ', up.el),
      h('div', { class: 'grid two' }, bDraft, bSend));
  }
  R('/special/new', function () { return h('div', null, UI.pageHead('บันทึกกิจกรรมพิเศษ', '#/activities?tab=special'), specialForm(null)); }, { roles: ['STUDENT'] });
  R('/special/:id', function (p) {
    return API.call('special.get', { submissionId: p.id }).then(function (d) {
      var s = d.item;
      if (App.isStaff()) return window.staffSpecialReview(s);
      return h('div', null, UI.pageHead('กิจกรรมพิเศษ', '#/activities?tab=special'),
        h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, s.title), UI.status(s.status)),
          s.score !== null ? h('div', null, 'คะแนน: ', h('strong', null, String(s.score))) : null,
          s.feedback ? UI.alert(s.status === 'APPROVED' ? 'ok' : 'warn', 'ข้อเสนอแนะครู: ' + s.feedback) : null,
          s.status === 'APPROVED' ? h('div', { class: 'tiny muted' }, 'หากแก้ไขผลงานที่อนุมัติแล้ว ต้องผ่านการตรวจใหม่') : null),
        s.status === 'REJECTED' ? h('div', { class: 'card' }, App.gallery(s.fileIds), h('p', { class: 'pre' }, s.detail)) : specialForm(s));
    });
  });

  /* ---------------- เวร ---------------- */
  R('/duty', function () {
    return API.call('duty.my').then(function (d) {
      var today = h('div', { class: 'card sky' }, h('div', { class: 'card-title' }, UI.icon('calendar'), h('h2', null, 'วันนี้เป็นเวรของใคร')),
        d.todayHoliday ? UI.alert('info', 'วันนี้เป็นวันหยุด: ' + d.todayHoliday) :
          d.today.length ? h('ul', { class: 'list' }, d.today.map(function (x) { return h('li', null, h('strong', null, x.groupName + ' · ' + x.area), h('div', null, x.members.map(function (m) { return m.name; }).join(', '))); }))
            : h('div', { class: 'muted' }, 'วันนี้ไม่มีเวร'));
      var nx = d.next;
      var next = h('div', { class: 'card sun' }, h('div', { class: 'card-title' }, UI.icon('broom'), h('h2', null, 'เวรครั้งถัดไปของฉัน')),
        nx ? h('div', null, h('h3', null, UI.thDate(nx.date, true)), h('div', null, nx.groupName + ' · ' + nx.area), h('div', { class: 'small muted' }, 'กับ ' + nx.members.map(function (m) { return m.nickname || m.name; }).join(', '))) : h('div', { class: 'muted' }, 'ยังไม่มีกำหนด'));
      var hist = h('div', { class: 'card' }, h('h3', null, 'รอบเวรของฉัน'), d.history.length ? h('ul', { class: 'list' }, d.history.filter(function (x) { return x.myStatus !== 'UPCOMING'; }).slice(0, 30).map(function (x) {
        var canMakeup = ['NOT_REPORTED', 'FAILED'].indexOf(x.myStatus) >= 0;
        return h('li', null, h('div', { class: 'row between' }, h('div', null, h('strong', null, UI.thDate(x.date, true)), h('div', { class: 'small muted' }, x.groupName + ' · ' + x.area)), UI.status(x.myStatus)),
          x.myStatus === 'NOT_REPORTED' ? h('div', { class: 'tiny muted' }, '"ยังไม่รายงาน" ไม่ได้หมายความว่าไม่ทำเวร') : null,
          h('div', { class: 'row wrap', style: { marginTop: '.3rem' } },
            x.myStatus === 'NOT_REPORTED' ? h('a', { class: 'btn small', href: '#/duty/report?type=SCHEDULED&dutyId=' + x.dutyId }, 'รายงานเวรนี้') : null,
            canMakeup ? h('a', { class: 'btn small sun', href: '#/duty/report?type=MAKEUP&dutyId=' + x.dutyId }, 'ทำเวรชดเชย') : null));
      })) : UI.empty('ยังไม่มีรอบเวร'));
      var reps = h('div', { class: 'card' }, h('h3', null, 'รายงานของฉัน'), d.reports.length ? h('ul', { class: 'list' }, d.reports.map(function (r) {
        return h('li', null, h('a', { class: 'list-link', href: '#/duty-report/' + r.reportId }, h('div', { class: 'grow' }, h('div', { class: 'title' }, r.typeLabel + ' · ' + UI.thDate(r.dutyDate)), h('div', { class: 'tiny muted' }, 'ส่งโดย ' + r.submitterName)), UI.status(r.status)));
      })) : UI.empty('ยังไม่มีรายงาน'));
      return h('div', null, UI.pageHead('เวรประจำวัน'), h('a', { class: 'btn primary block', href: '#/duty/report' }, UI.icon('camera'), 'รายงานเวร'), h('div', { style: { height: '1rem' } }), today, next, hist, reps);
    });
  }, { roles: ['STUDENT'] });

  R('/duty/report', function (p, q) {
    var editId = q.reportId;
    return Promise.all([API.call('duty.my'), editId ? API.call('duty.report.get', { reportId: editId }) : null]).then(function (res) {
      var d = res[0], ex = res[1];
      var type = UI.select([{ value: 'SCHEDULED', label: 'เวรตามตาราง' }, { value: 'MAKEUP', label: 'เวรชดเชย' }, { value: 'EXTRA', label: 'เวรเพิ่มเติม' }], ex ? ex.report.type : (q.type || 'SCHEDULED'), { disabled: !!ex });
      var past = d.history.filter(function (x) { return x.date <= App.me.today && x.status === 'ACTIVE'; });
      var dutySel = h('select');
      var date = h('input', { type: 'date', max: App.me.today, value: ex ? ex.report.dutyDate : App.me.today });
      var area = h('input', { maxlength: '150', value: ex ? ex.report.area : '' });
      var detail = h('textarea', { maxlength: '2000', placeholder: 'ทำอะไรบ้าง เช่น กวาดพื้น ถูพื้น เก็บขยะ' }); detail.value = ex ? ex.report.detail : '';
      var membersBox = h('div');
      var up = App.uploader(ex ? ex.report.fileIds : [], { label: 'ถ่ายรูปพื้นที่หลังทำเวร' });
      var selected = {};
      if (ex) ex.members.forEach(function (m) { selected[m.studentId] = 1; });
      function fillDuties() {
        var t = type.value; dutySel.textContent = '';
        var list = t === 'SCHEDULED' ? past.filter(function (x) { return x.myStatus === 'NOT_REPORTED' || x.myStatus === 'REVISE' || (ex && x.dutyId === (ex.duty || {}).dutyId); })
          : past.filter(function (x) { return ['NOT_REPORTED', 'FAILED'].indexOf(x.myStatus) >= 0 && x.date < App.me.today || (ex && x.dutyId === (ex.duty || {}).dutyId); });
        list.forEach(function (x) { dutySel.appendChild(h('option', { value: x.dutyId }, UI.thDate(x.date) + ' · ' + x.groupName + ' (' + x.myStatusLabel + ')')); });
        var pre = (ex && ex.duty && ex.duty.dutyId) || q.dutyId; if (pre) dutySel.value = pre;
        dutyField.classList.toggle('hidden', t === 'EXTRA');
        if (!list.length && t !== 'EXTRA') dutySel.appendChild(h('option', { value: '' }, t === 'MAKEUP' ? 'ไม่มีรอบที่ต้องชดเชย' : 'ไม่มีรอบเวรที่ยังไม่รายงาน'));
        onDuty();
      }
      function onDuty() {
        var t = type.value; var duty = past.filter(function (x) { return x.dutyId === dutySel.value; })[0];
        if (duty) { if (!area.value || !ex) area.value = duty.area; if (t === 'SCHEDULED') date.value = duty.date; }
        date.disabled = t === 'SCHEDULED';
        membersBox.textContent = '';
        var pool = t === 'EXTRA' ? d.classmates : duty ? duty.members : [];
        if (!ex && duty && t === 'SCHEDULED' && !Object.keys(selected).length) pool.forEach(function (m) { selected[m.studentId] = 1; });
        pool.forEach(function (m) {
          if (m.studentId === App.me.user.userId) return;
          var cb = h('input', { type: 'checkbox', checked: !!selected[m.studentId], onchange: function () { if (cb.checked) selected[m.studentId] = 1; else delete selected[m.studentId]; } });
          membersBox.appendChild(h('label', { class: 'check' }, cb, m.name));
        });
        if (!membersBox.childNodes.length) membersBox.appendChild(h('div', { class: 'muted small' }, 'ไม่มีสมาชิกอื่นให้เลือก'));
      }
      var dutyField = UI.field('รอบเวร', dutySel, 'เวรชดเชยต้องเลือกรอบเวรเดิมที่ต้องการชดเชย');
      type.addEventListener('change', function () { selected = {}; fillDuties(); });
      dutySel.addEventListener('change', function () { selected = {}; onDuty(); });
      var btn = h('button', { class: 'btn primary block', type: 'button', onclick: function () {
        if (up.busy()) { UI.toast('รอให้อัปโหลดภาพเสร็จก่อน', 'err'); return; }
        var t = type.value;
        var pool = t === 'EXTRA' ? d.classmates : (past.filter(function (x) { return x.dutyId === dutySel.value; })[0] || { members: [] }).members;
        var ids = Object.keys(selected).filter(function (id) { return pool.some(function (m) { return m.studentId === id; }); });
        App.action(btn, function () {
          return API.call('duty.report.submit', { reportId: editId || '', type: t, dutyId: t === 'EXTRA' ? '' : dutySel.value, dutyDate: date.value, area: area.value, detail: detail.value, memberIds: ids, fileIds: up.getIds() }, { mutate: true })
            .then(function (r) { UI.toast('ส่งรายงานเวรแล้ว รอครูตรวจ'); App.go('#/duty-report/' + r.reportId); });
        });
      } }, UI.icon('send'), editId ? 'ส่งรายงานที่แก้ไข' : 'ส่งรายงาน');
      var view = h('div', null, UI.pageHead(editId ? 'แก้ไขรายงานเวร' : 'รายงานเวร', '#/duty'),
        h('div', { class: 'card' }, UI.field('ประเภท', type), dutyField, UI.field('วันที่ทำเวร', date), UI.field('พื้นที่', area), UI.field('รายละเอียด', detail),
          UI.field('สมาชิกที่ร่วมทำจริง (คุณถูกใส่ชื่ออัตโนมัติ)', membersBox, 'เลือกเฉพาะคนที่มาทำจริง ครูจะรับรองรายคนอีกครั้ง'),
          UI.field('รูปภาพ' + (App.me.settings.dutyRequireImage ? ' (ต้องมีอย่างน้อย 1 รูป)' : ''), up.el), btn));
      fillDuties();
      return view;
    });
  }, { roles: ['STUDENT'] });

  /* ---------------- รายงานเวร (ลิงก์จาก LINE: #/duty-report/{id}) ---------------- */
  R('/duty-report/:id', function (p) {
    return API.call('duty.report.get', { reportId: p.id }).then(function (d) {
      var r = d.report;
      var head = UI.pageHead('รายงานเวร', App.isStaff() ? '#/review' : '#/duty');
      var info = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', null, r.typeLabel), UI.status(r.status, { APPROVED: 'ผ่าน', REJECTED: 'ไม่ผ่าน' }[r.status])),
        h('dl', { class: 'kv' }, h('dt', null, 'ห้อง'), h('dd', null, r.classroomName || ''), h('dt', null, 'ผู้ส่ง'), h('dd', null, r.submitterName),
          h('dt', null, 'วันที่ทำเวร'), h('dd', null, UI.thDate(r.dutyDate, true)), d.duty ? h('dt', null, 'รอบเวร') : null, d.duty ? h('dd', null, UI.thDate(d.duty.date) + ' · ' + d.duty.groupName) : null,
          h('dt', null, 'พื้นที่'), h('dd', null, r.area), h('dt', null, 'ส่งเมื่อ'), h('dd', null, UI.thDateTime(r.submittedAt) + (r.version > 1 ? ' (ฉบับที่ ' + r.version + ')' : ''))),
        h('p', { class: 'pre' }, r.detail), App.gallery(r.fileIds),
        r.teacherComment ? UI.alert(r.status === 'APPROVED' ? 'ok' : 'warn', 'ความคิดเห็นครู: ' + r.teacherComment) : null);
      var members = h('div', { class: 'card' }, h('h3', null, 'สมาชิกที่ระบุว่าร่วมทำ'), h('ul', { class: 'list' }, d.members.map(function (m) {
        return h('li', { class: 'row between' }, h('span', null, m.name), r.status === 'APPROVED' ? (m.certified ? h('span', { class: 'status st-ok' }, '✓ รับรอง ' + (m.score || 0) + ' คะแนน') : h('span', { class: 'status st-none' }, '– ไม่ได้รับรอง')) : h('span', { class: 'status st-wait' }, '⏳ รอครูรับรอง'));
      })));
      var parts = [head, info, members];
      if (d.canEdit) parts.push(h('a', { class: 'btn sun block', href: '#/duty/report?reportId=' + r.reportId }, 'แก้ไขและส่งใหม่'));
      if (d.canReview) parts.push(window.dutyReviewForm(d));
      return h('div', null, parts);
    });
  });

  /* ---------------- ฉัน: ที่มาของคะแนน ---------------- */
  function scoreBreakdown(sc) {
    function catBlock(k) {
      var c = sc.categories[k], det = c.detail || {};
      var lines = [];
      if (k === 'saving') lines.push('เงินที่จัดสรรเข้ารอบที่ถึงกำหนด ' + UI.fmtNum(c.raw) + ' บาท จากที่ควรออม ' + UI.fmtNum(c.full) + ' บาท (' + det.paidRounds + '/' + det.dueRounds + ' รอบ)' + (det.advanceSatang ? ' · เงินล่วงหน้า ' + UI.baht(det.advanceSatang) + ' ยังไม่นับ' : ''));
      if (k === 'activity') (det.items || []).forEach(function (i) { lines.push(i.title + ': ' + i.score + '/' + i.max + (i.status === 'APPROVED' ? '' : ' (ยังไม่อนุมัติ)')); });
      if (k === 'special') { lines.push('อนุมัติแล้ว ' + det.approved + ' รายการ รวม ' + c.raw + ' คะแนนดิบ จากเป้าหมาย ' + c.full + (det.capped ? ' (เกินเป้า นับเต็มเพดาน)' : '')); }
      if (k === 'duty') lines.push('ต้องทำ ' + det.requiredRounds + ' รอบ ผ่าน/ชดเชย ' + det.doneRounds + ' รอบ · คะแนนเวรปกติ ' + det.regularRaw + ' + เวรเพิ่มเติม ' + det.extraCapped + (det.extraRaw > det.extraCapped ? ' (จำกัดเพดาน จาก ' + det.extraRaw + ')' : ''));
      return h('div', { class: 'card' }, h('div', { class: 'card-title' }, UI.icon(CAT_ICON[k]), h('h3', null, CAT_LABEL[k]), h('strong', null, c.hasBasis ? UI.fmtNum(c.weighted) + ' / ' + c.weight : 'ยังไม่มีฐานประเมิน')),
        h('div', { class: 'grid three' }, UI.stat('คะแนนดิบ', UI.fmtNum(c.raw)), UI.stat('คะแนนเต็มดิบ', UI.fmtNum(c.full)), UI.stat('หลังถ่วงน้ำหนัก', c.hasBasis ? UI.fmtNum(c.weighted) : '0', 'น้ำหนัก ' + c.weight)),
        c.hasBasis ? h('div', { class: 'tiny muted', style: { marginTop: '.4rem' } }, 'สูตร: min(1, ' + UI.fmtNum(c.raw) + ' ÷ ' + UI.fmtNum(c.full) + ') × ' + c.weight + ' = ' + UI.fmtNum(c.weighted)) : UI.alert('info', 'ยังไม่มีรายการที่ใช้เป็นฐาน หมวดนี้ได้ 0 ชั่วคราว (ไม่ให้คะแนนเต็มอัตโนมัติ)'),
        h('ul', { class: 'small' }, lines.map(function (l) { return h('li', null, l); })));
    }
    return h('div', null,
      h('div', { class: 'card mint' }, h('div', { class: 'row' }, UI.ring(sc.total, 100, 'คะแนนรวม'), h('div', null,
        h('div', null, h('strong', null, 'คะแนนชั่วคราว ณ ' + UI.thDate(sc.asOf))), h('div', { class: 'small muted' }, 'เกณฑ์รุ่นที่ ' + sc.policy.version),
        h('div', { class: 'tiny muted' }, 'ปัดเศษแต่ละหมวดเป็นทศนิยม 2 ตำแหน่ง (ปัดครึ่งขึ้น) แล้วรวมเป็นคะแนนรวม ไม่เกิน 100')))),
      sc.published ? UI.alert('ok', 'ผลที่ประกาศแล้ว (ตัดยอด ' + UI.thDate(sc.published.cutoffDate) + '): ' + UI.fmtNum(sc.published.total) + ' คะแนน · ผลการประเมิน ' + sc.published.grade) : null,
      ['saving', 'activity', 'special', 'duty'].map(catBlock),
      sc.events && sc.events.length ? h('div', { class: 'card' }, h('h3', null, 'ประวัติการเปลี่ยนคะแนน'), h('ul', { class: 'list small' }, sc.events.map(function (e) {
        return h('li', null, UI.thDateTime(e.createdAt) + ' · ' + (CAT_LABEL[e.category.toLowerCase()] || e.category) + ': ' + e.oldScore + ' → ' + e.newScore + (e.reason ? ' (' + e.reason + ')' : ''));
      }))) : null);
  }
  window.scoreBreakdown = scoreBreakdown;

  R('/me', function () {
    return API.call('score.student').then(function (sc) {
      var u = App.me.user;
      return h('div', null, UI.pageHead('ฉัน'),
        h('div', { class: 'card' }, h('div', { class: 'hero' }, UI.mascot('happy'), h('div', null, h('h2', null, u.fullName), h('div', { class: 'small muted' }, 'เลขประจำตัว ' + u.studentCode),
          App.me.enrollment ? h('div', { class: 'small' }, App.me.enrollment.classroomName + ' เลขที่ ' + (App.me.enrollment.studentNo || '-') + (App.me.isOfficer ? ' · ' + (App.me.enrollment.classRole === 'LEADER' ? 'หัวหน้าห้อง' : 'รองหัวหน้าห้อง') : '')) : null))),
        h('h2', null, 'ที่มาของคะแนน'), scoreBreakdown(sc),
        h('div', { class: 'grid two' }, h('a', { class: 'btn', href: '#/change-password' }, UI.icon('lock'), 'เปลี่ยนรหัสผ่าน'), h('button', { class: 'btn danger', onclick: App.logout }, UI.icon('logout'), 'ออกจากระบบ')));
    });
  }, { roles: ['STUDENT'] });
})();
