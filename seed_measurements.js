const { supabase } = require('./db');

// Config
const DAYS_HISTORY = 365;
const BATCH_SIZE = 1000;

// Signals to simulate
const SIGNALS = [
    { id: 'sig-1', base: 45, variance: 5 }, // Temp
    { id: 'sig-2', base: 42, variance: 5 }, // Temp
    { id: 'sig-3', base: 100, variance: 10 }, // Press
    { id: 'sig-4', base: 98, variance: 10 }, // Press
];

function generateValue(base, variance) {
    const val = base + (Math.random() * variance * 2 - variance);
    return Number(val.toFixed(2));
}

function getStatus(val) {
    if (val > 110) return 'critical';
    if (val > 105) return 'high';
    return 'normal';
}

async function seedMeasurements() {
    console.log(`🌱 Seeding ${DAYS_HISTORY} days of hourly measurements...`);

    const now = new Date();
    const startTime = new Date(now.getTime() - DAYS_HISTORY * 24 * 60 * 60 * 1000);

    let currentBatch = [];
    let totalInserted = 0;

    // Iterate hour by hour
    for (let t = startTime.getTime(); t <= now.getTime(); t += 60 * 60 * 1000) {
        const timestamp = new Date(t).toISOString();

        for (const sig of SIGNALS) {
            const val = generateValue(sig.base, sig.variance);
            currentBatch.push({
                signal_id: sig.id,
                timestamp: timestamp,
                value: val,
                status: getStatus(val)
            });
        }

        if (currentBatch.length >= BATCH_SIZE) {
            const { error } = await supabase.from('measurements').insert(currentBatch);
            if (error) {
                console.error('Error inserting batch:', error);
                return;
            }
            totalInserted += currentBatch.length;
            process.stdout.write(`\rInserted: ${totalInserted} rows...`);
            currentBatch = [];
        }
    }

    // Final batch
    if (currentBatch.length > 0) {
        await supabase.from('measurements').insert(currentBatch);
        totalInserted += currentBatch.length;
    }

    console.log(`\n✅ Done! Inserted ${totalInserted} measurements.`);
}

seedMeasurements();
