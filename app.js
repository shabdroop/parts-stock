class InventoryApp {
    constructor() {
        this.db = null;
        this.codeReader = null;
        this.videoStream = null;
        this.isScanning = false;
        this.partsDatabase = {};
        this.currentEditingId = null;
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.setupEventListeners();
        this.registerServiceWorker();
        this.updateStats();
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

    // Start camera with jsQR
    async startScanning() {
        try {
            const video = document.getElementById('scanner-preview');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            video.style.display = 'block';

            this.showAlert('📷 Requesting camera access... Please allow when prompted', 'info');

            console.log('jsQR library available:', typeof jsQR !== 'undefined');

            // Request camera access with back camera preference
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            console.log('Requesting camera with constraints:', constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            console.log('Camera stream obtained');
            video.srcObject = stream;

            // Set canvas size to match video
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log('Canvas size:', canvas.width, 'x', canvas.height);
            };

            this.showAlert('✓ Camera ready! Scanning for QR codes...', 'success');

            // Start scanning loop
            this.isScanning = true;
            this.scanningStream = stream;

            const scanFrame = () => {
                if (!this.isScanning) return;

                try {
                    // Draw video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Get image data and decode QR code
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'dontInvert'
                    });

                    if (code) {
                        console.log('QR code scanned:', code.data);
                        this.handleBarcodeScan(code.data);
                        // Don't stop scanning, allow multiple scans
                    }
                } catch (frameError) {
                    // Silently continue scanning if frame processing fails
                }

                if (this.isScanning) {
                    requestAnimationFrame(scanFrame);
                }
            };

            // Start the scanning animation loop
            requestAnimationFrame(scanFrame);
            console.log('Camera scanning started successfully');

        } catch (err) {
            console.error('Camera error:', err);
            console.error('Error stack:', err.stack);

            let errorMsg = '';
            const errMsg = err.message ? err.message.toLowerCase() : '';

            if (errMsg.includes('notfounderr') || errMsg.includes('no camera')) {
                errorMsg = '❌ No camera found on device\n\nUse manual entry instead:\n1. Scroll down to "Manual Entry"\n2. Enter part number\n3. Click "Lookup Part"';
            } else if (errMsg.includes('notallowederror') || errMsg.includes('permission') || errMsg.includes('denied')) {
                errorMsg = '❌ Camera permission denied\n\n📱 Android: Go to Settings → Apps → Chrome → Permissions → Camera → Allow\n🖥️ Desktop: Check browser camera permissions\n\nOr use manual entry below';
            } else {
                errorMsg = `❌ ${err.message || 'Camera access failed'}\n\nTroubleshooting:\n1. Check camera permissions\n2. Try HTTPS connection\n3. Use manual entry as fallback`;
            }

            this.showAlert(errorMsg, 'error');
            document.getElementById('scanner-preview').style.display = 'none';
        }
    }

    // Stop camera
    async stopScanning() {
        this.isScanning = false;

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
