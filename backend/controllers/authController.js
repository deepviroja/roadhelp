const admin = require('../config/firebase');
const { getFrontendUrl, sendPasswordResetEmail } = require('../services/emailService');

exports.sendPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await admin.auth().getUserByEmail(email);
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${getFrontendUrl()}/login`,
    });

    await sendPasswordResetEmail({
      to: email,
      resetLink,
      fullName: user.displayName || user.email,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    const code = error?.code || error?.errorInfo?.code;
    if (code === 'auth/user-not-found') {
      return res.status(404).json({ success: false, message: 'No account found for that email address.' });
    }
    console.error('Password reset email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
