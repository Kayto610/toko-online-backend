// Integration test. Butuh MongoDB; set TEST_MONGO_URI (default: mongodb://127.0.0.1:27017/toko_online_test)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

const ctx = {};
const auth = (t) => ({ Authorization: `Bearer ${t}` });

before(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/toko_online_test');
    await mongoose.connection.dropDatabase();
    // dropDatabase ikut menghapus index (mis. unique email), bangun ulang
    await Promise.all([User, Product, Cart, Order].map((m) => m.syncIndexes()));
    await User.create({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
});

after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

test('register & login', async () => {
    let r = await request(app).post('/api/auth/register').send({ name: 'Budi', email: 'Budi@Test.com', password: 'rahasia1' });
    assert.equal(r.status, 201);
    assert.ok(r.body.data.token);
    assert.equal(r.body.data.user.role, 'user');
    assert.equal(r.body.data.user.password, undefined);

    // tidak bisa mendaftar sebagai admin lewat body
    r = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@test.com', password: 'abcdef', role: 'admin' });
    assert.equal(r.body.data.user.role, 'user');

    r = await request(app).post('/api/auth/register').send({ name: 'Budi', email: 'budi@test.com', password: 'rahasia1' });
    assert.equal(r.status, 409);

    r = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bukan-email', password: '123' });
    assert.equal(r.status, 400);

    r = await request(app).post('/api/auth/login').send({ email: 'budi@test.com', password: 'salah' });
    assert.equal(r.status, 401);

    r = await request(app).post('/api/auth/login').send({ email: 'budi@test.com', password: 'rahasia1' });
    assert.equal(r.status, 200);
    ctx.user = r.body.data.token;

    r = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
    ctx.admin = r.body.data.token;

    r = await request(app).get('/api/auth/me').set(auth(ctx.user));
    assert.equal(r.body.data.email, 'budi@test.com');
    r = await request(app).get('/api/auth/me');
    assert.equal(r.status, 401);
    r = await request(app).get('/api/auth/me').set(auth('token.palsu.xx'));
    assert.equal(r.status, 401);
});

test('produk: CRUD, proteksi admin, validasi, search', async () => {
    const body = { name: 'Kopi Arabika', description: 'Enak', price: 50000, stock: 5, category: 'Minuman' };

    let r = await request(app).post('/api/products').send(body);
    assert.equal(r.status, 401);
    r = await request(app).post('/api/products').set(auth(ctx.user)).send(body);
    assert.equal(r.status, 403);

    r = await request(app).post('/api/products').set(auth(ctx.admin)).send({ ...body, price: -5 });
    assert.equal(r.status, 400);
    r = await request(app).post('/api/products').set(auth(ctx.admin)).send({ name: 'x' });
    assert.equal(r.status, 400);

    r = await request(app).post('/api/products').set(auth(ctx.admin)).send(body);
    assert.equal(r.status, 201);
    ctx.p1 = r.body.data._id;
    r = await request(app).post('/api/products').set(auth(ctx.admin)).send({ ...body, name: 'Teh Melati', price: 20000, stock: 10 });
    ctx.p2 = r.body.data._id;

    r = await request(app).get('/api/products');
    assert.equal(r.body.total, 2);
    r = await request(app).get('/api/products?keyword=kopi');
    assert.equal(r.body.count, 1);
    r = await request(app).get('/api/products?keyword=.*');
    assert.equal(r.body.count, 0); // regex di-escape
    r = await request(app).get('/api/products?sort=price_asc&limit=1&page=1');
    assert.equal(r.body.data[0].name, 'Teh Melati');
    assert.equal(r.body.pages, 2);

    r = await request(app).get(`/api/products/${ctx.p1}`);
    assert.equal(r.body.data.name, 'Kopi Arabika');
    r = await request(app).get('/api/products/123');
    assert.equal(r.status, 400);
    r = await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`);
    assert.equal(r.status, 404);

    r = await request(app).put(`/api/products/${ctx.p1}`).set(auth(ctx.admin)).send({ price: 55000 });
    assert.equal(r.body.data.price, 55000);
    r = await request(app).get('/api/products/categories');
    assert.deepEqual(r.body.data, ['Minuman']);
});

test('keranjang: tambah, ubah qty, centang, hapus, batas stok', async () => {
    let r = await request(app).get('/api/cart');
    assert.equal(r.status, 401);

    r = await request(app).post('/api/cart').set(auth(ctx.user)).send({ productId: ctx.p1, quantity: 2 });
    assert.equal(r.status, 200);
    r = await request(app).post('/api/cart').set(auth(ctx.user)).send({ productId: ctx.p1 }); // +1 => 3
    assert.equal(r.body.data.items[0].quantity, 3);
    r = await request(app).post('/api/cart').set(auth(ctx.user)).send({ productId: ctx.p2, quantity: 1 });
    assert.equal(r.body.data.items.length, 2);
    assert.equal(r.body.data.totalPrice, 55000 * 3 + 20000);

    r = await request(app).post('/api/cart').set(auth(ctx.user)).send({ productId: ctx.p1, quantity: 99 });
    assert.equal(r.status, 400); // lewat stok

    r = await request(app).put(`/api/cart/${ctx.p2}`).set(auth(ctx.user)).send({ selected: false });
    assert.equal(r.body.data.totalPrice, 55000 * 3);
    r = await request(app).put(`/api/cart/${ctx.p1}`).set(auth(ctx.user)).send({ quantity: 2 });
    assert.equal(r.body.data.totalPrice, 110000);
    r = await request(app).put(`/api/cart/${ctx.p1}`).set(auth(ctx.user)).send({ quantity: 0 });
    assert.equal(r.status, 400);
});

test('checkout dari keranjang: hanya item tercentang, stok berkurang, harga dari server', async () => {
    let r = await request(app).post('/api/orders').set(auth(ctx.user)).send({ shippingAddress: '', paymentMethod: 'transfer_bank' });
    assert.equal(r.status, 400);
    r = await request(app).post('/api/orders').set(auth(ctx.user)).send({ shippingAddress: 'Jl. Merdeka 1', paymentMethod: 'kartu' });
    assert.equal(r.status, 400);

    r = await request(app).post('/api/orders').set(auth(ctx.user))
        .send({ shippingAddress: 'Jl. Merdeka 1, Palembang', paymentMethod: 'transfer_bank', totalPrice: 1 });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.totalPrice, 110000);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.status, 'pending');
    ctx.order = r.body.data._id;

    assert.equal((await Product.findById(ctx.p1)).stock, 3);
    r = await request(app).get('/api/cart').set(auth(ctx.user));
    assert.equal(r.body.data.items.length, 1); // p2 yang tidak dicentang tetap ada
    assert.equal(String(r.body.data.items[0].product._id), ctx.p2);

    // keranjang tanpa item tercentang -> error
    r = await request(app).post('/api/orders').set(auth(ctx.user)).send({ shippingAddress: 'x', paymentMethod: 'e_wallet' });
    assert.equal(r.status, 400);
});

test('beli sekarang (items langsung), stok habis, bayar, batal', async () => {
    let r = await request(app).post('/api/orders').set(auth(ctx.user))
        .send({ shippingAddress: 'Alamat', paymentMethod: 'e_wallet', items: [{ productId: ctx.p1, quantity: 50 }] });
    assert.equal(r.status, 400);
    assert.equal((await Product.findById(ctx.p1)).stock, 3); // tidak berubah

    // dua item, item kedua gagal -> stok item pertama harus di-rollback
    r = await request(app).post('/api/orders').set(auth(ctx.user))
        .send({ shippingAddress: 'Alamat', paymentMethod: 'e_wallet', items: [{ productId: ctx.p2, quantity: 2 }, { productId: ctx.p1, quantity: 50 }] });
    assert.equal(r.status, 400);
    assert.equal((await Product.findById(ctx.p2)).stock, 10);

    r = await request(app).post('/api/orders').set(auth(ctx.user))
        .send({ shippingAddress: 'Alamat', paymentMethod: 'e_wallet', items: [{ productId: ctx.p2, quantity: 2 }] });
    assert.equal(r.status, 201);
    const buyNow = r.body.data._id;
    assert.equal((await Product.findById(ctx.p2)).stock, 8);

    r = await request(app).put(`/api/orders/${buyNow}/cancel`).set(auth(ctx.user));
    assert.equal(r.body.data.status, 'cancelled');
    assert.equal((await Product.findById(ctx.p2)).stock, 10); // stok kembali

    r = await request(app).put(`/api/orders/${ctx.order}/pay`).set(auth(ctx.user));
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'paid');
    assert.equal(r.body.data.isPaid, true);
    r = await request(app).put(`/api/orders/${ctx.order}/pay`).set(auth(ctx.user));
    assert.equal(r.status, 400); // tidak bisa bayar dua kali
    r = await request(app).put(`/api/orders/${ctx.order}/cancel`).set(auth(ctx.user));
    assert.equal(r.status, 400);
});

test('akses pesanan: pemilik vs user lain vs admin', async () => {
    let r = await request(app).post('/api/auth/register').send({ name: 'Siti', email: 'siti@test.com', password: 'rahasia2' });
    const other = r.body.data.token;

    r = await request(app).get(`/api/orders/${ctx.order}`).set(auth(other));
    assert.equal(r.status, 403);
    r = await request(app).get(`/api/orders/${ctx.order}`).set(auth(ctx.user));
    assert.equal(r.status, 200);
    r = await request(app).get(`/api/orders/${ctx.order}`).set(auth(ctx.admin));
    assert.equal(r.status, 200);

    r = await request(app).get('/api/orders/my').set(auth(ctx.user));
    assert.equal(r.body.count, 2);
    r = await request(app).get('/api/orders/my').set(auth(other));
    assert.equal(r.body.count, 0);

    r = await request(app).get('/api/orders').set(auth(ctx.user));
    assert.equal(r.status, 403);
    r = await request(app).get('/api/orders').set(auth(ctx.admin));
    assert.equal(r.body.count, 2);

    r = await request(app).put(`/api/orders/${ctx.order}/status`).set(auth(ctx.user)).send({ status: 'shipped' });
    assert.equal(r.status, 403);
    r = await request(app).put(`/api/orders/${ctx.order}/status`).set(auth(ctx.admin)).send({ status: 'completed' });
    assert.equal(r.status, 400); // harus shipped dulu
    r = await request(app).put(`/api/orders/${ctx.order}/status`).set(auth(ctx.admin)).send({ status: 'shipped' });
    assert.equal(r.body.data.status, 'shipped');
});

test('hapus produk & 404 route', async () => {
    let r = await request(app).delete(`/api/products/${ctx.p2}`).set(auth(ctx.user));
    assert.equal(r.status, 403);
    r = await request(app).delete(`/api/products/${ctx.p2}`).set(auth(ctx.admin));
    assert.equal(r.status, 200);
    r = await request(app).delete(`/api/products/${ctx.p2}`).set(auth(ctx.admin));
    assert.equal(r.status, 404);
    r = await request(app).get('/api/cart').set(auth(ctx.user));
    assert.equal(r.body.data.items.length, 0); // produk terhapus tidak muncul di keranjang
    r = await request(app).get('/api/tidak-ada');
    assert.equal(r.status, 404);
});
