const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// proteksi route: wajib login (header Authorization: Bearer <token>)
const protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        throw new HttpError(401, "Tidak terautentikasi, silakan login terlebih dahulu");
    }

    let decoded;
    try {
        decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch (err) {
        throw new HttpError(401, "Token tidak valid atau sudah kedaluwarsa");
    }

    const user = await User.findById(decoded.id);
    if (!user) throw new HttpError(401, "User tidak ditemukan");

    req.user = user;
    next();
});

// hanya admin
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    next(new HttpError(403, "Akses ditolak, hanya untuk admin"));
};

module.exports = { protect, adminOnly };
