/**
 * Migration: Normalize TimeEntry status values to canonical hyphen form
 *
 * Background: The TimeEntry schema now uses hyphenated enum values
 * ('clocked-in', 'clocked-out', 'on-break'). Some legacy records may still
 * contain underscore values (e.g., 'clocked_in'). This script normalises
 * those old values so they pass validation with the current model enum.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node backend/scripts/migrate-timeentry-status.js
 *
 * Or against Atlas directly:
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/migrate-timeentry-status.js
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');

// Load environment config the same way the main server does
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('ERROR: No MONGODB_URI / MONGO_URI environment variable found.');
  process.exit(1);
}

// Mapping: old value -> canonical value
const STATUS_MAP = [
  { from: 'clocked_in',  to: 'clocked-in'  },
  { from: 'clocked_out', to: 'clocked-out' },
  { from: 'on_break',    to: 'on-break'    },
  { from: 'break',       to: 'on-break'    },
];

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log('Connected to MongoDB\n');

  const collection = mongoose.connection.collection('timeentries');

  let totalUpdated = 0;

  for (const { from, to } of STATUS_MAP) {
    const result = await collection.updateMany(
      { status: from },
      { $set: { status: to } }
    );
    const n = result.modifiedCount;
    totalUpdated += n;
    if (n > 0) {
      console.log(`  ${from} → ${to}: ${n} document(s) updated`);
    } else {
      console.log(`  ${from} → ${to}: 0 documents (already clean)`);
    }
  }

  console.log(`\nDone. Total documents updated: ${totalUpdated}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
