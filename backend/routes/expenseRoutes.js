const express = require('express');
const router = express.Router();
const multer = require('multer');
const expenseController = require('../controllers/expenseController');

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
    }
  }
});

// Get employee's own expenses
router.get('/', expenseController.getMyExpenses);

// Get expenses pending approval (manager/admin only)
router.get('/approvals', expenseController.getPendingApprovals);

// Get approved expenses (manager/admin only)
router.get('/approved', expenseController.getApprovedExpenses);

// Get rejected/declined expenses (manager/admin only)
router.get('/rejected', expenseController.getRejectedExpenses);

// Export expenses to CSV
router.post('/export/csv', expenseController.exportToCSV);

// Get single expense by ID - MUST come after specific routes
router.get('/:id', expenseController.getExpenseById);

// Create new expense claim
router.post('/', expenseController.createExpense);

// Update expense (only pending expenses)
router.put('/:id', expenseController.updateExpense);

// Delete expense (only pending expenses)
router.delete('/:id', expenseController.deleteExpense);

// Approve expense (manager/admin only)
router.post('/:id/approve', expenseController.approveExpense);

// Decline expense (manager/admin only)
router.post('/:id/decline', expenseController.declineExpense);

// Mark expense as paid (admin only)
router.post('/:id/pay', expenseController.markAsPaid);

// Revert expense to pending (admin only)
router.post('/:id/revert', expenseController.revertToPending);

// Upload attachment to expense
router.post('/:id/attachments', upload.single('file'), expenseController.uploadAttachment);

// Delete attachment from expense
router.delete('/:id/attachments/:attachmentId', expenseController.deleteAttachment);

// Get attachment file
router.get('/:id/attachments/:attachmentId', expenseController.getAttachment);

module.exports = router;
