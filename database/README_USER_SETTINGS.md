# User Settings Database Schema

This document describes the database schema for user profile and security settings.

## Tables

### 1. `users` Table

Stores basic user authentication and account information.

**Columns:**

- `id` (UUID, Primary Key): Unique user identifier
- `name` (VARCHAR): User's full name
- `email` (VARCHAR, Unique): User's email address
- `password_hash` (VARCHAR): Hashed password (bcrypt, argon2, etc.)
- `organization_id` (UUID, Foreign Key): Reference to organizations table
- `org_code` (VARCHAR): Organization code
- `role` (VARCHAR): User role (default: 'user')
- `email_verified` (BOOLEAN): Whether email is verified
- `created_at` (TIMESTAMP): Account creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**

- `idx_users_email`: Index on email for fast lookups
- `idx_users_organization_id`: Index on organization_id
- `idx_users_org_code`: Index on org_code

### 2. `user_profiles` Table

Stores additional user profile information.

**Columns:**

- `id` (UUID, Primary Key): Unique profile identifier
- `user_id` (UUID, Foreign Key, Unique): Reference to users table
- `avatar_url` (TEXT): URL to user's avatar image
- `job_title` (VARCHAR): User's job title (e.g., "Senior Engineer")
- `department` (VARCHAR): User's department (e.g., "Maintenance")
- `phone_number` (VARCHAR): User's phone number
- `bio` (TEXT): User biography
- `created_at` (TIMESTAMP): Profile creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**

- `idx_user_profiles_user_id`: Index on user_id for fast lookups

### 3. `user_security_settings` Table

Stores user security and preference settings.

**Columns:**

- `id` (UUID, Primary Key): Unique settings identifier
- `user_id` (UUID, Foreign Key, Unique): Reference to users table
- `two_factor_enabled` (BOOLEAN): Whether 2FA is enabled
- `two_factor_secret` (VARCHAR): Encrypted secret key for 2FA
- `two_factor_backup_codes` (TEXT[]): Array of backup codes for 2FA
- `session_timeout_minutes` (INTEGER): Session timeout in minutes (NULL = never)
- `last_password_change` (TIMESTAMP): Last password change timestamp
- `password_reset_token` (VARCHAR): Token for password reset flow
- `password_reset_expires` (TIMESTAMP): Expiration time for password reset token
- `failed_login_attempts` (INTEGER): Number of consecutive failed login attempts
- `account_locked_until` (TIMESTAMP): Account lockout expiration time
- `created_at` (TIMESTAMP): Settings creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- `chk_session_timeout`: Session timeout must be positive or NULL
- `chk_failed_login_attempts`: Failed login attempts must be non-negative

**Indexes:**

- `idx_user_security_settings_user_id`: Index on user_id
- `idx_user_security_settings_reset_token`: Index on password_reset_token

### 4. `user_password_history` Table (Optional)

Stores password history to prevent users from reusing old passwords.

**Columns:**

- `id` (UUID, Primary Key): Unique history record identifier
- `user_id` (UUID, Foreign Key): Reference to users table
- `password_hash` (VARCHAR): Hashed password
- `created_at` (TIMESTAMP): When this password was used

**Indexes:**

- `idx_user_password_history_user_id`: Index on user_id and created_at

## Views

### `user_complete_info` View

A view that combines user, profile, and security settings information for easier querying.

**Columns:** All columns from `users`, `user_profiles`, and `user_security_settings` tables.

## API Endpoints

### 1. Get User Profile

**GET** `/api/users/profile`

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "organization_id": "uuid",
    "org_code": "ORG001",
    "role": "user",
    "avatar_url": "https://example.com/avatar.jpg",
    "job_title": "Senior Engineer",
    "department": "Maintenance",
    "phone_number": "+1234567890",
    "bio": "User biography",
    "two_factor_enabled": false,
    "session_timeout_minutes": 30
  }
}
```

### 2. Update User Profile

**PUT** `/api/users/profile`

**Request Body:**

```json
{
  "name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "job_title": "Senior Engineer",
  "department": "Maintenance",
  "phone_number": "+1234567890",
  "bio": "User biography"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "job_title": "Senior Engineer",
    "department": "Maintenance",
    "phone_number": "+1234567890",
    "bio": "User biography",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

### 3. Change Password

**PUT** `/api/users/password`

**Request Body:**

```json
{
  "current_password": "currentPassword123",
  "new_password": "newPassword123",
  "confirm_password": "newPassword123"
}
```

**Response:**

```json
{
  "message": "Password changed successfully"
}
```

### 4. Update Security Settings

**PUT** `/api/users/security`

**Request Body:**

```json
{
  "two_factor_enabled": true,
  "session_timeout_minutes": 60
}
```

**Response:**

```json
{
  "settings": {
    "two_factor_enabled": true,
    "session_timeout_minutes": 60,
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Security settings updated successfully"
}
```

### 5. Enable Two-Factor Authentication

**POST** `/api/users/2fa/enable`

**Response:**

```json
{
  "secret": "BASE32_ENCODED_SECRET",
  "qr_code_url": "https://example.com/qr-code",
  "backup_codes": ["code1", "code2", ...],
  "message": "2FA enabled successfully"
}
```

### 6. Disable Two-Factor Authentication

**POST** `/api/users/2fa/disable`

**Request Body:**

```json
{
  "password": "userPassword123"
}
```

**Response:**

```json
{
  "message": "2FA disabled successfully"
}
```

### 7. Upload Avatar

**POST** `/api/users/avatar`

**Request:** Multipart form data with `avatar` file

**Response:**

```json
{
  "avatar_url": "https://example.com/uploads/avatar.jpg",
  "message": "Avatar uploaded successfully"
}
```

## Implementation Notes

### 1. Password Hashing

- Use bcrypt, argon2, or similar secure hashing algorithms
- Never store plain text passwords
- Use salt rounds (recommended: 10-12 for bcrypt)

### 2. Two-Factor Authentication

- Use TOTP (Time-based One-Time Password) algorithm
- Store 2FA secret encrypted
- Provide backup codes when enabling 2FA
- Use libraries like `speakeasy` (Node.js) or `pyotp` (Python)

### 3. Session Timeout

- `session_timeout_minutes` can be NULL (never timeout) or a positive integer
- Implement session timeout logic in your authentication middleware
- Clear session tokens when timeout is reached

### 4. Password History

- Store last N passwords (e.g., last 5 passwords)
- Check password history when user changes password
- Delete old password history records (keep only last N)

### 5. Account Lockout

- Lock account after N failed login attempts (e.g., 5 attempts)
- Set `account_locked_until` to unlock time
- Reset `failed_login_attempts` on successful login

### 6. Avatar Upload

- Store avatar files in cloud storage (S3, Cloudinary, etc.) or local storage
- Validate file type and size
- Generate unique filename to prevent conflicts
- Store URL in `user_profiles.avatar_url`

### 7. Email Updates

- Verify new email address before updating
- Send verification email to new address
- Update `email_verified` flag after verification

## Security Considerations

1. **Password Security:**
   - Enforce strong password policies (min length, complexity)
   - Hash passwords using secure algorithms
   - Implement password history to prevent reuse
   - Require current password when changing password

2. **Two-Factor Authentication:**
   - Encrypt 2FA secrets in database
   - Provide backup codes
   - Allow users to disable 2FA with password confirmation

3. **Session Management:**
   - Implement secure session timeout
   - Clear session tokens on logout
   - Implement account lockout for failed login attempts

4. **Data Validation:**
   - Validate all user inputs
   - Sanitize data before storing
   - Use parameterized queries to prevent SQL injection

5. **Access Control:**
   - Users can only update their own profile
   - Admins can update any user profile
   - Implement role-based access control (RBAC)

## Migration Notes

1. If you already have a `users` table, modify the schema to match your existing structure
2. Create `user_profiles` and `user_security_settings` tables
3. Migrate existing user data to new tables
4. Create default security settings for existing users
5. Update your authentication logic to use new tables

## Example Queries

### Get User Profile with Settings

```sql
SELECT * FROM user_complete_info WHERE id = 'user-uuid';
```

### Update User Profile

```sql
UPDATE user_profiles
SET
    avatar_url = 'https://example.com/avatar.jpg',
    job_title = 'Senior Engineer',
    department = 'Maintenance',
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid';
```

### Update Security Settings

```sql
UPDATE user_security_settings
SET
    two_factor_enabled = true,
    session_timeout_minutes = 60,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid';
```

### Change Password

```sql
-- Update password hash in users table
UPDATE users
SET
    password_hash = 'new_hashed_password',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'user-uuid';

-- Record password change
UPDATE user_security_settings
SET
    last_password_change = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid';

-- Add to password history (keep last 5)
INSERT INTO user_password_history (user_id, password_hash)
VALUES ('user-uuid', 'new_hashed_password');

-- Delete old password history (keep last 5)
DELETE FROM user_password_history
WHERE id NOT IN (
    SELECT id FROM user_password_history
    WHERE user_id = 'user-uuid'
    ORDER BY created_at DESC
    LIMIT 5
);
```

### Enable 2FA

```sql
UPDATE user_security_settings
SET
    two_factor_enabled = true,
    two_factor_secret = 'encrypted_secret',
    two_factor_backup_codes = ARRAY['code1', 'code2', 'code3', 'code4', 'code5'],
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'user-uuid';
```

## Testing

1. Test user profile creation and updates
2. Test password change functionality
3. Test 2FA enable/disable
4. Test session timeout
5. Test account lockout
6. Test avatar upload
7. Test email verification
8. Test password history enforcement
