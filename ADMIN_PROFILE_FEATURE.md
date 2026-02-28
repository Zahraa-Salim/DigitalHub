# Admin Dashboard - My Profile Feature

## 📋 Overview

A simple, internal-only "My Profile" feature for admins to view and edit their profile information within the admin dashboard.

### Key Principles
- ✅ Dashboard only (no website, no public access)
- ✅ JWT protected (admin auth required)
- ✅ Direct database access (users + admin_profiles tables)
- ✅ Simple, clean implementation
- ✅ No overengineering

---

## 🔌 Backend Endpoints

### 1. GET /api/admins/me
**Purpose:** Fetch current admin's profile  
**Auth:** Required (JWT token)  
**Middleware:** `verifyAdminAuth`

**SQL Query:**
```sql
SELECT 
  u.id,
  u.email,
  u.phone,
  ap.full_name,
  ap.avatar_url,
  ap.bio,
  ap.job_title,
  ap.linkedin_url,
  ap.github_url,
  ap.portfolio_url
FROM users u
JOIN admin_profiles ap ON ap.user_id = u.id
WHERE u.id = $1;
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "admin@example.com",
    "phone": "+1234567890",
    "full_name": "John Admin",
    "avatar_url": "https://...",
    "bio": "Senior Admin",
    "job_title": "System Administrator",
    "linkedin_url": "https://linkedin.com/in/...",
    "github_url": "https://github.com/...",
    "portfolio_url": "https://..."
  },
  "message": "Profile loaded successfully."
}
```

---

### 2. PUT /api/admins/me
**Purpose:** Update current admin's profile  
**Auth:** Required (JWT token)  
**Middleware:** `verifyAdminAuth`, `validateRequest`

**Request Body:**
```json
{
  "full_name": "John Admin Updated",
  "phone": "+1234567890",
  "job_title": "Lead Administrator",
  "bio": "Experienced system admin",
  "avatar_url": "data:image/jpeg;base64,...or https://...",
  "linkedin_url": "https://linkedin.com/in/...",
  "github_url": "https://github.com/...",
  "portfolio_url": "https://..."
}
```

**SQL Operations:**
```sql
-- Update admin_profiles
UPDATE admin_profiles SET
  full_name = $1,
  avatar_url = $2,
  bio = $3,
  job_title = $4,
  linkedin_url = $5,
  github_url = $6,
  portfolio_url = $7,
  updated_at = NOW()
WHERE user_id = $8;

-- Update users (phone)
UPDATE users SET 
  phone = $1,
  updated_at = NOW()
WHERE id = $2;
```

**Response:** Same as GET /api/admins/me with updated data

---

## 📦 Backend Architecture

### Layers

**routes/admins.routes.ts**
```typescript
adminsRouter.get("/me", verifyAdminAuth, asyncHandler(getMe));
adminsRouter.put("/me", verifyAdminAuth, validateRequest({ body: updateMeBodySchema }), asyncHandler(patchMe));
```

**controllers/auth.controller.ts**
```typescript
async function getMe(req, res) {
  const data = await getMyAdminProfile(req.user.id);
  sendSuccess(res, data, "Profile loaded successfully.");
}

async function patchMe(req, res) {
  const data = await updateMyAdminProfile(req.user.id, req.body);
  sendSuccess(res, data, "Profile updated successfully.");
}
```

**services/auth.service.ts**
```typescript
export async function getMyAdminProfile(userId) {
  const result = await findAdminProfileByUserId(userId);
  if (!result.rowCount) {
    throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
  }
  return toAdminProfileResponse(result.rows[0]);
}

export async function updateMyAdminProfile(userId, payload) {
  // Transaction with:
  // - Validate user exists
  // - Update admin_profiles
  // - Update users table (phone)
  // - Log admin action
  // - Rollback on error
}
```

**repositories/auth.repo.ts**
```typescript
export async function findAdminProfileByUserId(userId, db = pool) {
  // Joins users + admin_profiles
}

export async function upsertAdminProfile(userId, input, db = pool) {
  // Inserts or updates admin_profiles
}
```

**schemas/auth.schemas.ts**
```typescript
export const updateMeBodySchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(3).optional(),
  job_title: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  avatar_url: avatarUrlSchema.optional(),
  linkedin_url: z.string().trim().url().optional(),
  github_url: z.string().trim().url().optional(),
  portfolio_url: z.string().trim().url().optional(),
}).strict();
```

---

## 🎨 Frontend - MyProfilePage.tsx

### Component Structure

**File:** `apps/dashboard/src/pages/admin/MyProfilePage.tsx`

### Features

1. **Profile Display**
   - Avatar (image or initials)
   - Full name
   - Email
   - Phone
   - Job title
   - Bio
   - Social links (LinkedIn, GitHub, Portfolio)
   - Role and status

2. **Edit Functionality**
   - Modal form for editing
   - All profile fields editable
   - Avatar upload support
   - Real-time form state
   - Save and cancel buttons

3. **Admin Management** (Super Admin Only)
   - List of other admins
   - Edit other admin profiles
   - Change roles and passwords
   - Toggle active status

### State Management

```typescript
type ProfileFormState = {
  full_name: string;
  phone: string;
  job_title: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
};

const [profile, setProfile] = useState<AdminProfile | null>(null);
const [form, setForm] = useState<ProfileFormState>(initialForm);
const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
const [loading, setLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
```

### Page Flow

1. **On Load**
   ```typescript
   useEffect(() => {
     const loadProfile = async () => {
       setLoading(true);
       try {
         const profile = await api<AdminProfile>("/api/admins/me");
         setProfile(profile);
         setForm(toFormState(profile));
       } catch (err) {
         setError("Failed to load profile.");
       } finally {
         setLoading(false);
       }
     };
     loadProfile();
   }, []);
   ```

2. **Edit Mode**
   - Click "Edit Profile" button
   - Modal opens with form fields
   - Form state updates as user types
   - Avatar upload support

3. **Save**
   ```typescript
   const saveProfile = async () => {
     const payload = {
       full_name: form.full_name.trim(),
       phone: form.phone.trim(),
       job_title: form.job_title.trim(),
       bio: form.bio.trim(),
       avatar_url: form.avatar_url.trim(),
       linkedin_url: form.linkedin_url.trim(),
       github_url: form.github_url.trim(),
       portfolio_url: form.portfolio_url.trim(),
     };
     
     try {
       const updated = await api<AdminProfile>("/api/admins/me", {
         method: "PUT",
         body: JSON.stringify(payload),
       });
       setProfile(updated);
       setForm(toFormState(updated));
       setIsEditProfileOpen(false);
       setSuccess("Profile updated successfully.");
     } catch (err) {
       setError("Failed to update profile.");
     }
   };
   ```

---

## 📊 Database

### Tables Used

**users**
```sql
id (PK)
email (UNIQUE)
phone (UNIQUE)
password_hash
is_admin
is_active
created_at
updated_at
```

**admin_profiles**
```sql
user_id (PK, FK → users.id)
full_name
avatar_url
bio
job_title
linkedin_url
github_url
portfolio_url
admin_role
is_public
sort_order
created_at
updated_at
```

### Relations
```
users.id ←→ admin_profiles.user_id
```

---

## ✨ Features

### Display Information
- Avatar (image or initials fallback)
- Full name
- Email address
- Phone number
- Job title
- Bio/description
- Social media links
- Admin role
- Account status

### Edit Fields
- ✅ Full name
- ✅ Phone
- ✅ Job title
- ✅ Bio
- ✅ Avatar (upload or URL)
- ✅ LinkedIn URL
- ✅ GitHub URL
- ✅ Portfolio URL

### Special Features
- Avatar upload with image compression
- Support for data URLs and external URLs
- Validation for all inputs
- Error handling and user feedback
- Success notifications
- Real-time form updates
- Transaction support (all-or-nothing updates)
- Admin action logging

---

## 🔐 Security

✅ **Authentication**
- JWT token required
- verifyAdminAuth middleware

✅ **Authorization**
- Admins can only edit their own profile
- Super admins can manage other admins

✅ **Validation**
- Zod schema validation
- Field type checking
- URL validation
- Character limits

✅ **Data Protection**
- Parameterized SQL queries
- Transaction rollback on error
- Admin action logging
- Updated timestamps

---

## 🔄 User Flow

```
1. Admin navigates to "My Profile" page
   ↓
2. Page loads profile from GET /api/admins/me
   ├─ Fetch admin user data
   ├─ Fetch admin_profiles data
   └─ Display in profile card
   ↓
3. Admin clicks "Edit Profile"
   ↓
4. Modal form opens with current data
   ├─ All fields pre-populated
   └─ Ready for editing
   ↓
5. Admin makes changes
   ├─ Form state updates in real-time
   └─ Can upload new avatar
   ↓
6. Admin clicks "Save Profile"
   ↓
7. PUT /api/admins/me is called
   ├─ Backend validates payload
   ├─ Updates admin_profiles
   ├─ Updates users (phone)
   ├─ Logs admin action
   └─ Returns updated profile
   ↓
8. Frontend updates state
   ├─ Profile card refreshes
   ├─ Modal closes
   ├─ Success message shown
   └─ Ready for next edit
```

---

## 📋 Validation Rules

| Field | Rules |
|-------|-------|
| full_name | 1-120 chars, required when saving |
| phone | 3+ chars, phone format |
| job_title | 0-120 chars |
| bio | 0-2000 chars |
| avatar_url | Valid URL or data URL |
| linkedin_url | Valid URL |
| github_url | Valid URL |
| portfolio_url | Valid URL |

---

## 🐛 Error Handling

### Backend Errors
- `404 USER_NOT_FOUND` - Admin user not found
- `400 VALIDATION_ERROR` - Invalid input data
- `500 SERVER_ERROR` - Unexpected error

### Frontend Errors
- Displayed in alert boxes
- User-friendly messages
- Form remains editable for retry

### Error Recovery
- Automatic rollback on database error
- User can retry operation
- Previous data preserved

---

## 🚀 Usage

### Access the Page
```
http://localhost:5173/admin/profile
```

### API Calls

**Get profile:**
```bash
curl -X GET http://localhost:3000/api/admins/me \
  -H "Authorization: Bearer <token>"
```

**Update profile:**
```bash
curl -X PUT http://localhost:3000/api/admins/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Admin",
    "phone": "+1234567890",
    "bio": "Senior Administrator"
  }'
```

---

## ✅ Implementation Checklist

- [x] Backend: GET /api/admins/me endpoint
- [x] Backend: PUT /api/admins/me endpoint
- [x] Backend: Phone field support in schema
- [x] Backend: Phone update in service
- [x] Backend: Transaction support
- [x] Backend: Admin logging
- [x] Frontend: MyProfilePage component
- [x] Frontend: Profile display card
- [x] Frontend: Edit modal form
- [x] Frontend: State management
- [x] Frontend: Phone field in form
- [x] Frontend: Save functionality
- [x] Error handling: Both sides
- [x] Validation: Both sides

---

## 📝 Summary

The "My Profile" feature is a simple, secure, and intuitive way for admins to manage their own profile within the admin dashboard. It follows clean layered architecture, uses proper validation and error handling, and provides a great user experience with real-time updates.

**Everything is ready to use immediately!**
