const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Kayıt ol
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, name, role } = req.body;

        // Validasyonlar
        if (!username || !email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanları doldurunuz',
                errors: {
                    username: !username ? 'Kullanıcı adı gerekli' : null,
                    email: !email ? 'E-posta gerekli' : null,
                    password: !password ? 'Şifre gerekli' : null,
                    name: !name ? 'Ad soyad gerekli' : null
                }
            });
        }

        // Kullanıcı adı kontrolü
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Bu kullanıcı adı zaten kullanılıyor',
                field: 'username'
            });
        }

        // E-posta kontrolü
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı',
                field: 'email'
            });
        }

        // İlk kullanıcı otomatik admin olsun
        const userCount = await User.countDocuments();
        const userRole = userCount === 0 ? 'admin' : (role || 'staff');

        const user = await User.create({
            username,
            email,
            password,
            name,
            role: userRole
        });

        // Kayıttan sonra token dönme, giriş ekranına yönlendir
        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
            user: {
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        // Mongoose validasyon hataları
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', '),
                errors: error.errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Sunucu hatası. Lütfen tekrar deneyin.'
        });
    }
});

// @desc    Giriş yap
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı adı ve şifre gereklidir'
            });
        }

        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz kullanıcı bilgileri'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Hesabınız devre dışı bırakılmış'
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz kullanıcı bilgileri'
            });
        }

        // Son giriş zamanını güncelle
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = user.getSignedJwtToken();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Mevcut kullanıcı bilgisi
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role
        }
    });
});

module.exports = router;
