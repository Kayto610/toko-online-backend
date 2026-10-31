// Jalankan: npm run seed   (menghapus & mengisi ulang data User + Product)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

const img = (t) => `https://placehold.co/600x600?text=${encodeURIComponent(t)}`;

const products = [
    ['Kaos Polos Premium', 'Kaos katun combed 30s, nyaman dan adem dipakai harian.', 75000, 50, 'Fashion'],
    ['Kemeja Flannel', 'Kemeja flannel lengan panjang, bahan tebal dan lembut.', 145000, 30, 'Fashion'],
    ['Celana Chino', 'Celana chino slim fit, tersedia berbagai warna.', 185000, 25, 'Fashion'],
    ['Sepatu Sneakers Putih', 'Sneakers casual sol karet anti selip.', 299000, 20, 'Sepatu'],
    ['Sandal Jepit Nyaman', 'Sandal jepit empuk untuk santai.', 35000, 100, 'Sepatu'],
    ['Headphone Bluetooth', 'Headphone wireless dengan baterai hingga 30 jam.', 249000, 15, 'Elektronik'],
    ['Powerbank 10000mAh', 'Powerbank fast charging dengan 2 port USB.', 159000, 40, 'Elektronik'],
    ['Mouse Wireless', 'Mouse wireless 2.4GHz, ergonomis dan senyap.', 89000, 45, 'Elektronik'],
    ['Tas Ransel Laptop', 'Ransel muat laptop 15", bahan tahan air.', 225000, 18, 'Aksesoris'],
    ['Botol Minum Stainless', 'Botol minum 750ml, tahan panas dan dingin.', 65000, 60, 'Aksesoris'],
    ['Kopi Arabika 250g', 'Biji kopi arabika single origin, roasting medium.', 85000, 35, 'Makanan & Minuman'],
    ['Teh Melati Celup', 'Teh melati isi 25 kantong, aroma harum.', 22000, 80, 'Makanan & Minuman'],
].map(([name, description, price, stock, category]) => ({ name, description, price, stock, category, imageUrl: img(name) }));

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await Promise.all([User.deleteMany(), Product.deleteMany(), Cart.deleteMany(), Order.deleteMany()]);

        await User.create([
            { name: 'Admin Toko', email: process.env.ADMIN_EMAIL || 'admin@toko.com', password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
            { name: 'User Demo', email: 'user@toko.com', password: 'user123' },
        ]);
        await Product.insertMany(products);

        console.log(`Seed selesai: 2 user (admin & demo) dan ${products.length} produk`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
