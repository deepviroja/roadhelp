const admin = require('../config/firebase');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization header missing or invalid.' });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    // Load user role and profile from Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Auto-grant and persist superadmin access for admin@roadhelp.com
      if (userData.email === 'admin@roadhelp.com' && (!userData.permissions || !userData.permissions.includes('all') || !userData.isSuperAdmin)) {
        userData.permissions = ['all'];
        userData.isSuperAdmin = true;
        await admin.firestore().collection('users').doc(decodedToken.uid).update({
          permissions: ['all'],
          isSuperAdmin: true
        });
      }

      req.userProfile = { uid: decodedToken.uid, ...userData };
      req.userRole = req.userProfile.role || 'customer';
    } else {
      req.userRole = 'customer';
    }

    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

