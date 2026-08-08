# ระบบสต๊อกสินค้า

มี 2 โหมดให้ใช้งาน

- `index.html` — รุ่นเก็บข้อมูลในเครื่องด้วย LocalStorage
- `google-sheets.html` — รุ่นออนไลน์ เชื่อม Google Sheets ให้มือถือ/คอมหลายเครื่องใช้สต๊อกเดียวกัน

## Google Sheets Online

ไฟล์ `Code.gs` คือ backend สำหรับ Google Apps Script

### ตั้งค่าครั้งแรก

1. สร้าง Google Sheet ใหม่ เช่น `สต๊อกสินค้าร้าน`
2. ใน Google Sheet เลือก **ส่วนขยาย > Apps Script**
3. ลบโค้ดเดิมใน `Code.gs` แล้วคัดลอกโค้ดจากไฟล์ `Code.gs` ในโฟลเดอร์นี้ไปวาง
4. กด Save
5. เลือกฟังก์ชัน `setupSystem` แล้วกด Run ครั้งแรก และอนุญาตสิทธิ์ Google
6. ระบบจะสร้างชีต `Products` และ `Transactions` ให้อัตโนมัติ
7. เลือก **Deploy > New deployment > Web app**
8. Execute as: **Me**
9. Who has access: **Anyone**
10. กด Deploy แล้วคัดลอก URL ที่ลงท้ายด้วย `/exec`
11. เปิด `google-sheets.html`
12. วาง URL ในช่อง **Google Apps Script Web App URL** แล้วกด **บันทึก/เชื่อมต่อ**

หลังจากนั้นข้อมูลสินค้า การรับเข้า และการขายจะบันทึกลง Google Sheets โดยตรง ทุกเครื่องที่ใช้ Web App URL เดียวกันจะเห็นข้อมูลสต๊อกชุดเดียวกัน

## ฟังก์ชัน Google Sheets รุ่นนี้

- เพิ่มสินค้าและบาร์โค้ด
- ราคาทุน/ราคาขาย
- จำนวนคงเหลือและระดับแจ้งเตือน
- ขายและตัดสต๊อก
- รับสินค้าเข้า
- ประวัติ Transactions ใน Google Sheet
- ยอดขายวันนี้
- ป้องกันการขายพร้อมกันด้วย `LockService`

## โครงสร้าง Google Sheet

`Products`

`id | barcode | name | cost | price | qty | min`

`Transactions`

`id | time | type | productId | name | qty | unitPrice | cost | amount | note`

## หมายเหตุ

หากแก้ไข `Code.gs` ภายหลัง ต้องไปที่ **Deploy > Manage deployments > Edit > New version > Deploy** เพื่อให้ Web App ใช้โค้ดล่าสุด
