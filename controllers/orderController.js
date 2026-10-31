const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// kurangi stok secara atomik; kembalikan daftar yang berhasil dikurangi (untuk rollback)
const reserveStock = async (lines) => {
    const done = [];
    for (const l of lines) {
        const r = await Product.updateOne(
            { _id: l.product, stock: { $gte: l.quantity } },
            { $inc: { stock: -l.quantity } }
        );
        if (r.modifiedCount !== 1) {
            await restoreStock(done);
            throw new HttpError(400, `Stok "${l.name}" tidak mencukupi`);
        }
        done.push(l);
    }
    return done;
};

const restoreStock = async (lines) => {
    for (const l of lines) {
        await Product.updateOne({ _id: l.product }, { $inc: { stock: l.quantity } });
    }
};

// @desc    Buat pesanan (checkout). Sumber item:
//          - body.items [{productId, quantity}]  -> "Beli Sekarang"
//          - jika kosong -> item yang dicentang di keranjang
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { shippingAddress, paymentMethod } = req.body;
    const direct = Array.isArray(req.body.items) && req.body.items.length > 0;

    let source;
    if (direct) {
        source = req.body.items.map((i) => ({ productId: String(i.productId), quantity: Number(i.quantity) }));
    } else {
        const cart = await Cart.findOne({ user: req.user._id });
        source = (cart ? cart.items : [])
            .filter((i) => i.selected)
            .map((i) => ({ productId: String(i.product), quantity: i.quantity }));
    }
    if (source.length === 0) {
        throw new HttpError(400, "Tidak ada produk yang dipilih untuk di-checkout");
    }

    // gabungkan duplikat productId
    const merged = new Map();
    source.forEach((s) => merged.set(s.productId, (merged.get(s.productId) || 0) + s.quantity));

    const products = await Product.find({ _id: { $in: [...merged.keys()] } });
    if (products.length !== merged.size) throw new HttpError(404, "Ada produk yang sudah tidak tersedia");

    // harga selalu diambil dari database, bukan dari client
    const lines = products.map((p) => ({
        product: p._id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        quantity: merged.get(String(p._id)),
    }));
    const totalPrice = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

    const reserved = await reserveStock(lines);
    let order;
    try {
        order = await Order.create({
            user: req.user._id,
            items: lines,
            shippingAddress,
            paymentMethod,
            totalPrice,
        });
    } catch (err) {
        await restoreStock(reserved);
        throw err;
    }

    // bersihkan item yang sudah di-checkout dari keranjang
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
        const ordered = new Set(lines.map((l) => String(l.product)));
        cart.items = cart.items.filter((i) => !ordered.has(String(i.product)));
        await cart.save();
    }

    res.status(201).json({
        success: true,
        message: "Pesanan berhasil dibuat",
        data: order,
    });
});

// @desc    Riwayat pesanan milik user login
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Detail pesanan (pemilik atau admin)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) throw new HttpError(404, "Pesanan tidak ditemukan");

    const ownerId = order.user._id || order.user;
    if (String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
        throw new HttpError(403, "Anda tidak berhak mengakses pesanan ini");
    }
    res.status(200).json({ success: true, data: order });
});

// @desc    Konfirmasi pembayaran ("Konfirmasi & Bayar") -> simulasi, tanpa payment gateway
// @route   PUT /api/orders/:id/pay
// @access  Private (pemilik)
const payOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new HttpError(404, "Pesanan tidak ditemukan");
    if (order.status !== 'pending') throw new HttpError(400, `Pesanan berstatus "${order.status}", tidak bisa dibayar`);

    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'paid';
    await order.save();

    res.status(200).json({ success: true, message: "Pembayaran berhasil", data: order });
});

// @desc    Batalkan pesanan (hanya yang masih pending), stok dikembalikan
// @route   PUT /api/orders/:id/cancel
// @access  Private (pemilik)
const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) throw new HttpError(404, "Pesanan tidak ditemukan");
    if (order.status !== 'pending') throw new HttpError(400, "Hanya pesanan yang belum dibayar yang bisa dibatalkan");

    order.status = 'cancelled';
    await order.save();
    await restoreStock(order.items);

    res.status(200).json({ success: true, message: "Pesanan dibatalkan", data: order });
});

// @desc    Semua pesanan
// @route   GET /api/orders
// @access  Admin
const getAllOrders = asyncHandler(async (req, res) => {
    const filter = req.query.status ? { status: String(req.query.status) } : {};
    const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Ubah status pesanan (shipped / completed)
// @route   PUT /api/orders/:id/status
// @access  Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new HttpError(404, "Pesanan tidak ditemukan");

    const { status } = req.body;
    const allowed = { paid: ['shipped'], shipped: ['completed'] };
    if (!(allowed[order.status] || []).includes(status)) {
        throw new HttpError(400, `Status tidak bisa diubah dari "${order.status}" ke "${status}"`);
    }
    order.status = status;
    await order.save();

    res.status(200).json({ success: true, message: "Status pesanan diperbarui", data: order });
});

module.exports = { createOrder, getMyOrders, getOrderById, payOrder, cancelOrder, getAllOrders, updateOrderStatus };
