require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');

if (!process.env.JWT_SECRET) {
    console.error('Error: JWT_SECRET belum diatur di environment variable');
    process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Gagal menjalankan server:', error.message);
        process.exit(1);
    }
};

startServer();