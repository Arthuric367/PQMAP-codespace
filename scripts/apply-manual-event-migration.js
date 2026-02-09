#!/usr/bin/env node

/**
 * Apply Manual Event Fields Migration
 * This script adds the required columns to pq_events table for the Create Voltage Dip Workspace
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addColumns() {
  console.log('🚀 Adding columns to pq_events table...\n');

  const columns = [
    { name: 'circuit_id', type: 'TEXT', description: 'Transformer circuit identifier (H1, H2, H3)' },
    { name: 'v1', type: 'DECIMAL(5,2)', description: 'Phase 1 voltage % remaining' },
    { name: 'v2', type: 'DECIMAL(5,2)', description: 'Phase 2 voltage % remaining' },
    { name: 'v3', type: 'DECIMAL(5,2)', description: 'Phase 3 voltage % remaining' },
    { name: 'min_volt_recorded', type: 'BOOLEAN DEFAULT false', description: 'Minimum voltage recorded flag' },
    { name: 'non_clp_system_fault', type: 'BOOLEAN DEFAULT false', description: 'External fault flag' },
    { name: 'false_event', type: 'BOOLEAN DEFAULT false', description: 'FR Trigger / false positive flag' }
  ];

  // Test if columns already exist
  console.log('🔍 Checking existing columns...');
  const { data: testData, error: testError } = await supabase
    .from('pq_events')
    .select('id, circuit_id, v1, v2, v3, min_volt_recorded, non_clp_system_fault, false_event')
    .limit(1);

  if (!testError) {
    console.log('✅ All columns already exist! No migration needed.');
    return;
  }

  // Identify missing columns from error message
  const missingColumns = [];
  columns.forEach(col => {
    if (testError.message.includes(col.name)) {
      missingColumns.push(col);
    }
  });

  if (missingColumns.length === 0) {
    console.log('❌ Unexpected error:', testError.message);
    process.exit(1);
  }

  console.log(`\n📋 Missing columns detected: ${missingColumns.map(c => c.name).join(', ')}`);
  console.log('\n⚠️  MANUAL ACTION REQUIRED:\n');
  console.log('Please run this SQL in your Supabase SQL Editor:\n');
  console.log('```sql');
  console.log('-- Add missing columns to pq_events table\n');
  
  missingColumns.forEach(col => {
    console.log(`ALTER TABLE pq_events ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    console.log(`COMMENT ON COLUMN pq_events.${col.name} IS '${col.description}';`);
    console.log('');
  });

  console.log('-- Add indexes for performance');
  console.log('CREATE INDEX IF NOT EXISTS idx_pq_events_circuit_id ON pq_events(circuit_id);');
  console.log('CREATE INDEX IF NOT EXISTS idx_pq_events_false_event ON pq_events(false_event) WHERE false_event = true;');
  console.log('```\n');

  console.log('📖 Full migration script available at:');
  console.log('   scripts/add_manual_event_fields.sql');
  console.log('\n💡 After running the SQL, re-run this script to verify.');
}

addColumns().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
