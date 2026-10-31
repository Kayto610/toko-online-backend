const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

router.use(protect);

const productIdParam = param('productId').isMongoId().withMessage('ID produk tidak valid');

router.route('/')
    .get(getCart)
    .post(
        [
            body('productId').isMongoId().withMessage('ID produk tidak valid'),
            body('quantity').optional().isInt({ min: 1 }).withMessage('Kuantitas minimal 1').toInt(),
        ],
        validate,
        addToCart
    )
    .delete(clearCart);

router.route('/:productId')
    .put(
        [
            productIdParam,
            body('quantity').optional().isInt({ min: 1 }).withMessage('Kuantitas minimal 1').toInt(),
            body('selected').optional().isBoolean().withMessage('selected harus true/false').toBoolean(),
        ],
        validate,
        updateCartItem
    )
    .delete(productIdParam, validate, removeCartItem);

module.exports = router;
