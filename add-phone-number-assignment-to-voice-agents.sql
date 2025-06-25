-- Add phone number assignment to voice agents
-- This allows users to assign specific phone numbers to different voice agents

ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES tenant_phone_numbers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_voice_agents_phone_number ON voice_agents(phone_number_id);

-- Add comment for documentation
COMMENT ON COLUMN voice_agents.phone_number_id IS 'Assigned phone number for this voice agent. If NULL, uses any available phone number.';

-- Allow multiple agents to use the same phone number (many-to-one relationship)
-- This is useful for different agents handling different types of calls on the same number 