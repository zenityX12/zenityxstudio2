# ZenityX AI Studio - Changelog

> **ประวัติการเปลี่ยนแปลงสำคัญ** - บันทึกเหตุการณ์และ milestones ของโปรเจค  
> Format: [YYYY-MM-DD] - รายละเอียด

---

## [2025-01-19] - Project Documentation System

### Added
- สร้างระบบจัดการความรู้โปรเจคด้วย 3 ไฟล์หลัก:
  - `PROJECT_INDEX.md` - แผนที่โครงสร้างโปรเจคและ quick reference
  - `ARCHITECTURE.md` - บันทึกการตัดสินใจด้านสถาปัตยกรรมและเทคนิค
  - `CHANGELOG.md` - ประวัติการเปลี่ยนแปลงตามลำดับเวลา

### Purpose
- ลดปัญหาการลืม context และการตัดสินใจสำคัญในโปรเจคขนาดใหญ่
- ให้ AI agent และ developers สามารถทำความเข้าใจโปรเจคได้เร็วขึ้น
- เก็บประวัติการเปลี่ยนแปลงเพื่อ reference ในอนาคต

---

## [2025-01-19] - Homepage UI Improvements

### Added
- เพิ่มปุ่ม CTA "เริ่มใช้งานฟรี" ในส่วน Features (โมเดล AI ที่ทรงพลัง)
- เพิ่มปุ่ม CTA "เริ่มต้นใช้งาน" ในส่วน About (เกี่ยวกับ ZenityX)

### Changed
- ปรับปรุง UX ของ landing page ให้มี call-to-action ชัดเจนขึ้น

---

## [2025-01-19] - User Verification System

### Added
- เพิ่มฟิลด์ `isVerified` ใน `users` table schema
- สร้างตาราง `verificationCodes` สำหรับระบบยืนยันตัวตน
- สร้าง `verifiedCodeService.ts` สำหรับจัดการ verification codes

### Changed
- ตั้งค่า default value ของ `isVerified` เป็น 1 (verified) เพราะผู้ใช้ที่ login ผ่าน OAuth ถือว่ายืนยันตัวตนแล้ว
- อัปเดตผู้ใช้ที่มีอยู่แล้วในฐานข้อมูลให้มีสถานะ verified

### Technical Details
- Verification system ใช้สำหรับ special cases เท่านั้น (เช่น invite codes, premium features)
- Codes มี expiration time และ track usage history

---

## [2025-01-18] - Database Schema Setup

### Added
- สร้าง database schema ใน `drizzle/schema.ts`:
  - `users` - ผู้ใช้งาน (OAuth integration, role-based access)
  - `conversations` - ห้องสนทนา
  - `messages` - ข้อความในแต่ละ conversation
  - `aiModels` - โมเดล AI ที่รองรับ
  - `verificationCodes` - รหัสยืนยันตัวตน

### Changed
- แก้ไข `upsertUser` function ใน `server/db.ts` ให้ตรงกับ schema
- เพิ่ม query helpers สำหรับ user management

### Technical Details
- ใช้ camelCase สำหรับ column names
- ใช้ int เป็น surrogate key แทน string IDs
- ใช้ enum types สำหรับ role และ message.role

---

## [2025-01-18] - Project Initialization

### Added
- Initialize project ด้วย Manus web-db-user template
- Setup tRPC + React + Tailwind + Drizzle stack
- Configure OAuth authentication ด้วย Manus OAuth
- Setup development environment

### Features Enabled
- **Server**: Express backend with tRPC
- **Database**: MySQL/TiDB with Drizzle ORM
- **User Auth**: Manus OAuth integration with role-based access

### Initial Structure
- Frontend: React 19 + Tailwind CSS 4 + shadcn/ui
- Backend: Express 4 + tRPC 11 + superjson
- Database: Drizzle ORM with MySQL dialect
- Routing: wouter (lightweight React router)

---

## Migration Notes

### Database Migrations
- **2025-01-19**: Added `isVerified` field to users table (default: 1)
- **2025-01-19**: Created `verificationCodes` table
- **2025-01-18**: Initial schema creation (users, conversations, messages, aiModels)

### Breaking Changes
- None yet (project in early development)

---

## Known Issues

### TypeScript Errors (2025-01-19)
- 77 TypeScript errors detected in `server/verifiedCodeService.ts`
- Issues:
  1. Type mismatch in verification code insertion (unknown 'id' property)
  2. Boolean assigned to number field (`isUsed` should be 0/1, not true/false)
- **Status**: Pending fix
- **Impact**: Development only (not affecting runtime)

---

## Upcoming Features

### Phase 1 (In Progress)
- [ ] Implement conversation management (create, list, delete)
- [ ] Implement message handling (send, list)
- [ ] Integrate AI chat completion with streaming
- [ ] Build chat interface UI
- [ ] Add conversations sidebar

### Phase 2 (Planned)
- [ ] Image generation integration
- [ ] Voice input/output
- [ ] Multi-modal conversations
- [ ] Conversation sharing

### Phase 3 (Future)
- [ ] Team workspaces
- [ ] API access for developers
- [ ] Advanced analytics
- [ ] Custom AI model training

---

## Checkpoints

| Date | Version | Description |
|------|---------|-------------|
| 2025-01-18 | `c4acdbc4` | Initial project setup with database schema |

---

## Performance Metrics

### Current Status
- **Build Time**: ~5-10 seconds
- **Dev Server Start**: ~2-3 seconds
- **Database Queries**: Not yet optimized (no indexes beyond primary keys)

### Optimization Targets
- Add database indexes for frequently queried fields
- Implement React Query caching strategies
- Add code splitting for pages

---

## Security Updates

### 2025-01-18
- Enabled HTTP-only cookies for session management
- Configured CORS for frontend domain only
- Setup JWT secret for cookie signing

### Pending
- [ ] Implement rate limiting
- [ ] Add CAPTCHA for public endpoints
- [ ] Setup CSP headers
- [ ] Add request logging

---

## Dependencies Updates

### Major Dependencies
- React: 19.0.0
- Tailwind CSS: 4.0.0
- tRPC: 11.x
- Drizzle ORM: latest
- Express: 4.x

### Last Updated
- 2025-01-18: Initial installation

---

**หมายเหตุ:** 
- ไฟล์นี้ควรอัพเดทหลังจาก save checkpoint หรือเมื่อมีการเปลี่ยนแปลงสำคัญ
- ใช้ format `[YYYY-MM-DD]` สำหรับวันที่เพื่อความสม่ำเสมอ
- เรียงลำดับจากใหม่ไปเก่า (reverse chronological order)

