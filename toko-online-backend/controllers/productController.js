const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Tambah Produk
// @route   POST /api/products
// @access  Admin
const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, stock, category, imageUrl } = req.body;
    const product = await Product.create({ name, description, price, stock, category, imageUrl });

    res.status(201).json({
        success: true,
        message: "Produk berhasil ditambahkan.",
        data: product,
    });
});

// @desc    Ambil semua produk (mendukung search, filter kategori, sort, pagination)
// @route   GET /api/products?keyword=&category=&sort=&page=&limit=
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
    const { keyword, category, sort } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 100);

    const filter = {};
    if (typeof keyword === 'string' && keyword.trim()) {
        filter.name = { $regex: escapeRegex(keyword.trim()), $options: 'i' };
    }
    if (typeof category === 'string' && category.trim()) {
        filter.category = category.trim();
    }

    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
    };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
        .sort(sortMap[sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit);

    res.status(200).json({
        success: true,
        count: products.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: products,
    });
});

// @desc    Ambil detail 1 produk berdasarkan ID
// @route   GET /api/products/:id
// @access  Public
const getProductsById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, "Produk tidak ditemukan");

    res.status(200).json({ success: true, data: product });
});

// @desc    Update data produk
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = asyncHandler(async (req, res) => {
    const allowed = ['name', 'description', 'price', 'stock', 'category', 'imageUrl'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
    });
    if (!product) throw new HttpError(404, "Produk tidak ditemukan");

    res.status(200).json({
        success: true,
        message: "Produk berhasil diperbarui",
        data: product,
    });
});

// @desc    Hapus produk
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new HttpError(404, "Produk tidak ditemukan");

    res.status(200).json({ success: true, message: "Produk berhasil dihapus" });
});

// @desc    Daftar kategori yang tersedia
// @route   GET /api/products/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    const categories = await Product.distinct('category');
    res.status(200).json({ success: true, data: categories.sort() });
});

module.exports = {
    createProduct,
    getProducts,
    getProductsById,
    updateProduct,
    deleteProduct,
    getCategories,
};
