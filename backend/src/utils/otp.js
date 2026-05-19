const crypto = require('crypto');

/**
 * Generate a numeric OTP of given length
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Calculate OTP expiry datetime
 */
function otpExpiry(minutes = 10) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/**
 * Simulate sending OTP via SMS
 * In production: integrate Twilio / MSG91 here
 */
async function sendOTP(phone, otp) {
  // MOCK: just log in dev
  console.log(`\n📱 [OTP SERVICE] → Sending OTP ${otp} to +91${phone}\n`);
  // TODO: replace with real SMS API
  return true;
}

module.exports = { generateOTP, otpExpiry, sendOTP };
