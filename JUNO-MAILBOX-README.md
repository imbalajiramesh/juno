# Juno Mailbox System

The Juno Mailbox system provides a complete email management solution with custom domain support, OAuth integration with Gmail/Outlook, and a professional email interface similar to Gmail and Notion Mail.

## Features

### ✅ Implemented Features

#### 1. **Settings Integration**
- **Juno Voices** (formerly "Voice Agents") - Renamed with Juno branding
- **Juno Numbers** (formerly "Phone Numbers") - Renamed with Juno branding  
- **Juno Mailbox** - New email management settings page

#### 2. **Custom Domain Management**
- Add custom domains (yourcompany.com)
- DNS verification system (MX, SPF, DKIM records)
- Domain verification status tracking
- Multiple domain support per tenant

#### 3. **Email Provider Integration**
- Gmail OAuth integration
- Outlook OAuth integration
- Secure token storage with refresh capability
- Multiple mailbox support per tenant

#### 4. **Professional Email Interface**
- Gmail-like three-panel layout
- Folder navigation (Inbox, Sent, Starred, Archive, Trash)
- Email search functionality
- Unread email indicators
- Attachment support indicators
- Real-time email syncing

#### 5. **Agent Dashboard Integration**
- "Recent Emails" card on `/agent` page
- Unread count badges
- Quick access to full mailbox interface
- Email preview with sender/subject/time

#### 6. **Credits System Integration**
- Email sending costs 1 credit per email
- Transaction logging for all email activities
- Credit balance validation before sending

## Database Schema

### Core Tables

#### `mailbox_domains`
```sql
id UUID PRIMARY KEY
tenant_id UUID REFERENCES tenants(id)
domain TEXT NOT NULL
verified BOOLEAN DEFAULT FALSE
mx_records_configured BOOLEAN DEFAULT FALSE
spf_configured BOOLEAN DEFAULT FALSE
dkim_configured BOOLEAN DEFAULT FALSE
verification_token TEXT
dns_records JSONB DEFAULT '{}'
```

#### `mailbox_configs`
```sql
id UUID PRIMARY KEY
tenant_id UUID REFERENCES tenants(id)
email_address TEXT NOT NULL
domain TEXT NOT NULL
provider TEXT CHECK (provider IN ('gmail', 'outlook'))
status TEXT CHECK (status IN ('active', 'pending', 'error', 'disabled'))
access_token TEXT (encrypted)
refresh_token TEXT (encrypted)
token_expires_at TIMESTAMP
unread_count INTEGER DEFAULT 0
```

#### `mailbox_messages`
```sql
id UUID PRIMARY KEY
mailbox_id UUID REFERENCES mailbox_configs(id)
tenant_id UUID REFERENCES tenants(id)
message_id TEXT NOT NULL (provider's ID)
subject TEXT
sender_email TEXT
sender_name TEXT
body_text TEXT
body_html TEXT
is_read BOOLEAN DEFAULT FALSE
is_starred BOOLEAN DEFAULT FALSE
has_attachments BOOLEAN DEFAULT FALSE
folder TEXT DEFAULT 'INBOX'
received_at TIMESTAMP
```

#### `mailbox_templates`
```sql
id UUID PRIMARY KEY
tenant_id UUID REFERENCES tenants(id)
name TEXT NOT NULL
subject TEXT NOT NULL
body_html TEXT NOT NULL
variables JSONB DEFAULT '[]'
is_active BOOLEAN DEFAULT TRUE
```

#### `mailbox_sent_emails`
```sql
id UUID PRIMARY KEY
mailbox_id UUID REFERENCES mailbox_configs(id)
tenant_id UUID REFERENCES tenants(id)
customer_id UUID REFERENCES customers(id)
to_emails TEXT[] NOT NULL
subject TEXT NOT NULL
body_html TEXT
template_id UUID REFERENCES mailbox_templates(id)
status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
credits_used INTEGER DEFAULT 2
sent_at TIMESTAMP
```

## API Endpoints

### Settings Management
- `GET /api/mailbox` - List connected mailboxes
- `GET /api/mailbox/domains` - List custom domains
- `POST /api/mailbox/domains` - Add new domain
- `POST /api/mailbox/connect` - Initiate OAuth connection

### Email Management  
- `GET /api/mailbox/recent` - Recent emails for dashboard
- `GET /api/mailbox/messages` - Paginated email list with search/filter
- `POST /api/mailbox/messages/{id}/read` - Mark email as read
- `POST /api/mailbox/send` - Send new email (future)

### OAuth Flow
- `POST /api/mailbox/connect` - Generate OAuth URL
- `GET /api/mailbox/callback` - Handle OAuth callback (future)

## User Interface

### Settings Page (`/settings/mailbox`)
```
┌─────────────────────────────────────────────────────────┐
│ Juno Mailbox                                            │
├─────────────────────────────────────────────────────────┤
│ Connected Mailboxes                                     │
│ ┌─────────────┐ ┌─────────────┐                        │
│ │ Gmail       │ │ Outlook     │                        │
│ │ Connected   │ │ Connected   │                        │
│ │ 5 unread    │ │ 0 unread    │                        │
│ └─────────────┘ └─────────────┘                        │
├─────────────────────────────────────────────────────────┤
│ Custom Domains                                          │
│ ✅ company.com (verified)                               │
│ ⏳ newdomain.com (pending verification)                 │
└─────────────────────────────────────────────────────────┘
```

### Mailbox Interface (`/mailbox`)
```
┌──────────────────────────────────────────────────────────────────┐
│ Header Component                                                 │
├────────────┬─────────────────────────┬───────────────────────────┤
│ Sidebar    │ Email List              │ Email Detail              │
│            │                         │                           │
│ Juno       │ ┌─────────────────────┐ │ ┌─────────────────────┐   │
│ Mailbox    │ │ [📧] John Doe       │ │ │ Email Subject       │   │
│            │ │ Meeting Tomorrow    │ │ │                     │   │
│ 📥 Inbox   │ │ Can we reschedule.. │ │ │ From: john@...      │   │
│ 📤 Sent    │ └─────────────────────┘ │ │ To: juno@...        │   │
│ ⭐ Starred │ ┌─────────────────────┐ │ │                     │   │
│ 🗄️ Archive │ │ [📧] Jane Smith     │ │ │ Email body...       │   │
│ 🗑️ Trash   │ │ Project Update      │ │ │                     │   │
│            │ │ The latest status.. │ │ │                     │   │
│            │ └─────────────────────┘ │ │ [Reply] [Forward]   │   │
│            │                         │ └─────────────────────┘   │
└────────────┴─────────────────────────┴───────────────────────────┘
```

### Agent Dashboard Card
```
┌─────────────────────────────────────────┐
│ 📧 Recent Emails                [5 unread] │
├─────────────────────────────────────────┤
│ 🔵 John Doe - Meeting Tomorrow          │
│    2m ago                               │
│                                         │
│ 📧 Jane Smith - Project Update          │
│    1h ago                               │
│                                         │
│ 📧 Client ABC - Invoice #1234           │
│    3h ago                               │
├─────────────────────────────────────────┤
│               [View All]                │
└─────────────────────────────────────────┘
```

## Setup Instructions

### 1. Database Migration
```bash
# Run the mailbox schema migration
psql -d your_database -f juno-mailbox-schema.sql
```

### 2. Environment Variables
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Base URL for OAuth redirects
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 3. OAuth App Setup

#### Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://your-domain.com/api/mailbox/callback`
6. Add scopes: `gmail.readonly`, `gmail.send`

#### Microsoft OAuth App
1. Go to [Azure Portal](https://portal.azure.com/)
2. App Registrations → New registration
3. Add redirect URI: `https://your-domain.com/api/mailbox/callback`
4. API Permissions → Add Microsoft Graph permissions
5. Add scopes: `Mail.Read`, `Mail.Send`

### 4. DNS Configuration (for customers)
When adding a custom domain, customers need to configure:

#### MX Records
```
Priority: 10
Value: mx1.your-mail-provider.com
```

#### SPF Record
```
Type: TXT
Value: "v=spf1 include:_spf.your-mail-provider.com ~all"
```

#### DKIM Record
```
Type: TXT
Name: selector1._domainkey
Value: "v=DKIM1; k=rsa; p=[public-key]"
```

## White-Label Implementation

### Branding Updates Made
- ✅ "Voice Agents" → "Juno Voices"
- ✅ "Phone Numbers" → "Juno Numbers"  
- ✅ Added "Juno Mailbox" to settings menu
- ✅ Removed all Twilio/Vapi/Resend branding from UI
- ✅ Professional, native CRM appearance

### Future Branding Considerations
- Use generic terms like "professional email delivery"
- Avoid mentioning third-party service names in user-facing UI
- Maintain consistent "Juno" prefix for all communication services

## Security Considerations

### Token Security
- OAuth tokens stored encrypted in database
- Automatic token refresh before expiration
- Secure token transmission via HTTPS only

### Data Privacy  
- Email content cached locally for search/performance
- Row Level Security (RLS) enforced on all tables
- Tenant isolation at database level

### Access Control
- All API endpoints require authentication
- Tenant verification on every request
- No cross-tenant data access possible

## Future Enhancements

### Phase 2 Features (Not Yet Implemented)
- [ ] Email sending functionality
- [ ] Email templates with variables
- [ ] Attachment handling and storage
- [ ] Advanced email rules and filters
- [ ] Email analytics and tracking
- [ ] Bulk email operations
- [ ] Email scheduling
- [ ] Auto-responders
- [ ] Email signatures
- [ ] Conversation threading

### Integration Opportunities
- [ ] Link emails to customer records
- [ ] Email-to-lead conversion
- [ ] Email activity in customer timeline
- [ ] Automated email sequences
- [ ] Integration with voice agents for follow-up

## Credits System Integration

### Email Pricing
- **Email Send**: 1 credit per email
- Volume discounts available through credit packages
- Credit balance validation before sending

### Transaction Logging
All email activities logged in `credit_transactions`:
- Email sends
- Failed send attempts
- Credit refunds for bounced emails

## Technical Notes

### OAuth Flow
1. User selects provider (Gmail/Outlook) and domain
2. System generates OAuth URL with encrypted state
3. User redirects to provider for authorization
4. Provider redirects back with authorization code
5. System exchanges code for access/refresh tokens
6. Tokens stored securely, mailbox activated

### Email Sync Strategy
- Initial sync: Import last 30 days of emails
- Incremental sync: Poll for new emails every 5 minutes
- Webhook integration for real-time updates (future)

### Performance Optimization
- Database indexes on frequently queried columns
- Email content pagination (50 emails per request)
- Local caching for recently accessed emails
- Lazy loading of email bodies

This comprehensive system provides a professional, white-labeled email management solution that integrates seamlessly with the existing Juno CRM platform. 