const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

router.post(
    '/register',
    [
        body('name').isString().trim().notEmpty().withMessage('Nama wajib diisi'),
        body('email').isString().trim().isEmail().withMessage('Format email tidak valid'),
        body('password').isString().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    ],
    validate,
    register
);

router.post(
    '/login',
    [
        body('email').isString().trim().notEmpty().withMessage('Email wajib diisi'),
        body('password').isString().notEmpty().withMessage('Password wajib diisi'),
    ],
    validate,
    login
);

router.get('/me', protect, getMe);

module.exports = router;
