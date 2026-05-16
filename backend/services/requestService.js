const admin = require('../config/firebase');

const db = admin.firestore();

exports.saveRequest = async (data) => {
  const requestData = {
    ...data,
    status: 'pending',
    isPaid: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const docRef = await db.collection('serviceRequests').add(requestData);
  return { id: docRef.id, ...data };
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
  return snap.docs.map(d => {
    const data = d.data();
    if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
    return { id: d.id, ...data };
  });
};

exports.getProviderRequests = async (providerId) => {
  const snap = await db.collection('serviceRequests')
    .where('providerId', '==', providerId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => {
    const data = d.data();
    if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
    return { id: d.id, ...data };
  });
};

exports.getPendingRequests = async () => {
  const snap = await db.collection('serviceRequests')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => {
    const data = d.data();
    if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
    return { id: d.id, ...data };
  });
};

exports.getRequestById = async (requestId) => {
  const snap = await db.collection('serviceRequests').doc(requestId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
  return { id: snap.id, ...data };
};
