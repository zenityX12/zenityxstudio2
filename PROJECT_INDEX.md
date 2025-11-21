# ZenityX AI Studio - Project Index

> **แผนที่โครงสร้างโปรเจค** - Quick reference สำหรับการค้นหาไฟล์และทำความเข้าใจ codebase  
> อัพเดทล่าสุด: 2025-01-19

---

## 📁 โครงสร้างไดเรกทอรีหลัก

```
zenityx-ai-studio-deploy/
├── client/              # Frontend (React 19 + Tailwind 4)
│   ├── public/          # Static assets
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable UI components
│       ├── contexts/    # React contexts
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilities & tRPC client
├── server/              # Backend (Express 4 + tRPC 11)
│   ├── _core/           # Framework plumbing (OAuth, context)
│   ├── routers.ts       # tRPC procedures
│   └── db.ts            # Database query helpers
├── drizzle/             # Database schema & migrations
│   └── schema.ts        # Table definitions
├── storage/             # S3 file storage helpers
└── shared/              # Shared constants & types
```

---

## 🗂️ ไฟล์สำคัญและหน้าที่

### 📊 Database Layer

| ไฟล์ | หน้าที่ | ข้อมูลสำคัญ |
|------|--------|-------------|
| `drizzle/schema.ts` | ประกาศโครงสร้างตาราง | ใช้ camelCase สำหรับชื่อ columns, มี users, conversations, messages, aiModels, verificationCodes |
| `server/db.ts` | Query helpers | ฟังก์ชันสำหรับ CRUD operations ที่ใช้ซ้ำได้ |

**ตารางในฐานข้อมูล:**
- `users` - ผู้ใช้งาน (OAuth, role: admin/user, isVerified)
- `conversations` - ห้องสนทนา (userId, title, createdAt)
- `messages` - ข้อความ (conversationId, role: user/assistant, content)
- `aiModels` - โมเดล AI ที่รองรับ (name, provider, capabilities)
- `verificationCodes` - รหัสยืนยันตัวตน (code, userId, expiresAt, isUsed)

### 🔌 Backend API Layer

| ไฟล์ | หน้าที่ | Procedures |
|------|--------|-----------|
| `server/routers.ts` | tRPC router หลัก | auth.me, auth.logout, system.notifyOwner |
| `server/_core/trpc.ts` | tRPC setup | publicProcedure, protectedProcedure, adminProcedure |
| `server/_core/context.ts` | Request context | สร้าง ctx.user จาก session cookie |
| `server/_core/llm.ts` | LLM integration | invokeLLM() สำหรับเรียก AI models |

**Pattern สำคัญ:**
- ใช้ `protectedProcedure` สำหรับ endpoints ที่ต้อง login
- ใช้ `adminProcedure` สำหรับ admin-only features
- Return Drizzle rows โดยตรง (superjson จัดการ Date/BigInt อัตโนมัติ)

### 🎨 Frontend Layer

| ไฟล์ | หน้าที่ | ใช้ร่วมกับ |
|------|--------|-----------|
| `client/src/App.tsx` | Route definitions & layout | wouter, ThemeProvider |
| `client/src/main.tsx` | App entry point | tRPC client setup |
| `client/src/lib/trpc.ts` | tRPC client binding | ใช้ `trpc.*` hooks ในทุก component |
| `client/src/const.ts` | Shared constants | APP_TITLE, APP_LOGO, getLoginUrl() |

**หน้าหลัก (Pages):**
- `pages/Home.tsx` - Landing page พร้อม features showcase
- `pages/NotFound.tsx` - 404 error page

**Components สำคัญ:**
- `components/ui/*` - shadcn/ui components (button, card, dialog, etc.)
- `components/ErrorBoundary.tsx` - Error handling wrapper
- `components/DashboardLayout.tsx` - Sidebar layout สำหรับ internal tools

**Hooks:**
- `hooks/useAuth.ts` - Authentication state (user, loading, isAuthenticated, logout)

**Contexts:**
- `contexts/ThemeContext.tsx` - Theme management (light/dark mode)

### 🔐 Authentication Flow

```
1. User clicks login → redirect to getLoginUrl()
2. OAuth callback at /api/oauth/callback → sets session cookie
3. Frontend calls trpc.auth.me.useQuery() → gets ctx.user
4. Protected procedures check ctx.user automatically
```

**ไฟล์ที่เกี่ยวข้อง:**
- `server/_core/oauth.ts` - OAuth callback handler
- `server/_core/cookies.ts` - Session cookie management
- `server/_core/context.ts` - User extraction from cookie

---

## 🎯 Feature Map

### Feature: User Authentication
- **Backend:** `server/routers.ts` (auth router), `server/db.ts` (upsertUser, getUserByOpenId)
- **Frontend:** `hooks/useAuth.ts`, `const.ts` (getLoginUrl)
- **Database:** `users` table

### Feature: AI Chat (Planned)
- **Backend:** conversation router, message router, ai router (ยังไม่ implement)
- **Frontend:** Chat interface, Conversations sidebar (ยังไม่ implement)
- **Database:** `conversations`, `messages`, `aiModels` tables (schema พร้อม, ยังไม่ push)

### Feature: Verification System
- **Backend:** `server/verifiedCodeService.ts` (generate, verify, cleanup codes)
- **Frontend:** ยังไม่ implement
- **Database:** `verificationCodes` table

---

## 🔧 Naming Conventions

| ประเภท | Convention | ตัวอย่าง |
|--------|-----------|---------|
| Database columns | camelCase | `userId`, `createdAt`, `isVerified` |
| tRPC procedures | camelCase | `auth.me`, `system.notifyOwner` |
| React components | PascalCase | `Home.tsx`, `ErrorBoundary.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth()`, `useTheme()` |
| Constants | UPPER_SNAKE_CASE | `APP_TITLE`, `COOKIE_NAME` |

---

## 🚀 Common Tasks

### เพิ่ม Feature ใหม่

**1. Database:**
```bash
# แก้ drizzle/schema.ts → เพิ่มตาราง/columns
pnpm db:push
```

**2. Backend:**
```typescript
// server/db.ts - เพิ่ม query helper
export async function getFeatureData(userId: number) { ... }

// server/routers.ts - เพิ่ม procedure
feature: router({
  list: protectedProcedure.query(({ ctx }) => getFeatureData(ctx.user.id)),
})
```

**3. Frontend:**
```typescript
// client/src/pages/Feature.tsx
const { data, isLoading } = trpc.feature.list.useQuery();
```

### ตรวจสอบ Database

```bash
# ดู schema ปัจจุบัน
pnpm db:studio

# หรือใช้ Management UI → Database panel
```

### Debug Authentication

```typescript
// ใน component ใดก็ได้
const { user, loading, error } = useAuth();
console.log('Current user:', user);
```

---

## 📦 Dependencies สำคัญ

**Frontend:**
- React 19 - UI framework
- Tailwind CSS 4 - Styling
- shadcn/ui - Component library
- wouter - Routing
- @tanstack/react-query - Data fetching
- @trpc/react-query - tRPC client

**Backend:**
- Express 4 - Web server
- tRPC 11 - Type-safe API
- Drizzle ORM - Database toolkit
- superjson - Serialization (Date, BigInt support)

---

## ⚠️ ข้อควรระวัง

1. **ห้ามเก็บไฟล์ใน database** - ใช้ S3 (`storage/`) แทน, เก็บแค่ URL/metadata ใน DB
2. **ห้าม nested `<a>` tags** - wouter `<Link>` render เป็น `<a>` อยู่แล้ว
3. **Infinite query loops** - ใช้ `useState`/`useMemo` สำหรับ object/array inputs
4. **Dark mode styling** - ตั้ง `defaultTheme` ใน App.tsx ก่อน, แล้วแก้ CSS variables ใน `index.css`
5. **TypeScript errors** - ตรวจสอบ type mismatches ระหว่าง schema กับ code

---

## 📝 เอกสารอ้างอิง

- **Template README:** `/README.md` - คู่มือการใช้งาน template
- **Architecture Decisions:** `/ARCHITECTURE.md` - เหตุผลการออกแบบ
- **Change History:** `/CHANGELOG.md` - ประวัติการแก้ไข
- **Task Tracking:** `/todo.md` - งานที่ต้องทำ

---

**หมายเหตุ:** ไฟล์นี้เป็น living document ควรอัพเดททุกครั้งที่มีการเพิ่ม feature ใหม่หรือเปลี่ยนโครงสร้างสำคัญ

