const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Nama produk wajib diisi."],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Deskripsi produk wajib diisi."],
        },
        price: {
            type: Number,
            required: [true, "Harga produk wajib diisi."],
            min: [0, "Harga tidak boleh kurang dari 0"],
        },
        stock: {
            type: Number,
            required: [true, "Stok produk wajib diisi."],
            default: 0,
            min: [0, "Stok produk tidak boleh kurang dari 0"],
        },
        category: {
            type: String,
            required: [true, "Kategori produk wajib diisi."],
            trim: true,
        },
        imageUrl: {
            type: String,
            default: "https://via.placeholder.com/150",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Product', productSchema);