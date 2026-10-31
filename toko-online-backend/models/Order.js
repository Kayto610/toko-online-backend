const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        // snapshot data produk saat transaksi, supaya riwayat tidak berubah kalau produk diedit
        name: { type: String, required: true },
        price: { type: Number, required: true },
        imageUrl: { type: String },
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        items: {
            type: [orderItemSchema],
            validate: [(v) => v.length > 0, "Pesanan minimal berisi 1 produk"],
        },
        shippingAddress: {
            type: String,
            required: [true, "Alamat pengiriman wajib diisi"],
            trim: true,
        },
        paymentMethod: {
            type: String,
            required: [true, "Metode pembayaran wajib dipilih"],
            enum: {
                values: ["transfer_bank", "e_wallet"],
                message: "Metode pembayaran harus transfer_bank atau e_wallet",
            },
        },
        totalPrice: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["pending", "paid", "shipped", "completed", "cancelled"],
            default: "pending",
        },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
