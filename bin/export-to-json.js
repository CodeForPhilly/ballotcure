import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify required environment variables are present
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchAllBallots() {
  console.log('Fetching all ballot records...');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/phila_ballots?select=id_number,name,ward,division,birth_year,zip,ballot_status_reason,added`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ballots: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Fetched ${data.length} ballot records`);
  return data;
}

async function fetchDivisionStats() {
  console.log('Fetching division statistics...');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/phila_ballots_stats?select=division,count`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Fetched stats for ${data.length} divisions`);
  return data;
}

async function main() {
  try {
    // Fetch data
    const ballots = await fetchAllBallots();
    const stats = await fetchDivisionStats();

    // Define output paths
    const publicDataDir = join(__dirname, '..', 'public', 'data');
    const ballotsPath = join(publicDataDir, 'phila_ballots.json');
    const statsPath = join(publicDataDir, 'division_stats.json');

    // Save ballots data
    console.log(`Saving ballots to ${ballotsPath}...`);
    writeFileSync(ballotsPath, JSON.stringify(ballots, null, 2));
    console.log(`✓ Saved ${ballots.length} ballot records`);

    // Save stats data
    console.log(`Saving stats to ${statsPath}...`);
    writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`✓ Saved stats for ${stats.length} divisions`);

    // Print summary
    console.log('\n=== Export Summary ===');
    console.log(`Total ballot records: ${ballots.length}`);
    console.log(`Total divisions: ${stats.length}`);
    console.log(`Ballots file size: ${(JSON.stringify(ballots).length / 1024).toFixed(2)} KB`);
    console.log(`Stats file size: ${(JSON.stringify(stats).length / 1024).toFixed(2)} KB`);
    console.log('\nExport completed successfully!');

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
