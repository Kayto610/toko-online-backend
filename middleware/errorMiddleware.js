const notFound = (req, res, next) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} tidak ditemukan` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let status = err.statusCode || 500;
    let message = err.message || 'Terjadi kesalahan pada server';

    if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message)[0];
    } else if (err.name === 'CastError') {
        status = 400;
        message = `Format ${err.path} tidak valid`;
    } else if (err.code === 11000) {
        status = 409;
        message = `${Object.keys(err.keyValue || {})[0] || 'Data'} sudah terdaftar`;
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'Format JSON tidak valid';
    }

    if (status === 500) console.error(err);

    res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
