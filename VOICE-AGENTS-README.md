# Voice Agents Feature

This feature allows you to create and manage AI voice agents for automated customer calls. The system integrates with Vapi (Voice AI Platform) to provide professional voice calling capabilities.

## Features

- **Create Voice Agents**: Build custom AI agents with personalized scripts
- **Voice Selection**: Choose from multiple professional voices (male/female, different accents)
- **Cost Estimation**: Track per-minute costs for budgeting
- **Call Management**: Initiate calls, track status, and view transcripts
- **Integration**: Seamless integration with your CRM data

## Setup

### 1. Vapi Account Setup

1. Sign up for a Vapi account at [https://dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Get your API credentials:
   - `VAPI_API_KEY`: Your Vapi API key
   - `VAPI_PHONE_NUMBER_ID`: Your Vapi phone number ID

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Voice Agent Integration (Vapi)
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
```

### 3. Database Setup

Run the voice agents schema:

```sql
-- Run the contents of voice-agents-schema.sql
-- Run add-vapi-org-to-tenants.sql
-- And update-call-logs-for-vapi.sql
```

### 4. Automatic Organization Creation

**NEW**: When you complete your organization setup, the system will automatically:
- Create a dedicated Vapi organization for your tenant
- Store the Vapi organization ID in your tenant record
- Use this organization for all voice agent operations

This provides complete isolation between different tenants using your CRM system.

## Usage

### Creating Voice Agents

1. Go to **Settings > Voice Agents**
2. Click **Create Agent**
3. Fill in the details:
   - **Agent Name**: Descriptive name for your agent
   - **Voice Selection**: Choose from available voices
   - **Script**: Write your conversation script with variables
   - **Cost per Minute**: Set your budget estimate

### Script Variables

Use these variables in your scripts:
- `[Customer Name]` - Customer's full name
- `[Company]` - Your company name
- `[Agent Name]` - The voice agent's name

Example script:
```
Hello [Customer Name], this is [Agent Name] calling from [Company]. 
I'm reaching out to follow up on your recent inquiry about our services. 
How are you doing today?
```

### Making Calls

Voice agents can be used to:
- Make outbound sales calls
- Follow up with leads
- Customer service callbacks
- Appointment reminders

## API Endpoints

- `GET /api/voice-agents` - List all voice agents
- `POST /api/voice-agents` - Create a new voice agent
- `DELETE /api/voice-agents/[id]` - Delete a voice agent
- `POST /api/voice-agents/[id]/call` - Initiate a call with the agent

## Webhook Integration

The system automatically handles Vapi webhooks at `/api/webhooks/vapi` to:
- Log call start/end times
- Record call transcripts
- Track call duration and costs
- Update call status in your CRM

## Cost Management

Voice agents show estimated costs per minute. Actual costs depend on:
- Voice provider (11labs, etc.)
- Call duration
- Geographic location of calls
- Your Vapi plan

## Troubleshooting

### "Voice agent not properly configured"
- Check that your Vapi credentials are set in environment variables
- Verify your Vapi account has sufficient credits
- Ensure your phone number is verified in Vapi

### Calls not connecting
- Verify the customer phone number format
- Check Vapi dashboard for call logs
- Ensure your webhook URL is accessible (use ngrok for local development)

### Missing transcripts
- Transcripts are updated via webhooks
- Check that webhooks are properly configured
- Verify the webhook URL is publicly accessible

## Development

For local development with webhooks:

1. Install ngrok: `npm install -g ngrok`
2. Start your app: `npm run dev`
3. Expose webhook endpoint: `ngrok http 3000`
4. Update webhook URL in Vapi dashboard to: `https://your-ngrok-url.ngrok.io/api/webhooks/vapi`

## Security

- Vapi credentials are never exposed to the frontend
- All API calls are tenant-isolated with dedicated Vapi organizations
- Each tenant gets their own Vapi organization for complete isolation
- Webhook endpoints validate incoming requests
- Call logs are protected by Row Level Security
- Voice agents are isolated per tenant in both the database and Vapi 