class InventoryApp {
    constructor() {
        this.db = null;
        this.codeReader = null;
        this.videoStream = null;
        this.isScanning = false;
        this.partsDatabase = {};
        this.currentEditingId = null;
        this.qrScanner = null;
        this.orientationLocked = false;
        this.html5QrcodeScanner = null;
        this.isScanning = false;
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.setupEventListeners();
        this.registerServiceWorker();
        this.updateStats();
        this.setupOrientationHandling();
    }

    // Setup orientation change handling for Android
    setupOrientationHandling() {
        const handleOrientationChange = () => {
            console.log('Orientation changed:', screen.orientation.type);

            // Adjust video preview size on orientation change
            const video = document.getElementById('scanner-preview');
            if (video && video.style.display !== 'none') {
                setTimeout(() => {
                    // Force video element to recalculate dimensions
                    if (video.videoWidth && video.videoHeight) {
                        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                    }
                }, 100);
            }
        };

        // Listen for orientation changes
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        } else {
            window.addEventListener('orientationchange', handleOrientationChange);
        }
    }

    // Initialize IndexedDB
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('InventoryDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('parts')) {
                    const partStore = db.createObjectStore('parts', { keyPath: 'id', autoIncrement: true });
                    partStore.createIndex('partNumber', 'partNumber', { unique: true });
                }

                if (!db.objectStoreNames.contains('records')) {
                    const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                    recordStore.createIndex('timestamp', 'timestamp');
                    recordStore.createIndex('partNumber', 'partNumber');
                }
            };
        });
    }

    setupEventListeners() {
        document.getElementById('scan-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecord();
        });

        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateRecord();
        });
    }

    // Register Service Worker for offline support
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js').catch(() => {
                // Service worker registration failed, app still works
            });
        }
    }

    // Import file (CSV or Excel)
    async importFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.csv')) {
                this.importCSV(event);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                this.importExcel(file);
            } else {
                alert('Unsupported file format. Please use CSV, XLSX, or XLS');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    // CSV Import
    async importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                await this.saveParts(results.data);
                document.getElementById('file-status').textContent = `✓ Imported ${results.data.length} parts`;
                document.getElementById('file-status').style.display = 'block';
                this.updateStats();
            },
            error: (error) => {
                alert('Error parsing CSV: ' + error.message);
            }
        });
    }

    // Excel Import
    async importExcel(file) {
        try {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];

                // Convert to JSON with headers
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Validate required columns
                if (jsonData.length === 0) {
                    alert('Excel file is empty');
                    return;
                }

                const firstRow = jsonData[0];
                const hasPartNumber = Object.keys(firstRow).some(key =>
                    key.toLowerCase().includes('part number') || key.toLowerCase().includes('partnumber')
                );
                const hasPartName = Object.keys(firstRow).some(key =>
                    key.toLowerCase().includes('part name') || key.toLowerCase().includes('partname')
                );

                if (!hasPartNumber || !hasPartName) {
                    alert('Excel must have columns: "Part Number" and "Part Name"');
                    return;
                }

                // Normalize column names to match CSV format
                const normalizedData = jsonData.map(row => {
                    const normalized = {};
                    Object.keys(row).forEach(key => {
                        if (key.toLowerCase().includes('part number') || key.toLowerCase().includes('partnumber')) {
                            normalized['Part Number'] = row[key];
                        } else if (key.toLowerCase().includes('part name') || key.toLowerCase().includes('partname')) {
                            normalized['Part Name'] = row[key];
                        } else {
                            normalized[key] = row[key];
                        }
                    });
                    return normalized;
                });

                await this.saveParts(normalizedData);
                document.getElementById('file-status').textContent = `✓ Imported ${normalizedData.length} parts from Excel`;
                document.getElementById('file-status').style.display = 'block';
                this.updateStats();
            };

            reader.readAsArrayBuffer(file);
        } catch (error) {
            alert('Error parsing Excel: ' + error.message);
        }
    }

    // Fetch CSV from backend server
    async fetchCSVFromServer(serverUrl) {
        try {
            const apiUrl = `${serverUrl}/api/download`;
            console.log(`Fetching parts from: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                    'Content-Type': 'text/csv'
                },
                mode: 'cors'
            });

            console.log(`Response status: ${response.status}`);

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                    console.log('Error response:', errorText);
                } catch (e) {
                    errorText = 'Unable to read error';
                }
                throw new Error(`Server error: ${response.status} - ${errorText || 'File not found. Upload a CSV or Excel file to admin server first.'}`);
            }

            const csvText = await response.text();
            console.log(`Received ${csvText.length} bytes of data`);

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('CSV file is empty. Please upload a valid file to admin server.');
            }

            console.log('Starting Papa.parse...');
            const self = this; // Store reference to this for use in callback

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true, // Preserve number formats
                complete: async (results) => {
                    try {
                        console.log(`Parsed ${results.data.length} rows from CSV`);
                        console.log('First few rows:', results.data.slice(0, 2));

                        if (!results.data || results.data.length === 0) {
                            self.showAlert('CSV has no data rows', 'error');
                            return;
                        }

                        // Filter out completely empty rows
                        console.log('Filtering data rows...');
                        const validData = results.data.filter(row =>
                            row['Part Number'] || row['Part Name'] || Object.values(row).some(v => v)
                        );

                        console.log(`Found ${validData.length} valid data rows`);
                        console.log('Filtering parts with both Part Number and Part Name...');
                        const validParts = validData.filter(p => p['Part Number'] && p['Part Name']).length;
                        console.log(`Total valid parts (with both fields): ${validParts}`);

                        if (validParts === 0) {
                            self.showAlert('No valid parts found. Make sure all rows have both "Part Number" and "Part Name"', 'error');
                            return;
                        }

                        console.log('Showing save alert...');
                        self.showAlert(`💾 Saving ${validParts} parts to database... This may take a moment.`, 'info');

                        console.log('Starting database save...');
                        console.log('saveParts is a function:', typeof self.saveParts === 'function');

                        await self.saveParts(validData);

                        console.log('Database save completed');
                        document.getElementById('file-status').textContent = `✓ Fetched from server! Imported ${validParts} parts`;
                        document.getElementById('file-status').style.display = 'block';

                        // Update stats after successful save
                        console.log('Updating stats...');
                        await self.updateStats();

                        self.showAlert(`✓ Parts loaded successfully!\n\n${validParts} parts now available for scanning`, 'success');
                    } catch (completeError) {
                        console.error('Error in parse complete callback:', completeError);
                        console.error('Error stack:', completeError.stack);
                        self.showAlert(`✗ Unexpected error: ${completeError.message}`, 'error');
                    }
                },
                error: (error) => {
                    console.error('CSV Parse Error:', error);
                    self.showAlert('Error parsing CSV: ' + error.message + '\n\nMake sure the file has "Part Number" and "Part Name" columns', 'error');
                }
            });
        } catch (error) {
            console.error('Fetch Error:', error);
            this.showAlert(`✗ Error: ${error.message}\n\nTo use admin server:\n1. Go to: https://web-production-85db8e.up.railway.app\n2. Upload your Excel or CSV file\n3. Then click "Fetch from Admin Server" again\n\nOr use "Manual Entry" option below`, 'error');
        }
    }

    // Save parts to database (optimized for large datasets)
    async saveParts(parts) {
        console.log(`Starting to save ${parts.length} parts to database...`);

        return new Promise(async (resolve, reject) => {
            try {
                // Clear existing parts first
                const clearTx = this.db.transaction('parts', 'readwrite');
                const clearStore = clearTx.objectStore('parts');
                const clearRequest = clearStore.clear();

                clearRequest.onerror = () => {
                    console.error('Error clearing database:', clearRequest.error);
                    reject(clearRequest.error);
                };

                clearRequest.onsuccess = () => {
                    console.log('Database cleared');

                    // Process parts in batches to avoid transaction timeouts
                    const batchSize = 500;
                    let currentBatch = 0;

                    const processBatch = () => {
                        const start = currentBatch * batchSize;
                        const end = Math.min(start + batchSize, parts.length);
                        const batch = parts.slice(start, end);

                        if (batch.length === 0) {
                            console.log('All parts saved successfully');
                            resolve();
                            return;
                        }

                        const tx = this.db.transaction('parts', 'readwrite');
                        const store = tx.objectStore('parts');

                        batch.forEach((part) => {
                            if (part['Part Number'] && part['Part Name']) {
                                const partNumber = String(part['Part Number']).trim();
                                const partName = String(part['Part Name']).trim();

                                this.partsDatabase[partNumber] = partName;

                                try {
                                    store.add({
                                        partNumber: partNumber,
                                        partName: partName
                                    });
                                } catch (e) {
                                    console.warn(`Error adding part ${partNumber}:`, e);
                                }
                            }
                        });

                        tx.onerror = () => {
                            console.error(`Error in batch ${currentBatch}:`, tx.error);
                            reject(tx.error);
                        };

                        tx.oncomplete = () => {
                            console.log(`Batch ${currentBatch} completed (${end}/${parts.length} parts)`);
                            currentBatch++;
                            processBatch();
                        };
                    };

                    processBatch();
                };
            } catch (error) {
                console.error('Error in saveParts:', error);
                reject(error);
            }
        });
    }

    // Load parts from database into memory
    async loadPartsFromDatabase() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('parts', 'readonly');
            const store = tx.objectStore('parts');
            const request = store.getAll();

            request.onsuccess = () => {
                this.partsDatabase = {};
                request.result.forEach(part => {
                    this.partsDatabase[part.partNumber] = part.partName;
                });
                resolve();
            };
        });
    }

    // Start continuous video stream scanning (like UPI/Payment apps)
    async startScanning() {
        try {
            const video = document.getElementById('scanner-preview');
            video.style.display = 'block';

            this.showAlert('📷 Starting real-time scanner...', 'info');

            // Initialize html5-qrcode for continuous scanning
            const config = {
                fps: 10,  // Scan 10 frames per second (payment app standard)
                qrbox: { width: 250, height: 250 },  // Scan center region only
                aspectRatio: 1.77,
                disableFlip: false,  // Try both normal and inverted
                rememberLastUsedCamera: true
            };

            this.html5QrcodeScanner = new Html5Qrcode('scanner-preview');

            await this.html5QrcodeScanner.start(
                { facingMode: 'environment' },
                config,
                async (decodedText) => {
                    // SUCCESS - Barcode/QR detected
                    console.log('Barcode detected:', decodedText);
                    this.showAlert(`✓ Detected: ${decodedText}`, 'success');

                    // Stop scanning
                    await this.stopScanning();

                    // Process the barcode
                    await this.handleBarcodeScan(decodedText);
                },
                (errorMessage) => {
                    // Continuous scanning expects many failures - just continue
                    // Don't spam console logs
                }
            );

            this.isScanning = true;
            this.showAlert('✓ Real-time QR/Barcode scanner active\n\n📍 Point camera at code', 'success');

        } catch (err) {
            console.error('Camera error:', err);
            this.handleCameraError(err);
        }
    }

    // Handle camera errors
    handleCameraError(err) {
        let errorMsg = '';
        const errMsg = err.message ? err.message.toLowerCase() : '';

        if (errMsg.includes('notfounderr') || errMsg.includes('no camera')) {
            errorMsg = '❌ No camera found\n\nUse:\n• Upload barcode image\n• Manual entry below';
        } else if (errMsg.includes('notallowederror') || errMsg.includes('permission') || errMsg.includes('denied')) {
            errorMsg = '❌ Camera permission denied\n\n📱 Android: Settings → Chrome → Permissions → Camera → Allow\n\nOr use image upload / manual entry';
        } else {
            errorMsg = `❌ Camera error: ${err.message}\n\nUse image upload or manual entry`;
        }

        this.showAlert(errorMsg, 'error');
        document.getElementById('scanner-preview').style.display = 'none';
    }

    // Capture current frame from video for manual review
    async capturePhoto() {
        try {
            const video = document.getElementById('scanner-preview');

            if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                this.showAlert('⏳ Camera warming up... Please wait', 'info');
                return;
            }

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                this.showAlert('⏳ Camera not ready yet', 'info');
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const orientation = screen.orientation?.type || window.orientation;
            const isLandscape = orientation.includes('landscape');
            const needsRotation = !isLandscape;

            if (needsRotation) {
                canvas.width = video.videoHeight;
                canvas.height = video.videoWidth;
                ctx.translate(canvas.width, 0);
                ctx.rotate((90 * Math.PI) / 180);
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            } else {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            await this.showImagePreview(imageData);

        } catch (err) {
            console.error('Capture error:', err);
            this.showAlert('❌ Error capturing photo: ' + err.message, 'error');
        }
    }

    // Show image preview with barcode detection and rotation
    async showImagePreview(imageData) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

        let currentRotation = 0;

        const closeModal = () => {
            modal.remove();
        };

        const rotateImage = () => {
            currentRotation = (currentRotation + 90) % 360;
            const imgElement = document.getElementById('preview-image');
            imgElement.style.transform = `rotate(${currentRotation}deg)`;
            console.log('Image rotated:', currentRotation, 'degrees');

            // Retry barcode detection after rotation
            setTimeout(() => {
                this.detectBarcodeFromImage(imageData, currentRotation);
            }, 300);
        };

        const handleUseCode = () => {
            const codeInput = document.getElementById('captured-barcode');
            const code = codeInput.value.trim();

            if (!code) {
                alert('⚠️ Please enter a barcode or QR code');
                codeInput.focus();
                return;
            }

            console.log('Using code:', code);
            this.handleBarcodeScan(code);
            closeModal();
        };

        const handleRetry = async () => {
            console.log('Retrying scanner...');
            closeModal();
            // Restart continuous scanner for another attempt
            await this.retryScanning();
        };

        const handleRetake = () => {
            console.log('Retaking photo...');
            closeModal();
        };

        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; max-width: 95%; max-width: 90vw; text-align: center; max-height: 90vh; overflow-y: auto;">
                <h2>Captured Photo</h2>
                <img src="${imageData}" id="preview-image" style="width: 100%; max-width: 500px; border-radius: 8px; margin: 15px 0; max-height: 50vh; object-fit: contain; transition: transform 0.3s;">

                <div style="display: flex; gap: 8px; margin-bottom: 12px; justify-content: center;">
                    <button id="rotate-btn" style="padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px;">
                        🔄 Rotate Photo
                    </button>
                </div>

                <div id="barcode-status" style="font-size: 14px; color: #666; margin: 12px 0; padding: 12px; background: #f0f0f0; border-radius: 6px;">
                    ⏳ Scanning for barcode/QR code...
                </div>

                <div id="barcode-result" style="display: none; margin: 12px 0; padding: 12px; background: #d5f4e6; border-radius: 6px; border-left: 4px solid #27ae60;">
                    <strong>✓ Barcode/QR detected:</strong>
                    <div id="detected-code-display" style="font-size: 18px; font-weight: bold; color: #27ae60; margin-top: 8px;"></div>
                </div>

                <p style="font-size: 14px; color: #666; margin: 12px 0;">
                    📍 Review or manually enter the barcode/QR code number:
                </p>
                <div style="display: flex; gap: 10px; margin: 15px 0;">
                    <input type="text" placeholder="e.g., 123456789" id="captured-barcode"
                           style="flex: 1; padding: 12px; border: 2px solid #3498db; border-radius: 5px; font-size: 16px;">
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="retry-btn" style="flex: 1; min-width: 120px; padding: 12px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        🔄 Retry Scanner
                    </button>
                    <button id="retake-btn" style="flex: 1; min-width: 120px; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        📸 Retake
                    </button>
                    <button id="use-code-btn" style="flex: 1; min-width: 120px; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        ✓ Use Code
                    </button>
                </div>
            </div>
        `;

        modal.id = 'barcode-modal';
        document.body.appendChild(modal);

        // Attach event listeners
        document.getElementById('rotate-btn').addEventListener('click', () => rotateImage());
        document.getElementById('retry-btn').addEventListener('click', () => handleRetry());
        document.getElementById('retake-btn').addEventListener('click', () => handleRetake());
        document.getElementById('use-code-btn').addEventListener('click', () => handleUseCode());
        document.getElementById('captured-barcode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleUseCode();
        });

        // Perform barcode detection
        await this.detectBarcodeFromImage(imageData, 0);

        // Focus on input
        setTimeout(() => {
            document.getElementById('captured-barcode').focus();
        }, 100);

        console.log('Image preview modal created with rotation and barcode detection');
    }

    // Detect barcode/QR code from image
    async detectBarcodeFromImage(imageData, rotation = 0) {
        try {
            const statusDiv = document.getElementById('barcode-status');
            const resultDiv = document.getElementById('barcode-result');
            const codeInput = document.getElementById('captured-barcode');

            console.log('Starting barcode detection (rotation: ' + rotation + 'deg)...');

            // Create image from data URL
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = async () => {
                try {
                    // Create canvas to potentially rotate the image for scanning
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (rotation !== 0) {
                        // Apply rotation for detection
                        const radians = (rotation * Math.PI) / 180;
                        const cos = Math.cos(radians);
                        const sin = Math.sin(radians);

                        const newWidth = Math.abs(img.width * cos) + Math.abs(img.height * sin);
                        const newHeight = Math.abs(img.width * sin) + Math.abs(img.height * cos);

                        canvas.width = newWidth;
                        canvas.height = newHeight;

                        ctx.translate(newWidth / 2, newHeight / 2);
                        ctx.rotate(radians);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                    }

                    // Get canvas data URL
                    const rotatedImageData = canvas.toDataURL('image/jpeg', 0.9);

                    // Try html5-qrcode detection
                    const detectedCodes = await Html5Qrcode.scanFile(rotatedImageData, true);

                    if (detectedCodes && detectedCodes.length > 0) {
                        const primaryCode = detectedCodes[0].decodedText;
                        console.log('Barcode detected:', primaryCode);

                        statusDiv.style.display = 'none';
                        resultDiv.style.display = 'block';
                        document.getElementById('detected-code-display').textContent = primaryCode;
                        codeInput.value = primaryCode;
                    } else {
                        throw new Error('No barcode detected');
                    }
                } catch (err) {
                    console.log('Detection attempt ' + rotation + 'deg:', err.message);
                    statusDiv.innerHTML = `
                        ⚠️ No barcode/QR detected<br>
                        <small>Try rotating with 🔄 button or enter code manually</small>
                    `;
                    resultDiv.style.display = 'none';
                }
            };

            img.src = imageData;

        } catch (err) {
            console.error('Barcode Detection Error:', err);
            const statusDiv = document.getElementById('barcode-status');
            statusDiv.innerHTML = `
                ⚠️ Detection error<br>
                <small>Please enter the barcode manually</small>
            `;
        }
    }

    // Handle file upload from phone
    async handleBarcodeImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            console.log('Processing uploaded image:', file.name);

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                this.showImagePreview(imageData);
            };
            reader.readAsDataURL(file);

        } catch (err) {
            console.error('Upload error:', err);
            this.showAlert('❌ Error processing image: ' + err.message, 'error');
        }
    }

    // Stop camera and scanner
    async stopScanning() {
        this.isScanning = false;

        try {
            // Stop continuous scanner
            if (this.html5QrcodeScanner) {
                try {
                    await this.html5QrcodeScanner.stop();
                    this.html5QrcodeScanner = null;
                    console.log('QR scanner stopped');
                } catch (err) {
                    console.error('Error stopping scanner:', err);
                }
            }

            // Stop camera stream
            if (this.scanningStream) {
                this.scanningStream.getTracks().forEach(track => track.stop());
                this.scanningStream = null;
                console.log('Camera stream stopped');
            }

            // Hide video element
            const video = document.getElementById('scanner-preview');
            if (video) {
                video.style.display = 'none';
                video.srcObject = null;
            }

            this.showAlert('📷 Camera stopped', 'info');
        } catch (err) {
            console.error('Error stopping camera:', err);
        }
    }

    // Retry scanning (for when detection fails)
    async retryScanning() {
        try {
            this.showAlert('🔄 Restarting scanner...', 'info');

            // Stop current scanner
            if (this.html5QrcodeScanner) {
                try {
                    await this.html5QrcodeScanner.stop();
                } catch (err) {
                    console.error('Error stopping scanner:', err);
                }
            }

            // Start fresh
            await this.startScanning();
        } catch (err) {
            console.error('Retry error:', err);
            this.showAlert('❌ Error restarting scanner: ' + err.message, 'error');
        }
    }

    // Handle barcode scan result
    async handleBarcodeScan(barcode) {
        if (!barcode.trim()) return;

        const partNumber = barcode.trim();
        document.getElementById('manual-part-number').value = partNumber;
        await this.lookupPart();
    }

    // Manual part lookup
    async lookupPart() {
        const partNumber = document.getElementById('manual-part-number').value.trim();

        if (!partNumber) {
            this.showAlert('Enter a part number', 'error');
            return;
        }

        // Load parts if not already loaded
        if (Object.keys(this.partsDatabase).length === 0) {
            await this.loadPartsFromDatabase();
        }

        const partName = this.partsDatabase[partNumber];
        const resultDiv = document.getElementById('scan-result');
        const form = document.getElementById('scan-form');

        if (partName) {
            resultDiv.innerHTML = `
                <div class="scan-result success">
                    ✓ Part found: ${partName}
                </div>
            `;
            resultDiv.style.display = 'block';

            document.getElementById('part-number').value = partNumber;
            document.getElementById('part-name').value = partName;
            document.getElementById('physical-count').value = '';
            document.getElementById('location').value = '';

            form.style.display = 'block';
            document.getElementById('physical-count').focus();
        } else {
            resultDiv.innerHTML = `
                <div class="scan-result error">
                    ✗ Part number not found in database: "${partNumber}"
                    <br><small>Make sure it matches exactly (e.g., SKU-001)</small>
                </div>
            `;
            resultDiv.style.display = 'block';
            form.style.display = 'none';
        }
    }

    // Save record
    async saveRecord() {
        const partNumber = document.getElementById('part-number').value;
        const partName = document.getElementById('part-name').value;
        const count = document.getElementById('physical-count').value;
        const location = document.getElementById('location').value;

        if (!partNumber || !partName || !count || !location) {
            alert('Please fill all fields');
            return;
        }

        const record = {
            timestamp: new Date().toLocaleString(),
            partNumber: partNumber,
            partName: partName,
            physicalCount: parseInt(count),
            location: location
        };

        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readwrite');
            const store = tx.objectStore('records');
            store.add(record);

            tx.oncomplete = () => {
                this.showAlert('✓ Record saved successfully', 'success');
                this.resetForm();
                this.updateStats();
                resolve();
            };
        });
    }

    // Reset form
    resetForm() {
        document.getElementById('scan-form').reset();
        document.getElementById('scan-result').style.display = 'none';
        document.getElementById('part-number').focus();
    }

    // Update record
    async updateRecord() {
        const id = this.currentEditingId;
        const partName = document.getElementById('edit-part-name').value;
        const count = document.getElementById('edit-physical-count').value;
        const location = document.getElementById('edit-location').value;

        if (!partName || !count || !location) {
            alert('Please fill all fields');
            return;
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readwrite');
            const store = tx.objectStore('records');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const record = getRequest.result;
                record.partName = partName;
                record.physicalCount = parseInt(count);
                record.location = location;

                store.put(record);
            };

            tx.oncomplete = () => {
                this.showAlert('✓ Record updated', 'success');
                this.closeEditModal();
                this.loadRecords();
                this.updateStats();
                resolve();
            };
        });
    }

    // Delete record
    async deleteRecord() {
        if (!confirm('Are you sure you want to delete this record?')) return;

        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readwrite');
            const store = tx.objectStore('records');
            store.delete(this.currentEditingId);

            tx.oncomplete = () => {
                this.showAlert('✓ Record deleted', 'success');
                this.closeEditModal();
                this.loadRecords();
                this.updateStats();
                resolve();
            };
        });
    }

    // Load and display records
    async loadRecords() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => {
                const records = request.result.reverse();
                const container = document.getElementById('records-list');

                if (records.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>No records yet. Go to Scan tab to start recording inventory.</p>
                        </div>
                    `;
                } else {
                    let html = '<table class="records-table"><thead><tr>';
                    html += '<th>Timestamp</th><th>Part #</th><th>Part Name</th><th>Count</th><th>Location</th><th>Action</th></tr></thead><tbody>';

                    records.forEach(record => {
                        html += `<tr>
                            <td>${record.timestamp}</td>
                            <td><strong>${record.partNumber}</strong></td>
                            <td>${record.partName}</td>
                            <td>${record.physicalCount}</td>
                            <td>${record.location}</td>
                            <td><button class="btn-primary action-btn" onclick="app.openEditModal(${record.id})">Edit</button></td>
                        </tr>`;
                    });

                    html += '</tbody></table>';
                    container.innerHTML = html;
                }
                resolve();
            };
        });
    }

    // Open edit modal
    async openEditModal(id) {
        this.currentEditingId = id;

        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const request = store.get(id);

            request.onsuccess = () => {
                const record = request.result;
                document.getElementById('edit-part-number').value = record.partNumber;
                document.getElementById('edit-part-name').value = record.partName;
                document.getElementById('edit-physical-count').value = record.physicalCount;
                document.getElementById('edit-location').value = record.location;

                document.getElementById('edit-modal').classList.add('show');
                resolve();
            };
        });
    }

    // Close edit modal
    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('show');
        document.getElementById('edit-form').reset();
        this.currentEditingId = null;
    }

    // Export to Excel
    async exportExcel() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;

                if (records.length === 0) {
                    alert('No records to export');
                    resolve();
                    return;
                }

                // Prepare data for Excel
                const data = records.map(r => ({
                    'Timestamp': r.timestamp,
                    'Part Number': r.partNumber,
                    'Part Name': r.partName,
                    'Physical Count': r.physicalCount,
                    'Location': r.location
                }));

                // Create workbook and worksheet
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

                // Set column widths for better readability
                const colWidths = [25, 15, 25, 15, 15];
                worksheet['!cols'] = colWidths.map(width => ({ wch: width }));

                // Generate Excel file
                const timestamp = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(workbook, `inventory-${timestamp}.xlsx`);

                this.showAlert('✓ Inventory exported to Excel', 'success');
                resolve();
            };
        });
    }

    // Export to CSV
    async exportCSV() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;

                if (records.length === 0) {
                    alert('No records to export');
                    resolve();
                    return;
                }

                const csv = Papa.unparse(records.map(r => ({
                    'Timestamp': r.timestamp,
                    'Part Number': r.partNumber,
                    'Part Name': r.partName,
                    'Physical Count': r.physicalCount,
                    'Location': r.location
                })));

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);

                const timestamp = new Date().toISOString().slice(0, 10);
                link.setAttribute('href', url);
                link.setAttribute('download', `inventory-${timestamp}.csv`);
                link.style.visibility = 'hidden';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showAlert('✓ Inventory exported to CSV', 'success');
                resolve();
            };
        });
    }

    // Clear all records
    async clearAllRecords() {
        if (!confirm('Are you sure you want to delete all records? This cannot be undone.')) return;

        return new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readwrite');
            const store = tx.objectStore('records');
            store.clear();

            tx.oncomplete = () => {
                this.showAlert('✓ All records cleared', 'success');
                this.loadRecords();
                this.updateStats();
                resolve();
            };
        });
    }

    // Update statistics
    async updateStats() {
        // Update parts count
        const partsCount = await new Promise((resolve) => {
            const tx = this.db.transaction('parts', 'readonly');
            const store = tx.objectStore('parts');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
        });

        // Update records count
        const recordsCount = await new Promise((resolve) => {
            const tx = this.db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
        });

        document.getElementById('parts-count').textContent = partsCount;
        document.getElementById('records-saved-count').textContent = recordsCount;
        document.getElementById('record-count').textContent = `${recordsCount} records`;

        await this.loadRecords();
    }

    // Show alert
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;

        const container = document.querySelector('.tab-content.active');
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    // Load records when switching to records tab
    if (tabName === 'records') {
        app.loadRecords();
    }
}

// Initialize app when DOM is ready
const app = new InventoryApp();
