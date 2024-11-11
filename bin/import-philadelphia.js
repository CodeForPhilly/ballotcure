import fetch from 'node-fetch';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import process from 'process';

async function main() {
    try {
        // Step 1: Download the Excel file
        const response = await fetch('https://vote.phila.gov/media/2024_General_Election_Deficiency_List_.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 2: Parse Excel file
        const workbook = XLSX.read(buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Step 3 & 4: Convert to JSON and print each record
        const records = XLSX.utils.sheet_to_json(worksheet);
        records.forEach(record => {
            console.log(JSON.stringify(record));
        });
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
