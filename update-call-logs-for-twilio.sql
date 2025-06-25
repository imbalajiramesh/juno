-- Add Twilio call SID to call logs table
-- This allows tracking of both Twilio and Vapi call IDs

ALTER TABLE alex_call_logs 
ADD COLUMN twilio_call_sid TEXT;

-- Add index for performance
CREATE INDEX idx_alex_call_logs_twilio_call_sid ON alex_call_logs(twilio_call_sid);

-- Add comment
COMMENT ON COLUMN alex_call_logs.twilio_call_sid IS 'Twilio call SID for phone call tracking'; 