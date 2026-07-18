const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

router.post('/', requestController.createRequest);

router.get('/pending', requestController.getPendingRequests);
router.get('/customer/:customerId', requestController.getCustomerRequests);
router.get('/provider/:providerId', requestController.getProviderRequests);
router.get('/:id', requestController.getRequestById);

router.post('/:id/proposals', requestController.submitProposal);
router.put('/:id/proposals/select', requestController.selectProposal);
router.put('/:id/status', requestController.updateStatus);
router.put('/:id/accept', requestController.acceptRequest);
router.put('/:id/complete', requestController.completeRequest);
router.put('/:id/payment', requestController.processPayment);
router.put('/:id/rating', requestController.submitRating);

// Custom lifecycle and verification endpoints
router.put('/:id/verify-arrival-otp', requestController.verifyArrivalOtp);
router.post('/:id/propose-additional-costs', requestController.proposeAdditionalCosts);
router.put('/:id/approve-additional-costs', requestController.approveAdditionalCosts);

module.exports = router;
