const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');
const { validate, saleSchema } = require('../middleware/validators');

// @desc    Satış yap (MongoDB Transaction ile ACID)
// @route   POST /api/sales
router.post('/', protect, validate(saleSchema), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, discount = 0, paymentMethod = 'cash', note = '' } = req.body;

        let saleItems = [];
        let subtotal = 0;

        // Her ürün için stok kontrolü ve bilgi toplama
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);

            if (!product) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    message: `Ürün bulunamadı: ${item.productId}`
                });
            }

            if (product.stock < item.quantity) {
                await session.abortTransaction();
                session.endSession();
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

        if (discount > subtotal) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'İndirim tutarı ara toplamdan büyük olamaz'
            });
        }

        const total = subtotal - discount;

        // Satışı kaydet (transaction içinde)
        const [sale] = await Sale.create([{
            items: saleItems,
            subtotal,
            discount,
            total,
            paymentMethod,
            note,
            user: req.user._id
        }], { session });

        // Stokları düş ve hareketleri kaydet (transaction içinde)
        for (const item of saleItems) {
            const product = await Product.findById(item.product).session(session);
            const previousStock = product.stock;
            product.stock -= item.quantity;
            await product.save({ session });

            await StockMovement.create([{
                product: item.product,
                type: 'out',
                quantity: item.quantity,
                previousStock,
                newStock: product.stock,
                reason: 'sale',
                reference: sale.saleNumber,
                user: req.user._id
            }], { session });
        }

        // Her şey başarılı — commit
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            data: sale
        });
    } catch (error) {
        // Hata — rollback
        await session.abortTransaction();
        session.endSession();

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

// @desc    Satış iptal et
// @route   PUT /api/sales/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Satış bulunamadı'
            });
        }

        if (sale.status !== 'completed') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Bu satış zaten ${sale.status === 'cancelled' ? 'iptal edilmiş' : 'iade edilmiş'}`
            });
        }

        // Stokları geri ekle
        for (const item of sale.items) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                const previousStock = product.stock;
                product.stock += item.quantity;
                await product.save({ session });

                await StockMovement.create([{
                    product: item.product,
                    type: 'in',
                    quantity: item.quantity,
                    previousStock,
                    newStock: product.stock,
                    reason: 'return',
                    reference: sale.saleNumber,
                    note: 'Satış iptali',
                    user: req.user._id
                }], { session });
            }
        }

        sale.status = 'cancelled';
        sale.note = (sale.note ? sale.note + ' | ' : '') + `İptal: ${req.body.reason || 'Sebep belirtilmedi'}`;
        await sale.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Satış iptal edildi',
            data: sale
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Satış iade et
// @route   PUT /api/sales/:id/refund
router.put('/:id/refund', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Satış bulunamadı'
            });
        }

        if (sale.status !== 'completed') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Bu satış zaten ${sale.status === 'cancelled' ? 'iptal edilmiş' : 'iade edilmiş'}`
            });
        }

        // Stokları geri ekle
        for (const item of sale.items) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                const previousStock = product.stock;
                product.stock += item.quantity;
                await product.save({ session });

                await StockMovement.create([{
                    product: item.product,
                    type: 'in',
                    quantity: item.quantity,
                    previousStock,
                    newStock: product.stock,
                    reason: 'return',
                    reference: sale.saleNumber,
                    note: 'Satış iadesi',
                    user: req.user._id
                }], { session });
            }
        }

        sale.status = 'refunded';
        sale.note = (sale.note ? sale.note + ' | ' : '') + `İade: ${req.body.reason || 'Sebep belirtilmedi'}`;
        await sale.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Satış iade edildi',
            data: sale
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
