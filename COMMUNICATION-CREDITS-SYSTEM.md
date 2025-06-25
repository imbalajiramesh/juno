# Communication Credits System

## Overview

Your CRM uses a unified credits system to manage costs across all communication channels. Credits provide a simple, transparent way to pay for voice calls, phone numbers, emails, and SMS messages without exposing users to complex third-party pricing or technical details.

## 🎯 Key Benefits

- **Unified Billing**: One credit system for all communication services
- **Transparent Pricing**: Clear, fixed costs with no hidden fees
- **Simplified Management**: No need to manage multiple service accounts
- **Predictable Costs**: Integer-only credits make budgeting easy
- **Complete Isolation**: Each tenant has their own isolated communication infrastructure

## 💰 Pricing Structure

### Voice Communications
| Service | Cost | Description |
|---------|------|-------------|
| **Voice Calls** | 15 credits/minute | AI-powered voice conversations with customers |
| | | • 1-minute minimum billing |
| | | • Automatic transcription included |
| | | • Real-time conversation handling |

### Phone Numbers
| Service | Cost | Description |
|---------|------|-------------|
| **Setup Fee** | 500 credits | One-time cost per new phone number |
| **Monthly Rental** | 100 credits/month | Recurring charge to maintain the number |
| | | • Dedicated business phone numbers |
| | | • Automatic call routing to voice agents |
| | | • Full integration with CRM |

### Email Services
| Service | Cost | Description |
|---------|------|-------------|
| **Professional Emails** | 1 credit/email | Professional email delivery |
| | | • High deliverability rates |
| | | • Template support |
| | | • Tracking and analytics |

### SMS Messaging
| Service | Cost | Description |
|---------|------|-------------|
| **Outbound SMS** | 5 credits/message | Send messages to customers |
| **Inbound SMS** | 1 credit/message | Receive messages from customers |
| | | • Two-way messaging support |
| | | • Global delivery |
| | | • Automated response capabilities |

### WhatsApp Messaging (Future Feature)
| Service | Cost | Description |
|---------|------|-------------|
| **Outbound WhatsApp** | 3 credits/message | Send WhatsApp messages to customers |
| **Inbound WhatsApp** | 1 credit/message | Receive WhatsApp messages from customers |
| | | • Rich media support |
| | | • Global reach |
| | | • Business messaging features |

## 🏗️ System Architecture

### Complete Tenant Isolation

Each organization gets:
- **Dedicated Infrastructure**: Separate accounts for all services
- **Isolated Billing**: Credits and usage tracked independently
- **Secure Communications**: No cross-tenant data sharing
- **Independent Configuration**: Custom settings per organization

### Credit Management

**Balance Tracking**:
- Real-time credit balance monitoring
- Automatic deduction on service usage
- Detailed transaction history
- Low-balance notifications

**Transaction Types**:
- `purchase` - Credits added to account
- `call_charge` - Voice call usage
- `phone_number_charge` - Phone number fees
- `email_charge` - Email sending costs
- `sms_charge` - SMS messaging costs
- `whatsapp_charge` - WhatsApp messaging costs (future)
- `refund` - Credit returns
- `bonus` - Promotional credits

## 📱 User Interface

### Separated Settings Pages

**Voice Agents** (`/settings/voice-agents`):
- Create and manage AI voice agents
- Configure voice scripts and personas
- Test voice agent functionality
- Monitor agent performance

**Phone Numbers** (`/settings/phone-numbers`):
- Acquire dedicated business phone numbers
- Configure call routing and settings
- Monitor usage and billing dates
- Manage number status

**Credits & Billing** (`/settings/credits`):
- View current credit balance
- Purchase credit packages
- Review transaction history
- See pricing for all services

### No Third-Party Branding

The system provides a white-label experience:
- No mention of underlying service providers
- Branded as "your communication platform"
- Seamless integration with CRM interface
- Professional business appearance

## 🔄 Automatic Billing

### Voice Calls
- **When**: Credits deducted when call ends
- **Calculation**: Duration rounded up to nearest minute
- **Minimum**: 1-minute minimum charge
- **Includes**: Call recording, transcription, AI processing

### Phone Numbers
- **Setup**: Immediate deduction when number acquired
- **Monthly**: Automatic billing on anniversary date
- **Prorated**: No partial month charges

### Emails
- **When**: Credits deducted upon successful delivery
- **Failures**: No charge for failed deliveries
- **Retries**: No additional charge for automatic retries

### SMS Messages
- **Outbound**: Immediate deduction when message sent
- **Inbound**: Deducted when message received
- **Failed Messages**: No charge for delivery failures

## 📊 Usage Analytics

### Transaction History
- Complete audit trail of all credit usage
- Detailed descriptions for each transaction
- Date/time stamps for billing verification
- Service-specific categorization

### Balance Monitoring
- Real-time balance updates
- Low-balance warnings
- Usage trend analysis
- Projected monthly costs

## 🛡️ Insufficient Balance Protection

### Preventive Measures
- Balance checks before expensive operations
- Clear error messages for insufficient credits
- Graceful degradation of services
- No unexpected service interruptions

### Service Behavior
- **Voice Calls**: Prevented if balance too low
- **Phone Numbers**: Purchase blocked without sufficient credits
- **Emails**: Queued until credits available
- **SMS**: Sending disabled with clear notification

## 🚀 Getting Started

### Initial Setup
1. **Add Credits**: Start with starter package (500 credits)
2. **Create Voice Agent**: Set up your first AI assistant
3. **Get Phone Number**: Acquire a business number
4. **Test System**: Make test calls and send messages

### Recommended Starting Credits
- **Small Business**: 1,000 credits (~66 minutes of calls)
- **Growing Team**: 2,500 credits (~165 minutes of calls)
- **Enterprise**: 5,000+ credits for high volume

## 📈 Scalability

### Credit Packages

| Package | Credits | Price | Rate per Dollar | Description |
|---------|---------|-------|-----------------|-------------|
| **Starter** | 500 | $9.99 | 50.1 credits/$1 | Perfect for testing and small businesses |
| **Business** | 1,000 | $17.99 | 55.6 credits/$1 | Most popular choice for growing teams |
| **Professional** | 2,500 | $39.99 | 62.5 credits/$1 | Great value for active businesses |
| **Scale** | 5,000 | $69.99 | 71.4 credits/$1 | High volume usage with better rates |
| **Enterprise** | 10,000 | $119.99 | 83.3 credits/$1 | Best rate for enterprise customers |
| **Enterprise+** | 25,000 | $249.99 | 100.0 credits/$1 | Maximum value for large organizations |

**Volume Discount Structure**: The more credits you purchase, the better rate you receive per dollar.

### Volume Discounts
Future enhancements may include:
- Bulk credit purchase discounts
- Enterprise-tier pricing
- Committed usage plans
- Custom pricing for large organizations

## 🔧 Technical Implementation

### Database Schema
- **credit_balances**: Current balance per tenant
- **credit_transactions**: Complete transaction history
- **pricing_config**: Configurable service pricing
- **tenant_phone_numbers**: Phone number management
- **service_isolation**: Complete tenant separation

### API Integration
- Real-time balance checks
- Automatic deduction workflows
- Transaction logging
- Service provider abstraction

### Security Features
- Row Level Security (RLS) for data isolation
- Encrypted communication channels
- Audit trails for compliance
- Secure payment processing

## 🎯 Business Benefits

### For End Users
- **Simplified Billing**: One system for all communications
- **Predictable Costs**: Fixed credit pricing
- **Professional Experience**: White-label interface
- **Integrated Workflow**: Seamless CRM integration

### For Business Owners
- **Transparent Pricing**: No hidden service fees
- **Unified Management**: Single platform for all communications
- **Scalable Solution**: Grows with business needs
- **Complete Control**: Manage all communication settings

### For Developers
- **Clean Architecture**: Abstracted service integrations
- **Unified API**: Single interface for all communication types
- **Maintainable Code**: Separated concerns and clear interfaces
- **Extensible Design**: Easy to add new communication channels

## 🔮 Future Enhancements

### Planned Features
- **Video Calling**: Credits-based video communication
- **International SMS**: Global messaging capabilities
- **Advanced Analytics**: Detailed usage reporting
- **API Access**: Programmatic credit management
- **Integration Hub**: Connect with other business tools

### Advanced Billing
- **Subscription Plans**: Monthly credit allocations
- **Usage Alerts**: Automated balance notifications
- **Spending Limits**: Prevent overuse
- **Department Allocation**: Credits per team/department

This credits system provides a foundation for all current and future communication needs while maintaining simplicity and transparency for users. 