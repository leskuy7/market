const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { validate, categorySchema } = require('../middleware/validators');

// @desc    Tüm kategorileri getir
// @route   GET /api/categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort('name');
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kategori ekle
// @route   POST /api/categories
router.post('/', protect, validate(categorySchema), async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kategori güncelle
// @route   PUT /api/categories/:id
router.put('/:id', protect, validate(categorySchema.partial()), async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kategori sil
// @route   DELETE /api/categories/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        // Bu kategoriye ait aktif ürün var mı kontrol et
        const productCount = await Product.countDocuments({
            category: req.params.id,
            isActive: true
        });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Bu kategoride ${productCount} aktif ürün bulunuyor. Önce ürünleri başka bir kategoriye taşıyın.`
            });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Kategori silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
