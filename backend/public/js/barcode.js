// Barcode Scanner Module — html5-qrcode powered
const barcodeScanner = {
    html5Qr: null,
    scanning: false,
    onScan: null,

    async start(onScan) {
        this.onScan = onScan;

        try {
            // Clean up any previous instance
            if (this.html5Qr) {
                try { await this.html5Qr.stop(); } catch (_) { /* ignore */ }
                this.html5Qr.clear();
                this.html5Qr = null;
            }

            this.html5Qr = new Html5Qrcode('qr-reader');
            this.scanning = true;

            const config = {
                fps: 15,
                qrbox: { width: 280, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39
                ]
            };

            await this.html5Qr.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Barcode successfully decoded
                    if (typeof sfx !== 'undefined') sfx.beep();

                    const resultArea = document.getElementById('scanner-result-area');
                    const barcodeLabel = document.getElementById('scanned-barcode');
                    if (resultArea && barcodeLabel) {
                        barcodeLabel.textContent = decodedText;
                        resultArea.style.display = 'block';
                    }

                    // Trigger callback
                    if (this.onScan) this.onScan(decodedText);

                    // Auto-stop after reading
                    setTimeout(() => this.stop(), 500);
                },
                (_errorMessage) => {
                    // Scan frame — no barcode found yet (this is normal, not an error)
                }
            );

            return true;
        } catch (error) {
            console.error('Kamera başlatılamadı:', error);
            showToast('Kamera erişimi sağlanamadı. Lütfen kamera izni verin.', 'error');
            return false;
        }
    },

    async stop() {
        this.scanning = false;
        if (this.html5Qr) {
            try {
                await this.html5Qr.stop();
            } catch (_) { /* already stopped */ }
            try {
                this.html5Qr.clear();
            } catch (_) { /* ignore */ }
            this.html5Qr = null;
        }
    },

    // Manual barcode input
    async searchByBarcode(barcode) {
        try {
            const response = await api.products.getByBarcode(barcode);
            return response.success ? response.data : null;
        } catch {
            return null;
        }
    }
};

// Scanner modal handling
document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const scannerModal = document.getElementById('scanner-modal');
    const closeScanner = document.getElementById('close-scanner');

    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            scannerModal.classList.remove('hidden');
            const resultArea = document.getElementById('scanner-result-area');
            if (resultArea) resultArea.style.display = 'none';

            barcodeScanner.start(async (barcode) => {
                // If on sales page, add to cart directly
                if (typeof addToCart === 'function') {
                    await addToCart(barcode);
                }
                // Close modal after a short delay
                setTimeout(() => {
                    scannerModal.classList.add('hidden');
                }, 800);
            });
        });
    }

    if (closeScanner) {
        closeScanner.addEventListener('click', async () => {
            await barcodeScanner.stop();
            scannerModal.classList.add('hidden');
        });
    }
});
