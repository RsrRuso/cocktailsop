
-- Add workspace_id to transfer_qr_codes table
ALTER TABLE transfer_qr_codes 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_qr_codes_workspace_id ON transfer_qr_codes(workspace_id);

-- Backfill workspace_id for existing transfer QR codes based on the store's workspace
UPDATE transfer_qr_codes tqr
SET workspace_id = s.workspace_id
FROM stores s
WHERE tqr.from_store_id = s.id
AND tqr.workspace_id IS NULL;
