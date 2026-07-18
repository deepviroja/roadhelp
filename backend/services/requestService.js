const admin = require('../config/firebase');
const crypto = require('crypto');
const { getFrontendUrl, sendWelcomeGuestEmail, sendMagicLinkEmail } = require('./emailService');

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

  const countryCode = data.countryCode || (phone.startsWith('+91') ? '+91' : phone.startsWith('+1') ? '+1' : '+91');
  const cleanPhone = data.phone || (phone.startsWith(countryCode) ? phone.slice(countryCode.length) : phone);

  try {
    let userRecord = null;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    let guestAccountCreated = false;
    let tempPassword = '';
    if (!userRecord) {
      tempPassword = crypto.randomBytes(12).toString('base64url');
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
        phone: cleanPhone,
        countryCode,
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

    // Generate single-use login magic token (10 minute expiry)
    const magicToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.collection('magicTokens').doc(magicToken).set({
      email,
      role: 'customer',
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const magicLink = `${getFrontendUrl()}/magic-login?token=${magicToken}`;
    let welcomeEmailSent = false;
    let welcomeEmailError = null;

    if (guestAccountCreated) {
      try {
        await sendWelcomeGuestEmail({
          to: email,
          fullName,
          password: tempPassword,
          magicLink,
        });
        welcomeEmailSent = true;
      } catch (emailError) {
        welcomeEmailError = emailError;
        console.error('Failed to send guest welcome email:', emailError);
      }
    } else {
      try {
        await sendMagicLinkEmail({
          to: email,
          fullName,
          magicLink,
        });
        welcomeEmailSent = true;
      } catch (emailError) {
        welcomeEmailError = emailError;
        console.error('Failed to send repeat guest magic link email:', emailError);
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
  if (status === 'inProgress') updateData.inProgressAt = adminTimestamp;
  if (status === 'completed') updateData.completedAt = adminTimestamp;
  if (status === 'cancelled') updateData.cancelledAt = adminTimestamp;
  
  if (status === 'arriving') {
    updateData.arrivingAt = adminTimestamp;
    // Generate unique 4-digit OTP if not already present
    const docSnap = await db.collection('serviceRequests').doc(requestId).get();
    if (docSnap.exists && !docSnap.data().arrivalOtp) {
      updateData.arrivalOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }
  }
  
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
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  // Validate price cap on completion
  const serviceSnap = await db.collection('services').doc(requestData.serviceType).get();
  if (serviceSnap.exists) {
    const serviceConfig = serviceSnap.data();
    if (finalPrice < serviceConfig.basePrice || finalPrice > serviceConfig.maxPrice) {
      throw new Error(`Service Base Amount must be between ${serviceConfig.basePrice} and ${serviceConfig.maxPrice}`);
    }
  }

  const totalPrice = finalPrice + (additionalFees || 0);
  const adminCommission = totalPrice * 0.15;
  const providerEarnings = totalPrice - adminCommission;
  
  await db.collection('serviceRequests').doc(requestId).update({
    status: 'completed',
    finalPrice,
    additionalFees,
    totalPrice,
    adminCommission,
    providerEarnings,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    payoutStatus: 'pending',
  });
};

exports.verifyArrivalOtp = async (requestId, otp) => {
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  if (requestData.status !== 'arriving') {
    throw new Error('Request status is not arriving');
  }

  if (!requestData.arrivalOtp || requestData.arrivalOtp !== otp.trim()) {
    throw new Error('Incorrect verification code.');
  }

  // Clear OTP and update status to inProgress
  await db.collection('serviceRequests').doc(requestId).update({
    status: 'inProgress',
    arrivalOtp: admin.firestore.FieldValue.delete(),
    inProgressAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.proposeAdditionalCosts = async (requestId, proposedAdditionalFees, reason) => {
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  if (requestData.status !== 'accepted' && requestData.status !== 'arriving' && requestData.status !== 'inProgress') {
    throw new Error('Cannot propose additional costs in this state');
  }

  // Validate price cap ranges on proposed base rate as well (just in case they propose costs when base rate isn't finalized yet)
  const serviceSnap = await db.collection('services').doc(requestData.serviceType).get();
  if (serviceSnap.exists) {
    const serviceConfig = serviceSnap.data();
    const currentBase = requestData.finalPrice || requestData.estimatedPrice || 0;
    if (currentBase < serviceConfig.basePrice || currentBase > serviceConfig.maxPrice) {
      throw new Error(`Current Service Base Rate (${currentBase}) is outside the admin price range of ${serviceConfig.basePrice} - ${serviceConfig.maxPrice}`);
    }
  }

  await db.collection('serviceRequests').doc(requestId).update({
    preApprovalStatus: requestData.status,
    status: 'pendingUserApproval',
    proposedAdditionalFees: Number(proposedAdditionalFees) || 0,
    proposedAdditionalReason: reason || '',
  });
};

exports.approveAdditionalCosts = async (requestId) => {
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  if (requestData.status !== 'pendingUserApproval') {
    throw new Error('No proposed costs pending approval');
  }

  const basePrice = requestData.finalPrice || requestData.estimatedPrice || 0;
  const newAdditionalFees = requestData.proposedAdditionalFees || 0;
  const totalPrice = basePrice + newAdditionalFees;

  await db.collection('serviceRequests').doc(requestId).update({
    status: requestData.preApprovalStatus || 'accepted',
    additionalFees: newAdditionalFees,
    totalPrice: totalPrice,
    proposedAdditionalFees: admin.firestore.FieldValue.delete(),
    proposedAdditionalReason: admin.firestore.FieldValue.delete(),
    preApprovalStatus: admin.firestore.FieldValue.delete(),
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
