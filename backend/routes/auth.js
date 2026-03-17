const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateRegisterInput(email, password) {
    if (!email || !password) {
        return 'E-posta ve şifre gereklidir';
    }

    if (!EMAIL_REGEX.test(email)) {
        return 'Geçerli bir e-posta adresi giriniz';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return 'Şifre en az 1 harf ve 1 rakam içermelidir';
    }

    return null;
}

function validateLoginInput(email, password) {
    if (!email || !password) {
        return 'E-posta ve şifre gereklidir';
    }

    if (!EMAIL_REGEX.test(email)) {
        return 'Geçerli bir e-posta adresi giriniz';
    }

    return null;
}

// @desc    Kayıt ol (sadece e-posta ile)
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const name = String(req.body.name || '').trim();

        const validationMessage = validateRegisterInput(email, password);
        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage
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
        const userRole = userCount === 0 ? 'admin' : 'staff';

        const user = await User.create({
            email,
            password,
            name: name || email.split('@')[0],
            role: userRole
        });

        // Kayıttan sonra token dönme, giriş ekranına yönlendir
        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
            user: {
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

// @desc    Giriş yap (e-posta ile)
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        const validationMessage = validateLoginInput(email, password);
        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage
            });
        }

        const user = await User.findOne({ email }).select('+password');

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
            email: req.user.email,
            name: req.user.name,
            role: req.user.role
        }
    });
});

module.exports = router;
