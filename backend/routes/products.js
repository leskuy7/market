const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');

// @desc    Tüm ürünleri getir
// @route   GET /api/products
router.get('/', async (req, res) => {
    try {
        const { category, search, lowStock, page = 1, limit = 50 } = req.query;

        let query = { isActive: true };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        if (lowStock === 'true') {
            query.$expr = { $lte: ['$stock', '$minStock'] };
        }

        const products = await Product.find(query)
            .populate('category', 'name color icon')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            count: products.length,
            total,
            pages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Barkod ile ürün ara
// @route   GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const product = await Product.findOne({
            barcode: req.params.barcode,
            isActive: true
        }).populate('category', 'name color icon');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Tek ürün getir
// @route   GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name color icon');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Ürün ekle
// @route   POST /api/products
router.post('/', protect, async (req, res) => {
    try {
        const product = await Product.create(req.body);

        // İlk stok hareketi
        if (product.stock > 0) {
            await StockMovement.create({
                product: product._id,
                type: 'in',
                quantity: product.stock,
                previousStock: 0,
                newStock: product.stock,
                reason: 'purchase',
                note: 'İlk stok girişi',
                user: req.user._id
            });
        }

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Ürün güncelle
// @route   PUT /api/products/:id
router.put('/:id', protect, async (req, res) => {
    try {
        // Stok değişikliği ayrı işlenecek
        const { stock, ...updateData } = req.body;

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('category', 'name color icon');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Ürün sil
// @route   DELETE /api/products/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Ürün silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Düşük stoklu ürünler
// @route   GET /api/products/alerts/low-stock
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const products = await Product.find({
            isActive: true,
            $expr: { $lte: ['$stock', '$minStock'] }
        }).populate('category', 'name color icon').sort('stock');

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
