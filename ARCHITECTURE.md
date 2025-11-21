# ZenityX AI Studio - Architecture Decisions

> **บันทึกการตัดสินใจด้านสถาปัตยกรรมและเทคนิค** - เหตุผลเบื้องหลังการออกแบบระบบ  
> อัพเดทล่าสุด: 2025-01-19

---

## 🎯 ภาพรวมโปรเจค

**ZenityX AI Studio** เป็น web application สำหรับให้บริการ AI chat interface ที่รองรับหลายโมเดล AI โดยมีเป้าหมายหลักคือ:

1. ให้ผู้ใช้สามารถสนทนากับ AI models ต่างๆ ผ่าน web interface ที่ใช้งานง่าย
2. เก็บประวัติการสนทนาและจัดการ conversations
3. รองรับระบบยืนยันตัวตนสำหรับผู้ใช้พิเศษ
4. ขยายไปสู่ features เพิ่มเติมในอนาคต (image generation, voice input, etc.)

---

## 🏗️ Technology Stack

### Frontend Stack

**React 19 + Tailwind CSS 4 + shadcn/ui**

เลือกใช้เพราะ:
- **React 19** มี performance improvements และ concurrent features ที่เหมาะกับ real-time chat
- **Tailwind CSS 4** ให้ flexibility สูงในการออกแบบ UI โดยไม่ต้องเขียน CSS แยก
- **shadcn/ui** เป็น component library ที่ copy-paste ได้ ปรับแต่งง่าย ไม่ lock-in กับ package

**Routing: wouter**

เลือกใช้แทน react-router เพราะ:
- น้ำหนักเบา (1.5KB gzipped)
- API เรียบง่าย เหมาะกับ SPA ขนาดเล็ก-กลาง
- รองรับ hooks-based routing

### Backend Stack

**Express 4 + tRPC 11 + Drizzle ORM**

เลือกใช้เพราะ:
- **tRPC** ให้ end-to-end type safety โดยไม่ต้องเขียน API contract แยก
- **superjson** serialization รองรับ Date, BigInt, undefined ทำให้ส่งข้อมูลจาก DB ได้โดยตรง
- **Drizzle ORM** เป็น TypeScript-first ORM ที่ให้ type inference ดี และ migration workflow ที่ชัดเจน

**Database: MySQL/TiDB**

เลือกใช้เพราะ:
- รองรับ relational data model ที่เหมาะกับโครงสร้าง users → conversations → messages
- TiDB ให้ horizontal scalability ในอนาคต
- Drizzle มี MySQL dialect ที่ stable

---

## 🗄️ Database Design Decisions

### 1. User Table Schema

```typescript
users {
  id: int (PK, auto-increment)
  openId: varchar(64) (unique, not null)  // Manus OAuth ID
  name: text
  email: varchar(320)
  loginMethod: varchar(64)
  role: enum('user', 'admin')
  isVerified: tinyint (default 1)
  createdAt: timestamp
  updatedAt: timestamp
  lastSignedIn: timestamp
}
```

**การตัดสินใจสำคัญ:**

- **ใช้ `id` เป็น surrogate key แทน `openId`** เพราะ:
  - `openId` เป็น string ยาว ใช้เป็น foreign key จะทำให้ index ใหญ่
  - `id` เป็น int ประหยัดพื้นที่และเร็วกว่าในการ join
  - `openId` ยังคง unique constraint สำหรับ OAuth lookup

- **`isVerified` เป็น tinyint แทน boolean** เพราะ:
  - MySQL ไม่มี native boolean type (จะแปลงเป็น tinyint อยู่แล้ว)
  - ใช้ 1 = verified, 0 = not verified
  - **Default เป็น 1** เพราะผู้ใช้ทั่วไปที่ login ผ่าน OAuth ถือว่ายืนยันตัวตนแล้ว
  - Verification system ใช้สำหรับ special cases เท่านั้น

- **`role` เป็น enum แทน string** เพราะ:
  - บังคับค่าที่เป็นไปได้ที่ database level
  - ประหยัดพื้นที่กว่า varchar
  - ป้องกัน typo และ invalid values

### 2. Conversations & Messages Schema

```typescript
conversations {
  id: int (PK, auto-increment)
  userId: int (FK → users.id)
  title: varchar(255)
  createdAt: timestamp
  updatedAt: timestamp
}

messages {
  id: int (PK, auto-increment)
  conversationId: int (FK → conversations.id)
  role: enum('user', 'assistant', 'system')
  content: text
  createdAt: timestamp
}
```

**การตัดสินใจสำคัญ:**

- **แยก conversations และ messages เป็น 2 ตาราง** เพราะ:
  - 1 conversation มีหลาย messages (1:N relationship)
  - สามารถ query conversations list ได้เร็วโดยไม่ต้อง load messages ทั้งหมด
  - ลบ conversation ได้โดยไม่ต้อง delete messages ทีละ row (ใช้ CASCADE)

- **`role` เป็น enum** เพื่อรองรับ:
  - `user` - ข้อความจากผู้ใช้
  - `assistant` - ข้อความจาก AI
  - `system` - system prompts หรือ metadata (future use)

- **`content` เป็น text แทน varchar** เพราะ:
  - ข้อความจาก AI อาจยาวมาก (> 65KB)
  - text รองรับได้ถึง 64KB, mediumtext ถึง 16MB

### 3. AI Models Table

```typescript
aiModels {
  id: int (PK, auto-increment)
  name: varchar(100)
  provider: varchar(50)
  modelId: varchar(100)
  capabilities: text (JSON)
  isActive: tinyint (default 1)
  createdAt: timestamp
}
```

**การตัดสินใจสำคัญ:**

- **เก็บ model metadata ใน database** แทน hardcode ใน code เพราะ:
  - สามารถเพิ่ม/ปิด models ได้โดยไม่ต้อง deploy code ใหม่
  - Admin สามารถจัดการผ่าน UI ได้
  - Track usage statistics ได้ง่าย

- **`capabilities` เป็น JSON text** เพราะ:
  - แต่ละ model มี capabilities ต่างกัน (text, image, function calling)
  - ไม่ต้องสร้าง columns เพิ่มทุกครั้งที่มี capability ใหม่
  - Drizzle รองรับ JSON parsing อัตโนมัติ

### 4. Verification Codes Table

```typescript
verificationCodes {
  id: int (PK, auto-increment)
  code: varchar(10) (unique)
  createdBy: int (FK → users.id)
  expiresAt: timestamp
  isUsed: tinyint (default 0)
  usedBy: int (FK → users.id, nullable)
  usedAt: timestamp (nullable)
  usedCount: int (default 0)
  createdAt: timestamp
}
```

**การตัดสินใจสำคัญ:**

- **แยกตาราง verification codes** แทนเก็บใน users table เพราะ:
  - 1 user สามารถสร้างหลาย codes ได้
  - Track usage history และ expiration ได้ชัดเจน
  - สามารถ cleanup expired codes ได้โดยไม่กระทบ users

- **`isUsed` เป็น tinyint** แทน boolean (เหตุผลเดียวกับ `isVerified`)

- **มีทั้ง `usedBy` และ `usedCount`** เพราะ:
  - อาจรองรับ multi-use codes ในอนาคต
  - Track ว่า code ถูกใช้โดยใครบ้าง

---

## 🔐 Authentication & Authorization

### OAuth Flow

**ใช้ Manus OAuth** แทนสร้างระบบ auth เอง เพราะ:
- ลด complexity ในการจัดการ passwords, sessions, security
- Manus platform จัดการ OAuth callback และ session cookies ให้
- ผู้ใช้สามารถใช้ account เดียวกันกับ Manus ecosystem

**Session Management:**
- ใช้ HTTP-only cookies แทน localStorage/sessionStorage
- Cookie signed ด้วย JWT_SECRET
- Context middleware (`server/_core/context.ts`) extract user จาก cookie ทุก request

### Role-Based Access Control (RBAC)

**2 roles หลัก:**
- `user` - ผู้ใช้ทั่วไป
- `admin` - ผู้ดูแลระบบ (owner + promoted users)

**Implementation:**
```typescript
// server/_core/trpc.ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

**Owner Auto-Promotion:**
- User ที่มี `openId === ENV.ownerOpenId` จะได้ role `admin` อัตโนมัติ
- Logic อยู่ใน `upsertUser()` function

---

## 🎨 Frontend Architecture

### Component Organization

```
components/
├── ui/              # shadcn/ui primitives (button, card, dialog)
├── DashboardLayout  # Sidebar layout wrapper
└── ErrorBoundary    # Global error handler
```

**หลักการ:**
- **Atomic Design** - เริ่มจาก primitives (`ui/*`) → compose เป็น features
- **Colocation** - Feature-specific components อยู่ใน `pages/` เดียวกัน
- **Reusability** - Extract ออกมาเป็น `components/*` เมื่อใช้ซ้ำ ≥ 2 ที่

### State Management

**ไม่ใช้ Redux/Zustand** เพราะ:
- tRPC + React Query จัดการ server state ได้ดีแล้ว
- Local UI state ใช้ `useState` / `useReducer` เพียงพอ
- Global state ใช้ Context API (เช่น ThemeContext, AuthContext)

**Data Fetching Pattern:**
```typescript
// ✅ Good: tRPC handles caching, refetching, optimistic updates
const { data, isLoading } = trpc.feature.list.useQuery();

// ❌ Bad: Manual fetch + useState
const [data, setData] = useState([]);
useEffect(() => { fetch(...).then(setData) }, []);
```

### Styling Strategy

**Tailwind Utility-First + CSS Variables**

```css
/* index.css - Design tokens */
:root {
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.45 0.15 250);
  /* ... */
}
```

**หลักการ:**
- ใช้ CSS variables สำหรับ colors, spacing, typography
- Tailwind utilities สำหรับ layout และ responsive design
- Custom CSS เฉพาะกรณีที่ Tailwind ทำไม่ได้ (animations, complex selectors)

**Dark Mode:**
- ใช้ class-based strategy (`.dark` class)
- ThemeProvider จัดการ theme switching
- CSS variables แยกชุดสำหรับ light/dark

---

## 🔌 API Design (tRPC)

### Procedure Types

| Type | Use Case | Example |
|------|----------|---------|
| `publicProcedure` | ไม่ต้อง login | `auth.me` (check session) |
| `protectedProcedure` | ต้อง login | `conversation.list` |
| `adminProcedure` | ต้องเป็น admin | `admin.manageUsers` |

### Input Validation

**ใช้ Zod schemas** สำหรับทุก procedure input:

```typescript
createConversation: protectedProcedure
  .input(z.object({
    title: z.string().min(1).max(255),
  }))
  .mutation(async ({ ctx, input }) => { ... })
```

**เหตุผล:**
- Type safety ที่ runtime (ไม่ใช่แค่ compile time)
- Auto-generate TypeScript types
- Clear error messages สำหรับ invalid inputs

### Error Handling

**ใช้ TRPCError แทน throw Error:**

```typescript
throw new TRPCError({
  code: 'NOT_FOUND',  // Standard HTTP-like codes
  message: 'Conversation not found',
});
```

**Error codes ที่ใช้:**
- `UNAUTHORIZED` - ไม่ได้ login
- `FORBIDDEN` - login แล้วแต่ไม่มีสิทธิ์
- `NOT_FOUND` - resource ไม่มีอยู่
- `BAD_REQUEST` - input ไม่ถูกต้อง
- `INTERNAL_SERVER_ERROR` - unexpected errors

---

## 📁 File Storage Strategy

**ใช้ S3 สำหรับไฟล์ทุกประเภท** (images, audio, documents)

**ห้ามเก็บไฟล์ใน database** เพราะ:
- Database bloat → slow queries
- Backup/restore ช้า
- ไม่ scale ได้

**Pattern:**
```typescript
// 1. Upload to S3
const { url } = await storagePut(
  `${userId}/files/${filename}-${randomId()}.png`,
  fileBuffer,
  'image/png'
);

// 2. Save metadata to DB
await db.insert(files).values({
  userId,
  url,
  filename,
  mimeType: 'image/png',
  size: fileBuffer.length,
});
```

**Security:**
- S3 bucket เป็น public (URLs ใช้งานได้โดยตรง)
- ใช้ random suffixes ใน file keys เพื่อป้องกัน enumeration
- Authorization check ที่ API level (ไม่ใช่ S3 level)

---

## 🚀 Performance Considerations

### Database Indexing

**Indexes ที่สร้างไว้:**
- `users.openId` (unique) - สำหรับ OAuth lookup
- `conversations.userId` - สำหรับ list user's conversations
- `messages.conversationId` - สำหรับ load messages in conversation
- `verificationCodes.code` (unique) - สำหรับ verify code

### Query Optimization

**N+1 Query Prevention:**
```typescript
// ❌ Bad: N+1 queries
const conversations = await db.select().from(conversations);
for (const conv of conversations) {
  conv.messages = await db.select().from(messages)
    .where(eq(messages.conversationId, conv.id));
}

// ✅ Good: Single query with join
const result = await db.select()
  .from(conversations)
  .leftJoin(messages, eq(messages.conversationId, conversations.id));
```

### Frontend Optimization

**Code Splitting:**
- Pages lazy-loaded ด้วย React.lazy() (future)
- shadcn/ui components tree-shakeable

**React Query Caching:**
- Default stale time: 0 (always refetch)
- Cache time: 5 minutes
- Optimistic updates สำหรับ mutations

---

## 🔒 Security Considerations

### Input Sanitization

**XSS Prevention:**
- React escape HTML โดยอัตโนมัติ
- ใช้ `dangerouslySetInnerHTML` เฉพาะกรณีที่จำเป็น (markdown rendering)
- Sanitize HTML ด้วย DOMPurify ก่อน render

**SQL Injection Prevention:**
- ใช้ Drizzle ORM parameterized queries
- ห้าม string concatenation ใน SQL

### Rate Limiting

**ยังไม่ implement** แต่วางแผนไว้:
- API rate limiting ด้วย express-rate-limit
- Per-user quotas สำหรับ AI requests
- CAPTCHA สำหรับ public endpoints

### CORS & CSRF

**CORS:**
- Backend อนุญาตเฉพาะ frontend domain
- Credentials: include (สำหรับ cookies)

**CSRF:**
- SameSite cookies (Lax/Strict)
- HTTP-only cookies ป้องกัน XSS

---

## 🧪 Testing Strategy

### Current State

**ยังไม่มี automated tests** เพราะ:
- โปรเจคยังอยู่ใน early stage
- Focus ที่ feature development ก่อน

### Planned Testing

**Unit Tests (Vitest):**
- Database helpers (`server/db.ts`)
- Utility functions
- React hooks

**Integration Tests:**
- tRPC procedures end-to-end
- Authentication flow
- Database migrations

**E2E Tests (Playwright):**
- Critical user flows (login, chat, create conversation)
- Cross-browser testing

---

## 📊 Monitoring & Observability

### Logging

**Current:**
- Console.log สำหรับ development
- Error logging ใน ErrorBoundary

**Planned:**
- Structured logging ด้วย winston/pino
- Log aggregation (Datadog/Sentry)
- Performance monitoring

### Analytics

**Built-in:**
- Manus Analytics (UV/PV tracking)
- Environment variables: `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`

**Custom Events:**
- Track AI model usage
- Conversation creation
- User actions

---

## 🔄 Migration Strategy

### Database Migrations

**Workflow:**
```bash
# 1. แก้ schema
vim drizzle/schema.ts

# 2. Generate migration
pnpm db:push

# 3. Verify in database
pnpm db:studio
```

**Best Practices:**
- ใช้ `db:push` สำหรับ development (auto-migrate)
- ใช้ `drizzle-kit generate` + `migrate` สำหรับ production
- ห้าม drop columns ที่มีข้อมูล (ใช้ rename หรือ deprecate)

### Code Migrations

**Breaking Changes:**
- Version API endpoints (`/api/v1/`, `/api/v2/`)
- Maintain backward compatibility อย่างน้อย 1 version
- Deprecation warnings ก่อน remove features

---

## 🎯 Future Considerations

### Scalability

**Horizontal Scaling:**
- Stateless backend (session ใน database/Redis แทน memory)
- Load balancer สำหรับหลาย instances
- CDN สำหรับ static assets

**Database Scaling:**
- Read replicas สำหรับ heavy read workloads
- Sharding by userId (ถ้าจำเป็น)
- TiDB auto-scaling

### Feature Roadmap

**Phase 2:**
- Image generation integration
- Voice input/output
- Multi-modal conversations

**Phase 3:**
- Team workspaces
- Conversation sharing
- API access สำหรับ developers

---

## 📚 References

- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
- [React 19 Release Notes](https://react.dev/blog/2024/04/25/react-19)

---

**หมายเหตุ:** เอกสารนี้ควรอัพเดททุกครั้งที่มีการตัดสินใจด้านสถาปัตยกรรมที่สำคัญ หรือเปลี่ยนแปลง technical approach

