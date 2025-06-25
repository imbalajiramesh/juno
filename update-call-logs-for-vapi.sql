-- Add Vapi integration fields to alex_call_logs table
ALTER TABLE alex_call_logs 
ADD COLUMN IF NOT EXISTS vapi_call_id TEXT,
ADD COLUMN IF NOT EXISTS voice_agent_id UUID REFERENCES voice_agents(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_vapi_id ON alex_call_logs(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_voice_agent ON alex_call_logs(voice_agent_id);

-- Add comments for documentation
COMMENT ON COLUMN alex_call_logs.vapi_call_id IS 'External Vapi call ID for voice agent calls';
COMMENT ON COLUMN alex_call_logs.voice_agent_id IS 'Reference to the voice agent that made this call'; 