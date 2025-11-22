# Railway Deployment Guide - ZenityX AI Studio

## 🚀 ขั้นตอนการ Deploy

### 1. Environment Variables ที่ต้อง Configure ใน Railway

ไปที่ Railway Dashboard → เลือก Project → Variables → Add Variables

```bash
# Database Configuration (TiDB)
DATABASE_URL=mysql://M6RiQS69meh6Ri6.root:0i9PkiyY7Uf3aCoD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}

# JWT Secret (สร้าง random string ยาวๆ สำหรับความปลอดภัย)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string-min-32-chars

# Node Environment
NODE_ENV=production

# Kie.ai API Key (สำหรับ AI generation)
KIE_API_KEY=kie-api-key-1

# Port (Railway จะ inject อัตโนมัติ แต่ควรมีไว้)
PORT=3000
```

### 2. การสร้าง JWT_SECRET ที่ปลอดภัย

คุณสามารถสร้าง JWT_SECRET ได้โดยใช้คำสั่งใดคำสั่งหนึ่งนี้:

```bash
# วิธีที่ 1: ใช้ Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# วิธีที่ 2: ใช้ OpenSSL
openssl rand -hex 64

# วิธีที่ 3: ใช้ online generator
# https://www.grc.com/passwords.htm
```

### 3. ตรวจสอบ GitHub Integration

1. ไปที่ Railway Dashboard → Settings → GitHub
2. ตรวจสอบว่า repository `zenityX12/zenityxstudio2` ถูกเชื่อมต่อแล้ว
3. ตรวจสอบว่า Auto-deploy เปิดอยู่ (Deploy on Push)

### 4. Deploy

หลังจาก configure environment variables แล้ว:

1. Railway จะ auto-deploy ทันทีเมื่อมีการ push code ไป GitHub
2. หรือคุณสามารถ manual deploy ได้ที่ Railway Dashboard → Deployments → Deploy Now

### 5. ตรวจสอบ Deployment

1. ไปที่ Railway Dashboard → Deployments
2. ดู Build Logs เพื่อตรวจสอบว่า build สำเร็จหรือไม่
3. ดู Deploy Logs เพื่อตรวจสอบว่า server รันได้หรือไม่
4. เข้าไปที่ URL ที่ Railway สร้างให้ (เช่น https://web-production-70259.up.railway.app)

### 6. ทดสอบ Production

1. เปิด URL ของ Railway
2. ทดสอบสมัครสมาชิก (Register)
3. ทดสอบ Login
4. ทดสอบเข้าหน้า Studio
5. ทดสอบ AI generation features

---

## 🔧 Troubleshooting

### ปัญหา: Database Connection Failed

**สาเหตุ:** DATABASE_URL ไม่ถูกต้องหรือ TiDB ไม่อนุญาตให้ Railway เชื่อมต่อ

**แก้ไข:**
1. ตรวจสอบว่า DATABASE_URL ถูกต้อง
2. ตรวจสอบว่า TiDB อนุญาต IP ของ Railway (หรือเปิด public access)
3. ดู logs ใน Railway Dashboard

### ปัญหา: JWT Token Invalid

**สาเหตุ:** JWT_SECRET ไม่ตรงกันระหว่าง development และ production

**แก้ไข:**
1. ตรวจสอบว่า JWT_SECRET ถูก set ใน Railway
2. ลอง logout และ login ใหม่

### ปัญหา: Build Failed

**สาเหตุ:** Dependencies ไม่ครบหรือ build command ไม่ถูกต้อง

**แก้ไข:**
1. ตรวจสอบ package.json ว่ามี build script
2. ตรวจสอบ logs ใน Railway Dashboard
3. ลอง build ใน local ก่อน: `pnpm build`

---

## 📝 Important Notes

1. **DATABASE_URL** - ใช้ TiDB connection string ที่คุณให้มา (ตรวจสอบแล้วว่าถูกต้อง)
2. **JWT_SECRET** - **ต้องสร้างใหม่** อย่าใช้ค่าเดิมจาก development
3. **KIE_API_KEY** - ใช้ค่าเดิม `kie-api-key-1` หรือ update ถ้ามี key ใหม่
4. **Auto-deployment** - Railway จะ deploy อัตโนมัติทุกครั้งที่ push code ไป GitHub

---

## ✅ Checklist

- [ ] Configure DATABASE_URL ใน Railway
- [ ] สร้างและ configure JWT_SECRET ใน Railway
- [ ] Configure NODE_ENV=production
- [ ] Configure KIE_API_KEY
- [ ] ตรวจสอบ GitHub integration
- [ ] รอ Railway auto-deploy
- [ ] ทดสอบ Register/Login ใน production
- [ ] ทดสอบ AI generation features

---

## 🎯 Next Steps After Deployment

1. **Custom Domain** - เพิ่ม custom domain ใน Railway Settings
2. **Monitoring** - ติดตั้ง monitoring tools (Sentry, LogRocket)
3. **Backup** - ตั้งค่า database backup schedule
4. **SSL Certificate** - Railway จัดการให้อัตโนมัติ (Let's Encrypt)
