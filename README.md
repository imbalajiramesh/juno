# Juno - Multi-Tenant Customer Management Platform

![Juno Logo](public/logo.png)

Juno is a comprehensive multi-tenant customer relationship management (CRM) platform built specifically for energy companies and sales teams. It provides advanced customer management, AI-powered interactions, team collaboration, and detailed analytics in a secure, scalable environment.

## 🌟 Key Features

### 🏢 **Multi-Tenant Architecture**
- **Organization-based isolation** - Complete data separation between different companies
- **Role-based access control** - Different permission levels for team members
- **Row Level Security (RLS)** - Database-level security ensuring data privacy
- **Scalable infrastructure** - Built to handle multiple organizations simultaneously

### 👥 **Customer Management**
- **Complete customer profiles** - Store comprehensive customer information
- **Custom fields** - Flexible data structure for industry-specific needs
- **Customer status tracking** - Monitor customer lifecycle and engagement
- **Bulk operations** - Import/export customers via CSV
- **Advanced search** - Find customers quickly with powerful search functionality

### 🤖 **AI-Powered Features (Alex)**
- **Smart call logging** - AI-generated call summaries and transcripts
- **Email automation** - AI-powered email interactions and tracking
- **SMS management** - Automated text messaging with AI insights
- **Task automation** - AI-generated follow-up tasks and reminders
- **Intelligent insights** - AI-driven customer behavior analysis

### 📊 **Analytics & Reporting**
- **Real-time dashboards** - Live metrics and KPIs
- **Revenue tracking** - Monitor sales performance and trends
- **Team leaderboards** - Gamify sales performance
- **Activity monitoring** - Track all customer interactions
- **Performance metrics** - Detailed analytics for optimization

### 👨‍💼 **Team Collaboration**
- **Team member management** - Add and manage team members
- **Task assignment** - Assign and track tasks across the team
- **Activity feeds** - Real-time updates on team activities
- **Performance tracking** - Monitor individual and team metrics

## 🏗️ Architecture

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and transitions

### **Backend**
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security** - Database-level security policies
- **Supabase Auth** - Authentication and user management

### **Database Schema**
```sql
-- Core Tables
├── tenants                 # Organization/company data
├── user_accounts          # User profiles and permissions
├── customers              # Customer information
├── interactions           # Customer interaction history
├── custom_field_definitions # Configurable fields
├── tasks                  # Task management
├── roles                  # User roles and permissions

-- AI Features (Alex)
├── alex_call_logs         # AI call summaries
├── alex_email_logs        # Email interactions
├── alex_sms_logs          # SMS interactions
├── alex_tasks             # AI-generated tasks
└── alex_add_minutes       # Communication minutes tracking
```

## 📱 Pages & Features

### 🏠 **Dashboard** (`/dashboard`)
- **Overview metrics** - Total customers, new customers, revenue, appointments
- **Activity feed** - Real-time team activities and interactions
- **Recent sales** - Latest successful deals and conversions
- **Quick actions** - Fast access to common tasks

### 👥 **Customers** (`/customers`)
- **Customer list** - Paginated, searchable customer directory
- **Customer stats** - Active, churned, and new customer metrics
- **Customer profiles** - Detailed individual customer pages (`/customers/[id]`)
- **Bulk operations** - Import/export functionality
- **Status management** - Track customer lifecycle stages

### 🏢 **Team** (`/team`)
- **Team dashboard** - Overview of team performance
- **Leaderboard** - Gamified performance rankings
- **Member management** - Add/remove team members
- **Individual profiles** - Detailed team member pages (`/team/[slug]`)
- **Performance metrics** - Individual and team analytics

### ⚙️ **Settings** (`/settings`)
- **Organization settings** (`/settings/organization`) - Company profile and preferences
- **Custom fields** (`/settings/custom-fields`) - Configure industry-specific data fields
- **Team management** (`/settings/team`) - User roles and permissions
- **Integration settings** - API keys and external services

### 🔐 **Authentication**
- **Sign in** (`/login`) - Secure authentication via Supabase Auth
- **Sign up** (`/sign-up`) - User registration
- **Organization selection** (`/organization-selection`) - Multi-tenant organization switching
- **Session management** - Secure session handling

### 🤖 **AI Agent** (`/agent`)
- **AI interaction interface** - Direct communication with Alex
- **Automated insights** - AI-generated recommendations
- **Task suggestions** - Smart follow-up recommendations

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase account** (or self-hosted instance)
- **Supabase project** for authentication and database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd juno
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   # Database
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Supabase Authentication  
   # All authentication is handled through Supabase
   # Configure auth providers in your Supabase dashboard
   ```

4. **Database Setup**
   ```bash
   # Enable Row Level Security
   export SUPABASE_DB_PASSWORD='your_database_password'
   ./scripts/enable-rls.sh
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 API Reference

### **Customer Management**
```typescript
GET    /api/customers              # List customers
POST   /api/customers              # Create customer
GET    /api/customers/[id]         # Get customer
PUT    /api/customers/[id]         # Update customer
DELETE /api/customers/[id]         # Delete customer
POST   /api/customers/import       # Bulk import CSV
GET    /api/customers/export       # Bulk export CSV
GET    /api/customers/search       # Search customers
GET    /api/customers/recent-sales # Recent sales data
```

### **Analytics & Stats**
```typescript
GET /api/customers/stats           # Customer statistics
GET /api/customers/stats/active    # Active customer stats
GET /api/customers/stats/churned   # Churned customer stats
GET /api/customers/stats/new       # New customer stats
GET /api/customers/stats/status    # Status distribution
GET /api/leaderboard/stats         # Team leaderboard
GET /api/activities                # Activity feed
GET /api/appointments/stats        # Appointment statistics
GET /api/calls/stats               # Call statistics
GET /api/emails/stats              # Email statistics
GET /api/texts/stats               # Text message statistics
```

### **Team Management**
```typescript
GET  /api/team                     # List team members
POST /api/team                     # Add team member
GET  /api/user-accounts            # User account details
GET  /api/organization             # Organization details
```

### **AI Features (Alex)**
```typescript
GET  /api/call-logs                # AI call logs
GET  /api/minutes/balance          # Communication minutes balance
GET  /api/minutes/used             # Used minutes
GET  /api/minutes/total            # Total minutes available
```

### **Configuration**
```typescript
GET    /api/custom-fields          # List custom field definitions
POST   /api/custom-fields          # Create custom field
PUT    /api/custom-fields/[id]     # Update custom field
DELETE /api/custom-fields/[id]     # Delete custom field
# Webhook endpoint removed (was Clerk-specific)
```

## 🎨 UI Components

### **Dashboard Cards**
- `<TotalCustomers />` - Customer count metrics with trend analysis
- `<NewCustomers />` - New customer tracking and growth metrics
- `<TotalRevenue />` - Revenue analytics and performance tracking
- `<Activities />` - Real-time activity feed with filtering
- `<RecentSales />` - Latest successful deals and conversions
- `<Appointments />` - Appointment scheduling and tracking

### **Customer Components**
- `<CustomerList />` - Comprehensive customer directory with search
- `<CustomerProfile />` - Detailed individual customer profiles
- `<CustomerStatus />` - Visual status distribution and analytics
- `<CustomerDetails />` - Customer information display card
- `<AddCustomerModal />` - Customer creation and editing modal

### **Team Components**
- `<TeamMembers />` - Team directory with performance metrics
- `<Leaderboard />` - Gamified performance rankings
- `<AddMemberModal />` - Team member invitation modal
- `<AssignedCustomerList />` - Customer assignments per team member

### **AI Components (Alex)**
- `<CallLogs />` - AI-generated call summaries and transcripts
- `<BalanceMinutes />` - Communication minutes tracking
- `<ScheduledTasks />` - AI-generated task management
- `<LiveAction />` - Real-time AI activity monitoring

### **Analytics Components**
- `<SeenPercent />` - Customer engagement metrics
- `<CallsMade />` - Call activity tracking
- `<EmailsSent />` - Email campaign metrics
- `<TextsSent />` - SMS campaign analytics

### **Industry-Specific Components**
- `<EnergyProfile />` - Energy consumption and solar panel data
- `<AppliancesTab />` - Home appliance tracking
- `<ProgramsTab />` - Energy efficiency program management

## 🔒 Security Features

### **Row Level Security (RLS)**
- **Tenant isolation** - Complete data separation between organizations
- **User-based policies** - Access control enforced at database level
- **Service role bypass** - Admin operations when needed
- **Performance optimized** - Indexed queries for fast RLS checks

### **Authentication**
- **Supabase Auth integration** - Enterprise-grade authentication
- **Multi-factor authentication** - Enhanced security options
- **Session management** - Secure session handling with automatic refresh
- **Organization switching** - Secure multi-tenant support
- **Webhook validation** - Secure API integrations with signature verification

### **Data Protection**
- **Encrypted connections** - All data transmitted over HTTPS
- **Environment variables** - Sensitive data stored securely
- **API rate limiting** - Protection against abuse
- **Input validation** - Comprehensive data validation using Zod

## 🔧 Configuration

### **Supabase Setup**
1. Create a new Supabase project or use self-hosted instance
2. Run the RLS setup script: `./scripts/enable-rls.sh`
3. Configure authentication providers in Supabase dashboard
4. Set up database policies and indexes
5. Configure authentication methods (email, social, etc.)
6. Set up any required webhooks for integrations

### **Custom Fields Configuration**
Configure industry-specific fields through the settings panel:
- **Energy profiles** - Solar panels, energy consumption, utility data
- **Appliances** - Home appliances, HVAC systems, smart devices
- **Programs** - Energy efficiency programs, rebates, incentives
- **Custom data** - Any additional fields specific to your business

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### **Environment Variables**
Ensure all environment variables are configured in your deployment platform:
- Supabase credentials and database URL
- Supabase project URL and anon key
- Any additional API keys for integrations

### **Database Migration**
- RLS policies are automatically applied via the setup script
- Custom fields are configurable through the UI
- Data migrations are handled through Supabase migrations

## 🔧 Development

### **Project Structure**
```
juno/
├── app/                    # Next.js App Router
│   ├── api/               # API routes for backend functionality
│   ├── dashboard/         # Main dashboard pages
│   ├── customers/         # Customer management pages
│   ├── team/              # Team management pages
│   ├── settings/          # Application settings pages
│   ├── agent/             # AI agent interface
│   ├── login/             # Authentication pages
│   ├── sign-up/           # User registration
│   └── organization-selection/ # Multi-tenant org selection
├── components/            # React components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── cards/             # Dashboard and feature cards
│   ├── modals/            # Modal components
│   ├── custom-fields/     # Custom field management
│   └── layout/            # Layout components
├── lib/                   # Utility functions and configurations
├── types/                 # TypeScript type definitions
├── utils/                 # Helper utilities and Supabase clients
├── supabase/              # Database scripts and documentation
├── scripts/               # Deployment and setup scripts
├── hooks/                 # Custom React hooks
└── public/                # Static assets and images
```

### **Development Commands**
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build optimized production bundle
npm run start        # Start production server
npm run lint         # Run ESLint for code quality
```

### **Code Standards**
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code quality enforcement with Next.js config
- **Component patterns** - Consistent React component architecture
- **File naming** - Kebab-case for files, PascalCase for components
- **Import organization** - Consistent import ordering and grouping

## 📈 Performance Optimizations

### **Frontend Optimizations**
- **Server-side rendering** - Fast initial page loads with SSR
- **Image optimization** - Next.js automatic image optimization
- **Bundle optimization** - Tree shaking and code splitting
- **Lazy loading** - Components loaded on demand
- **Caching strategies** - Optimized caching for API responses

### **Database Optimizations**
- **Indexed queries** - All tenant_id columns indexed for RLS
- **Query optimization** - Efficient Supabase queries
- **Connection pooling** - Optimal database connection management
- **Real-time subscriptions** - Efficient real-time data updates

### **Monitoring & Analytics**
- **Performance metrics** - Core Web Vitals tracking
- **Error tracking** - Comprehensive error logging
- **User analytics** - Usage pattern analysis
- **Database monitoring** - Query performance insights

## 🤝 Contributing

We welcome contributions to improve Juno! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with proper testing
4. **Commit your changes** (`git commit -m 'Add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request** with detailed description

### **Development Guidelines**
- Follow TypeScript best practices and maintain type safety
- Write comprehensive tests for new features
- Update documentation for any API changes
- Follow existing component patterns and architecture
- Ensure accessibility compliance (WCAG guidelines)
- Test multi-tenant functionality thoroughly

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

For support, questions, and detailed documentation:
- **README** - This comprehensive guide
- **Code Comments** - Inline documentation throughout the codebase
- **API Documentation** - Detailed API reference above
- **RLS Documentation** - See `supabase/RLS-README.md`
- **Issues** - Create GitHub issues for bugs and feature requests
- **Discussions** - Use GitHub Discussions for questions and ideas

## 🙏 Acknowledgments

This project is built with amazing open-source technologies:

- **[Next.js](https://nextjs.org/)** - The React framework for production
- **[Supabase](https://supabase.com/)** - The open source Firebase alternative
- **[Supabase](https://supabase.com/)** - Authentication, database, and user management
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[Recharts](https://recharts.org/)** - Composable charting library
- **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icons
- **[Vercel](https://vercel.com/)** - Platform for frontend frameworks

---

**Built with ❤️ for energy companies and sales teams worldwide**

*Juno - Empowering customer relationships through intelligent technology*

## 🔄 Recent Updates

- ✅ **Prisma Removed** - Migrated to pure Supabase implementation
- ✅ **RLS Enabled** - Database-level security with row-level policies  
- ✅ **Multi-tenant Architecture** - Complete organization isolation
- ✅ **AI Features** - Alex assistant with call logs, emails, and SMS
- ✅ **Performance Optimized** - Reduced bundle size and improved speed
- ✅ **TypeScript Enhanced** - Full type safety across the application

*Last updated: January 2025*
