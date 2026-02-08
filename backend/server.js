require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route dosyaları
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const stockRoutes = require('./routes/stock');
const saleRoutes = require('./routes/sales');
const reportRoutes = require('./routes/reports');

// Veritabanı bağlantısı
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route'ları bağla
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);

// Ana sayfa (API Bilgisi)
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Market Stok Takip API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            categories: '/api/categories',
            products: '/api/products',
            stock: '/api/stock',
            sales: '/api/sales',
            reports: '/api/reports'
        }
    });
});

// Global hata yakalama middleware
app.use((err, req, res, next) => {
    console.error('Hata:', err);

    // Mongoose hataları
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Geçersiz ID formatı',
            error: 'INVALID_ID'
        });
    }

    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: messages.join(', '),
            error: 'VALIDATION_ERROR'
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `Bu ${field} zaten kullanılıyor`,
            error: 'DUPLICATE_KEY'
        });
    }

    // JWT hataları
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Geçersiz oturum. Lütfen tekrar giriş yapın.',
            error: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
            error: 'TOKEN_EXPIRED'
        });
    }

    // Genel sunucu hatası
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Sunucu hatası oluştu. Lütfen tekrar deneyin.',
        error: 'SERVER_ERROR'
    });
});

const path = require('path');

// Statik dosyaları sun (Frontend - Production)
app.use(express.static(path.join(__dirname, 'public')));

// 404 handler - API için
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'İstenen API endpoint bulunamadı',
        error: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// SPA için tüm diğer istekleri index.html'e yönlendir
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🏪 Market Stok Takip API                        ║
║   ────────────────────────                        ║
║   Port: ${PORT}                                      ║
║   Mode: ${process.env.NODE_ENV || 'development'}                           ║
║                                                   ║
║   API Endpoints:                                  ║
║   • /api/auth       - Kimlik doğrulama            ║
║   • /api/products   - Ürün yönetimi               ║
║   • /api/categories - Kategori yönetimi           ║
║   • /api/stock      - Stok hareketleri            ║
║   • /api/sales      - Satış işlemleri             ║
║   • /api/reports    - Raporlar                    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});
