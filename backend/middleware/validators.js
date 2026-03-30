const { z } = require('zod');

// ─── Validation Schemas ───

const saleSchema = z.object({
    items: z.array(z.object({
        productId: z.string().min(1, 'Ürün ID gereklidir'),
        quantity: z.number().int().positive('Miktar 0\'dan büyük olmalıdır')
    })).min(1, 'Sepet boş olamaz'),
    discount: z.number().min(0, 'İndirim negatif olamaz').default(0),
    paymentMethod: z.enum(['cash', 'card'], { message: 'Geçersiz ödeme yöntemi' }).default('cash'),
    note: z.string().max(500).default('')
});

const productSchema = z.object({
    barcode: z.string().min(1, 'Barkod gereklidir'),
    name: z.string().min(1, 'Ürün adı gereklidir').max(200),
    category: z.string().nullable().optional(),
    purchasePrice: z.number().min(0, 'Alış fiyatı negatif olamaz'),
    salePrice: z.number().min(0, 'Satış fiyatı negatif olamaz'),
    stock: z.number().int().min(0, 'Stok negatif olamaz').default(0),
    minStock: z.number().int().min(0).default(5),
    unit: z.enum(['adet', 'kg', 'lt', 'paket', 'kutu']).default('adet'),
    supplier: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
});

const productUpdateSchema = productSchema.partial();

const categorySchema = z.object({
    name: z.string().min(1, 'Kategori adı gereklidir').max(100),
    description: z.string().max(500).optional(),
    color: z.string().max(20).optional()
});

const stockMovementSchema = z.object({
    productId: z.string().min(1, 'Ürün ID gereklidir'),
    type: z.enum(['in', 'out', 'adjustment'], { message: 'Geçersiz hareket tipi' }),
    quantity: z.number().int().positive('Miktar 0\'dan büyük olmalıdır'),
    reason: z.string().min(1, 'Sebep gereklidir'),
    note: z.string().max(500).optional()
});

// ─── Middleware Factory ───

/**
 * Creates an Express middleware that validates req.body against a Zod schema.
 * @param {z.ZodSchema} schema
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                const messages = err.errors.map(e => e.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', '),
                    error: 'VALIDATION_ERROR',
                    details: err.errors
                });
            }
            next(err);
        }
    };
}

module.exports = {
    validate,
    saleSchema,
    productSchema,
    productUpdateSchema,
    categorySchema,
    stockMovementSchema
};
