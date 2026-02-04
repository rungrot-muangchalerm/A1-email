# รับเมลผ่าน Cloudflare (ไม่ต้องชี้ MX มาที่เซิร์ฟเวอร์)

ถ้า MX ของ rungrot.com ชี้ไปที่ Cloudflare อยู่แล้ว ให้ใช้ **Email Worker** ส่งเมลมาแอปคุณทาง Webhook แล้วเปิดอ่านในแอปได้เลย

## ขั้นตอน

### 1. Secret (ถ้าอยากใช้ชั่วคราว ไม่ต้องตั้ง)

- **ไม่ตั้ง** `INBOUND_EMAIL_SECRET` → แอปรับเมลจาก Webhook ได้เลย ไม่ต้องส่ง header ลับ (เหมาะใช้ชั่วคราว)
- **ตั้ง** `INBOUND_EMAIL_SECRET=ค่าลับ` บนเซิร์ฟเวอร์ และตั้ง `WEBHOOK_SECRET` ใน Worker ให้ตรงกัน → ใช้เมื่ออยากกันคนอื่นยิงมาที่ endpoint

### 2. สร้าง Email Worker ใน Cloudflare

1. เข้า **Cloudflare Dashboard** (dash.cloudflare.com)
2. หาเมนูสร้าง Worker (อยู่ระดับ **บัญชี** ไม่ใช่ในหน้าโดเมน):
   - ถ้าเห็น **Workers & Pages** ในแถบซ้าย → กดเข้าไป
   - ถ้าเห็นแค่ **Workers** หรือ **Workers Routes** → กด **Workers** (หรือกลับไปหน้าแรกบัญชี แล้วดูแถบซ้ายอีกครั้ง มักมี **Workers & Pages** อยู่ด้านบน)
   - หรือลองกด **สร้าง Worker** / **Create Worker** จากหน้าแรก Dashboard
   - ลิงก์ตรง: หลังล็อกอินแล้วไปที่ **dash.cloudflare.com** → เลือกบัญชี → แถบซ้ายควรมี **Workers & Pages** (อยู่ระดับบัญชี ไม่ใช่ใน rungrot.com)
3. กด **Create** → **Create Worker** ตั้งชื่อ เช่น `email-to-webhook` → **Deploy**
4. กด **Edit code** แล้วแทนที่ทั้งหมดด้วยสคริปต์ด้านล่าง
5. ไปที่ **Settings** → **Variables** → **Add variable**:
   - **Name:** `API_URL` → **Value:** `https://www.rungrot.com/api/inbound-email-raw`
   - **Name:** `WEBHOOK_SECRET` → **Value:** เว้นว่างได้ (ใช้ชั่วคราวไม่ต้องใส่)
6. **Save** แล้ว **Deploy** อีกครั้ง

### 3. ผูก Worker กับ Email Routing (รับได้ทุกที่อยู่ @rungrot.com)

**ช่อง "Custom address"** = ใส่แค่ **ส่วนก่อน @** (local part) แล้วได้แค่ที่อยู่นั้นไป Worker เช่น ใส่ `temp` → มีแค่ temp@rungrot.com ไป Worker

ถ้าอยากให้ **ทุกที่อยู่** (wek4li3ngu, สุ่มอะไรก็ได้) ไป Worker ต้องใช้ **Catch-all** แทน:

1. ไปที่ **Email** → **Email Routing**
2. เปิดแท็บ **Routing rules** (หรือ **Overview**)
3. หาส่วน **Catch-all address** → เปิดเป็น **Active**
4. ใน **Action** เลือก **Send to a Worker**
5. ใน **Destination** เลือก **email-to-webhook**
6. กด **Save**

(ถ้าไม่มี Catch-all ใน UI ลองดูที่ **Settings** หรือใช้ **Create custom address** ใส่เครื่องหมาย `*` หรือคำว่า catch-all ตามที่ Cloudflare แสดง)

**ทางเลือกแบบ Custom address อย่างเดียว:** ถ้าอยากทดสอบแค่ที่อยู่เดียว ให้กด Cancel กลับไป แล้วสร้าง Custom address ใส่คำเดียว เช่น `mail` → จะได้แค่ **mail@rungrot.com** ไป Worker (ที่อยู่อื่นจะไม่เข้า Worker)

จากนั้นเมื่อมีคนส่งเมลมา **wek4li3ngu@rungrot.com** (หรือที่อยู่ใดที่ @rungrot.com ถ้าใช้ Catch-all) Cloudflare จะรับเมล → รัน Worker → Worker ส่ง raw เมลไปที่ `https://www.rungrot.com/api/inbound-email-raw` → แอปเก็บเข้า inbox ของ `wek4li3ngu` → เปิดอ่านในหน้าเว็บได้

---

## สคริปต์ Worker (แทนที่ใน Editor)

```javascript
export default {
  async email(message, env, ctx) {
    const apiUrl = env.API_URL || 'https://www.rungrot.com/api/inbound-email-raw';
    const secret = env.WEBHOOK_SECRET || '';

    const headers = {
      'Content-Type': 'message/rfc822',
    };
    if (secret) headers['X-Webhook-Secret'] = secret;

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: message.raw,
        headers,
      });
      if (!res.ok) {
        console.error('Webhook failed:', res.status, await res.text());
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
  },
};
```

---

## สรุป

- **MX ยังชี้ไปที่ Cloudflare** (route1/2/3.mx.cloudflare.net) ได้ ไม่ต้องเปลี่ยน
- **Email Worker** จะรับเมลจาก Cloudflare แล้ว POST raw เมลไปที่ `/api/inbound-email-raw`
- แอปจะ parse แล้วเก็บเข้า inbox ตาม local part (เช่น wek4li3ngu)
- เปิด **www.rungrot.com** → Gen Email หรือใช้ที่อยู่ **wek4li3ngu@rungrot.com** → กล่องจดหมายจะโหลดเมลที่ส่งมาที่ที่อยู่นั้น
