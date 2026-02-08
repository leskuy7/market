const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Dashboard özeti
// @route   GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Bugünkü satışlar
        const todaySales = await Sale.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: 'completed'
        });

        // Haftalık satışlar
        const weeklySales = await Sale.find({
            createdAt: { $gte: weekAgo },
            status: 'completed'
        });

        // Toplam ürün sayısı
        const totalProducts = await Product.countDocuments({ isActive: true });

        // Düşük stoklu ürünler
        const lowStockProducts = await Product.countDocuments({
            isActive: true,
            $expr: { $lte: ['$stock', '$minStock'] }
        });

        // Toplam stok değeri
        const products = await Product.find({ isActive: true });
        const stockValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

        res.json({
            success: true,
            data: {
                today: {
                    salesCount: todaySales.length,
                    revenue: todaySales.reduce((sum, s) => sum + s.total, 0),
                    profit: todaySales.reduce((sum, s) => sum + s.profit, 0)
                },
                weekly: {
                    salesCount: weeklySales.length,
                    revenue: weeklySales.reduce((sum, s) => sum + s.total, 0),
                    profit: weeklySales.reduce((sum, s) => sum + s.profit, 0)
                },
                inventory: {
                    totalProducts,
                    lowStockProducts,
                    stockValue
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Satış raporu
// @route   GET /api/reports/sales
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        let matchStage = { status: 'completed' };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = end;
            }
        } else {
            // Varsayılan son 30 gün
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchStage.createdAt = { $gte: thirtyDaysAgo };
        }

        let groupId;
        if (groupBy === 'day') {
            groupId = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        } else if (groupBy === 'week') {
            groupId = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        } else {
            groupId = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        }

        const report = await Sale.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: groupId,
                    count: { $sum: 1 },
                    revenue: { $sum: '$total' },
                    profit: { $sum: '$profit' },
                    items: { $sum: { $size: '$items' } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    En çok satan ürünler
// @route   GET /api/reports/top-products
router.get('/top-products', async (req, res) => {
    try {
        const { limit = 10, startDate, endDate } = req.query;

        let matchStage = { status: 'completed' };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = end;
            }
        }

        const topProducts = await Sale.aggregate([
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.name' },
                    barcode: { $first: '$items.barcode' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Kategori bazlı satış
// @route   GET /api/reports/category-sales
router.get('/category-sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchStage = { status: 'completed' };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = end;
            }
        }

        const sales = await Sale.find(matchStage);

        // Ürün ID'lerini topla
        const productIds = [...new Set(sales.flatMap(s => s.items.map(i => i.product.toString())))];

        // Ürün ve kategori bilgilerini al
        const products = await Product.find({ _id: { $in: productIds } })
            .populate('category', 'name color');

        const productMap = {};
        products.forEach(p => {
            productMap[p._id.toString()] = p;
        });

        // Kategori bazlı hesapla
        const categoryStats = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = productMap[item.product.toString()];
                if (product) {
                    const catName = product.category ? product.category.name : 'Kategorisiz';
                    const catColor = product.category ? product.category.color : '#9ca3af';

                    if (!categoryStats[catName]) {
                        categoryStats[catName] = {
                            name: catName,
                            color: catColor,
                            quantity: 0,
                            revenue: 0
                        };
                    }

                    categoryStats[catName].quantity += item.quantity;
                    categoryStats[catName].revenue += item.total;
                }
            });
        });

        res.json({
            success: true,
            data: Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
