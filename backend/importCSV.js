/**
 * importCSV.js - Import CSV data into DB1 (voter_db.voters)
 * Maps CSV fields to voter schema.
 * Run: node importCSV.js
 */

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { getVoterCollection, closeConnections } = require('./db');

async function importCSV() {
    const csvFilePath = path.join(__dirname, 'demo data base.csv');
    console.log('📄 Reading CSV file:', csvFilePath);

    if (!fs.existsSync(csvFilePath)) {
        console.error('❌ CSV file not found:', csvFilePath);
        process.exit(1);
    }

    const records = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                const record = {
                    voterId: (row.epicNumber || '').trim(),
                    name: (row.applicantFirstName || '').trim(),
                    age: row.age_x ? parseInt(row.age_x, 10) : null,
                    gender: (row.gender_x || '').trim(),
                    relationName: (row.relationName || '').trim(),
                    relationType: (row.relationType || '').trim(),
                    mobile: '',  // Not in CSV - can be added later
                    area: `${(row.asmblyName || '').trim()}, ${(row.districtValue || '').trim()}`,
                    assemblyName: (row.asmblyName || '').trim(),
                    partNumber: row.partNumber ? parseInt(row.partNumber, 10) : null,
                    acNumber: row.acNumber ? parseInt(row.acNumber, 10) : null,
                    parliamentName: (row.prlmntName || '').trim(),
                    parliamentNo: row.prlmntNo ? parseInt(row.prlmntNo, 10) : null,
                    district: (row.districtValue || '').trim(),
                    state: (row.stateName || '').trim(),
                    status: 'Active',
                    importedAt: new Date()
                };
                records.push(record);
            })
            .on('end', async () => {
                console.log(`📊 Parsed ${records.length} records from CSV.`);
                try {
                    const collection = await getVoterCollection();

                    const existingCount = await collection.countDocuments();
                    if (existingCount > 0) {
                        console.log(`⚠️  Collection has ${existingCount} existing documents. Clearing...`);
                        await collection.deleteMany({});
                    }

                    const result = await collection.insertMany(records);
                    console.log(`✅ Inserted ${result.insertedCount} voter records into DB1!`);

                    // Create indexes
                    await collection.createIndex({ voterId: 1 }, { unique: true });
                    await collection.createIndex({ name: 1 });
                    await collection.createIndex({ area: 1 });
                    await collection.createIndex({ district: 1 });
                    await collection.createIndex({ assemblyName: 1 });
                    console.log('📇 Indexes created successfully.');

                    await closeConnections();
                    resolve(result);
                } catch (error) {
                    console.error('❌ Insert error:', error.message);
                    await closeConnections();
                    reject(error);
                }
            })
            .on('error', (error) => {
                console.error('❌ CSV error:', error.message);
                reject(error);
            });
    });
}

importCSV()
    .then(() => { console.log('\n🎉 CSV import complete!'); process.exit(0); })
    .catch((err) => { console.error('\n💥 Import failed:', err.message); process.exit(1); });
