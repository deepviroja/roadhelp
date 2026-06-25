const admin = require('../config/firebase');
const crypto = require('crypto');
const { getFrontendUrl, sendWelcomeEmail } = require('./emailService');

const db = admin.firestore();
const auth = admin.auth();

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function serializeDoc(doc) {
  const data = doc.data();
  if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate().toISOString();
  if (data.acceptedAt?.toDate) data.acceptedAt = data.acceptedAt.toDate().toISOString();
  if (data.arrivingAt?.toDate) data.arrivingAt = data.arrivingAt.toDate().toISOString();
  if (data.inProgressAt?.toDate) data.inProgressAt = data.inProgressAt.toDate().toISOString();
  if (data.completedAt?.toDate) data.completedAt = data.completedAt.toDate().toISOString();
  if (data.cancelledAt?.toDate) data.cancelledAt = data.cancelledAt.toDate().toISOString();
  return { id: doc.id, ...data };
}

async function syncGuestCustomerAccount(data) {
  const email = String(data.customerEmail || '').trim().toLowerCase();
  if (!email) {
    return {
      customerId: data.customerId,
      guestAccountCreated: false,
      customerEmail: data.customerEmail,
      welcomeEmailSent: false,
    };
  }

  const fullName = String(data.customerName || '').trim() || email;
  const phone = String(data.customerPhone || '').trim();
  const phoneDigits = normalizeDigits(phone);
  const phoneE164 = phone.startsWith('+') ? phone : (phoneDigits ? `+${phoneDigits}` : phone);

  try {
    let userRecord = null;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    let guestAccountCreated = false;
    if (!userRecord) {
      const tempPassword = crypto.randomBytes(12).toString('base64url');
      userRecord = await auth.createUser({
        email,
        password: tempPassword,
        displayName: fullName,
      });
      guestAccountCreated = true;
    }

    const profileRef = db.collection('users').doc(userRecord.uid);
    await profileRef.set(
      {
        uid: userRecord.uid,
        fullName,
        email,
        phone,
        phoneDigits,
        phoneE164,
        role: 'customer',
        isGuest: true,
        guestSessionId: data.guestSessionId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(guestAccountCreated
          ? { createdAt: admin.firestore.FieldValue.serverTimestamp() }
          : {}),
        },
      { merge: true }
    );

    let welcomeEmailSent = false;
    let welcomeEmailError = null;
    if (guestAccountCreated) {
      const loginLink = `${getFrontendUrl()}/login`;
      try {
        const resetLink = await auth.generatePasswordResetLink(email, {
          url: loginLink,
        });

        await sendWelcomeEmail({
          to: email,
          fullName,
          loginLink,
          resetLink,
        });
        welcomeEmailSent = true;
      } catch (emailError) {
        welcomeEmailError = emailError;
        console.error('Failed to send guest welcome email:', {
          email,
          message: emailError?.message || emailError,
        });
      }
    }

    return {
      customerId: userRecord.uid,
      guestAccountCreated,
      customerEmail: email,
      welcomeEmailSent,
      ...(welcomeEmailError ? { welcomeEmailError: welcomeEmailError.message || String(welcomeEmailError) } : {}),
    };
  } catch (error) {
    console.warn('Guest account sync failed, continuing with booking:', error.message || error);
    return {
      customerId: data.customerId,
      guestAccountCreated: false,
      customerEmail: data.customerEmail,
      welcomeEmailSent: false,
    };
  }
}

exports.saveRequest = async (data) => {
  const guestSync = data.isGuest && data.customerEmail ? await syncGuestCustomerAccount(data) : null;
  const requestData = {
    ...data,
    customerId: guestSync?.customerId || data.customerId,
    customerEmail: guestSync?.customerEmail || data.customerEmail,
    guestAccountCreated: guestSync?.guestAccountCreated || false,
    welcomeEmailSent: guestSync?.welcomeEmailSent || false,
    ...(guestSync?.welcomeEmailError ? { welcomeEmailError: guestSync.welcomeEmailError } : {}),
    status: 'pending',
    isPaid: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('serviceRequests').add(requestData);
  return {
    id: docRef.id,
    ...data,
    customerId: requestData.customerId,
    customerEmail: requestData.customerEmail,
    guestAccountCreated: requestData.guestAccountCreated,
    welcomeEmailSent: requestData.welcomeEmailSent,
    ...(requestData.welcomeEmailError ? { welcomeEmailError: requestData.welcomeEmailError } : {}),
  };
};

exports.submitProposal = async (requestId, proposal) => {
  const proposalData = {
    ...proposal,
    requestId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const proposalRef = await db.collection('serviceRequests').doc(requestId).collection('proposals').add(proposalData);
  await db.collection('serviceRequests').doc(requestId).update({ status: 'bidding' });
  await db.collection('users').doc(proposal.providerId).update({ 'stats.applied': admin.firestore.FieldValue.increment(1) });
  return proposalRef.id;
};

exports.selectProposal = async (requestId, proposal) => {
  const adminTimestamp = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('serviceRequests').doc(requestId).update({
    status: 'accepted',
    providerId: proposal.providerId,
    providerName: proposal.providerName,
    providerPhone: proposal.providerPhone || '',
    providerVehicleNumber: proposal.providerVehicleNumber || '',
    providerRating: proposal.providerRating || 5,
    estimatedPrice: proposal.estimatedPrice || 0,
    additionalFees: proposal.additionalFees || 0,
    totalPrice: (proposal.estimatedPrice || 0) + (proposal.additionalFees || 0),
    acceptedAt: adminTimestamp,
  });
  await db.collection('users').doc(proposal.providerId).update({ 'stats.approved': admin.firestore.FieldValue.increment(1) });
};

exports.updateRequestStatus = async (requestId, status, extras = {}) => {
  const updateData = { status, ...extras };
  const adminTimestamp = admin.firestore.FieldValue.serverTimestamp();
  if (status === 'accepted') updateData.acceptedAt = adminTimestamp;
  if (status === 'arriving') updateData.arrivingAt = adminTimestamp;
  if (status === 'inProgress') updateData.inProgressAt = adminTimestamp;
  if (status === 'completed') updateData.completedAt = adminTimestamp;
  if (status === 'cancelled') updateData.cancelledAt = adminTimestamp;
  await db.collection('serviceRequests').doc(requestId).update(updateData);
};

exports.acceptRequest = async (requestId, profile) => {
  await db.collection('serviceRequests').doc(requestId).update({
    status: 'accepted',
    providerId: profile.uid,
    providerName: profile.fullName,
    providerPhone: profile.phone || '',
    providerVehicleNumber: profile.vehicleNumber || '',
    providerRating: profile.rating || 5,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.completeRequest = async (requestId, finalPrice, additionalFees) => {
  const totalPrice = finalPrice + (additionalFees || 0);
  const adminCommission = totalPrice * 0.15;
  const providerEarnings = totalPrice - adminCommission;
  
  await db.collection('serviceRequests').doc(requestId).update({
    status: 'completed',
    totalPrice,
    adminCommission,
    providerEarnings,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    payoutStatus: 'pending',
  });
};

exports.processPayment = async (requestId, tip) => {
  const docRef = db.collection('serviceRequests').doc(requestId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error('Request not found');
  const data = snap.data();
  
  await docRef.update({
    isPaid: true,
    tipAmount: tip || 0,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  if (data.providerId) {
    await db.collection('users').doc(data.providerId).update({
      totalEarnings: admin.firestore.FieldValue.increment((data.providerEarnings || 0) + (tip || 0)),
      totalJobs: admin.firestore.FieldValue.increment(1)
    });
  }
};

exports.submitRating = async (requestId, rating, review) => {
  await db.collection('serviceRequests').doc(requestId).update({ rating, review: review || '' });
};

exports.getCustomerRequests = async (customerId) => {
  const snap = await db.collection('serviceRequests')
    .where('customerId', '==', customerId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(serializeDoc);
};

exports.getProviderRequests = async (providerId) => {
  const snap = await db.collection('serviceRequests')
    .where('providerId', '==', providerId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(serializeDoc);
};

exports.getPendingRequests = async () => {
  const snap = await db.collection('serviceRequests')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(serializeDoc);
};

exports.getRequestById = async (requestId) => {
  const snap = await db.collection('serviceRequests').doc(requestId).get();
  if (!snap.exists) return null;
  return serializeDoc(snap);
};
