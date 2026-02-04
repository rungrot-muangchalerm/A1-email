# แก้ DNS ใน Cloudflare ให้ rungrot.com และ www ใช้ได้

## ปัญหา: "This site can't be reached" / DNS_PROBE_FINISHED_NXDOMAIN

- **phpmyadmin.rungrot.com** ใช้ได้ เพราะมี A record ชื่อ `phpmyadmin` → 203.154.83.37
- **www.rungrot.com** หรือ **rungrot.com** ใช้ไม่ได้ ถ้า DNS ไม่ครบ

## สิ่งที่ต้องมีใน Cloudflare (DNS → Records)

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| **A** | **@** | 203.154.83.37 | Proxied (ส้ม) |
| **A** | **www** | 203.154.83.37 | Proxied (ส้ม) |

- **@** = โดเมนหลัก `rungrot.com` (เวลาเข้า rungrot.com โดยไม่มี www)
- **www** = `www.rungrot.com`

ถ้าในรายการมีแค่ `www`, `app`, `phpmyadmin` แต่ **ไม่มี @** ให้เพิ่ม A record ใหม่:

1. กด **Add record**
2. Type: **A**
3. Name: **@** (หรือเลือก "root" / "rungrot.com" ตามที่ Cloudflare ให้)
4. IPv4 address: **203.154.83.37**
5. Proxy status: **Proxied** (เมฆส้ม)
6. Save

จากนั้นรอ 1–2 นาที แล้วลองเปิด **rungrot.com** และ **www.rungrot.com** อีกครั้ง

## เช็กบนเซิร์ฟเวอร์

- Nginx ต้องมี `server_name www.rungrot.com rungrot.com` และ `listen 80 default_server`
- Node (PM2) รันที่พอร์ต 9000
- Firewall เปิดพอร์ต 80 (และ 443 ถ้าใช้ HTTPS)
