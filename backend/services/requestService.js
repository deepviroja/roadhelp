const admin = require('../config/firebase');
const crypto = require('crypto');
const { getFrontendUrl, sendWelcomeGuestEmail, sendMagicLinkEmail } = require('./emailService');

const db = admin.firestore();
const auth = admin.auth();

function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRequestVisibilityHours(sysConfig) {
  const rawHours =
    sysConfig.requestVisibilityHours ??
    sysConfig.requestVisibilityWindowHours ??
    sysConfig.requestExpiryHours ??
    24;
  const hours = Number(rawHours);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

function getTimestampMillis(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isRequestWithinVisibilityWindow(request, visibilityHours) {
  const createdAtMs = getTimestampMillis(request.createdAt);
  if (!createdAtMs) return true;
  const visibilityMs = visibilityHours * 60 * 60 * 1000;
  return Date.now() - createdAtMs <= visibilityMs;
}

async function getSystemConfig() {
  const sysSnap = await db.collection('system').doc('config').get();
  return sysSnap.exists ? sysSnap.data() : {};
}

const ALLOWED_TRANSITIONS = {
  draft: ['submitted', 'searching_providers', 'cancelled'],
  pending: ['submitted', 'searching_providers', 'offers_received', 'bidding', 'accepted', 'cancelled'],
  submitted: ['searching_providers', 'offers_received', 'bidding', 'accepted', 'cancelled'],
  searching_providers: ['offers_received', 'bidding', 'provider_selected', 'accepted', 'cancelled', 'expired'],
  offers_received: ['provider_selected', 'accepted', 'cancelled', 'expired'],
  bidding: ['offers_received', 'provider_selected', 'accepted', 'cancelled', 'expired'],
  provider_selected: ['accepted', 'provider_en_route', 'cancelled'],
  accepted: ['provider_en_route', 'arriving', 'provider_arrived', 'cancelled'],
  arriving: ['inProgress', 'in_progress', 'cancelled'],
  provider_en_route: ['provider_arrived', 'arriving', 'inProgress', 'cancelled'],
  provider_arrived: ['inProgress', 'in_progress', 'cancelled'],
  inProgress: ['completed', 'pendingUserApproval', 'cancelled'],
  in_progress: ['completed', 'pendingUserApproval', 'cancelled'],
  pendingUserApproval: ['inProgress', 'in_progress', 'accepted', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

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

function sanitizeForUser(request, user) {
  if (!request) return null;
  if (!user) {
    const { customerPhone, customerEmail, providerPhone, ...publicInfo } = request;
    return publicInfo;
  }
  const isCustomerOwner = request.customerId === user.uid;
  const isAssignedProvider = request.providerId === user.uid;
  const isAdmin = user.role === 'admin';
  const isOpenStatus = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'].includes(request.status);
  const isEligibleProvider = user.role === 'provider' && isOpenStatus;

  if (isCustomerOwner || isAssignedProvider || isAdmin || isEligibleProvider) {
    return request;
  }

  const { customerPhone, customerEmail, providerPhone, ...redacted } = request;
  return redacted;
}

async function expireRequestIfNeeded(requestRef, requestData, sysConfig) {
  if (!requestData || ['completed', 'cancelled', 'expired'].includes(requestData.status)) {
    return requestData;
  }

  const visibilityHours = getRequestVisibilityHours(sysConfig);
  if (isRequestWithinVisibilityWindow(requestData, visibilityHours)) {
    return requestData;
  }

  await requestRef.update({
    status: 'expired',
    expiredAt: admin.firestore.FieldValue.serverTimestamp(),
    closedReason: 'visibility_window_expired',
  });
  return { ...requestData, status: 'expired' };
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
  const sysConfig = await getSystemConfig();
  const visibilityHours = getRequestVisibilityHours(sysConfig);
  const requestData = {
    ...data,
    customerId: guestSync?.customerId || data.customerId,
    anonymousCustomerId: data.customerId || null,
    customerEmail: guestSync?.customerEmail || data.customerEmail,
    guestAccountCreated: guestSync?.guestAccountCreated || false,
    welcomeEmailSent: guestSync?.welcomeEmailSent || false,
    ...(guestSync?.welcomeEmailError ? { welcomeEmailError: guestSync.welcomeEmailError } : {}),
    status: 'submitted',
    isPaid: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    visibilityHours,
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + visibilityHours * 60 * 60 * 1000)),
  };

  // Clean undefined properties to prevent Firestore insert crashes
  Object.keys(requestData).forEach((key) => {
    if (requestData[key] === undefined) {
      delete requestData[key];
    }
  });

  const docRef = await db.collection('serviceRequests').add(requestData);
  return {
    id: docRef.id,
    ...data,
    customerId: requestData.customerId,
    customerEmail: requestData.customerEmail,
    guestAccountCreated: requestData.guestAccountCreated,
    welcomeEmailSent: requestData.welcomeEmailSent,
  };
};

exports.getEligibleRequestsForProvider = async (providerUid) => {
  const providerSnap = await db.collection('users').doc(providerUid).get();
  if (!providerSnap.exists) throw new Error('Provider account not found');
  const provider = providerSnap.data();

  if (provider.role !== 'provider') throw new Error('User is not a service provider');
  if (provider.isVerified === false) return [];
  if (provider.isOnline === false) return [];

  const sysConfig = await getSystemConfig();
  const defaultRadius = Number(sysConfig.defaultServiceRadiusKm || sysConfig.serviceRadiusKm) || 15;
  const providerRadius = Number(provider.serviceRadiusKm) || defaultRadius;

  const providerLat = provider.location?.lat;
  const providerLng = provider.location?.lng;

  const openStatuses = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'];
  const snap = await db.collection('serviceRequests')
    .where('status', 'in', openStatuses)
    .get();

  const eligibleRequests = [];
  for (const doc of snap.docs) {
    const req = serializeDoc(doc);
    if (!isRequestWithinVisibilityWindow(req, getRequestVisibilityHours(sysConfig))) {
      await doc.ref.update({
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        closedReason: 'visibility_window_expired',
      });
      continue;
    }

    // Direct request check: if pre-assigned to a provider, only show to that provider
    if (req.providerId && req.providerId !== providerUid) {
      continue;
    }

    const reqLat = req.customerLocation?.lat;
    const reqLng = req.customerLocation?.lng;

    // Check if this provider has an invitation or existing proposal on this request
    const proposalSnap = await doc.ref.collection('proposals')
      .where('providerId', '==', providerUid)
      .limit(1)
      .get();
    const hasProposal = !proposalSnap.empty;
    const proposalData = hasProposal ? proposalSnap.docs[0].data() : null;
    const isDeclined = req.declinedProviders && req.declinedProviders.includes(providerUid);
    const isDirectInvite = hasProposal && proposalData?.requestedByCustomer === true;

    if (isDeclined && !isDirectInvite) {
      continue;
    }

    if (hasProposal || req.providerId === providerUid) {
      // Direct invite or pre-assigned request — bypass distance checks
      if (provider.serviceTypes && provider.serviceTypes.includes(req.serviceType)) {
        const distance = (reqLat != null && reqLng != null && providerLat != null && providerLng != null)
          ? calculateHaversineDistanceKm(providerLat, providerLng, reqLat, reqLng)
          : null;
        
        eligibleRequests.push({ 
          ...req, 
          distanceKm: distance != null ? Number(distance.toFixed(1)) : null,
          directInvite: hasProposal && proposalData?.requestedByCustomer === true,
          proposalStatus: hasProposal ? proposalData?.status : null,
          proposalPrice: hasProposal ? proposalData?.estimatedPrice : null,
        });
      }
    } else if (reqLat != null && reqLng != null && providerLat != null && providerLng != null) {
      const distance = calculateHaversineDistanceKm(providerLat, providerLng, reqLat, reqLng);
      if (distance <= providerRadius) {
        if (provider.serviceTypes && provider.serviceTypes.includes(req.serviceType)) {
          eligibleRequests.push({ ...req, distanceKm: Number(distance.toFixed(1)) });
        }
      }
    } else {
      if (provider.serviceTypes && provider.serviceTypes.includes(req.serviceType)) {
        eligibleRequests.push({ ...req, distanceKm: null });
      }
    }
  }

  eligibleRequests.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  return eligibleRequests;
};

exports.submitProposal = async (requestId, proposal, providerUser) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();
  const serviceBasePrice = Number(reqData.serviceBasePrice);
  const serviceMaxPrice = Number(reqData.serviceMaxPrice);
  const proposedPrice = Number(proposal.estimatedPrice);
  const isDirectInvite = proposal.requestedByCustomer === true;

  if (!isDirectInvite) {
    if (serviceBasePrice && proposedPrice < serviceBasePrice) {
      throw new Error(`Proposed price must be at least ${serviceBasePrice}`);
    }
    if (serviceMaxPrice && proposedPrice > serviceMaxPrice) {
      throw new Error(`Proposed price cannot exceed ${serviceMaxPrice}`);
    }
  }

  // Verify provider actually offers the requested service type
  if (providerUser && providerUser.serviceTypes) {
    if (!providerUser.serviceTypes.includes(reqData.serviceType)) {
      throw new Error('Service type mismatch — you do not offer this service type in your settings');
    }
  }

  // Check if provider already has a proposal on this request
  const existingSnap = await requestRef.collection('proposals')
    .where('providerId', '==', providerUser.uid)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    // Update existing proposal instead
    const existingDoc = existingSnap.docs[0];
    await existingDoc.ref.update({
      estimatedPrice: proposal.estimatedPrice,
      estimatedTime: proposal.estimatedTime,
      message: proposal.message || '',
      status: 'offered',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return existingDoc.id;
  }

  const proposalData = {
    ...proposal,
    requestId,
    providerId: providerUser.uid,
    providerName: providerUser.fullName || proposal.providerName || 'Service Provider',
    providerPhone: providerUser.phone || proposal.providerPhone || '',
    providerRating: providerUser.rating || 5,
    providerCompanyName: providerUser.companyName || '',
    distanceKm: proposal.distanceKm || null,
    status: 'offered',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const proposalRef = await requestRef.collection('proposals').add(proposalData);

  // Set the request status to offers_received and set a proposalDeadline if not already set
  const updatePayload = { status: 'offers_received' };
  if (!reqData.proposalDeadline) {
    // First offer — start 3-minute customer choice window
    const deadline = new Date(Date.now() + 3 * 60 * 1000);
    updatePayload.proposalDeadline = admin.firestore.Timestamp.fromDate(deadline);
    updatePayload.proposalDeadlineMs = deadline.getTime();
  }
  await requestRef.update(updatePayload);

  await db.collection('users').doc(providerUser.uid)
    .update({ 'stats.applied': admin.firestore.FieldValue.increment(1) })
    .catch(() => {});

  return proposalRef.id;
};

exports.selectProposal = async (requestId, proposalId, customerUid) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const isGuestCapable = reqData.isGuest === true && customerUid;
  if (reqData.customerId !== customerUid && reqData.anonymousCustomerId !== customerUid && !isGuestCapable) {
    throw new Error('Unauthorized to select proposal for this request');
  }

  const proposalSnap = await requestRef.collection('proposals').doc(proposalId).get();
  if (!proposalSnap.exists) throw new Error('Selected offer not found');
  const proposal = proposalSnap.data();

  const adminTimestamp = admin.firestore.FieldValue.serverTimestamp();
  await requestRef.update({
    status: 'accepted',
    providerId: proposal.providerId,
    providerName: proposal.providerName,
    providerPhone: proposal.providerPhone || '',
    providerVehicleNumber: proposal.providerVehicleNumber || '',
    providerRating: proposal.providerRating || 5,
    estimatedPrice: proposal.estimatedPrice || reqData.estimatedPrice || 0,
    estimatedTime: proposal.estimatedTime || null,
    additionalFees: proposal.additionalFees || 0,
    totalPrice: (proposal.estimatedPrice || reqData.estimatedPrice || 0) + (proposal.additionalFees || 0),
    basePrice: proposal.estimatedPrice ? Math.min(proposal.estimatedPrice, reqData.serviceBasePrice || 0) : (reqData.serviceBasePrice || 0),
    maxPrice: proposal.estimatedPrice ? Math.max(proposal.estimatedPrice, reqData.serviceMaxPrice || 0) : (reqData.serviceMaxPrice || 0),
    acceptedAt: adminTimestamp,
    proposalDeadline: admin.firestore.FieldValue.delete(),
    proposalDeadlineMs: admin.firestore.FieldValue.delete(),
  });

  const proposalsSnap = await requestRef.collection('proposals').get();
  const batch = db.batch();
  proposalsSnap.docs.forEach((pDoc) => {
    if (pDoc.id === proposalId) {
      batch.update(pDoc.ref, { status: 'selected' });
    } else {
      batch.update(pDoc.ref, { status: 'rejected' });
    }
  });
  await batch.commit();

  await db.collection('users').doc(proposal.providerId)
    .update({ 'stats.approved': admin.firestore.FieldValue.increment(1) })
    .catch(() => {});
};

exports.rejectProposal = async (requestId, proposalId, customerUid) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const isGuestCapable = reqData.isGuest === true && customerUid;
  if (reqData.customerId !== customerUid && reqData.anonymousCustomerId !== customerUid && !isGuestCapable) {
    throw new Error('Unauthorized');
  }

  await requestRef.collection('proposals').doc(proposalId).update({ status: 'rejected' });
};

exports.cancelProposal = async (requestId, providerUid) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const proposalsSnap = await requestRef.collection('proposals')
    .where('providerId', '==', providerUid)
    .get();

  if (proposalsSnap.empty) {
    throw new Error('No active proposal found for this provider');
  }

  const batch = db.batch();
  proposalsSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // If there are no other proposals, reset status of the request
  const remainingProposals = await requestRef.collection('proposals').get();
  if (remainingProposals.empty) {
    if (reqData.status === 'offers_received') {
      await requestRef.update({
        status: 'searching_providers',
        proposalDeadline: admin.firestore.FieldValue.delete(),
        proposalDeadlineMs: admin.firestore.FieldValue.delete(),
      });
    }
  }
};

exports.autoAssignProposal = async (requestId, customerUid) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  // Only auto-assign for the owner or open requests past deadline
  const isGuestCapable = reqData.isGuest === true && customerUid;
  if (customerUid && reqData.customerId !== customerUid && reqData.anonymousCustomerId !== customerUid && !isGuestCapable) {
    throw new Error('Unauthorized');
  }

  // Must still be in an open state
  const openStates = ['offers_received', 'bidding', 'pending', 'submitted', 'searching_providers'];
  if (!openStates.includes(reqData.status)) {
    throw new Error('Request is no longer open for assignment');
  }

  // Get all pending proposals ordered by createdAt (earliest first)
  const proposalsSnap = await requestRef.collection('proposals')
    .where('status', '==', 'offered')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();

  if (proposalsSnap.empty) {
    // No proposals — keep open or mark as searching
    await requestRef.update({ status: 'searching_providers', proposalDeadline: admin.firestore.FieldValue.delete(), proposalDeadlineMs: admin.firestore.FieldValue.delete() });
    return { assigned: false };
  }

  const winnerDoc = proposalsSnap.docs[0];
  const winner = winnerDoc.data();

  const adminTimestamp = admin.firestore.FieldValue.serverTimestamp();
  await requestRef.update({
    status: 'accepted',
    providerId: winner.providerId,
    providerName: winner.providerName,
    providerPhone: winner.providerPhone || '',
    providerVehicleNumber: winner.providerVehicleNumber || '',
    providerRating: winner.providerRating || 5,
    estimatedPrice: winner.estimatedPrice || reqData.estimatedPrice || 0,
    estimatedTime: winner.estimatedTime || null,
    totalPrice: winner.estimatedPrice || reqData.estimatedPrice || 0,
    basePrice: winner.estimatedPrice ? Math.min(winner.estimatedPrice, reqData.serviceBasePrice || 0) : (reqData.serviceBasePrice || 0),
    maxPrice: winner.estimatedPrice ? Math.max(winner.estimatedPrice, reqData.serviceMaxPrice || 0) : (reqData.serviceMaxPrice || 0),
    acceptedAt: adminTimestamp,
    autoAssigned: true,
    proposalDeadline: admin.firestore.FieldValue.delete(),
    proposalDeadlineMs: admin.firestore.FieldValue.delete(),
  });

  // Mark winner selected, others rejected
  const allProposals = await requestRef.collection('proposals').get();
  const batch = db.batch();
  allProposals.docs.forEach((pDoc) => {
    batch.update(pDoc.ref, { status: pDoc.id === winnerDoc.id ? 'selected' : 'rejected' });
  });
  await batch.commit();

  await db.collection('users').doc(winner.providerId)
    .update({ 'stats.approved': admin.firestore.FieldValue.increment(1) })
    .catch(() => {});

  return { assigned: true, providerId: winner.providerId, providerName: winner.providerName };
};

exports.updateRequestStatus = async (requestId, targetStatus, extras = {}, user) => {
  const requestRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const currentStatus = reqData.status || 'submitted';
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(targetStatus) && user?.role !== 'admin') {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${targetStatus}'.`);
  }

  const updateData = { status: targetStatus, ...extras };
  const adminTimestamp = admin.firestore.FieldValue.serverTimestamp();
  if (targetStatus === 'accepted') updateData.acceptedAt = adminTimestamp;
  if (targetStatus === 'inProgress' || targetStatus === 'in_progress') updateData.inProgressAt = adminTimestamp;
  if (targetStatus === 'completed') updateData.completedAt = adminTimestamp;
  if (targetStatus === 'cancelled') updateData.cancelledAt = adminTimestamp;

  if (targetStatus === 'arriving' || targetStatus === 'provider_arrived') {
    updateData.arrivingAt = adminTimestamp;
    if (!reqData.arrivalOtp) {
      updateData.arrivalOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }
  }

  await requestRef.update(updateData);
};

exports.acceptRequest = async (requestId, profile) => {
  const docRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await docRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const openStatuses = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'];
  if (!openStatuses.includes(reqData.status) || (reqData.providerId && reqData.providerId !== profile.uid)) {
    throw new Error('Mission Conflict: Request assigned to other unit');
  }

  await docRef.update({
    status: 'accepted',
    providerId: profile.uid,
    providerName: profile.fullName,
    providerPhone: profile.phone || '',
    providerVehicleNumber: profile.vehicleNumber || '',
    providerRating: profile.rating || 5,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.declineRequest = async (requestId, providerUid) => {
  const docRef = db.collection('serviceRequests').doc(requestId);
  const reqSnap = await docRef.get();
  if (!reqSnap.exists) throw new Error('Request not found');
  const reqData = reqSnap.data();

  const batch = db.batch();
  let needsCommit = false;

  // Track provider skips to avoid showing skipped requests again
  batch.update(docRef, {
    declinedProviders: admin.firestore.FieldValue.arrayUnion(providerUid)
  });
  needsCommit = true;

  if (reqData.providerId === providerUid) {
    batch.update(docRef, {
      providerId: admin.firestore.FieldValue.delete(),
      providerName: admin.firestore.FieldValue.delete(),
      providerPhone: admin.firestore.FieldValue.delete(),
      providerRating: admin.firestore.FieldValue.delete(),
      providerVehicleNumber: admin.firestore.FieldValue.delete(),
      status: 'searching_providers',
    });
  }

  // Also reject any active proposals from this provider for this request
  const proposalsSnap = await docRef.collection('proposals')
    .where('providerId', '==', providerUid)
    .get();

  if (!proposalsSnap.empty) {
    proposalsSnap.docs.forEach((pDoc) => {
      batch.update(pDoc.ref, { status: 'rejected' });
    });
  }

  if (needsCommit) {
    await batch.commit();
  }
};

exports.completeRequest = async (requestId, finalPrice, additionalFees) => {
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  const serviceSnap = await db.collection('services').doc(requestData.serviceType).get();
  const serviceConfig = serviceSnap.exists ? serviceSnap.data() : {};
  const basePriceLimit = requestData.basePrice || serviceConfig.basePrice || 0;
  const maxPriceLimit = requestData.maxPrice || serviceConfig.maxPrice || 10000;

  if (finalPrice < basePriceLimit || finalPrice > maxPriceLimit) {
    throw new Error(`Service Base Amount must be between ${basePriceLimit} and ${maxPriceLimit}`);
  }

  const totalPrice = finalPrice + (additionalFees || 0);
  const sysSnap = await db.collection('system').doc('config').get();
  const sysConfig = sysSnap.exists ? sysSnap.data() : {};
  const commRate = (sysConfig.baseCommissionRate || 15) / 100;

  const adminCommission = totalPrice * commRate;
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

  if (requestData.status !== 'arriving' && requestData.status !== 'provider_arrived') {
    throw new Error('Request status is not arriving');
  }

  if (!requestData.arrivalOtp || requestData.arrivalOtp !== otp.trim()) {
    throw new Error('Incorrect verification code.');
  }

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

  if (requestData.status !== 'accepted' && requestData.status !== 'provider_en_route' && requestData.status !== 'arriving' && requestData.status !== 'inProgress') {
    throw new Error('Cannot propose additional costs in this state');
  }

  if (requestData.additionalFees && requestData.additionalFees > 0) {
    throw new Error('Additional charges have already been established for this request. You can only propose additional charges once.');
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

exports.rejectAdditionalCosts = async (requestId) => {
  const requestSnap = await db.collection('serviceRequests').doc(requestId).get();
  if (!requestSnap.exists) throw new Error('Request not found');
  const requestData = requestSnap.data();

  if (requestData.status !== 'pendingUserApproval') {
    throw new Error('No proposed costs pending rejection');
  }

  await db.collection('serviceRequests').doc(requestId).update({
    status: requestData.preApprovalStatus || 'accepted',
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

exports.getCustomerRequests = async (customerId, requestingUser) => {
  const snap = await db.collection('serviceRequests')
    .where('customerId', '==', customerId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => sanitizeForUser(serializeDoc(d), requestingUser));
};

exports.getProviderRequests = async (providerId, requestingUser) => {
  const snap = await db.collection('serviceRequests')
    .where('providerId', '==', providerId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => sanitizeForUser(serializeDoc(d), requestingUser));
};

exports.getPendingRequests = async (requestingUser) => {
  const sysConfig = await getSystemConfig();
  const visibilityHours = getRequestVisibilityHours(sysConfig);
  const snap = await db.collection('serviceRequests')
    .where('status', 'in', ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding', 'expired', 'cancelled'])
    .orderBy('createdAt', 'desc')
    .get();
  const items = [];
  for (const d of snap.docs) {
    const req = serializeDoc(d);
    if (!['expired', 'cancelled', 'completed'].includes(req.status) && !isRequestWithinVisibilityWindow(req, visibilityHours)) {
      await d.ref.update({
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        closedReason: 'visibility_window_expired',
      });
      req.status = 'expired';
    }
    items.push(sanitizeForUser(req, requestingUser));
  }
  return items;
};

exports.getRequestById = async (requestId, requestingUser) => {
  const snap = await db.collection('serviceRequests').doc(requestId).get();
  if (!snap.exists) return null;
  return sanitizeForUser(serializeDoc(snap), requestingUser);
};

exports.resetDeclinedRequests = async (providerUid) => {
  const openStatuses = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'];
  const snap = await db.collection('serviceRequests')
    .where('status', 'in', openStatuses)
    .where('declinedProviders', 'array-contains', providerUid)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      declinedProviders: admin.firestore.FieldValue.arrayRemove(providerUid)
    });
  });
  await batch.commit();
};

