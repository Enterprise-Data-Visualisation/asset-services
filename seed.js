const { supabase } = require('./db');

const initialAssets = [
    // Sites
    { id: 'site-1', name: 'Texas Refinery', type: 'Site', parentId: null },
    { id: 'site-2', name: 'Louisiana Chemical', type: 'Site', parentId: null },

    // Plants
    { id: 'plant-1', name: 'Plant Alpha', type: 'Plant', parentId: 'site-1' },
    { id: 'plant-2', name: 'Plant Beta', type: 'Plant', parentId: 'site-1' },
    { id: 'plant-3', name: 'Plant Gamma', type: 'Plant', parentId: 'site-2' },

    // Trains
    { id: 'train-1', name: 'Train 101', type: 'Train', parentId: 'plant-1' },
    { id: 'train-2', name: 'Train 102', type: 'Train', parentId: 'plant-1' },

    // Units
    { id: 'unit-1', name: 'Crude Unit', type: 'Unit', parentId: 'train-1' },
    { id: 'unit-2', name: 'Vacuum Unit', type: 'Unit', parentId: 'train-1' },

    // Signal Containers
    {
        id: 'cont-1',
        name: 'Temperature Sensors',
        type: 'Signal Container',
        parentId: 'unit-1',
    },
    {
        id: 'cont-2',
        name: 'Pressure Sensors',
        type: 'Signal Container',
        parentId: 'unit-1',
    },

    // Signals
    {
        id: 'sig-1',
        name: 'TI-1001 Inlet Temp',
        type: 'Signal',
        parentId: 'cont-1',
    },
    {
        id: 'sig-2',
        name: 'TI-1002 Outlet Temp',
        type: 'Signal',
        parentId: 'cont-1',
    },
    {
        id: 'sig-3',
        name: 'PI-2001 Header Press',
        type: 'Signal',
        parentId: 'cont-2',
    },
    {
        id: 'sig-4',
        name: 'PI-2002 Suction Press',
        type: 'Signal',
        parentId: 'cont-2',
    },
];

async function seed() {
    console.log('🌱 Starting Seed...');

    // 1. Create Assets Table? (Supabase is schemaless with JSONB, or use SQL Editor? 
    // We cannot create tables via JS client unless using RPC or if table exists. 
    // Wait, Supabase client allows CRUD but not DDL (CREATE TABLE) easily without SQL Editor.
    // HOWEVER, we can just insert and see if it works? No, Supabase needs table exists.

    // STRATEGY: Since I cannot run SQL DDL from here easily without postgres-connection string (password),
    // I will Instruct the user to run SQL in Dashboard OR I can use the trick:
    // IF the user hasn't created tables, this will fail.
    // BUT: I can try to use a standardized SQL snippet via user? 
    // OR: Does the user expect me to do it? 
    // Wait, I asked for Key/URL. I probably can't CREATE TABLES via API without Service Key maybe?
    // Actually, Anon key respects RLS.

    // Let's assume user defined table? No, user hasn't.
    // I'll try to just check connection first.

    // Checking if 'assets' table exists by selecting 
    const { error: checkError } = await supabase.from('assets').select('count').limit(1);

    if (checkError) {
        console.error('❌ Table "assets" not found or not accessible. Please create tables in Supabase Dashboard SQL Editor:');
        console.log(`
      CREATE TABLE assets (
          id text PRIMARY KEY,
          name text,
          type text,
          "parentId" text,
          children jsonb
      );
      
      CREATE TABLE snapshots (
          id text PRIMARY KEY,
          name text,
          "createdAt" text,
          "activeSignalIds" text[],
          "hiddenSignalIds" text[],
          "dateRange" text,
          "customColors" text
      );
      `);
        return;
    }

    // 2. Clear existing data (optional, or just upsert)
    console.log('Deleting existing assets...');
    const { error: delError } = await supabase.from('assets').delete().neq('id', 'technically_impossible_id'); // Delete all basically if policy allows

    // 3. Insert Data
    console.log('Inserting assets...');
    const { error: insertError } = await supabase.from('assets').upsert(initialAssets);

    if (insertError) {
        console.error('Error inserting assets:', insertError);
    } else {
        console.log('✅ Assets seeded successfully!');
    }
}

seed();
