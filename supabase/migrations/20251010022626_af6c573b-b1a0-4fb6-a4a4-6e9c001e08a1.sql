-- Add received_at column to transfers table to track when inventory was received
ALTER TABLE transfers ADD COLUMN received_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add transfer_date column to distinguish transfer initiation from receive
ALTER TABLE transfers ADD COLUMN transfer_date TIMESTAMP WITH TIME ZONE DEFAULT now();