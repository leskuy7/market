const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    barcode: String,
    name: String,
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true
    },
    purchasePrice: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
});

const saleSchema = new mongoose.Schema({
    saleNumber: {
        type: String,
        unique: true
    },
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'mixed'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled', 'refunded'],
        default: 'completed'
    },
    note: {
        type: String,
        default: ''
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Satış numarası oluştur
saleSchema.pre('save', async function (next) {
    if (!this.saleNumber) {
        const date = new Date();
        const prefix = `S${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        });
        this.saleNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    // Kar hesapla
    this.profit = this.items.reduce((sum, item) => {
        return sum + ((item.unitPrice - item.purchasePrice) * item.quantity);
    }, 0);

    next();
});

module.exports = mongoose.model('Sale', saleSchema);
