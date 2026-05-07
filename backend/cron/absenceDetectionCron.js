const cron = require('node-cron');
const { runDailyAbsenceDetection } = require('../services/absenceDetectionService');

/**
 * ABSENCE DETECTION CRON JOB
 * Runs daily to detect absences, lateness, and overtime
 */

/**
 * Schedule daily absence detection
 * Runs at 12:00 PM every day to check previous day's attendance
 */
function scheduleAbsenceDetection() {
  // Run at 12:00 PM every day
  cron.schedule('0 12 * * *', async () => {
    console.log('🕐 Running daily absence detection...');
    try {
      await runDailyAbsenceDetection();
      console.log('✅ Daily absence detection completed');
    } catch (error) {
      console.error('❌ Daily absence detection failed:', error);
    }
  });

  console.log('✅ Absence detection cron job scheduled (12:00 PM daily)');
}

/**
 * Run absence detection immediately (for testing)
 */
async function runAbsenceDetectionNow() {
  console.log('🕐 Running absence detection now...');
  try {
    await runDailyAbsenceDetection();
    console.log('✅ Absence detection completed');
  } catch (error) {
    console.error('❌ Absence detection failed:', error);
  }
}

module.exports = {
  scheduleAbsenceDetection,
  runAbsenceDetectionNow
};
