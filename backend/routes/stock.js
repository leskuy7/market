const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');

// @desc    Stok hareketi ekle
// @route   POST /api/stock/movement
router.post('/movement', protect, async (req, res) => {
    try {
        const { productId, type, quantity, reason, note } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        const previousStock = product.stock;
        let newStock;

        if (type === 'in') {
            newStock = previousStock + quantity;
        } else if (type === 'out') {
            if (previousStock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Yetersiz stok'
                });
            }
            newStock = previousStock - quantity;
        } else {
            newStock = quantity; // adjustment
        }

        const movement = await StockMovement.create({
            product: productId,
            type,
            quantity,
            previousStock,
            newStock,
            reason,
            note,
            user: req.user._id
        });

        product.stock = newStock;
        await product.save();

        res.status(201).json({
            success: true,
            data: movement,
            product: {
                id: product._id,
                name: product.name,
                stock: product.stock
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Ürün stok geçmişi
// @route   GET /api/stock/history/:productId
router.get('/history/:productId', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const movements = await StockMovement.find({ product: req.params.productId })
            .populate('user', 'name')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await StockMovement.countDocuments({ product: req.params.productId });

        res.json({
            success: true,
            count: movements.length,
            total,
            data: movements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Tüm stok hareketleri
// @route   GET /api/stock/movements
router.get('/movements', async (req, res) => {
    try {
        const { type, reason, startDate, endDate, page = 1, limit = 50 } = req.query;

        let query = {};

        if (type) query.type = type;
        if (reason) query.reason = reason;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const movements = await StockMovement.find(query)
            .populate('product', 'name barcode')
            .populate('user', 'name')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await StockMovement.countDocuments(query);

        res.json({
            success: true,
            count: movements.length,
            total,
            data: movements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
