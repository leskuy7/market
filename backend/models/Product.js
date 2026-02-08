const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    barcode: {
        type: String,
        required: [true, 'Barkod gereklidir'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Ürün adı gereklidir'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Alış fiyatı gereklidir'],
        min: 0
    },
    salePrice: {
        type: Number,
        required: [true, 'Satış fiyatı gereklidir'],
        min: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    minStock: {
        type: Number,
        default: 5,
        min: 0
    },
    unit: {
        type: String,
        enum: ['adet', 'kg', 'lt', 'paket', 'kutu'],
        default: 'adet'
    },
    image: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    supplier: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Düşük stok kontrolü
productSchema.virtual('isLowStock').get(function () {
    return this.stock <= this.minStock;
});

// Kar marjı hesaplama
productSchema.virtual('profitMargin').get(function () {
    if (this.purchasePrice === 0) return 100;
    return ((this.salePrice - this.purchasePrice) / this.purchasePrice * 100).toFixed(2);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
