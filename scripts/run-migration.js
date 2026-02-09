#!/usr/bin/env node

/**
 * Run SQL Migration Script via Supabase
 * Usage: node scripts/run-migration.js <migration-file.sql>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Error: Please provide migration file path');
  console.error('Usage: node scripts/run-migration.js <migration-file.sql>');
  process.exit(1);
}

const migrationPath = path.resolve(migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found: ${migrationPath}`);
  process.exit(1);
}

console.log('📁 Reading migration file:', migrationPath);
const sql = fs.readFileSync(migrationPath, 'utf8');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('\n🚀 Running migration...\n');
  
  // Split SQL into individual statements (rough split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    
    // Skip comment blocks and DO blocks
    if (stmt.includes('DO $$')) {
      console.log(`⏭️  Skipping DO block (${i + 1}/${statements.length})`);
      continue;
    }

    console.log(`▶️  Statement ${i + 1}/${statements.length}`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        // Try direct SQL execution for DDL statements
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql: stmt })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        console.log(`   ✅ Success (via HTTP)`);
        successCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Please review errors above.');
    console.log('   Tip: Run SQL manually in Supabase SQL Editor if needed.');
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
}

runMigration().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
