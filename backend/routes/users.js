const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @desc    Tüm kullanıcıları listele (admin)
// @route   GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort('-createdAt');

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kullanıcı güncelle (admin)
// @route   PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, role, isActive } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Admin kendi rolünü değiştiremesin
        if (req.params.id === req.user._id.toString() && role && role !== req.user.role) {
            return res.status(400).json({
                success: false,
                message: 'Kendi rolünüzü değiştiremezsiniz'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kullanıcı sil (devre dışı bırak) (admin)
// @route   DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        // Admin kendini silemez
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Kendi hesabınızı silemezsiniz'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Kullanıcı devre dışı bırakıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
