# Student Profile Management API - Full Implementation Guide

## Overview
Complete API flow for admin dashboard profile management with database integration, transactions, and public profile access.

---

## Architecture Layers

```
ROUTES (profiles.routes.ts)
  ↓
CONTROLLERS (profiles.controller.ts) - HTTP handlers
  ↓
SERVICES (profiles.service.ts) - Business logic & transactions
  ↓
REPOSITORIES (profiles.repository.ts) - SQL queries
  ↓
DATABASE (PostgreSQL)
```

---

## API Endpoints

### 1. Admin: Fetch Student Profile
**Endpoint:** `GET /profiles/students/:userId`  
**Auth:** Required (Admin)  
**Description:** Fetch student profile with user data and all projects

**Request:**
```http
GET /profiles/students/123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "student@example.com",
      "phone": "+1234567890",
      "is_student": true,
      "is_instructor": false,
      "is_admin": false
    },
    "profile": {
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg",
      "bio": "Full-stack developer",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "github_url": "https://github.com/johndoe",
      "portfolio_url": "https://johndoe.dev",
      "is_public": true,
      "featured": true,
      "featured_rank": 1,
      "public_slug": "john-doe",
      "is_graduated": true,
      "is_working": true,
      "open_to_work": false,
      "company_work_for": "Tech Corp"
    },
    "projects": [
      {
        "id": 1,
        "title": "E-commerce App",
        "description": "Full-stack React & Node app",
        "image_url": "https://example.com/project.jpg",
        "github_url": "https://github.com/johndoe/ecommerce",
        "live_url": "https://ecommerce-demo.com",
        "is_public": true
      }
    ]
  },
  "message": "Student profile loaded successfully."
}
```

---

### 2. Admin: Update Student Profile
**Endpoint:** `PATCH /profiles/students/:userId`  
**Auth:** Required (Admin)  
**Description:** Update student profile with validation & transaction

**Request:**
```http
PATCH /profiles/students/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe Updated",
  "bio": "Senior full-stack developer",
  "is_public": true,
  "featured": true,
  "featured_rank": 2,
  "public_slug": "john-doe-updated",
  "is_graduated": true,
  "is_working": true,
  "open_to_work": false,
  "company_work_for": "New Tech Inc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "profile": {...},
    "projects": [...]
  },
  "message": "Student profile updated successfully."
}
```

**Validation Rules:**
- `full_name`: 1-120 characters
- `bio`: 0-2000 characters
- `public_slug`: 3-50 chars, lowercase alphanumeric + hyphens only, must be unique
- `featured_rank`: positive integer or null
- All URLs must be valid
- At least one field required for update

**Error Responses:**
```json
// User not found
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Student user not found.",
    "statusCode": 404
  }
}

// Duplicate slug
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SLUG",
    "message": "This public slug is already taken.",
    "statusCode": 409
  }
}

// Profile not found
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

### 3. Public: Fetch Public Student Profile
**Endpoint:** `GET /profiles/public/students/:public_slug`  
**Auth:** None (Public)  
**Description:** Fetch public student profile and projects (only public ones)

**Request:**
```http
GET /profiles/public/students/john-doe-updated
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg",
      "bio": "Senior full-stack developer",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "github_url": "https://github.com/johndoe",
      "portfolio_url": "https://johndoe.dev",
      "is_graduated": true,
      "is_working": true,
      "open_to_work": false,
      "company_work_for": "Tech Corp",
      "featured": true
    },
    "projects": [
      {
        "id": 1,
        "title": "E-commerce App",
        "description": "Full-stack React & Node app",
        "image_url": "https://example.com/project.jpg",
        "github_url": "https://github.com/johndoe/ecommerce",
        "live_url": "https://ecommerce-demo.com"
      }
    ]
  },
  "message": "Public profile loaded successfully."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Public profile not found.",
    "statusCode": 404
  }
}
```

---

## Database Relations

### Schema
```
users
├── id (PK)
├── email
├── phone
├── is_student, is_instructor, is_admin
└── ...

student_profiles
├── user_id (FK → users.id)
├── full_name
├── avatar_url
├── bio
├── linkedin_url, github_url, portfolio_url
├── is_public
├── featured, featured_rank
├── public_slug (UNIQUE)
├── is_graduated, is_working, open_to_work
├── company_work_for
└── created_at

projects
├── id (PK)
├── student_user_id (FK → users.id)
├── title
├── description
├── image_url
├── github_url, live_url
├── is_public
├── sort_order
├── created_at, updated_at
└── deleted_at
```

### SQL Queries Used

**Fetch Student Profile with User:**
```sql
SELECT
  u.id, u.email, u.phone,
  u.is_student, u.is_instructor, u.is_admin,
  sp.user_id, sp.full_name, sp.avatar_url, sp.bio,
  sp.linkedin_url, sp.github_url, sp.portfolio_url,
  sp.is_public, sp.featured, sp.featured_rank,
  sp.public_slug, sp.is_graduated, sp.is_working,
  sp.open_to_work, sp.company_work_for, sp.created_at
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
WHERE u.id = $1;
```

**Fetch Student Projects:**
```sql
SELECT *
FROM projects
WHERE student_user_id = $1
  AND deleted_at IS NULL
ORDER BY sort_order, created_at DESC;
```

**Fetch Public Profile by Slug:**
```sql
SELECT *
FROM student_profiles
WHERE public_slug = $1
  AND is_public = true;
```

**Fetch Public Projects:**
```sql
SELECT *
FROM projects
WHERE student_user_id = $1
  AND is_public = true
  AND deleted_at IS NULL
ORDER BY sort_order, created_at DESC;
```

**Check Slug Uniqueness:**
```sql
SELECT COUNT(*) as count
FROM student_profiles
WHERE public_slug = $1
  AND user_id != $2;
```

**Update Student Profile (Dynamic):**
```sql
UPDATE student_profiles
SET full_name = $1, bio = $2, ... (dynamic fields)
WHERE user_id = $N
RETURNING ...;
```

---

## Transaction Management

### Update Flow with Transaction
```
BEGIN TRANSACTION
  ├─ Validate slug uniqueness (if provided)
  ├─ Update student_profiles
  ├─ Log admin action (admin_logs)
  └─ COMMIT
  
ON ERROR: ROLLBACK
```

**Example Transaction Code:**
```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");
  
  // Update profile
  const updateResult = updateStudentProfile(userId, normalizedPayload, client);
  
  // Log action
  await logAdminAction({
    actorUserId: adminUserId,
    action: "update student profile",
    entityType: "student_profiles",
    entityId: targetUserId,
    metadata: { updated_fields: Object.keys(normalizedPayload) },
  }, client);
  
  await client.query("COMMIT");
  return result;
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

---

## Data Flow: Admin Dashboard

### 1. Dashboard Loads Student Profile
```
Dashboard Component
        ↓
GET /profiles/students/:userId (Admin Auth)
        ↓
Controller: getStudentProfileHandler()
        ↓
Service: getStudentProfile()
        ↓
Repository: getStudentProfileWithUser()
           + getStudentProjects()
        ↓
Database Query
        ↓
Response: { user, profile, projects }
        ↓
Display in Profile Box
```

### 2. Admin Edits and Saves Profile
```
Edit Form Submission
        ↓
Validate Payload (Zod Schema)
        ↓
PATCH /profiles/students/:userId (Admin Auth)
        ↓
Controller: updateStudentProfileHandler()
        ↓
Service: updateStudentProfileAdmin()
  - Validate slug uniqueness
  - Start transaction
  - Update profile
  - Log action
  - Fetch fresh data
  - Commit
        ↓
Response: { user, profile, projects }
        ↓
Update Dashboard Display
```

### 3. Changes Reflect Public Profile
```
Profile Updated
        ↓
public_slug set
is_public = true
        ↓
Query: GET /profiles/public/students/:public_slug
        ↓
Service: getPublicStudentProfile()
        ↓
Fetch from student_profiles
  + Public projects only
        ↓
Display on Public Website
```

### 4. Projects Link to Profile
```
projects.student_user_id → users.id
           ↓
User.id → student_profiles.user_id
           ↓
Profile info (name, avatar, etc.)
           ↓
Display on Project Card
```

---

## Error Handling

### HTTP Status Codes
| Code | Scenario |
|------|----------|
| 200 | Success |
| 400 | Invalid request (validation failed) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (not admin) |
| 404 | User/profile not found |
| 409 | Conflict (duplicate slug) |
| 500 | Server error |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "statusCode": 400
  }
}
```

### Validation Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "public_slug",
        "message": "Slug must be lowercase alphanumeric with hyphens only"
      }
    ],
    "statusCode": 400
  }
}
```

---

## File Structure

```
server/src/
├── schemas/
│   ├── profiles.schema.ts          (NEW: Student profile validation)
│   └── profiles.schemas.ts         (UPDATED: Add student schemas)
├── repositories/
│   ├── profiles.repository.ts      (NEW: Student profile queries)
│   └── profiles.repo.ts            (Existing: Admin profile queries)
├── services/
│   └── profiles.service.ts         (UPDATED: Add student functions)
├── controllers/
│   └── profiles.controller.ts      (UPDATED: Add student handlers)
├── routes/
│   └── profiles.routes.ts          (UPDATED: Add student routes)
└── index.ts                        (Already registers /profiles)
```

---

## Security Features

### 1. Authentication
- JWT token validation via `verifyAdminAuth` middleware
- Only admins can update profiles
- Public endpoints have no auth

### 2. Authorization
- Super admin only for certain operations
- Admin actions are logged
- Role-based access control

### 3. Validation
- Zod schemas for all inputs
- URL validation
- Slug format validation (lowercase, hyphens only)
- Slug uniqueness check

### 4. SQL Injection Prevention
- Parameterized queries ($1, $2, etc.)
- No string concatenation
- Prepared statements

### 5. Transaction Safety
- ACID compliance
- Rollback on errors
- Atomic updates

---

## Integration Checklist

- [x] Repository: Student profile queries created
- [x] Service: Business logic & transactions implemented
- [x] Controller: HTTP handlers created
- [x] Routes: Endpoints registered
- [x] Schemas: Validation rules defined
- [x] Routes: Main app integration ready
- [ ] Dashboard: Update component to use new endpoints
- [ ] Public Website: Update to use `/profiles/public/` endpoint
- [ ] Testing: Test all endpoints
- [ ] Documentation: API docs updated

---

## Testing Examples

### Fetch Profile (Admin)
```bash
curl -X GET http://localhost:3000/profiles/students/123 \
  -H "Authorization: Bearer <admin-token>"
```

### Update Profile (Admin)
```bash
curl -X PATCH http://localhost:3000/profiles/students/123 \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Updated",
    "is_public": true,
    "public_slug": "john-updated"
  }'
```

### Fetch Public Profile
```bash
curl -X GET http://localhost:3000/profiles/public/students/john-updated
```

---

## Performance Notes

### Indexes Used
- `student_profiles(featured)` - Featured profiles query
- `student_profiles(featured_rank)` - Ranking queries
- `projects(student_user_id)` - Profile → Projects join
- `projects(is_public)` - Public projects filter
- `projects(deleted_at)` - Soft delete filter

### Query Optimization
- Single query for user + profile (JOIN)
- Separate query for projects (efficient pagination)
- Lazy load public projects (only when needed)
- Indexed lookups for public_slug

### Caching Suggestions
- Cache public profiles (invalidate on update)
- Cache project counts
- Cache featured rankings

---

## Next Steps

1. **Dashboard Component Update**
   - Use `GET /profiles/students/:userId` to fetch
   - Render profile info box with all fields
   - Use `PATCH /profiles/students/:userId` to update

2. **Public Website Integration**
   - Add route for `GET /profiles/public/students/:slug`
   - Create public profile page
   - Display student projects

3. **Project Listing**
   - Link projects to student profile
   - Show student info on project cards
   - Use student_user_id to fetch projects

4. **Admin Dashboard**
   - Student profile management page
   - Search & filter students
   - Bulk operations (set featured, etc.)

---

## Support

For questions or issues:
- Check error codes in responses
- Review validation schemas
- Test SQL queries independently
- Check admin logs for action history
