const requestService = require('../services/requestService');

exports.createRequest = async (req, res) => {
  try {
    const data = req.body;
    const result = await requestService.saveRequest(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEligibleRequests = async (req, res) => {
  try {
    const providerUid = req.userProfile?.uid || req.params.providerId;
    if (!providerUid) {
      return res.status(401).json({ success: false, message: 'Provider identification missing.' });
    }
    const data = await requestService.getEligibleRequestsForProvider(providerUid);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get Eligible Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = req.body;
    const admin = require('../config/firebase');
    
    let providerUser;
    if (req.userProfile && req.userProfile.role === 'provider') {
      providerUser = req.userProfile;
    } else {
      if (!proposal.providerId) {
        return res.status(400).json({ success: false, message: 'providerId is required' });
      }
      const providerSnap = await admin.firestore().collection('users').doc(proposal.providerId).get();
      if (!providerSnap.exists) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }
      providerUser = { uid: proposal.providerId, ...providerSnap.data() };
    }

    const proposalId = await requestService.submitProposal(id, proposal, providerUser);
    res.status(201).json({ success: true, data: { id: proposalId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.selectProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposalId } = req.body;
    const customerUid = req.userProfile?.uid || req.body.customerId;
    await requestService.selectProposal(id, proposalId || req.body.proposal?.id, customerUid);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectProposal = async (req, res) => {
  try {
    const { id, proposalId } = req.params;
    const customerUid = req.userProfile?.uid;
    await requestService.rejectProposal(id, proposalId, customerUid);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.autoAssignProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const customerUid = req.userProfile?.uid;
    const result = await requestService.autoAssignProposal(id, customerUid);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, extras } = req.body;
    await requestService.updateRequestStatus(id, status, extras, req.userProfile);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = req.userProfile || req.body.profile;
    await requestService.acceptRequest(id, profile);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.declineRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const providerUid = req.userProfile?.uid;
    await requestService.declineRequest(id, providerUid);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice, additionalFees } = req.body;
    await requestService.completeRequest(id, finalPrice, additionalFees);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { tip } = req.body;
    await requestService.processPayment(id, tip);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    await requestService.submitRating(id, rating, review);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerRequests = async (req, res) => {
  try {
    const customerId = req.params.customerId === 'mine' ? req.userProfile?.uid : req.params.customerId;
    const data = await requestService.getCustomerRequests(customerId, req.userProfile);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get Customer Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProviderRequests = async (req, res) => {
  try {
    const providerId = req.params.providerId === 'mine' ? req.userProfile?.uid : req.params.providerId;
    const data = await requestService.getProviderRequests(providerId, req.userProfile);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get Provider Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const data = await requestService.getPendingRequests(req.userProfile);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get Pending Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await requestService.getRequestById(id, req.userProfile);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyArrivalOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    await requestService.verifyArrivalOtp(id, otp);
    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify Arrival OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.proposeAdditionalCosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposedAdditionalFees, reason } = req.body;
    await requestService.proposeAdditionalCosts(id, proposedAdditionalFees, reason);
    res.status(200).json({ success: true, message: 'Additional costs proposed successfully' });
  } catch (error) {
    console.error('Propose Additional Costs Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveAdditionalCosts = async (req, res) => {
  try {
    const { id } = req.params;
    await requestService.approveAdditionalCosts(id);
    res.status(200).json({ success: true, message: 'Additional costs approved successfully' });
  } catch (error) {
    console.error('Approve Additional Costs Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

