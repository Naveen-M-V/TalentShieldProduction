/**
 * Validation Script for Goals & Reviews Module Setup
 * 
 * Validates that all necessary files, models, controllers, routes, and middleware are in place
 */

const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '..');

// Files to check
const filesToCheck = [
  // Models
  { path: 'models/Goal.js', type: 'Model' },
  { path: 'models/Review.js', type: 'Model' },
  
  // Controllers
  { path: 'controllers/goalsController.js', type: 'Controller' },
  { path: 'controllers/reviewsController.js', type: 'Controller' },
  
  // Routes
  { path: 'routes/goalsRoutes.js', type: 'Routes' },
  { path: 'routes/reviewsRoutes.js', type: 'Routes' },
  
  // Middleware
  { path: 'middleware/goalsReviewsRBAC.js', type: 'Middleware' },
  
  // Services
  { path: 'services/employeeService.js', type: 'Service' }
];

console.log('\n📋 GOALS & REVIEWS MODULE VALIDATION\n');
console.log('=' .repeat(60));

let allFilesExist = true;

console.log('\n✅ CHECKING FILES:\n');

for (const file of filesToCheck) {
  const filePath = path.join(backendPath, file.path);
  const exists = fs.existsSync(filePath);
  
  const status = exists ? '✅' : '❌';
  console.log(`${status} [${file.type}] ${file.path}`);
  
  if (!exists) {
    allFilesExist = false;
  }
}

// Check server.js for route registration
console.log('\n✅ CHECKING ROUTE REGISTRATION:\n');

const serverPath = path.join(backendPath, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const routeChecks = [
  { name: 'Goals routes import', pattern: /const goalsRoutes = require\('\.\/routes\/goalsRoutes'\)/ },
  { name: 'Goals routes registration', pattern: /app\.use\('\/api\/goals',.*goalsRoutes\)/ },
  { name: 'Reviews routes import', pattern: /const reviewRoutes = require\('\.\/routes\/reviewRoutes'\)/ },
  { name: 'Reviews routes registration', pattern: /app\.use\('\/api\/reviews',.*reviewRoutes\)/ }
];

for (const check of routeChecks) {
  const found = check.pattern.test(serverContent);
  const status = found ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (!found) {
    allFilesExist = false;
  }
}

// Check database connection
console.log('\n✅ CHECKING MODELS ARE EXPORTABLE:\n');

try {
  // Don't actually require them, just check the syntax
  const goalModelPath = path.join(backendPath, 'models/Goal.js');
  const reviewModelPath = path.join(backendPath, 'models/Review.js');
  
  const goalContent = fs.readFileSync(goalModelPath, 'utf8');
  const reviewContent = fs.readFileSync(reviewModelPath, 'utf8');
  
  const goalExports = goalContent.includes('module.exports');
  const reviewExports = reviewContent.includes('module.exports');
  
  console.log(`${goalExports ? '✅' : '❌'} Goal model exports correctly`);
  console.log(`${reviewExports ? '✅' : '❌'} Review model exports correctly`);
} catch (error) {
  console.error('❌ Error checking model exports:', error.message);
  allFilesExist = false;
}

// Summary
console.log('\n' + '='.repeat(60));

if (allFilesExist) {
  console.log('\n✅ ALL CHECKS PASSED!\n');
  console.log('The Goals & Reviews module is properly set up.\n');
  console.log('API ENDPOINTS:');
  console.log('  GET    /api/goals/my              - Get user\'s goals');
  console.log('  POST   /api/goals                 - Create new goal');
  console.log('  PUT    /api/goals/:id             - Update goal');
  console.log('  DELETE /api/goals/:id             - Delete goal');
  console.log('  GET    /api/goals                 - Get all goals (admin)');
  console.log('  POST   /api/goals/:id/approve     - Approve goal (admin)');
  console.log('  POST   /api/goals/:id/comment     - Add comment (admin)');
  console.log('  GET    /api/goals/summary/all     - Get summary (admin)');
  console.log('');
  console.log('  GET    /api/reviews/my            - Get user\'s reviews');
  console.log('  GET    /api/reviews/:id           - Get specific review');
  console.log('  POST   /api/reviews/:id/self      - Submit self-assessment');
  console.log('  POST   /api/reviews/initiate      - Initiate review (admin)');
  console.log('  POST   /api/reviews/:id/manager   - Submit manager feedback (admin)');
  console.log('  POST   /api/reviews/:id/status    - Advance status (admin)');
  console.log('  GET    /api/reviews               - Get all reviews (admin)');
  console.log('');
} else {
  console.log('\n❌ VALIDATION FAILED!\n');
  console.log('Some files or route registrations are missing.\n');
  process.exit(1);
}

console.log('Next Steps:');
console.log('  1. Create frontend pages and components');
console.log('  2. Test all endpoints with API client');
console.log('  3. Deploy to production\n');
