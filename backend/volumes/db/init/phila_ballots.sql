-- Create Philadelphia ballots table
CREATE TABLE IF NOT EXISTS phila_ballots (
    id_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ward TEXT NOT NULL,
    division TEXT NOT NULL,
    birth_year INTEGER,
    zip TEXT,
    ballot_status_reason TEXT,
    added INTEGER,
    -- Add useful indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS phila_ballots_ward_division_idx ON phila_ballots(ward, division);
CREATE INDEX IF NOT EXISTS phila_ballots_zip_idx ON phila_ballots(zip);
CREATE INDEX IF NOT EXISTS phila_ballots_ballot_status_idx ON phila_ballots(ballot_status_reason);

-- Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_phila_ballots_updated_at
    BEFORE UPDATE ON phila_ballots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE phila_ballots IS 'Stores Philadelphia voter registration and ballot status information';
COMMENT ON COLUMN phila_ballots.id_number IS 'Unique identifier for each voter';
COMMENT ON COLUMN phila_ballots.name IS 'Full name of the voter';
COMMENT ON COLUMN phila_ballots.ward IS 'Electoral ward number';
COMMENT ON COLUMN phila_ballots.division IS 'Electoral division identifier';
COMMENT ON COLUMN phila_ballots.birth_year IS 'Year of birth';
COMMENT ON COLUMN phila_ballots.zip IS 'ZIP/Postal code';
COMMENT ON COLUMN phila_ballots.ballot_status_reason IS 'Reason for current ballot status';
COMMENT ON COLUMN phila_ballots.added IS 'Timestamp code when record was added';
COMMENT ON COLUMN phila_ballots.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN phila_ballots.updated_at IS 'Timestamp when record was last updated';
