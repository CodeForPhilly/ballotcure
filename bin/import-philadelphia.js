import fetch from 'node-fetch';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import process from 'process';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Verify required environment variables are present
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Initialize Supabase client with superuser credentials
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertRecord(record) {
    const { data, error } = await supabase
        .from('phila_ballots')
        .upsert({
            id_number: record['ID Number'],
            name: record['Name'],
            ward: record['Ward'],
            division: record['Division'],
            birth_year: record['Birth Year'],
            zip: record['Zip'],
            ballot_status_reason: record['Ballot Status Reason'],
            added: record['Added']
        }, {
            onConflict: 'id_number'
        });

    if (error) {
        throw new Error(`Failed to insert record: ${error.message}`);
    }
    return data;
}

async function main() {
    try {
        // Step 1: Download the Excel file
        console.log('Downloading Excel file...');
        const response = await fetch('https://vote.phila.gov/media/2024_General_Election_Deficiency_List_.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 2: Parse Excel file
        console.log('Parsing Excel file...');
        const workbook = XLSX.read(buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Step 3: Convert to JSON and insert records
        console.log('Processing records...');
        const records = XLSX.utils.sheet_to_json(worksheet);
        let successCount = 0;
        let errorCount = 0;

        for (const record of records) {
            try {
                await insertRecord(record);
                successCount++;
                if (successCount % 100 === 0) {
                    console.log(`Processed ${successCount} records...`);
                }
            } catch (error) {
                console.error(`Error processing record:`, record, error.message);
                errorCount++;
            }
        }

        console.log(`\nImport completed:`);
        console.log(`- Successfully processed: ${successCount} records`);
        console.log(`- Failed to process: ${errorCount} records`);

    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}

main();
