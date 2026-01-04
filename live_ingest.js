const { supabase } = require('./db');

// Config
const INTERVAL_MS = 2000; // 2 seconds
const DATA_RETENTION_HOURS = 24; // Keep raw data for 24 hours

// Signals to simulate
const SIGNALS = [
    { id: 'sig-1', base: 45, variance: 5 },
    { id: 'sig-2', base: 42, variance: 5 },
    { id: 'sig-3', base: 100, variance: 10 },
    { id: 'sig-4', base: 98, variance: 10 },
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

async function ingest() {
    console.log('⚡ Starting Live Ingestion...');
    console.log(`policy: Delete data older than ${DATA_RETENTION_HOURS} hours.`);

    setInterval(async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // 1. Generate new readings
        const readings = SIGNALS.map(sig => {
            const val = generateValue(sig.base, sig.variance);
            return {
                signal_id: sig.id,
                timestamp: timestamp,
                value: val,
                status: getStatus(val)
            };
        });

        // 2. Insert
        const { error } = await supabase.from('measurements').insert(readings);
        if (error) console.error('Insert Error:', error.message);
        else console.log(`[${timestamp}] Pushed ${readings.length} readings.`);

        // 3. Cleanup (Run roughly every minute to avoid spamming delete)
        // 3. Smart Cleanup (Runs roughly every minute)
        // Deletes high-frequency data older than 24h, ensures we stay free-tier eligible.
        // REQUIRES: User to run `create_cleanup_function.sql` in Supabase.
        if (now.getSeconds() < 2) {
            const { error } = await supabase.rpc('cleanup_measurements');
            if (error) {
                // Ignore error loop if function doesn't exist (User needs to run SQL)
                console.warn('Cleanup warning (Function missing?):', error.message);
            } else {
                console.log('🧹 Old high-freq data cleaned up.');
            }
        }

    }, INTERVAL_MS);
}

ingest();
