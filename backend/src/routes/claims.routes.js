const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const claimsController = require('../controllers/claims.controller');

const router = express.Router();

router.post('/', authenticate, claimsController.createClaim);
router.get('/', authenticate, claimsController.getClaims);
router.get('/:id', authenticate, claimsController.getClaimById);
router.put('/:id/approve', authenticate, authorize('admin'), claimsController.approveClaim);
router.put('/:id/reject', authenticate, authorize('admin'), claimsController.rejectClaim);

module.exports = router;
