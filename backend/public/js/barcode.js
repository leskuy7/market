// Barcode Scanner Module
const barcodeScanner = {
    video: null,
    stream: null,
    scanning: false,
    onScan: null,

    async start(onScan) {
        this.onScan = onScan;
        this.video = document.getElementById('scanner-video');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.video.srcObject = this.stream;
            this.scanning = true;
            this.scan();
            return true;
        } catch (error) {
            showToast('Kamera erişimi sağlanamadı', 'error');
            return false;
        }
    },

    stop() {
        this.scanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    scan() {
        if (!this.scanning) return;
        // Polling for barcode (simplified - would use QuaggaJS in production)
        requestAnimationFrame(() => this.scan());
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
            barcodeScanner.start((barcode) => {
                document.getElementById('scanned-barcode').textContent = barcode;
            });
        });
    }

    if (closeScanner) {
        closeScanner.addEventListener('click', () => {
            barcodeScanner.stop();
            scannerModal.classList.add('hidden');
        });
    }
});
