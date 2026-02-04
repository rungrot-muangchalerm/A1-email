const path = require('path');
const http = require('http');
const express = require('express');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const HTTP_PORT = Number(process.env.PORT) || 9000;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 2525;
const DOMAIN = (process.env.DOMAIN || 'rungrot.com').toLowerCase();
const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET || '';

// เก็บเมลในหน่วยความจำ: key = localPart (ตัวก่อน @), value = array of { id, from, subject, text, html, date }
const inbox = new Map();
let idCounter = 1;

function getLocalPart(address) {
  if (!address || typeof address !== 'string') return null;
  const at = address.lastIndexOf('@');
  if (at === -1) return null;
  const local = address.slice(0, at).trim().toLowerCase();
  const host = address.slice(at + 1).trim().toLowerCase();
  if (host !== DOMAIN) return null;
  return local || null;
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// รับ raw MIME จาก Cloudflare Email Worker (ต้องใช้ก่อน route อื่นที่อ่าน body)
app.post('/api/inbound-email-raw', express.raw({ type: 'message/rfc822', limit: '10mb' }), (req, res) => {
  if (INBOUND_SECRET && req.headers['x-webhook-secret'] !== INBOUND_SECRET) {
    return res.status(401).json({ ok: false, error: 'Invalid secret' });
  }
  const raw = req.body;
  if (!raw || !Buffer.isBuffer(raw)) {
    return res.status(400).json({ ok: false, error: 'No body' });
  }
  simpleParser(raw, (err, parsed) => {
    if (err) return res.status(400).json({ ok: false, error: String(err.message) });
    const toAddr = parsed.to?.text || parsed.to?.value?.[0]?.address || '';
    const local = getLocalPart(toAddr);
    if (!local) return res.status(400).json({ ok: false, error: 'Invalid to' });
    const msg = {
      id: idCounter++,
      from: parsed.from?.text || parsed.from?.value?.[0]?.address || '',
      subject: parsed.subject || '',
      text: parsed.text || '',
      html: parsed.html || '',
      date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    };
    if (!inbox.has(local)) inbox.set(local, []);
    inbox.get(local).unshift(msg);
    res.json({ ok: true, local });
  });
});

// static files จาก public
app.use(express.static(path.join(__dirname, 'public')));

// API: ดึงรายการเมลของที่อยู่หนึ่งๆ
app.get('/api/inbox/:localPart', (req, res) => {
  const local = (req.params.localPart || '').trim().toLowerCase();
  if (!local) {
    return res.json([]);
  }
  const list = inbox.get(local) || [];
  res.json(list);
});

// API: รับเมลแบบ JSON จาก webhook อื่น (ไม่ต้องชี้ MX มาที่เซิร์ฟเวอร์)
app.post('/api/inbound-email', (req, res) => {
  if (INBOUND_SECRET && req.headers['x-webhook-secret'] !== INBOUND_SECRET) {
    return res.status(401).json({ ok: false, error: 'Invalid secret' });
  }
  const { to, from, subject, text, html } = req.body || {};
  const local = getLocalPart(to || req.body?.toAddress);
  if (!local) {
    return res.status(400).json({ ok: false, error: 'Invalid to address' });
  }
  const msg = {
    id: idCounter++,
    from: from || req.body?.from || '',
    subject: subject || req.body?.subject || '',
    text: text || req.body?.text || '',
    html: html || req.body?.html || '',
    date: new Date().toISOString(),
  };
  if (!inbox.has(local)) inbox.set(local, []);
  inbox.get(local).unshift(msg);
  res.json({ ok: true, local });
});

// หน้าแรก
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SMTP server รับเมล
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],
  onConnect(session, callback) {
    callback();
  },
  onMailFrom(address, session, callback) {
    callback();
  },
  onRcptTo(address, session, callback) {
    const local = getLocalPart(address.address);
    if (local) {
      session.localPart = local;
      return callback();
    }
    callback(new Error('Only addresses @' + DOMAIN + ' are accepted'));
  },
  onData(stream, session, callback) {
    const local = session.localPart;
    if (!local) return callback(new Error('Invalid recipient'));

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const raw = Buffer.concat(chunks);
      simpleParser(raw, (err, parsed) => {
        if (err) {
          return callback(err);
        }
        const from = parsed.from?.text || parsed.from?.value?.[0]?.address || '';
        const subject = parsed.subject || '';
        const text = parsed.text || '';
        const html = parsed.html || '';
        const date = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

        const msg = {
          id: idCounter++,
          from,
          subject,
          text,
          html,
          date,
        };

        if (!inbox.has(local)) {
          inbox.set(local, []);
        }
        inbox.get(local).unshift(msg);
        callback();
      });
    });
  },
});

const server = http.createServer(app);

server.listen(HTTP_PORT, () => {
  console.log('HTTP server: http://localhost:' + HTTP_PORT);
});

smtp.listen(SMTP_PORT, () => {
  console.log('SMTP server: port ' + SMTP_PORT + ' (for @' + DOMAIN + ')');
  console.log('Set MX record for ' + DOMAIN + ' to this server. Use port ' + SMTP_PORT + ' if not 25.');
});
