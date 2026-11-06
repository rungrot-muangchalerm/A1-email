← [กลับไปยัง README](../README.md)

# กฎการเขียนโค้ด

เอกสารนี้กำหนดรูปแบบและมาตรฐานการเขียนโค้ดสำหรับโปรเจกต์นี้ ผู้พัฒนาและ AI assistant ต้องอ่านและปฏิบัติตามเอกสารนี้อย่างเคร่งครัด

## CSR-CR-001: การดึงข้อมูลมาใช้งานทันทีบนหน้า

เมื่อหน้าใดต้องการนำข้อมูลจาก API มาแสดงทันทีที่เปิด ให้ดึงข้อมูลแล้ว **inject เข้า element โดยตรงตาม id** โดยไม่ต้องสร้างตัวแปรกลาง

### รูปแบบที่ถูกต้อง

```js
fetch('/api/category/name').then(res => res.json()).then(data => {
    if (data.status === 200) {
        document.getElementById('id-category-one').textContent = data.data.one
        document.getElementById('id-category-two').src = data.data.two
        document.getElementById('id-category-three').value = data.data.three
    } else {
        console.log(data)
    }
})
```

### ข้อกำหนด

- ใช้ `fetch()` สำหรับดึงข้อมูลจาก API
- เขียน `fetch().then().then()` ให้อยู่ในบรรทัดเดียวกัน ไม่ขึ้นบรรทัดใหม่ระหว่าง `.then()`
- ตรวจสอบ `data.status === 200` ก่อนนำข้อมูลไปใช้
- inject ข้อมูลเข้า element โดยตรงผ่าน `document.getElementById()` โดยไม่สร้างตัวแปรกลาง
- รองรับ property ที่เหมาะสมกับ element:
  - ข้อความ: `.textContent`
  - รูปภาพ: `.src`
  - ค่า input: `.value`
- หาก `data.status` ไม่ใช่ 200 ให้ `console.log(data)` เพื่อตรวจสอบสาเหตุผ่าน console ไม่ต้องแสดง error บนหน้าเว็บ
- หากหน้านั้นต้องการดึงข้อมูล **ทันทีที่เปิด** ให้เรียก `fetch()` โดยตรงใน script ไม่ต้องห่อหุ้มด้วยฟังก์ชันแล้วค่อยเรียก

### สิ่งที่ห้ามทำ

- ห้ามสร้างตัวแปรมาเก็บข้อมูลก่อน inject
- ห้ามแสดงข้อความ error บน UI เมื่อ API ส่ง status ที่ไม่ใช่ 200
- ห้ามห่อหุ้ม `fetch()` ที่ต้องทำทันทีด้วยฟังก์ชันแล้วเรียกใช้ เช่น `function loadData() { fetch(...) } loadData()`

## CSR-CR-002: การวน loop แสดงรายการข้อมูล

เมื่อต้องแสดงรายการข้อมูลหลายรายการที่มีโครงสร้างเดียวกัน ให้ใช้ `<template>` element เท่านั้น ห้ามใช้ `innerHTML`

### รูปแบบที่ถูกต้อง

```html
<div id="category-container">
  <template id="category-template">
    <div class="item">
      <span data-role="one"></span>
      <img data-role="two" src="" alt="">
      <input data-role="three" type="text">
    </div>
  </template>
</div>
```

```js
fetch('/api/category/name').then(res => res.json()).then(data => {
    if (data.status === 200) {
        const container = document.getElementById('category-container')
        const template = document.getElementById('category-template')
        data.data.forEach(element => {
            const clone = template.content.cloneNode(true)
            clone.querySelector('[data-role="one"]').textContent = element.one
            clone.querySelector('[data-role="two"]').src = element.two
            clone.querySelector('[data-role="three"]').value = element.three
            container.appendChild(clone)
        })
    } else {
        console.log(data)
    }
})
```

### ข้อกำหนด

- สร้าง `<template>` element ไว้ภายใน container ที่จะแสดงรายการ เพื่อให้ตามหา element ได้ง่ายเวลาอ่านโค้ด
- ใช้ `cloneNode(true)` เพื่อโคลนเนื้อหาทั้งหมดของ template
- ใช้ `clone.querySelector('[data-role="..."]')` เพื่อเข้าถึง element ภายใน clone ที่โคลนออกมา
- inject ข้อมูลเข้า element ด้วย `.textContent`, `.src`, `.value` ตามประเภท
- append clone เข้า container ด้วย `appendChild()`
- เขียน `forEach` inline ภายใน `.then()` ของ API นั้น ๆ แต่ละ API ต้องเขียนใหม่ตลอด ห้าม reuse helper function
- รักษารูปแบบการจัดการ error เหมือน CSR-CR-001: หาก `data.status` ไม่ใช่ 200 ให้ `console.log(data)`

### สิ่งที่ห้ามทำ

- ห้ามใช้ `innerHTML` เพื่อ render รายการ
- ห้าม query element นอก clone เพราะจะอ้างอิง element ผิดตัว
- ห้ามสร้าง DOM element ด้วย `document.createElement()` แล้วต่อ string เอง
- ห้ามแยก `forEach` หรือ logic การ render ออกไปเป็น helper function หรือฟังก์ชันแยก ให้เขียน `forEach` inline ภายใน `.then()` ของ API นั้น ๆ เสมอ

## CSR-CR-003: การส่งข้อมูลเมื่อกดปุ่ม

เมื่อผู้ใช้ต้องกรอกข้อมูลแล้วกดปุ่มเพื่อส่ง ให้ใช้ `addEventListener('click', ...)` ห่อหุ้ม `fetch()` ด้วย method `POST`

### รูปแบบที่ถูกต้อง

```js
document.getElementById('btn-category').addEventListener('click', () => {
    fetch('/api/category/name', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            object_one: document.getElementById('object-one').value,
            object_two: document.getElementById('object-two').value
        })
    }).then(res => res.json()).then(data => {
        if (data.status === 200) {
            console.log(data)
        } else {
            console.log(data)
        }
    })
})
```

### ข้อกำหนด

- ใช้ `addEventListener('click', () => { ... })` สำหรับจับเหตุการณ์กดปุ่ม
- ใช้ `fetch()` ด้วย `method: 'POST'` สำหรับส่งข้อมูล
- กำหนด `headers: { 'Content-Type': 'application/json' }` เมื่อส่ง JSON
- ใส่ `credentials: 'include'` เพื่อส่ง Cookie httpOnly ไปพร้อมกับ request
- อ่านค่าจาก input โดยตรงภายใน `JSON.stringify()` ไม่สร้างตัวแปรกลาง
- ตรวจสอบ `data.status === 200` ก่อนนำข้อมูลไปใช้
- การใช้งานข้อมูลที่ได้รับต้องทำภายใน `.then()` เดียวกัน
- หาก `data.status` ไม่ใช่ 200 ให้ `console.log(data)` เพื่อตรวจสอบสาเหตุผ่าน console

### สิ่งที่ห้ามทำ

- ห้ามสร้างตัวแปรมาเก็บค่า input ก่อนใส่ลง `JSON.stringify()`
- ห้ามลืมใส่ `credentials: 'include'` หากระบบใช้ Cookie httpOnly
- ห้ามนำข้อมูลจาก response ออกไปใช้นอก `.then()` ที่รับ `data`

## SSR-CR-001: Mock API POST ด้วย Express (Phase 2)

**POST** ใช้สำหรับสร้างข้อมูลใหม่ในระบบ เช่น การลงทะเบียน การสร้างการจอง หรือการเพิ่มรายการโปรด

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ POST ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ request body หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.post('/api/category/name', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            one: 1,
            two: 'two',
            three: 'three'
        }
    })
})
```

### ข้อกำหนด

- ใช้ `app.post()` สำหรับสร้างข้อมูลใหม่
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.body`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.body` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## SSR-CR-002: Mock API GET Single Resource ด้วย Express (Phase 2)

**GET** ใช้สำหรับดึงข้อมูลจากระบบ ในกรณีนี้คือการดึงข้อมูล **เพียงรายการเดียว (Single Resource)** เช่น ข้อมูลผู้ใช้ปัจจุบัน หรือรายละเอียดวิลล่าหนึ่งหลัง

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ GET Single Resource ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ parameter, query string หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.get('/api/category/name', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            one: 1,
            two: 'two',
            three: 'three'
        }
    })
})
```

### ข้อกำหนด

- ใช้ `app.get()` สำหรับดึงข้อมูล
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- `data` ต้องเป็น **object เดียว** สำหรับ Single Resource
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.params` หรือ `req.query`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.params` หรือ `req.query` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## SSR-CR-003: Mock API GET Collection ด้วย Express (Phase 2)

**GET** ใช้สำหรับดึงข้อมูลจากระบบ ในกรณีนี้คือการดึงข้อมูล **หลายรายการ (Collection / List)** เช่น รายการวิลล่าแนะนำ หรือรายการการจอง

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ GET Collection ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ parameter, query string หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.get('/api/villa/recommendations', (req, res) => {
    res.status(200).json({
        status: 200,
        data: [{
            one: 1,
            two: 'two',
            three: 'three',
            four: 'four',
            five: 5,
            six: 6,
            seven: 'seven',
            eight: 8,
            nine: ['one', 'two', 'three']
        }, {
            one: 2,
            two: 'two',
            three: 'three',
            four: 'four',
            five: 5,
            six: 6,
            seven: 'seven',
            eight: 8,
            nine: ['one', 'two', 'three']
        }]
    })
})
```

### ข้อกำหนด

- ใช้ `app.get()` สำหรับดึงข้อมูล
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- `data` ต้องเป็น **array ของ objects** สำหรับ Collection
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.params` หรือ `req.query`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.params` หรือ `req.query` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## SSR-CR-004: Mock API PUT ด้วย Express (Phase 2)

**PUT** ใช้สำหรับอัปเดตข้อมูลทั้งหมดของ resource ที่ระบุ เช่น การแก้ไขโปรไฟล์ผู้ใช้ทั้งหมด

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ PUT ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ request body หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.put('/api/category/name', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            one: 1,
            two: 'two',
            three: 'three'
        }
    })
})
```

### ข้อกำหนด

- ใช้ `app.put()` สำหรับอัปเดตข้อมูล
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.body`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.body` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## SSR-CR-005: Mock API DELETE ด้วย Express (Phase 2)

**DELETE** ใช้สำหรับลบข้อมูลออกจากระบบ เช่น การยกเลิกการจอง การลบวิลล่าออกจากรายการโปรด

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ DELETE ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ parameter หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.delete('/api/category/name', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            one: 1,
            two: 'two',
            three: 'three'
        }
    })
})
```

### ข้อกำหนด

- ใช้ `app.delete()` สำหรับลบข้อมูล
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.params` หรือ `req.query`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.params` หรือ `req.query` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## SSR-CR-006: Mock API PATCH ด้วย Express (Phase 2)

**PATCH** ใช้สำหรับอัปเดตข้อมูลบางส่วนของ resource เช่น การเปลี่ยนเฉพาะเบอร์โทรศัพท์หรือที่อยู่

ในช่วง Phase 2 ก่อนที่จะเชื่อมต่อฐานข้อมูลจริง ให้สร้าง Mock API แบบ PATCH ด้วย Express โดยคืนค่า JSON ตรง ๆ ไม่ต้องตรวจสอบ request body หรือประมวลผลใด ๆ

### รูปแบบที่ถูกต้อง

```js
app.patch('/api/category/name', (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            one: 1,
            two: 'two',
            three: 'three'
        }
    })
})
```

### ข้อกำหนด

- ใช้ `app.patch()` สำหรับอัปเดตข้อมูลบางส่วน
- คืนค่าด้วย `res.status(200).json({ ... })` เสมอ
- รูปแบบ response ต้องมี `status` และ `data` อย่างน้อย 2 ฟิลด์
- ข้อมูลใน `data` เป็น static/mock ตัวอย่างเท่านั้น
- ไม่ต้องตรวจสอบ `req.body`
- ไม่ต้องเชื่อมต่อฐานข้อมูล
- ไม่ต้องเขียน validation หรือ business logic ใด ๆ

### สิ่งที่ห้ามทำ

- ห้ามอ่านหรือตรวจสอบ `req.body` ใน mock API
- ห้าม return status code อื่นนอกจาก 200 ใน mock API
- ห้ามเชื่อมต่อฐานข้อมูลจริง
- ห้ามเขียน validation หรือ error handling ที่ซับซ้อน

## หลักการทั่วไป

- เขียนโค้ดให้อ่านง่าย กระชับ และมีความหมาย
- ตั้งชื่อตัวแปร ฟังก์ชัน คลาส และไฟล์ให้สื่อความหมาย
- หลีกเลี่ยงโค้ดที่ซ้ำซ้อน (DRY — Don't Repeat Yourself)
- แยกความรับผิดชอบของแต่ละส่วนให้ชัดเจน
- เขียนคอมเมนต์เฉพาะเมื่อจำเป็นจริง ๆ โดยอธิบาย **เหตุผล** ไม่ใช่แค่ **ทำอะไร**

## กฎการเขียน JavaScript / Node.js

- ใช้ `const` เป็นค่าเริ่มต้น ใช้ `let` เมื่อต้องเปลี่ยนค่า ห้ามใช้ `var`
- ฟังก์ชันแบบธรรมดา (`function`) สำหรับการประกาศฟังก์ชันหลัก หรือใช้ arrow function (`=>`) เมื่อเหมาะสม
- ตั้งชื่อไฟล์ด้วยตัวพิมพ์เล็กและใช้ขีดกลาง เช่น `booking-service.js`, `user-controller.js`
- ตั้งชื่อคลาสด้วยตัวพิมพ์ใหญ่ เช่น `BookingService`
- ตั้งชื่อตัวแปรและฟังก์ชันแบบ camelCase เช่น `getUserById`, `totalPrice`
- ตั้งชื่อค่าคงที่แบบ UPPER_SNAKE_CASE เฉพาะค่าที่แท้จริง เช่น `MAX_GUESTS`
- ใช้ single quote (`'`) สำหรับ string ธรรมดา
- ใช้ template literal (backtick) เมื่อต้องมีตัวแปรหรือขึ้นบรรทัดใหม่
- จัดการ error ทุกกรณีที่อาจเกิดขึ้น ไม่ปล่อยให้ exception หลุดโดยไม่จัดการ

## กฎการเขียน HTML / CSS

- ใช้ HTML5 semantic elements เช่น `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- ตั้งชื่อ class/id ด้วยตัวพิมพ์เล็กและขีดกลาง เช่น `booking-form`, `villa-card`
- ใช้ Bootstrap 5 เป็นหลักสำหรับ layout และ component
- แยก CSS ที่เป็น global ไว้ใน `assets/css/` หรือ `public/css/`
- หลีกเลี่ยงการใช้ inline style ยกเว้นกรณีจำเป็นและเห็นชัดเจน
- รูปภาพต้องมี `alt` text ที่อธิบายเนื้อหา

## กฎการเขียน API / Express.js

- ใช้ RESTful URL pattern
  - `GET /api/search/:page/:where` — ค้นหารายการวิลล่า
  - `GET /api/villa/:slug` — ดึงข้อมูลวิลล่าตาม slug
  - `POST /api/booking` — สร้างการจองใหม่
  - `POST /api/booking/:id/cancel` — ยกเลิกการจอง
- คืนค่า response ในรูปแบบ JSON สม่ำเสมอ
- ใช้ HTTP status code ที่ถูกต้อง เช่น 200, 201, 400, 401, 403, 404, 500
- แยก route, controller, service ออกจากกันตามหน้าที่

## กฎการเขียนฐานข้อมูล (MariaDB)

- ตั้งชื่อตารางแบบพหูพจน์และตัวพิมพ์เล็ก เช่น `villas`, `bookings`, `users`
- ตั้งชื่อคอลัมน์แบบ snake_case เช่น `check_in_date`, `total_amount`
- กำหนด primary key เป็น `id` ทุกตาราง
- กำหนด foreign key เพื่อรักษาความสัมพันธ์ของข้อมูล
- ใช้ `mysql2/promise` สำหรับเชื่อมต่อฐานข้อมูล
- เขียน query parameter ด้วย placeholder (`?`) เพื่อป้องกัน SQL injection

## สิ่งที่ต้องทำเมื่อพบรูปแบบโค้ดที่ไม่ได้ระบุ

หากพบรูปแบบโค้ดที่ไม่ได้ระบุไว้ในเอกสารนี้ ให้แจ้งว่า:

> ไม่พบรูปแบบโค้ดที่ระบุไว้ใน `CONTRIBUTING.MD`

แล้วหยุดดำเนินการจนกว่าจะได้รับคำสั่งเพิ่มเติมจากผู้พัฒนาหลัก
