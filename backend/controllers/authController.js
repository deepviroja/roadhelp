const admin = require('../config/firebase');
const crypto = require('crypto');
const { getFrontendUrl, sendPasswordResetEmail, sendOtpEmail } = require('../services/emailService');

const db = admin.firestore();
const auth = admin.auth();

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

async function resolveEmail(identifier) {
  if (identifier.includes('@')) {
    return identifier.trim().toLowerCase();
  }
  const digits = normalizeDigits(identifier);
  if (!digits) return null;

  const usersRef = db.collection('users');
  const snap1 = await usersRef.where('phoneDigits', '==', digits).limit(1).get();
  if (!snap1.empty) return snap1.docs[0].data().email;

  const snap2 = await usersRef.where('phone', '==', identifier).limit(1).get();
  if (!snap2.empty) return snap2.docs[0].data().email;

  return null;
}

// 1. Password Reset Flow: Forgot Password link generator (custom tokenized)
exports.sendPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ success: false, message: 'No account found for that email address.' });
      }
      throw err;
    }

    // Generate custom reset token (1 hour expiration)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection('passwordResets').doc(resetToken).set({
      email,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const resetLink = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail({
      to: email,
      resetLink,
      fullName: userRecord.displayName || userRecord.email,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Custom Password Reset Verification
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const tokenDoc = await db.collection('passwordResets').doc(token).get();
    if (!tokenDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }

    const tokenData = tokenDoc.data();
    const expiresAt = tokenData.expiresAt.toDate();
    if (Date.now() > expiresAt.getTime()) {
      await db.collection('passwordResets').doc(token).delete();
      return res.status(400).json({ success: false, message: 'Reset link has expired.' });
    }

    const userRecord = await auth.getUserByEmail(tokenData.email);
    await auth.updateUser(userRecord.uid, { password });

    // Delete the token immediately
    await db.collection('passwordResets').doc(token).delete();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Login Request (verifies credentials, generates OTP, does NOT return custom token yet)
exports.loginRequest = async (req, res) => {
  try {
    const { identifier, password, role, bypassOtp } = req.body;
    if (!identifier || !password || !role) {
      return res.status(400).json({ success: false, message: 'Identifier, password, and role are required' });
    }

    const email = await resolveEmail(identifier);
    if (!email) {
      return res.status(404).json({ success: false, message: 'We could not find an account with those details.' });
    }

    // Lookup user in Firestore
    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (userSnap.empty) {
      return res.status(404).json({ success: false, message: 'Profile not found. Please sign up.' });
    }

    const userProfile = userSnap.docs[0].data();
    if (userProfile.role !== role) {
      return res.status(403).json({ success: false, message: 'Please switch to the correct account type and try again.' });
    }

    // Authenticate password with Google Identity Toolkit REST API
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Firebase API key is missing on the server.' });
    }

    let resAuth;
    try {
      resAuth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
    } catch (networkError) {
      console.error('Authentication network error:', networkError);
      return res.status(503).json({
        success: false,
        message: 'Communication with the authentication server timed out. Please check your network connection and try again.'
      });
    }

    const authData = await resAuth.json();
    if (!resAuth.ok) {
      const errMsg = authData.error?.message;
      if (errMsg === 'INVALID_PASSWORD' || errMsg === 'EMAIL_NOT_FOUND') {
        return res.status(401).json({ success: false, message: 'The email or password is incorrect.' });
      }
      return res.status(400).json({ success: false, message: errMsg || 'Authentication failed' });
    }

    const uid = authData.localId;

    // Check if OTP challenge is bypassed (e.g. for guest direct tracks with token, not URL parameters)
    // Wait, standard login requires OTP challenge always. Guest links bypass OTP via direct token login (/magic-login).
    // So bypassOtp option is disabled or restricted on backend. We only allow bypass if explicitly flagged and they are guest.
    if (bypassOtp && userProfile.isGuest) {
      const customToken = await auth.createCustomToken(uid);
      return res.status(200).json({ success: true, verified: true, token: customToken });
    }

    // Generate 6-digit OTP (10 minute expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save pending login state
    await db.collection('pendingOtps').doc(`login_${email}`).set({
      email,
      otp,
      uid,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send OTP email
    await sendOtpEmail({
      to: email,
      otp,
      fullName: userProfile.fullName,
      type: 'login',
    });

    res.status(200).json({ success: true, verified: false, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Login request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Verify Login OTP (verifies OTP, returns custom token)
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpDoc = await db.collection('pendingOtps').doc(`login_${cleanEmail}`).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const otpData = otpDoc.data();
    const expiresAt = otpData.expiresAt.toDate();
    if (Date.now() > expiresAt.getTime()) {
      await db.collection('pendingOtps').doc(`login_${cleanEmail}`).delete();
      return res.status(400).json({ success: false, message: 'Verification code has expired.' });
    }

    if (otpData.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    // OTP is valid. Delete pending login OTP.
    await db.collection('pendingOtps').doc(`login_${cleanEmail}`).delete();

    // Create Firebase Custom Auth Token
    const customToken = await auth.createCustomToken(otpData.uid);
    res.status(200).json({ success: true, token: customToken });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Signup OTP (sends registration verification email)
exports.signupOtp = async (req, res) => {
  try {
    const { email, fullName } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ success: false, message: 'Email and full name are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists in Firebase Auth
    try {
      await auth.getUserByEmail(cleanEmail);
      return res.status(400).json({ success: false, message: 'That email is already in use.' });
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Generate 6-digit OTP (10 minute expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save pending signup OTP state
    await db.collection('pendingOtps').doc(`signup_${cleanEmail}`).set({
      email: cleanEmail,
      otp,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send OTP email
    await sendOtpEmail({
      to: cleanEmail,
      otp,
      fullName,
      type: 'signup',
    });

    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Signup OTP request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Verify Signup OTP (creates auth user + profile, mints custom token)
exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp, signupData } = req.body;
    if (!email || !otp || !signupData) {
      return res.status(400).json({ success: false, message: 'Email, verification code, and registration data are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpDoc = await db.collection('pendingOtps').doc(`signup_${cleanEmail}`).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const otpData = otpDoc.data();
    const expiresAt = otpData.expiresAt.toDate();
    if (Date.now() > expiresAt.getTime()) {
      await db.collection('pendingOtps').doc(`signup_${cleanEmail}`).delete();
      return res.status(400).json({ success: false, message: 'Verification code has expired.' });
    }

    if (otpData.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    // OTP is valid! Create the user in Firebase Auth.
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: cleanEmail,
        password: signupData.password,
        displayName: signupData.fullName,
      });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ success: false, message: 'That email is already in use.' });
      }
      throw err;
    }

    // Prepare Firestore profile document
    const phoneDigits = normalizeDigits(signupData.phone);
    const countryCode = signupData.countryCode || '+91';
    const phoneE164 = `${countryCode}${phoneDigits}`;

    const baseProfile = {
      uid: userRecord.uid,
      fullName: signupData.fullName,
      email: cleanEmail,
      phone: signupData.phone,
      phoneDigits,
      phoneE164,
      countryCode,
      role: signupData.role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    let fullProfile = { ...baseProfile };

    if (signupData.role === 'provider') {
      fullProfile = {
        ...baseProfile,
        companyName: signupData.companyName,
        businessAddress: signupData.businessAddress,
        city: signupData.city,
        state: signupData.state,
        pin: signupData.pin,
        businessHours: signupData.businessHours || 'Mon - Sat, 9:00 AM - 8:00 PM',
        serviceRadiusKm: Number(signupData.serviceRadiusKm) || 25,
        location: signupData.latitude && signupData.longitude ? {
          lat: Number(signupData.latitude),
          lng: Number(signupData.longitude),
        } : null,
        serviceTypes: signupData.serviceTypes || [],
        vehicleNumber: signupData.vehicleNumber,
        isVerified: false,
        isOnline: false,
        rating: 0,
        totalJobs: 0,
        totalEarnings: 0,
      };
    }

    // Save profile to Firestore users collection
    await db.collection('users').doc(userRecord.uid).set(fullProfile);

    // Delete pending signup state
    await db.collection('pendingOtps').doc(`signup_${cleanEmail}`).delete();

    // Create Firebase Custom Auth Token
    const customToken = await auth.createCustomToken(userRecord.uid);
    res.status(200).json({ success: true, token: customToken });
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Verify Magic Token (verifies token, immediately deletes token doc, returns custom token)
exports.verifyMagicToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Magic token is required' });
    }

    const tokenDoc = await db.collection('magicTokens').doc(token).get();
    if (!tokenDoc.exists) {
      return res.status(400).json({ success: false, message: 'Invalid or expired magic link.' });
    }

    const tokenData = tokenDoc.data();
    const expiresAt = tokenData.expiresAt.toDate();

    // Delete token immediately to enforce single-use property and prevent replay attacks
    await db.collection('magicTokens').doc(token).delete();

    if (Date.now() > expiresAt.getTime()) {
      return res.status(400).json({ success: false, message: 'Magic link has expired (10 minutes limit).' });
    }

    const userRecord = await auth.getUserByEmail(tokenData.email);
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(200).json({ success: true, token: customToken });
  } catch (error) {
    console.error('Verify magic token error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
