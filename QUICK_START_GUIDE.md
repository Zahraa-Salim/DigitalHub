# Student Profile API - Quick Start Guide

## 🚀 What Was Built

A complete backend API for managing student profiles in your admin dashboard with the following features:

### 3 New Endpoints

#### 1️⃣ **Fetch Student Profile** (Admin Only)
```
GET /profiles/students/:userId
Authorization: Bearer <admin-token>
```
Returns student profile with user data and all projects.

#### 2️⃣ **Update Student Profile** (Admin Only)
```
PATCH /profiles/students/:userId
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "bio": "Senior developer",
  "is_public": true,
  "public_slug": "john-doe",
  "featured": true,
  "featured_rank": 1,
  "is_graduated": true,
  "is_working": true,
  "company_work_for": "Tech Corp"
}
```
Updates profile with transaction support, validates slug uniqueness, logs admin action.

#### 3️⃣ **Get Public Student Profile** (Public - No Auth)
```
GET /profiles/public/students/:public_slug
```
Returns public profile view with only public projects.

---

## 📁 Files Created

### New Files
- `server/src/repositories/profiles.repository.ts` - Database queries (7 functions)
- `server/src/schemas/profiles.schema.ts` - Validation schemas (created but not used)
- `API_STUDENT_PROFILES_GUIDE.md` - Complete documentation
- `IMPLEMENTATION_SUMMARY.md` - Overview

### Updated Files
- `server/src/services/profiles.service.ts` - Added service functions
- `server/src/controllers/profiles.controller.ts` - Added HTTP handlers
- `server/src/routes/profiles.routes.ts` - Added route definitions
- `server/src/schemas/profiles.schemas.ts` - Added validation schemas

---

## 🔌 Integration Points

All routes are automatically available at `/profiles`:
- Admin endpoint: `GET /profiles/students/:userId`
- Admin endpoint: `PATCH /profiles/students/:userId`
- Public endpoint: `GET /profiles/public/students/:public_slug`

---

## 📊 Database

### Queries Implemented
✅ Fetch user + profile with JOIN
✅ Fetch student projects
✅ Fetch public profile by slug
✅ Check slug uniqueness  
✅ Update profile (dynamic fields)

### Data Relations
```
users (id) ←→ student_profiles (user_id)
users (id) ←→ projects (student_user_id)
```

---

## 🔐 Security

✅ JWT authentication (admin endpoints)
✅ Parameter validation (Zod schemas)
✅ SQL injection prevention (parameterized queries)
✅ Transaction safety (ACID compliant)
✅ Admin logging (action tracking)
✅ Slug uniqueness validation
✅ URL validation
✅ Character limits

---

## 🔄 Transaction Flow

### When updating profile:
1. ✅ Validate slug is unique
2. ✅ Begin database transaction
3. ✅ Update student_profiles table
4. ✅ Log admin action
5. ✅ Commit transaction
6. ✅ Fetch fresh data
7. ✅ Return response

If error → Automatic rollback

---

## 📋 Response Format

### Success
```json
{
  "success": true,
  "data": { "user": {...}, "profile": {...}, "projects": [...] },
  "message": "Student profile loaded successfully."
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Student profile not found.",
    "statusCode": 404
  }
}
```

---

## 🐛 Error Codes

- `PROFILE_NOT_FOUND` (404) - Student profile doesn't exist
- `USER_NOT_FOUND` (404) - User record not found
- `DUPLICATE_SLUG` (409) - Public slug already taken
- `INVALID_REQUEST` (400) - Missing required parameters
- `VALIDATION_ERROR` (400) - Invalid input data

---

## 📦 What Each Layer Does

```
ROUTES (profiles.routes.ts)
  ↓ Maps URL paths to handlers
  
CONTROLLERS (profiles.controller.ts)
  ↓ Handles HTTP request/response
  
SERVICES (profiles.service.ts)
  ↓ Business logic & transactions
  
REPOSITORIES (profiles.repository.ts)
  ↓ SQL queries
  
DATABASE (PostgreSQL)
  ↓ Data persistence
```

---

## 🧪 Quick Test

### 1. Fetch Student Profile
```bash
curl -X GET http://localhost:3000/profiles/students/123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Update Profile
```bash
curl -X PATCH http://localhost:3000/profiles/students/123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Doe",
    "bio": "Full-stack engineer",
    "is_public": true,
    "featured": true
  }'
```

### 3. View Public Profile
```bash
curl http://localhost:3000/profiles/public/students/jane-doe
```

---

## ✅ Implementation Status

- [x] Repository layer (7 functions)
- [x] Service layer (3 functions)
- [x] Controller layer (3 handlers)
- [x] Route layer (3 endpoints)
- [x] Schema validation (4 schemas)
- [x] Error handling
- [x] Transactions
- [x] Admin logging
- [x] SQL security
- [x] Routes registered in main app
- [ ] Frontend integration (Your turn!)

---

## 💡 Next Steps for Your Team

### 1. Dashboard Component
```tsx
// Fetch profile
const fetchStudentProfile = async (userId) => {
  const response = await fetch(`/profiles/students/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};

// Update profile
const updateProfile = async (userId, updates) => {
  const response = await fetch(`/profiles/students/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};
```

### 2. Public Website Integration
```tsx
// Get public profile
const fetchPublicProfile = async (slug) => {
  const response = await fetch(`/profiles/public/students/${slug}`);
  return response.json();
};
```

### 3. Project Listing
```tsx
// From profile response, get projects
const { projects } = profileData;
projects.forEach(project => {
  // Display project with student info
});
```

---

## 📚 Documentation

Complete documentation available in:
- **[API_STUDENT_PROFILES_GUIDE.md](./API_STUDENT_PROFILES_GUIDE.md)** - Full technical guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation overview

---

## 🎯 Key Features

✨ **Admin Dashboard**
- Load student profile with projects
- Edit all profile fields
- Save changes with validation
- Auto-refresh after update

✨ **Public Profile**
- View student public profile by slug
- See featured students
- Browse public projects only
- SEO-friendly URLs

✨ **Backend**
- Transaction support
- Admin logging
- Slug uniqueness validation
- SQL injection prevention
- Proper error handling
- Full validation

---

## 🚨 Important Notes

1. **Auth Required**: Admin endpoints need JWT token in Authorization header
2. **Public Slug**: Must be 3-50 chars, lowercase alphanumeric + hyphens only
3. **Uniqueness**: Each public_slug must be unique (checked on update)
4. **Transactions**: All updates are atomic (all-or-nothing)
5. **Logging**: Every admin action is logged for audit trail

---

## ✅ Ready to Deploy

The API is production-ready:
- ✅ Full error handling
- ✅ Input validation
- ✅ SQL security
- ✅ Transaction support
- ✅ Admin logging
- ✅ Proper HTTP status codes
- ✅ Consistent response format

---

## 🤝 Support

If you encounter issues:
1. Check error codes in response
2. Review validation schemas
3. Check admin logs for actions
4. Verify JWT token validity
5. Look at SQL queries in repository

---

**Everything is ready to use. Happy coding! 🚀**
