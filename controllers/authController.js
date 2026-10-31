const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const userPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
});

// @desc    Registrasi user baru
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // role selalu "user"; admin dibuat lewat seeder
    const user = await User.create({ name, email, password });

    res.status(201).json({
        success: true,
        message: "Registrasi berhasil",
        data: { user: userPayload(user), token: generateToken(user._id) },
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        throw new HttpError(401, "Email atau password salah");
    }

    res.status(200).json({
        success: true,
        message: "Login berhasil",
        data: { user: userPayload(user), token: generateToken(user._id) },
    });
});

// @desc    Ambil profil user yang sedang login
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: userPayload(req.user) });
});

module.exports = { register, login, getMe };
