const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProductsById,
    updateProduct,
    deleteProduct,
    getCategories,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const idRule = param('id').isMongoId().withMessage('ID produk tidak valid');

const productRules = (optional) => {
    const f = (chain) => (optional ? chain.optional() : chain);
    return [
        f(body('name')).isString().trim().notEmpty().withMessage('Nama produk wajib diisi'),
        f(body('description')).isString().trim().notEmpty().withMessage('Deskripsi produk wajib diisi'),
        f(body('price')).isFloat({ min: 0 }).withMessage('Harga harus angka dan tidak boleh kurang dari 0').toFloat(),
        f(body('stock')).isInt({ min: 0 }).withMessage('Stok harus bilangan bulat dan tidak boleh kurang dari 0').toInt(),
        f(body('category')).isString().trim().notEmpty().withMessage('Kategori produk wajib diisi'),
        body('imageUrl').optional().isString().trim().isURL().withMessage('imageUrl harus berupa URL yang valid'),
    ];
};

// base route : /api/products

// GET  : Public (Ambil semua produk, ?keyword= &category= &sort= &page= &limit=)
// POST : Admin  (Menambahkan produk)
router.route('/')
    .get(getProducts)
    .post(protect, adminOnly, productRules(false), validate, createProduct);

// GET : Public (daftar kategori)
router.get('/categories', getCategories);

// GET    : Public (Ambil detail 1 produk)
// PUT    : Admin  (Memperbarui produk)
// DELETE : Admin  (Menghapus produk)
router.route('/:id')
    .get(idRule, validate, getProductsById)
    .put(protect, adminOnly, idRule, productRules(true), validate, updateProduct)
    .delete(protect, adminOnly, idRule, validate, deleteProduct);

module.exports = router;
