/**
 * Password Generation Utility
 * Generates secure passwords for new users
 */

/**
 * Generate a random password with specified length
 * @param {number} length - Password length (minimum 6)
 * @returns {string} Generated password
 */
const generatePassword = (length = 8) => {
  // Ensure minimum length of 6
  const minLength = Math.max(6, length);
  
  // Character sets for password generation
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  // Combine all character sets
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each set
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = 4; i < minLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate a simple password (letters and numbers only)
 * @param {number} length - Password length (minimum 6)
 * @returns {string} Generated password
 */
const generateSimplePassword = (length = 8) => {
  const minLength = Math.max(6, length);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < minLength; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return password;
};

/**
 * Generate a secure password for new users (12 characters)
 * @returns {string} Generated secure password
 */
const generateSecurePassword = () => {
  return generatePassword(12);
};

module.exports = {
  generatePassword,
  generateSimplePassword,
  generateSecurePassword
};
