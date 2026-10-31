# toko-online-backend

REST API untuk **Toko Online (E-Commerce MVP)** — melayani Web App dan Mobile App dari satu backend.
Stack: Node.js, Express 5, MongoDB (Mongoose), JWT.

## Menjalankan lokal

```bash
npm install
cp .env.example .env      # isi MONGO_URI dan JWT_SECRET
npm run seed              # (opsional) isi data contoh: 12 produk + akun admin & demo
npm run dev               # http://localhost:5000
npm test                  # integration test (butuh MongoDB lokal di 127.0.0.1:27017, atau set TEST_MONGO_URI)
```

Akun hasil seed: `admin@toko.com / admin123` (admin), `user@toko.com / user123` (user).

## Environment variable

| Nama | Keterangan |
| --- | --- |
| `MONGO_URI` | Connection string MongoDB (Atlas) |
| `JWT_SECRET` | Secret penanda token JWT (wajib) |
| `JWT_EXPIRES_IN` | Masa berlaku token, default `7d` |
| `CORS_ORIGIN` | Origin frontend dipisah koma (kosong = semua origin) |
| `PORT` | Port server, default `5000` |

## Format response

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "pesan error" }
```

Route privat memakai header `Authorization: Bearer <token>`.

## Endpoint

### Auth — `/api/auth`
| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/register` | Public | `{ name, email, password }` → `{ user, token }` |
| POST | `/login` | Public | `{ email, password }` → `{ user, token }` |
| GET | `/me` | User | Profil user login |

### Produk — `/api/products`
| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/` | Public | Query: `keyword`, `category`, `sort` (`newest`, `oldest`, `price_asc`, `price_desc`), `page`, `limit` |
| GET | `/categories` | Public | Daftar kategori |
| GET | `/:id` | Public | Detail produk |
| POST | `/` | Admin | `{ name, description, price, stock, category, imageUrl? }` |
| PUT | `/:id` | Admin | Update sebagian field |
| DELETE | `/:id` | Admin | Hapus produk |

### Keranjang — `/api/cart` (semua butuh login)
| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/` | Isi keranjang + `totalItems` + `totalPrice` (hanya item tercentang) |
| POST | `/` | `{ productId, quantity? }` → tombol "+ Keranjang" |
| PUT | `/:productId` | `{ quantity?, selected? }` → counter (+/-) dan checkbox |
| DELETE | `/:productId` | Hapus 1 item |
| DELETE | `/` | Kosongkan keranjang |

### Pesanan — `/api/orders` (semua butuh login)
| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/` | User | `{ shippingAddress, paymentMethod: "transfer_bank" \| "e_wallet", items? }`. Tanpa `items` = checkout item yang dicentang di keranjang; dengan `items: [{ productId, quantity }]` = "Beli Sekarang" |
| GET | `/my` | User | Riwayat pesanan sendiri |
| GET | `/:id` | Pemilik / Admin | Detail pesanan |
| PUT | `/:id/pay` | Pemilik | "Konfirmasi & Bayar" (simulasi) → status `paid` |
| PUT | `/:id/cancel` | Pemilik | Batalkan pesanan `pending`, stok dikembalikan |
| GET | `/` | Admin | Semua pesanan (`?status=`) |
| PUT | `/:id/status` | Admin | `{ status: "shipped" \| "completed" }` |

Status pesanan: `pending → paid → shipped → completed` (atau `cancelled` dari `pending`).

### Aturan penting
- Harga selalu diambil dari database saat checkout, bukan dari client.
- Stok dikurangi atomik saat pesanan dibuat; jika ada item yang stoknya kurang, semua dibatalkan.
- Register selalu menghasilkan role `user`; admin dibuat lewat `npm run seed`.
- Pembayaran belum memakai payment gateway (sesuai lingkup MVP), `/pay` hanya menandai pesanan lunas.

## Struktur

```
app.js            konfigurasi Express (middleware, routes)
server.js         entry point (koneksi DB + listen)
config/           koneksi database
models/           User, Product, Cart, Order
controllers/      logika bisnis
routes/           definisi endpoint + validasi input
middleware/       auth (JWT), validasi, error handler
scripts/seed.js   data contoh
tests/            integration test
```

## Deploy (Render / Railway)

1. Buat cluster MongoDB Atlas, izinkan akses jaringan (`0.0.0.0/0` untuk tugas), salin connection string.
2. Buat Web Service dari repo ini: Build `npm install`, Start `npm start`.
3. Isi environment variable `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` (URL web yang sudah di-deploy).
4. Jalankan `npm run seed` sekali dari lokal (dengan `MONGO_URI` Atlas) untuk data awal.
