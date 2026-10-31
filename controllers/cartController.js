const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// ambil keranjang user + detail produk + total harga item yang dicentang
const buildCartResponse = async (userId) => {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    const items = (cart ? cart.items : [])
        .filter((i) => i.product) // abaikan produk yang sudah dihapus admin
        .map((i) => ({
            product: i.product,
            quantity: i.quantity,
            selected: i.selected,
            subtotal: i.product.price * i.quantity,
        }));

    const totalPrice = items.filter((i) => i.selected).reduce((sum, i) => sum + i.subtotal, 0);
    const totalItems = items.filter((i) => i.selected).reduce((sum, i) => sum + i.quantity, 0);

    return { items, totalItems, totalPrice };
};

const getOrCreateCart = async (userId) =>
    (await Cart.findOne({ user: userId })) || (await Cart.create({ user: userId, items: [] }));

// @desc    Ambil keranjang
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await buildCartResponse(req.user._id) });
});

// @desc    Tambah produk ke keranjang ("+ Keranjang")
// @route   POST /api/cart   body: { productId, quantity }
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);

    const product = await Product.findById(productId);
    if (!product) throw new HttpError(404, "Produk tidak ditemukan");

    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find((i) => i.product.equals(productId));
    const newQty = (existing ? existing.quantity : 0) + quantity;

    if (newQty > product.stock) {
        throw new HttpError(400, `Stok tidak mencukupi (tersisa ${product.stock})`);
    }

    if (existing) existing.quantity = newQty;
    else cart.items.push({ product: productId, quantity });
    await cart.save();

    res.status(200).json({
        success: true,
        message: "Produk ditambahkan ke keranjang",
        data: await buildCartResponse(req.user._id),
    });
});

// @desc    Ubah kuantitas / centang produk di keranjang
// @route   PUT /api/cart/:productId   body: { quantity?, selected? }
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.find((i) => i.product.equals(req.params.productId));
    if (!item) throw new HttpError(404, "Produk tidak ada di keranjang");

    if (req.body.quantity !== undefined) {
        const product = await Product.findById(req.params.productId);
        if (!product) throw new HttpError(404, "Produk tidak ditemukan");
        if (req.body.quantity > product.stock) {
            throw new HttpError(400, `Stok tidak mencukupi (tersisa ${product.stock})`);
        }
        item.quantity = req.body.quantity;
    }
    if (req.body.selected !== undefined) item.selected = req.body.selected;

    await cart.save();
    res.status(200).json({ success: true, data: await buildCartResponse(req.user._id) });
});

// @desc    Hapus 1 produk dari keranjang
// @route   DELETE /api/cart/:productId
// @access  Private
const removeCartItem = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter((i) => !i.product.equals(req.params.productId));
    await cart.save();

    res.status(200).json({
        success: true,
        message: "Produk dihapus dari keranjang",
        data: await buildCartResponse(req.user._id),
    });
});

// @desc    Kosongkan keranjang
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    res.status(200).json({ success: true, message: "Keranjang dikosongkan", data: await buildCartResponse(req.user._id) });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
