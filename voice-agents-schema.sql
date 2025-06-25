-- Voice Agents Table
-- This table stores AI voice agents created for automated calling

CREATE TABLE voice_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    voice TEXT NOT NULL, -- Voice identifier (jennifer, brian, etc.)
    script TEXT NOT NULL, -- The conversation script for the agent
    cost_per_minute DECIMAL(10,4) DEFAULT 0.15, -- Cost estimate per minute
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    vapi_agent_id TEXT, -- External Vapi agent ID for integration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voice_agents_tenant_id ON voice_agents(tenant_id);
CREATE INDEX idx_voice_agents_status ON voice_agents(status);
CREATE INDEX idx_voice_agents_vapi_id ON voice_agents(vapi_agent_id);

-- RLS (Row Level Security) policies
ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access voice agents from their tenant"
  ON voice_agents
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all voice agents"
  ON voice_agents
  FOR ALL
  TO service_role
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_voice_agents_updated_at
    BEFORE UPDATE ON voice_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_agents TO authenticated; 