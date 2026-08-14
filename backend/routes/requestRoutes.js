const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public request creation (supports guest checkout with magic token creation)
router.post('/', requestController.createRequest);

// Protected endpoints requiring authenticated session token
router.get('/pending', authMiddleware, requestController.getPendingRequests);
router.get('/eligible/mine', authMiddleware, requestController.getEligibleRequests);
router.get('/eligible/:providerId', authMiddleware, requestController.getEligibleRequests);
router.get('/customer/:customerId', authMiddleware, requestController.getCustomerRequests);
router.get('/provider/:providerId', authMiddleware, requestController.getProviderRequests);
router.get('/:id', requestController.getRequestById);

router.post('/:id/proposals', authMiddleware, requestController.submitProposal);
router.put('/:id/proposals/select', authMiddleware, requestController.selectProposal);
router.delete('/:id/proposals/:proposalId', authMiddleware, requestController.rejectProposal);
router.post('/:id/proposals/auto-assign', authMiddleware, requestController.autoAssignProposal);
router.put('/:id/status', authMiddleware, requestController.updateStatus);
router.put('/:id/accept', authMiddleware, requestController.acceptRequest);
router.put('/:id/decline', authMiddleware, requestController.declineRequest);
router.put('/:id/complete', authMiddleware, requestController.completeRequest);
router.put('/:id/payment', authMiddleware, requestController.processPayment);
router.put('/:id/rating', authMiddleware, requestController.submitRating);

// Custom lifecycle and verification endpoints
router.put('/:id/verify-arrival-otp', authMiddleware, requestController.verifyArrivalOtp);
router.post('/:id/propose-additional-costs', authMiddleware, requestController.proposeAdditionalCosts);
router.put('/:id/approve-additional-costs', authMiddleware, requestController.approveAdditionalCosts);
router.put('/:id/reject-additional-costs', authMiddleware, requestController.rejectAdditionalCosts);

module.exports = router;

