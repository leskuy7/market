const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');

// @desc    Satış yap
// @route   POST /api/sales
router.post('/', protect, async (req, res) => {
    try {
        const { items, discount = 0, paymentMethod = 'cash', note = '' } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sepet boş olamaz'
            });
        }

        let saleItems = [];
        let subtotal = 0;

        // Her ürün için stok kontrolü ve bilgi toplama
        for (const item of items) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Ürün bulunamadı: ${item.productId}`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Yetersiz stok: ${product.name} (Mevcut: ${product.stock})`
                });
            }

            const itemTotal = product.salePrice * item.quantity;
            subtotal += itemTotal;

            saleItems.push({
                product: product._id,
                barcode: product.barcode,
                name: product.name,
                quantity: item.quantity,
                unitPrice: product.salePrice,
                purchasePrice: product.purchasePrice,
                total: itemTotal
            });
        }

        const total = subtotal - discount;

        // Satışı kaydet
        const sale = await Sale.create({
            items: saleItems,
            subtotal,
            discount,
            total,
            paymentMethod,
            note,
            user: req.user._id
        });

        // Stokları düş ve hareketleri kaydet
        for (const item of saleItems) {
            const product = await Product.findById(item.product);
            const previousStock = product.stock;
            product.stock -= item.quantity;
            await product.save();

            await StockMovement.create({
                product: item.product,
                type: 'out',
                quantity: item.quantity,
                previousStock,
                newStock: product.stock,
                reason: 'sale',
                reference: sale.saleNumber,
                user: req.user._id
            });
        }

        res.status(201).json({
            success: true,
            data: sale
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Satışları listele
// @route   GET /api/sales
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

        let query = {};

        if (status) query.status = status;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const sales = await Sale.find(query)
            .populate('user', 'name')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Sale.countDocuments(query);

        res.json({
            success: true,
            count: sales.length,
            total,
            data: sales
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Tek satış detayı
// @route   GET /api/sales/:id
router.get('/:id', async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('user', 'name')
            .populate('items.product', 'name barcode');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Satış bulunamadı'
            });
        }

        res.json({
            success: true,
            data: sale
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Bugünkü satışlar özeti
// @route   GET /api/sales/summary/today
router.get('/summary/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const sales = await Sale.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: 'completed'
        });

        const summary = {
            count: sales.length,
            total: sales.reduce((sum, s) => sum + s.total, 0),
            profit: sales.reduce((sum, s) => sum + s.profit, 0),
            items: sales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0)
        };

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
