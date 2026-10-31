require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');

if (!process.env.JWT_SECRET) {
    console.error('Error : JWT_SECRET belum diatur di environment variable');
    process.exit(1);
}

connectDB();

// jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
