-- Fix existing organizations that should be marked as approved
-- This corrects the migration bug where existing orgs were left as 'pending'

UPDATE tenants 
SET 
    approval_status = 'approved',
    approved_at = created_at
WHERE approval_status = 'pending';

-- Verify the fix
SELECT 
    name,
    approval_status,
    created_at,
    approved_at
FROM tenants
ORDER BY created_at; 