require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// ─── Security Middleware ───
app.use(helmet({
    contentSecurityPolicy: false // SPA uyumluluğu için kapalı
}));

// Genel API Rate Limit (100 istek/dakika)
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.',
        error: 'RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Kimlik doğrulama Rate Limit (10 istek/dakika)
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.',
        error: 'AUTH_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Statik dosyaları sun (Frontend - EN BAŞTA OLMALI)
app.use(express.static(path.join(__dirname, 'public')));

// API rate limit uygula
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

const { protect, authorize } = require('./middleware/auth');

// Route'ları bağla
app.use('/api/auth', authRoutes);
app.use('/api/categories', protect, categoryRoutes);
app.use('/api/products', protect, productRoutes);
app.use('/api/stock', protect, stockRoutes);
app.use('/api/sales', protect, saleRoutes);
app.use('/api/reports', protect, reportRoutes);

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
