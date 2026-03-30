/**
 * Async route handler wrapper - try/catch gerekliliğini ortadan kaldırır.
 * Yakalanmayan hatalar otomatik olarak Express error handler'a iletilir.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
