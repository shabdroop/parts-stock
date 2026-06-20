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
                    recordStore.createIndex('remarks', 'remarks');
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

            // Try with CORS enabled (works across networks/WiFi)
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                    'Content-Type': 'text/csv'
                },
                mode: 'cors',
                credentials: 'omit'  // Don't send cookies, works across networks
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
            let errorMsg = `✗ Error connecting to admin server\n\n`;

            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                errorMsg += `Network Issue Detected:\n`;
                errorMsg += `✓ Check admin server is running\n`;
                errorMsg += `✓ Works on different WiFi networks & mobile data\n`;
                errorMsg += `✓ Admin server URL: https://web-production-85db8e.up.railway.app\n\n`;
                errorMsg += `Steps:\n`;
                errorMsg += `1. Visit admin server URL\n`;
                errorMsg += `2. Upload CSV/Excel file\n`;
                errorMsg += `3. Click "Fetch from Admin Server" again\n\n`;
                errorMsg += `Or use "Upload Excel/CSV File" option below`;
            } else {
                errorMsg += `${error.message}\n\n`;
                errorMsg += `To fix:\n`;
                errorMsg += `1. Go to admin server\n`;
                errorMsg += `2. Upload your Excel or CSV file\n`;
                errorMsg += `3. Click "Fetch from Admin Server" again\n\n`;
                errorMsg += `Or manually upload file using "Upload Excel/CSV File" option`;
            }

            this.showAlert(errorMsg, 'error');
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

    // Start mobile-optimized frame-grabbing scanner
    async startScanning() {
        try {
            const video = document.getElementById('scanner-preview');
            video.style.display = 'block';

            this.showAlert('📷 Starting scanner...', 'info');

            // Request camera with moderate resolution for Android
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                },
                audio: false
            });

            video.srcObject = stream;
            this.scanningStream = stream;
            this.isScanning = true;

            // Log actual camera settings
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings ? track.getSettings() : {};
            console.log('Camera active:', {
                width: settings.width,
                height: settings.height,
                facingMode: settings.facingMode
            });

            // Start frame grabbing at safe rate for Android (2 FPS)
            this.startFrameGrabbing(video);

            this.showAlert('✓ Scanner active\n📍 Point camera at barcode/QR code', 'success');

        } catch (err) {
            console.error('Camera error:', err);
            this.handleCameraError(err);
        }
    }

    // Grab frames from video and scan them
    startFrameGrabbing(video) {
        let isProcessing = false;
        let frameCount = 0;
        const fps = 5;  // Increased to 5 FPS for better detection (safe on all devices)

        // Check if jsQR is available
        if (typeof jsQR === 'undefined') {
            console.warn('jsQR not loaded! QR code detection will not work.');
            this.showAlert('⚠️ QR detection library not loaded. Using manual entry as fallback.', 'warning');
        }

        this.frameGrabbingInterval = setInterval(async () => {
            if (!this.isScanning || isProcessing) return;

            isProcessing = true;
            frameCount++;

            try {
                // Create canvas from current video frame
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                if (canvas.width === 0 || canvas.height === 0) {
                    isProcessing = false;
                    return;  // Video not ready yet
                }

                const ctx = canvas.getContext('2d', { alpha: false });  // Optimize for opaque images
                ctx.drawImage(video, 0, 0);

                // Log every Nth frame for debugging
                if (frameCount % 10 === 0) {
                    console.log('Frame ' + frameCount + ' captured: ' + canvas.width + 'x' + canvas.height);
                }

                // Try native BarcodeDetector API first (Chrome Android with ML Kit)
                if ('BarcodeDetector' in window) {
                    try {
                        const detector = new BarcodeDetector({
                            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
                        });
                        const barcodes = await detector.detect(canvas);

                        if (barcodes && barcodes.length > 0) {
                            const code = barcodes[0].rawValue;
                            console.log('✓ Barcode detected (Native API) at frame ' + frameCount + ':', code);
                            this.showAlert(`✓ Detected: ${code}`, 'success');
                            this.isScanning = false;
                            await this.stopScanning();
                            await this.handleBarcodeScan(code);
                            return;
                        }
                    } catch (err) {
                        // Native API not available or failed, fall through to jsQR
                        if (frameCount === 1) {
                            console.log('Native BarcodeDetector not available, using jsQR fallback');
                        }
                    }
                }

                // Fallback: Use jsQR for QR codes
                if (typeof jsQR !== 'undefined') {
                    try {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        // Try jsQR with both inversion attempts
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: 'attemptBoth'  // Try both normal and inverted
                        });

                        if (code && code.data) {
                            console.log('✓ QR code detected (jsQR) at frame ' + frameCount + ':', code.data);
                            this.showAlert(`✓ Detected: ${code.data}`, 'success');
                            this.isScanning = false;
                            await this.stopScanning();
                            await this.handleBarcodeScan(code.data);
                            return;
                        }

                        // If not found, try with enhanced contrast (for poor lighting)
                        if (frameCount % 20 === 0) {  // Try every 20 frames to save CPU
                            const enhancedImageData = this.enhanceImageContrast(imageData);
                            const enhancedCode = jsQR(enhancedImageData.data, enhancedImageData.width, enhancedImageData.height, {
                                inversionAttempts: 'attemptBoth'
                            });

                            if (enhancedCode && enhancedCode.data) {
                                console.log('✓ QR code detected (jsQR+enhanced) at frame ' + frameCount + ':', enhancedCode.data);
                                this.showAlert(`✓ Detected: ${enhancedCode.data}`, 'success');
                                this.isScanning = false;
                                await this.stopScanning();
                                await this.handleBarcodeScan(enhancedCode.data);
                                return;
                            }
                        }
                    } catch (err) {
                        console.error('jsQR error:', err.message);
                    }
                }

            } catch (err) {
                console.error('Frame scanning error:', err);
                // Continue scanning despite errors
            } finally {
                isProcessing = false;
            }
        }, 1000 / fps);

        console.log('Frame grabbing started at ' + fps + ' FPS');
    }

    // Enhance image contrast for better QR detection in poor lighting
    enhanceImageContrast(imageData) {
        const data = new Uint8ClampedArray(imageData.data);

        // Calculate average brightness
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            total += brightness;
        }
        const average = total / (data.length / 4);

        // Enhance contrast around average
        const enhancement = 1.5;  // Contrast multiplier
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const adjusted = (brightness - average) * enhancement + average;
            const clipped = Math.max(0, Math.min(255, adjusted));

            data[i] = clipped;      // R
            data[i + 1] = clipped;  // G
            data[i + 2] = clipped;  // B
            // Keep alpha unchanged
        }

        return new ImageData(data, imageData.width, imageData.height);
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
        let retryLookupBtn = null;

        const closeModal = () => {
            modal.remove();
        };

        const rotateImage = () => {
            currentRotation = (currentRotation + 90) % 360;
            const imgElement = document.getElementById('preview-image');
            imgElement.style.transform = `rotate(${currentRotation}deg)`;
            console.log('Image rotated:', currentRotation, 'degrees');

            // Show "Retry Lookup" button after rotation
            if (!retryLookupBtn) {
                const btnContainer = document.querySelector('[style*="display: flex"][style*="gap: 8px"][style*="flex-wrap"]');
                if (btnContainer) {
                    retryLookupBtn = document.createElement('button');
                    retryLookupBtn.id = 'retry-lookup-btn';
                    retryLookupBtn.textContent = '🔍 Retry Lookup';
                    retryLookupBtn.style.cssText = `
                        flex: 1; min-width: 120px; padding: 12px;
                        background: #e67e22; color: white; border: none;
                        border-radius: 5px; cursor: pointer; font-weight: 600;
                    `;
                    retryLookupBtn.onclick = () => {
                        this.detectBarcodeFromImage(imageData, currentRotation);
                    };
                    btnContainer.insertBefore(retryLookupBtn, btnContainer.firstChild);
                }
            }

            // Auto-retry barcode detection after rotation
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
                           style="flex: 1; padding: 12px; border: 2px solid #3498db; border-radius: 5px; font-size: 14px;">
                </div>
                <button id="trim-btn" style="width: 100%; padding: 10px; margin-bottom: 12px; background: #9b59b6; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 13px;">
                    ✂️ Trim QR (Extract Part #)
                </button>
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

        const handleTrim = () => {
            const codeInput = document.getElementById('captured-barcode');
            const fullText = codeInput.value.trim();

            if (!fullText) {
                alert('Please enter or detect a code first');
                return;
            }

            // Show trim dialog with options
            const trimDialog = document.createElement('div');
            trimDialog.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; padding: 20px; border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                z-index: 10001; max-width: 500px; text-align: left;
            `;

            // Parse QR data (format: field1#field2#field3#...)
            const fields = fullText.split('#').filter(f => f.trim().length > 0);

            let optionsHtml = '<p style="font-weight: bold; margin-bottom: 12px;">Multiple fields detected. Select part number:</p>';
            optionsHtml += '<div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px; padding: 10px;">';

            fields.forEach((field, idx) => {
                const displayText = field.length > 50 ? field.substring(0, 47) + '...' : field;
                optionsHtml += `
                    <div style="padding: 8px; margin: 4px 0; background: #f5f5f5; border-radius: 4px; cursor: pointer; border-left: 3px solid #3498db;"
                         onclick="document.getElementById('trim-select-${idx}').checked = true;">
                        <input type="radio" name="trim-select" id="trim-select-${idx}" value="${field}" style="cursor: pointer;">
                        <label for="trim-select-${idx}" style="cursor: pointer; margin-left: 5px; display: inline;">
                            ${displayText}
                        </label>
                    </div>
                `;
            });

            optionsHtml += '</div>';

            trimDialog.innerHTML = `
                <h3 style="margin-top: 0;">Extract Part Number</h3>
                ${optionsHtml}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="trim-confirm" style="flex: 1; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        ✓ Use Selected
                    </button>
                    <button id="trim-cancel" style="flex: 1; padding: 10px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        ✕ Cancel
                    </button>
                </div>
            `;

            document.body.appendChild(trimDialog);

            document.getElementById('trim-confirm').onclick = () => {
                const selected = document.querySelector('input[name="trim-select"]:checked');
                if (selected) {
                    codeInput.value = selected.value;
                    trimDialog.remove();

                    // Show 10-second countdown before proceeding
                    let countdown = 10;
                    const countdownDiv = document.createElement('div');
                    countdownDiv.style.cssText = `
                        position: fixed; top: 20px; right: 20px;
                        background: #3498db; color: white; padding: 15px 20px;
                        border-radius: 8px; font-weight: bold; font-size: 16px;
                        z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    `;
                    countdownDiv.textContent = `Auto-lookup in ${countdown}s... Edit part # above`;
                    document.body.appendChild(countdownDiv);

                    const countdownInterval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            countdownDiv.textContent = `Auto-lookup in ${countdown}s... Edit or rotate image`;
                        } else {
                            clearInterval(countdownInterval);
                            countdownDiv.remove();
                            handleUseCode();
                        }
                    }, 1000);

                    // Allow user to click "Use Code" button to skip waiting
                    const originalUseCodeHandler = document.getElementById('use-code-btn').onclick;
                    document.getElementById('use-code-btn').onclick = () => {
                        clearInterval(countdownInterval);
                        countdownDiv.remove();
                        handleUseCode();
                    };
                }
            };

            document.getElementById('trim-cancel').onclick = () => {
                trimDialog.remove();
            };

            // Select first option by default
            if (fields.length > 0) {
                document.getElementById('trim-select-0').checked = true;
            }
        };

        // Attach event listeners
        document.getElementById('rotate-btn').addEventListener('click', () => rotateImage());
        document.getElementById('retry-btn').addEventListener('click', () => handleRetry());
        document.getElementById('retake-btn').addEventListener('click', () => handleRetake());
        document.getElementById('trim-btn').addEventListener('click', () => handleTrim());
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

                    let detectedCode = null;

                    // Try native BarcodeDetector first (Chrome Android)
                    if ('BarcodeDetector' in window) {
                        try {
                            const detector = new BarcodeDetector({
                                formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
                            });
                            const barcodes = await detector.detect(canvas);
                            if (barcodes && barcodes.length > 0) {
                                detectedCode = barcodes[0].rawValue;
                                console.log('Barcode detected (Native):', detectedCode);
                            }
                        } catch (err) {
                            console.log('Native detector note:', err.message);
                        }
                    }

                    // Fallback: Try jsQR for QR codes
                    if (!detectedCode && typeof jsQR !== 'undefined') {
                        try {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'attemptBoth'  // Try both normal and inverted
                            });
                            if (qrCode && qrCode.data) {
                                detectedCode = qrCode.data;
                                console.log('QR code detected (jsQR):', detectedCode);
                            }
                        } catch (err) {
                            console.log('jsQR note:', err.message);
                        }
                    }

                    if (detectedCode) {
                        statusDiv.style.display = 'none';
                        resultDiv.style.display = 'block';
                        document.getElementById('detected-code-display').textContent = detectedCode;
                        codeInput.value = detectedCode;
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
            // Stop frame grabbing
            if (this.frameGrabbingInterval) {
                clearInterval(this.frameGrabbingInterval);
                this.frameGrabbingInterval = null;
                console.log('Frame grabbing stopped');
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

            // Stop current scanner and stream
            await this.stopScanning();

            // Wait a moment then start fresh
            await new Promise(resolve => setTimeout(resolve, 500));

            // Start scanner again
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

            // Set readonly for found parts (user shouldn't edit)
            const partNameField = document.getElementById('part-name');
            partNameField.setAttribute('readonly', 'readonly');
            partNameField.value = partName;

            document.getElementById('part-number').value = partNumber;
            document.getElementById('physical-count').value = '';
            document.getElementById('location').value = '';
            document.getElementById('remarks').value = '';

            form.style.display = 'block';
            document.getElementById('physical-count').focus();
        } else {
            // Part not found - offer to add manually
            resultDiv.innerHTML = `
                <div class="scan-result error">
                    ✗ Part number not found in database: "${partNumber}"
                </div>
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-top: 12px;">
                    <strong>Want to add this part manually?</strong><br>
                    <small>Click button below to create a new entry with this part number.</small><br>
                    <button onclick="app.addNewPartManually('${partNumber}')" style="margin-top: 10px; padding: 8px 16px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                        ➕ Add New Part
                    </button>
                </div>
            `;
            resultDiv.style.display = 'block';
            form.style.display = 'none';
        }
    }

    // Add new part manually (when not found in database)
    addNewPartManually(partNumber) {
        const form = document.getElementById('scan-form');
        const resultDiv = document.getElementById('scan-result');
        const partNameField = document.getElementById('part-name');

        resultDiv.innerHTML = `
            <div class="scan-result" style="background: #d1ecf1; border-left-color: #17a2b8;">
                ℹ️ Adding new part: <strong>${partNumber}</strong>
            </div>
        `;

        document.getElementById('part-number').value = partNumber;

        // IMPORTANT: Remove readonly so user can enter part name
        partNameField.removeAttribute('readonly');
        partNameField.value = '';  // Clear field for user input

        document.getElementById('physical-count').value = '';
        document.getElementById('location').value = '';
        document.getElementById('remarks').value = 'Part Not in System Data';  // Auto-populate remarks

        form.style.display = 'block';
        partNameField.focus();  // Focus on part name since it's required

        this.showAlert('📝 Enter Part Name (required) and other details to add this new part', 'info');
    }

    // Save record
    async saveRecord() {
        const partNumber = document.getElementById('part-number').value;
        const partName = document.getElementById('part-name').value;
        const count = document.getElementById('physical-count').value;
        const location = document.getElementById('location').value;
        const remarks = document.getElementById('remarks').value || '';

        if (!partNumber || !partName || !count || !location) {
            alert('Please fill all required fields (marked with *)');
            return;
        }

        const record = {
            timestamp: new Date().toLocaleString(),
            partNumber: partNumber,
            partName: partName,
            physicalCount: parseInt(count),
            location: location,
            remarks: remarks
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
        const remarks = document.getElementById('edit-remarks').value || '';

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
                record.remarks = remarks;

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
                document.getElementById('edit-remarks').value = record.remarks || '';

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

                // Ask user for filename
                const timestamp = new Date().toISOString().slice(0, 10);
                const defaultName = `inventory-${timestamp}`;
                const fileName = prompt('Enter filename for Excel export:', defaultName);

                if (!fileName) {
                    // User cancelled
                    resolve();
                    return;
                }

                // Prepare data for Excel
                const data = records.map(r => ({
                    'Timestamp': r.timestamp,
                    'Part Number': r.partNumber,
                    'Part Name': r.partName,
                    'Physical Count': r.physicalCount,
                    'Location': r.location,
                    'Remarks': r.remarks || ''
                }));

                // Create workbook and worksheet
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

                // Set column widths for better readability
                const colWidths = [25, 15, 25, 15, 15];
                worksheet['!cols'] = colWidths.map(width => ({ wch: width }));

                // Use custom filename (add .xlsx if not included)
                const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
                XLSX.writeFile(workbook, finalName);

                this.showAlert(`✓ Inventory exported to: ${finalName}`, 'success');
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

                // Ask user for filename
                const timestamp = new Date().toISOString().slice(0, 10);
                const defaultName = `inventory-${timestamp}`;
                const fileName = prompt('Enter filename for CSV export:', defaultName);

                if (!fileName) {
                    // User cancelled
                    resolve();
                    return;
                }

                const csv = Papa.unparse(records.map(r => ({
                    'Timestamp': r.timestamp,
                    'Part Number': r.partNumber,
                    'Part Name': r.partName,
                    'Physical Count': r.physicalCount,
                    'Location': r.location,
                    'Remarks': r.remarks || ''
                })));

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);

                // Use custom filename (add .csv if not included)
                const finalName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
                link.setAttribute('href', url);
                link.setAttribute('download', finalName);
                link.style.visibility = 'hidden';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showAlert(`✓ Inventory exported to: ${finalName}`, 'success');
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
