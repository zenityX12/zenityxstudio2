# New Authentication System Design

## 🎯 Overview

สร้างระบบ authentication ที่**ไม่ต้องพึ่ง Manus OAuth** โดยใช้:
- **Email/Password** authentication (primary)
- **Google OAuth** (optional, future enhancement)
- **JWT** สำหรับ session management
- **TiDB database** สำหรับเก็บข้อมูล users

---

## 📊 Database Schema

### Table: `users`

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  email VARCHAR(255) UNIQUE NOT NULL,   -- Email (unique)
  password_hash VARCHAR(255),           -- bcrypt hashed password (nullable for OAuth users)
  name VARCHAR(255),                    -- Display name
  avatar_url TEXT,                      -- Profile picture URL
  credits INT DEFAULT 100,              -- Free credits for new users
  auth_provider VARCHAR(50) DEFAULT 'email', -- 'email' | 'google'
  google_id VARCHAR(255),               -- Google OAuth ID (nullable)
  email_verified BOOLEAN DEFAULT FALSE, -- Email verification status
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  
  INDEX idx_email (email),
  INDEX idx_google_id (google_id)
);
```

### Table: `sessions` (optional, for refresh tokens)

```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_refresh_token (refresh_token)
);
```

---

## 🔐 Authentication Flow

### 1. Register (Email/Password)

**Endpoint**: `POST /api/auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Process**:
1. Validate email format
2. Check if email already exists
3. Hash password with bcrypt (salt rounds: 10)
4. Create user in database
5. Generate JWT access token
6. Return user data + token

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 100
  },
  "token": "jwt_access_token"
}
```

### 2. Login (Email/Password)

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Process**:
1. Find user by email
2. Compare password with bcrypt
3. Update last_login_at
4. Generate JWT access token
5. Return user data + token

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 100
  },
  "token": "jwt_access_token"
}
```

### 3. Logout

**Endpoint**: `POST /api/auth/logout`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Process**:
1. Verify JWT token
2. (Optional) Invalidate refresh token in sessions table
3. Return success

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4. Get Current User

**Endpoint**: `GET /api/auth/me`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Process**:
1. Verify JWT token
2. Extract user_id from token
3. Fetch user from database
4. Return user data

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 100
  }
}
```

---

## 🔑 JWT Token Structure

### Access Token (expires in 7 days)

**Payload**:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Secret**: Generate random secret (32 characters)

---

## 🛡️ Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Expiration**: 7 days (configurable)
3. **Email Validation**: Regex pattern
4. **Password Requirements**:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
5. **Rate Limiting**: Max 5 login attempts per minute per IP
6. **HTTPS Only**: In production

---

## 📱 Frontend Integration

### 1. Login Page (`/login`)

- Email input
- Password input
- "Remember me" checkbox
- "Forgot password?" link (future)
- "Sign up" link
- Google Sign In button (future)

### 2. Register Page (`/register`)

- Name input
- Email input
- Password input
- Confirm password input
- Terms & conditions checkbox
- "Sign in" link

### 3. Auth Context

```typescript
interface AuthContext {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
```

### 4. Protected Routes

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}
```

---

## 🚀 Implementation Plan

### Phase 1: Database Schema
- [x] Design users table
- [ ] Create Drizzle schema
- [ ] Run migration

### Phase 2: Backend API
- [ ] Install dependencies (bcrypt, jsonwebtoken)
- [ ] Create auth utilities (hash, compare, generateToken, verifyToken)
- [ ] Implement register endpoint
- [ ] Implement login endpoint
- [ ] Implement logout endpoint
- [ ] Implement /me endpoint
- [ ] Add authentication middleware

### Phase 3: Frontend UI
- [ ] Create AuthContext
- [ ] Create Login page
- [ ] Create Register page
- [ ] Create ProtectedRoute component
- [ ] Update navigation (show user menu when logged in)
- [ ] Add logout button

### Phase 4: Testing
- [ ] Test register flow
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test protected routes
- [ ] Test token expiration

### Phase 5: Deployment
- [ ] Add JWT_SECRET to Railway environment variables
- [ ] Deploy to Railway
- [ ] Test in production

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7"
  }
}
```

---

## 🎨 UI Design

### Login Page
- Clean, modern design
- Centered card layout
- ZenityX AI Studio branding
- Email/password inputs with icons
- Primary CTA button
- Link to register page

### Register Page
- Similar to login page
- Additional name input
- Password strength indicator
- Terms & conditions checkbox

---

## 🔄 Migration from Manus OAuth

### Current Users
- No existing users in database (fresh start)
- All users will register with new system

### Future Enhancement
- Add Google OAuth as alternative login method
- Keep email/password as primary method

---

## ✅ Success Criteria

1. Users can register with email/password
2. Users can login with email/password
3. Users can logout
4. JWT tokens work correctly
5. Protected routes redirect to login
6. User session persists across page refreshes
7. System works in both dev and production (Railway)

---

**Created**: 22 Nov 2025  
**Status**: Design Complete - Ready for Implementation
