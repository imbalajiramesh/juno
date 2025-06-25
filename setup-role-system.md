# Complete Role-Based Permission & Invitation System Setup

This guide will help you implement the complete role-based permission system and invitation functionality in your Juno application.

## 📋 Overview

The system includes:
- **Role-based permissions** with granular access control
- **Team invitation system** with branded emails
- **Invitation acceptance flow** with account creation
- **Permission-based UI components**
- **Default role assignment** for new users

## 🔧 Installation Steps

### 1. Install Required Dependencies

```bash
npm install resend @tabler/icons-react
```

### 2. Set Environment Variables

Add the following to your `.env.local` file:

```env
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Apply Database Schema (IMPORTANT ORDER!)

**Step 3a: Run the basic migration FIRST**

```sql
-- Run this in your Supabase SQL editor FIRST
-- File: add-missing-columns.sql
```

This adds the basic columns and roles table that the system needs.

**Step 3b: Then run the full schema**

```sql
-- Run this AFTER the basic migration
-- File: role-based-permissions-schema.sql
```

This creates the complete invitation and permissions system.

### 4. Update Database Types (Optional)

If using TypeScript with generated types, regenerate them:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

## 🎯 Key Features Implemented

### Role-Based Access Control

```typescript
// Example usage in components
import { PermissionGuard, PERMISSIONS } from '@/lib/permissions';

<PermissionGuard permission={PERMISSIONS.TEAM_INVITE}>
  <InviteButton />
</PermissionGuard>
```

### Team Invitation System

```typescript
// Send invitation
const response = await fetch('/api/invitations', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', role_id: 'role-uuid' })
});
```

### Invitation Acceptance

Users receive branded emails with invitation links that lead to:
- `/auth/accept-invitation?token=invitation-token`
- Account creation with proper role assignment
- Automatic tenant association

## 🔐 Default Roles & Permissions

### Admin
- Full access to all features
- Organization settings and billing
- Team management and role assignment

### Manager  
- Customer and voice agent management
- Basic team operations (no deletion)
- Most features except critical admin functions

### Agent
- Customer management (read, create, update)
- Voice calling and communication
- Basic analytics access

### Support
- Read-only access to customers and analytics
- Limited access for support operations

## 📧 Email Templates

The system includes beautifully designed email templates for:

1. **Invitation Emails**
   - Professional branding with gradients
   - Clear call-to-action buttons
   - Organization and role information
   - Expiration notices

2. **Welcome Emails**
   - Personalized welcome message
   - Getting started checklist
   - Direct dashboard access

## 🛡️ Security Features

- **Row Level Security (RLS)** on all new tables
- **Token-based invitation system** with expiration
- **Permission checking** on both frontend and backend
- **Tenant isolation** for multi-tenant security

## 🔄 API Endpoints

### Invitations
- `GET /api/invitations` - List pending invitations
- `POST /api/invitations` - Send new invitation
- `DELETE /api/invitations?id=uuid` - Cancel invitation

### Invitation Acceptance
- `GET /api/invitations/accept?token=xxx` - Verify invitation
- `POST /api/invitations/accept` - Accept invitation and create account

### User Permissions
- `GET /api/user/permissions` - Get current user's permissions

## 📱 Frontend Components

### New Components Added
- `InviteTeamMemberModal` - Modal for sending invitations
- `AcceptInvitationPage` - Complete invitation acceptance flow
- `PermissionGuard` - Wrapper for permission-based rendering

### Updated Components
- Team management page with invitation tracking
- Role-based UI restrictions throughout the app

### New Library Files
- `lib/permissions.ts` - Client-side permission utilities
- `lib/permissions-server.ts` - Server-side permission utilities
- `lib/invitation-email.ts` - Email service with branded templates

## 🚀 Getting Started

1. **Apply the database schema** using the SQL files IN ORDER:
   - First: `add-missing-columns.sql`
   - Then: `role-based-permissions-schema.sql`

2. **Set up Resend API key** for email sending

3. **Test the invitation flow**:
   - Go to Settings > Team
   - Click "Invite Team Member"
   - Send an invitation
   - Check the recipient's email
   - Accept the invitation

## 🔧 Architecture Changes Made

### Database
- Added `tenant_id`, `role_id`, `date_of_joining` to `user_accounts`
- Created `roles`, `permissions`, `role_permissions`, `invitations` tables
- Added proper foreign key constraints and indexes
- Implemented Row Level Security (RLS)

### Backend
- Separated server-side and client-side permission utilities
- Created permission checking API endpoint
- Implemented invitation management APIs
- Added email service with Resend integration

### Frontend
- Updated team management with invitation system
- Added permission-based component guards
- Created invitation acceptance flow
- Implemented role-based UI restrictions

## 🎨 Customization

### Email Branding
Update the email templates in `lib/invitation-email.ts` to match your brand:
- Logo URLs
- Color schemes
- Company information

### Permissions
Modify permissions in the database to match your needs:
- Add new permission categories
- Adjust role-permission assignments
- Create custom roles

### UI Components
Customize the permission guards and role displays:
- Role color coding
- Permission fallback messages
- Access denied states

## 🔍 Troubleshooting

### Common Issues

1. **"Missing permission" errors**
   - Check if roles and permissions are properly seeded
   - Verify user has been assigned a role
   - Ensure permission names match exactly

2. **"Could not find tenant_id column" errors**
   - Run the `add-missing-columns.sql` migration first
   - Restart your development server after running migrations

3. **Email not sending**
   - Verify Resend API key is correct
   - Check environment variables
   - Review email service logs

4. **Invitation acceptance fails**
   - Check if invitation token is valid
   - Verify database trigger is working
   - Ensure proper role exists

### Debug Commands

```sql
-- Check user permissions
SELECT p.name, p.category 
FROM user_accounts ua
JOIN role_permissions rp ON ua.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ua.auth_id = 'user-auth-id';

-- Check pending invitations
SELECT * FROM invitations WHERE status = 'pending';

-- Verify role assignments
SELECT ua.email, r.role_name 
FROM user_accounts ua
LEFT JOIN roles r ON ua.role_id = r.id;

-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_accounts';
```

## 🎉 Success!

Once setup is complete, you'll have:
- ✅ Complete role-based permission system
- ✅ Beautiful invitation emails  
- ✅ Secure invitation acceptance flow
- ✅ Permission-based UI restrictions
- ✅ Multi-tenant security
- ✅ Automatic role assignment

Your team can now invite members, assign roles, and control access throughout the application!

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the database logs in Supabase
3. Verify all environment variables are set
4. Test with a clean user account
5. Ensure you ran the migrations in the correct order

The system is designed to be robust and handle edge cases, but please report any issues you encounter. 