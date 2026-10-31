const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const {
    createOrder, getMyOrders, getOrderById, payOrder, cancelOrder, getAllOrders, updateOrderStatus,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

router.use(protect);

const idRule = param('id').isMongoId().withMessage('ID pesanan tidak valid');

router.route('/')
    .get(adminOnly, getAllOrders)
    .post(
        [
            body('shippingAddress').isString().trim().notEmpty().withMessage('Alamat pengiriman wajib diisi'),
            body('paymentMethod').isIn(['transfer_bank', 'e_wallet']).withMessage('Metode pembayaran harus transfer_bank atau e_wallet'),
            body('items').optional().isArray({ min: 1 }).withMessage('items harus berupa array'),
            body('items.*.productId').if(body('items').exists()).isMongoId().withMessage('ID produk tidak valid'),
            body('items.*.quantity').if(body('items').exists()).isInt({ min: 1 }).withMessage('Kuantitas minimal 1').toInt(),
        ],
        validate,
        createOrder
    );

router.get('/my', getMyOrders);
router.get('/:id', idRule, validate, getOrderById);
router.put('/:id/pay', idRule, validate, payOrder);
router.put('/:id/cancel', idRule, validate, cancelOrder);
router.put(
    '/:id/status',
    adminOnly,
    idRule,
    body('status').isIn(['shipped', 'completed']).withMessage('Status harus shipped atau completed'),
    validate,
    updateOrderStatus
);

module.exports = router;
