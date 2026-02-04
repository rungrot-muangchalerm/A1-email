(function () {
  'use strict';

  var DOMAIN = 'rungrot.com';
  var LENGTH = 10;
  var CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var INBOX_POLL_MS = 5000;
  var STORAGE_ADDRESSES = 'temp_email_addresses';
  var STORAGE_INBOX_PREFIX = 'temp_inbox_';

  var emailListSection = document.getElementById('emailListSection');
  var emailListContainer = document.getElementById('emailListContainer');
  var display = document.getElementById('emailDisplay');
  var genBtn = document.getElementById('genBtn');
  var copyBtn = document.getElementById('copyBtn');
  var mailboxSection = document.getElementById('mailboxSection');
  var inboxList = document.getElementById('inboxList');
  var inboxEmpty = document.getElementById('inboxEmpty');
  var emailModalEl = document.getElementById('emailModal');
  var bsModal = typeof bootstrap !== 'undefined' ? bootstrap.Modal.getOrCreateInstance(emailModalEl) : null;
  var modalClose = document.getElementById('modalClose');
  var modalSubject = document.getElementById('modalSubject');
  var modalFrom = document.getElementById('modalFrom');
  var modalDate = document.getElementById('modalDate');
  var modalBody = document.getElementById('modalBody');

  var currentLocalPart = null;
  var currentEmail = null;
  var pollTimer = null;

  function getStoredAddresses() {
    try {
      var raw = localStorage.getItem(STORAGE_ADDRESSES);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function setStoredAddresses(arr) {
    try {
      localStorage.setItem(STORAGE_ADDRESSES, JSON.stringify(arr));
    } catch (e) {}
  }

  function getStoredInbox(localPart) {
    if (!localPart) return [];
    try {
      var raw = localStorage.getItem(STORAGE_INBOX_PREFIX + localPart);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function setStoredInbox(localPart, list) {
    if (!localPart) return;
    try {
      localStorage.setItem(STORAGE_INBOX_PREFIX + localPart, JSON.stringify(list));
    } catch (e) {}
  }

  function randomString(len) {
    var s = '';
    for (var i = 0; i < len; i++) {
      s += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return s;
  }

  function generateEmail() {
    var local = randomString(LENGTH);
    return local + '@' + DOMAIN;
  }

  function renderEmailList() {
    var addresses = getStoredAddresses();
    emailListContainer.innerHTML = '';
    if (addresses.length === 0) {
      emailListSection.hidden = true;
      return;
    }
    emailListSection.hidden = false;
    addresses.forEach(function (email) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-secondary email-chip';
      if (email === currentEmail) btn.classList.add('active');
      btn.textContent = email;
      btn.title = email;
      btn.addEventListener('click', function () {
        selectEmail(email);
      });
      emailListContainer.appendChild(btn);
    });
  }

  function selectEmail(email) {
    currentEmail = email;
    var local = email.split('@')[0];
    currentLocalPart = local;
    display.textContent = email;
    display.classList.add('filled');
    copyBtn.disabled = false;
    mailboxSection.hidden = false;
    renderEmailList();
    renderInboxFromStorage();
    startInboxPoll();
    fetchInbox();
  }

  function setEmail(email) {
    currentEmail = email;
    var local = email.split('@')[0];
    currentLocalPart = local;
    var addresses = getStoredAddresses();
    if (addresses.indexOf(email) === -1) {
      addresses.push(email);
      setStoredAddresses(addresses);
      setStoredInbox(local, []);
    }
    display.textContent = email;
    display.classList.add('filled');
    copyBtn.disabled = false;
    mailboxSection.hidden = false;
    renderEmailList();
    inboxList.innerHTML = '';
    inboxEmpty.classList.remove('hidden');
    startInboxPoll();
    fetchInbox();
  }

  function getInboxUrl() {
    return '/api/inbox/' + encodeURIComponent(currentLocalPart);
  }

  function renderInboxFromStorage() {
    var list = getStoredInbox(currentLocalPart);
    inboxList.innerHTML = '';
    if (!list || list.length === 0) {
      inboxEmpty.classList.remove('hidden');
      inboxEmpty.textContent = 'ยังไม่มีจดหมาย';
      return;
    }
    inboxEmpty.classList.add('hidden');
    list.forEach(function (msg) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'list-group-item list-group-item-action inbox-item';
      el.innerHTML =
        '<p class="inbox-item-subject">' + escapeHtml(msg.subject || '(ไม่มีหัวข้อ)') + '</p>' +
        '<p class="inbox-item-from">จาก: ' + escapeHtml(msg.from || '') + '</p>';
      el.addEventListener('click', function () { openEmail(msg); });
      inboxList.appendChild(el);
    });
  }

  function fetchInbox() {
    if (!currentLocalPart) return;
    fetch(getInboxUrl())
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (list) {
        if (!list || !Array.isArray(list)) list = [];
        setStoredInbox(currentLocalPart, list);
        renderInboxFromStorage();
      })
      .catch(function () {
        var list = getStoredInbox(currentLocalPart);
        if (list.length === 0) {
          inboxEmpty.classList.remove('hidden');
          inboxEmpty.textContent = 'โหลดกล่องจดหมายไม่ได้';
        }
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function startInboxPoll() {
    stopInboxPoll();
    pollTimer = setInterval(fetchInbox, INBOX_POLL_MS);
  }

  function stopInboxPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function openEmail(msg) {
    modalSubject.textContent = msg.subject || '(ไม่มีหัวข้อ)';
    modalFrom.textContent = 'จาก: ' + (msg.from || '');
    modalDate.textContent = msg.date ? new Date(msg.date).toLocaleString('th-TH') : '';
    var body = msg.text || msg.body || '';
    if (msg.html && msg.html.trim()) {
      modalBody.innerHTML = '<iframe class="sandbox" srcdoc="' + escapeAttr(msg.html) + '" sandbox></iframe>';
    } else {
      modalBody.textContent = body || '(ไม่มีเนื้อความ)';
    }
    if (bsModal) bsModal.show(); else emailModalEl.style.display = 'flex';
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function closeModal() {
    if (bsModal) bsModal.hide(); else if (emailModalEl) emailModalEl.style.display = 'none';
  }

  genBtn.addEventListener('click', function () {
    var email = generateEmail();
    setEmail(email);
  });

  copyBtn.addEventListener('click', function () {
    var email = display.textContent;
    if (!email || email === 'กด Gen Email เพื่อสร้างอีเมล') return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () {
        showCopied();
      }).catch(function () {
        fallbackCopy(email);
      });
    } else {
      fallbackCopy(email);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopied();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function showCopied() {
    var textSpan = copyBtn.querySelector('.btn-text');
    var orig = textSpan.textContent;
    copyBtn.classList.add('copied');
    textSpan.textContent = 'คัดลอกแล้ว!';
    setTimeout(function () {
      copyBtn.classList.remove('copied');
      textSpan.textContent = orig;
    }, 1500);
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);

  // โหลดจาก localStorage ตอนเปิดหน้า
  (function init() {
    var addresses = getStoredAddresses();
    if (addresses.length > 0) {
      selectEmail(addresses[addresses.length - 1]);
    } else {
      display.textContent = 'กด Gen Email เพื่อสร้างอีเมล';
      copyBtn.disabled = true;
    }
  })();
})();
