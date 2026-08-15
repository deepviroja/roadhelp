const admin = require('../config/firebase');

/**
 * Bulk delete users by role (customers or providers)
 * Deletes from both Firestore and Firebase Auth
 */
async function deleteUsersByRole(req, res) {
  try {
    const { target } = req.body; // 'customers' | 'providers' | 'requests'

    // Only super admins can do this (permissions.length === 0 means all access, or permissions includes 'all')
    const profile = req.userProfile;
    const isSuperAdmin =
      profile?.isSuperAdmin === true ||
      !profile?.permissions ||
      profile?.permissions?.length === 0 ||
      profile?.permissions?.includes('all');

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only super administrators can perform this action.',
      });
    }

    if (!['customers', 'providers', 'requests'].includes(target)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target. Must be customers, providers, or requests.',
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    if (target === 'requests') {
      // Delete all service requests
      const snap = await db.collection('serviceRequests').get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return res.json({
        success: true,
        message: `Successfully deleted ${snap.size} service requests.`,
        deleted: snap.size,
      });
    }

    // For customers and providers: delete Firestore docs + Firebase Auth users
    const role = target === 'customers' ? 'customer' : 'provider';
    const snap = await db.collection('users').where('role', '==', role).get();

    if (snap.empty) {
      return res.json({
        success: true,
        message: `No ${role} accounts found to delete.`,
        deleted: 0,
      });
    }

    const uids = snap.docs.map((doc) => doc.id);

    // Delete Firestore documents in batches of 500
    const firestoreBatches = [];
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = db.batch();
      snap.docs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
      firestoreBatches.push(batch.commit());
    }
    await Promise.all(firestoreBatches);

    // Delete Firebase Auth users in batches of 1000
    let deletedAuthCount = 0;
    for (let i = 0; i < uids.length; i += 1000) {
      const chunk = uids.slice(i, i + 1000);
      try {
        const result = await auth.deleteUsers(chunk);
        deletedAuthCount += result.successCount;
      } catch (authErr) {
        console.warn('Some auth deletions failed:', authErr.message);
      }
    }

    // Log the action
    await db.collection('auditLogs').add({
      type: 'SUPER_ADMIN_BULK_DELETE',
      target,
      adminUid: req.user.uid,
      adminEmail: profile?.email || req.user.email,
      firestoreDeleted: uids.length,
      authDeleted: deletedAuthCount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: `Successfully deleted ${uids.length} ${role} accounts (${deletedAuthCount} auth users removed).`,
      deleted: uids.length,
      authDeleted: deletedAuthCount,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete bulk deletion.',
    });
  }
}

module.exports = { deleteUsersByRole };
