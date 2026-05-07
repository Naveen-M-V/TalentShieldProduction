const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TimeEntry = require('../models/TimeEntry');

const migrate = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI not found in environment');
        }

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const statusMap = {
            'clocked_in': 'clocked-in',
            'on_break': 'on-break',
            'clocked_out': 'clocked-out',
            'break': 'on-break',
            'CLOCK_IN': 'clocked-in',
            'ON_BREAK': 'on-break',
            'CLOCK_OUT': 'clocked-out'
        };

        const entries = await TimeEntry.find({
            status: { $in: Object.keys(statusMap) }
        });

        console.log(`Found ${entries.length} entries to migrate`);

        let updatedCount = 0;
        for (const entry of entries) {
            const newStatus = statusMap[entry.status];
            if (newStatus) {
                entry.set('status', newStatus);
                // Temporarily disable validation if needed, but 'clocked-in' is in the enum
                await entry.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} entries`);

        // Also check Objective/Goal statuses if they exist in the DB
        // But the user specifically approved TimeEntry status migration.
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
