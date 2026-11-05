/* api.js — เรียก Backend (Apps Script) จาก GitHub Pages
 * ใช้ POST + Content-Type: text/plain (simple request → ไม่มี CORS preflight ซึ่ง Apps Script ไม่รองรับ)
 * fetch ตาม 302 ไป script.googleusercontent.com ที่ตอบ Access-Control-Allow-Origin: * จึงอ่าน JSON ได้จริง
 * ไม่ใช้ mode:'no-cors' และไม่ใช้ JSONP
 * token อยู่ในเนื้อหาคำขอ ไม่อยู่ใน URL
 */
(function (W) {
  'use strict';
  var TOKEN_KEY = 'pmd_token';

  function ApiError(code, message, details) { this.code = code; this.message = message; this.details = details; }
  ApiError.prototype = Object.create(Error.prototype);

  var Auth = {
    get: function () { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } },
    set: function (t, remember) {
      try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch (e) { /* โหมดส่วนตัว */ }
    },
    clear: function () { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { } }
  };

  var onAuthError = function () { };

  function send(body) {
    if (typeof W.DEV_BACKEND === 'function') return Promise.resolve(W.DEV_BACKEND(body)); // โหมดพัฒนาในเครื่องเท่านั้น (dev/index.html)
    var url = (W.APP_CONFIG || {}).API_URL || '';
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) || url.indexOf('ใส่_') >= 0) {
      return Promise.reject(new ApiError('CONFIG', 'ยังไม่ได้ตั้งค่า API_URL ใน config.js'));
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, (W.APP_CONFIG.REQUEST_TIMEOUT_MS || 45000)) : null;
    return fetch(url, {
      method: 'POST', redirect: 'follow', credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new ApiError('HTTP', 'เซิร์ฟเวอร์ตอบกลับผิดปกติ (' + r.status + ')');
      return r.json().catch(function () { throw new ApiError('BAD_RESPONSE', 'อ่านผลตอบกลับไม่ได้ (ตรวจสอบการ Deploy ว่าเปิดสิทธิ์ "Anyone")'); });
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw new ApiError('NETWORK', e && e.name === 'AbortError' ? 'หมดเวลาเชื่อมต่อ กรุณาลองใหม่' : 'เชื่อมต่อเครือข่ายไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    });
  }

  /**
   * call(action, payload, {requestId, mutate})
   * mutate=true: สร้าง requestId ครั้งเดียว แล้วลองส่งซ้ำด้วยรหัสเดิมเมื่อเครือข่ายล้ม → Backend ไม่บันทึกซ้ำ
   */
  function call(action, payload, opts) {
    opts = opts || {};
    var requestId = opts.requestId || (opts.mutate ? UI.rid() : undefined);
    var body = { action: action, token: Auth.get(), payload: payload || {}, requestId: requestId };
    var attempts = opts.mutate || !requestId ? (opts.mutate ? 3 : 2) : 1;
    function attempt(n) {
      return send(body).then(function (res) {
        if (res && res.ok) return res.data;
        var err = (res && res.error) || { code: 'BAD_RESPONSE', message: 'ผลตอบกลับไม่ถูกต้อง' };
        throw new ApiError(err.code, err.message, err.details);
      }).catch(function (e) {
        if (e.code === 'NETWORK' && n < attempts) return new Promise(function (r) { setTimeout(r, 800 * n); }).then(function () { return attempt(n + 1); });
        if (e.code === 'LOCK_TIMEOUT' && n < attempts) return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return attempt(n + 1); });
        if (['AUTH_REQUIRED', 'SESSION_EXPIRED', 'PASSWORD_CHANGE_REQUIRED'].indexOf(e.code) >= 0 && action !== 'auth.login') onAuthError(e);
        throw e;
      });
    }
    return attempt(1);
  }

  /** ภาพ: cache ในหน่วยความจำเท่านั้น (ไม่เก็บถาวรในเครื่อง) */
  var fileCache = {};
  function fileUrl(fileId) {
    if (!fileCache[fileId]) fileCache[fileId] = call('file.get', { fileId: fileId }).then(function (d) { return d.dataUrl; }).catch(function (e) { delete fileCache[fileId]; throw e; });
    return fileCache[fileId];
  }
  function upload(dataUrl, classroomId) { return call('file.upload', { dataUrl: dataUrl, classroomId: classroomId }, { mutate: true }); }

  W.API = { call: call, Auth: Auth, ApiError: ApiError, fileUrl: fileUrl, upload: upload, onAuthError: function (fn) { onAuthError = fn; } };
})(window);
