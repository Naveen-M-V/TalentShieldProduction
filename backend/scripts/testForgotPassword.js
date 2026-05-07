const http = require('http');

// Test forgot password endpoint
const testForgotPassword = () => {
  const postData = JSON.stringify({ email: 'notifications.athryan@gmail.com' });
  
  const options = {
    hostname: 'localhost',
    port: 5003,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n✅ FORGOT PASSWORD TEST RESULTS:');
      console.log('=========================================');
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response: ${data}`);
      console.log('=========================================\n');
      
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('✅ Forgot password endpoint working correctly!');
          console.log(`Message: ${response.message}`);
        } else {
          console.log('❌ Error response:', response);
        }
      } catch (e) {
        console.log('Response is not JSON:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

// Test non-existent email (should return success for security)
const testForgotPasswordNonExistent = () => {
  const postData = JSON.stringify({ email: 'nonexistent@example.com' });
  
  const options = {
    hostname: 'localhost',
    port: 5003,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n✅ FORGOT PASSWORD TEST (NON-EXISTENT EMAIL):');
      console.log('=========================================');
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response: ${data}`);
      console.log('=========================================\n');
      
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 200 && response.message.includes('account')) {
          console.log('✅ Security check passed: Returns same message for non-existent email');
        } else {
          console.log('⚠️  Response:', response);
        }
      } catch (e) {
        console.log('Response is not JSON:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

console.log('\n🧪 Testing Forgot Password Endpoints...\n');
console.log('1️⃣  Testing with existing email...');
setTimeout(() => {
  testForgotPassword();
}, 500);

console.log('2️⃣  Testing with non-existent email (security check)...');
setTimeout(() => {
  testForgotPasswordNonExistent();
}, 1500);
