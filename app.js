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

    // Fetch CSV from backend server
    async fetchCSVFromServer(serverUrl) {
        try {
            console.log(`Fetching CSV from: ${serverUrl}/api/download`);

            const response = await fetch(`${serverUrl}/api/download`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText || 'CSV not available'}`);
            }

            const csvText = await response.text();

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('CSV file is empty');
            }

            Papa.parse(csvText, {
                header: true,
                complete: async (results) => {
                    if (!results.data || results.data.length === 0) {
                        this.showAlert('CSV has no data rows', 'error');
                        return;
                    }

                    await this.saveParts(results.data);
                    const validParts = results.data.filter(p => p['Part Number'] && p['Part Name']).length;

                    document.getElementById('file-status').textContent = `✓ Fetched from server! Imported ${validParts} parts`;
                    document.getElementById('file-status').style.display = 'block';
                    this.updateStats();
                    this.showAlert(`✓ Parts loaded from admin server (${validParts} items)`, 'success');
                },
                error: (error) => {
                    console.error('CSV Parse Error:', error);
                    this.showAlert('Error parsing CSV: ' + error.message, 'error');
                }
            });
        } catch (error) {
            console.error('Fetch Error:', error);
            this.showAlert(`✗ Error: ${error.message}\n\nMake sure:\n1. Admin server running (port 5000)\n2. CSV uploaded to admin panel\n3. Both on same WiFi`, 'error');
        }
    }

    // Save parts to database
    async saveParts(parts) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('parts', 'readwrite');
            const store = tx.objectStore('parts');

            // Clear existing parts
            store.clear();

            parts.forEach((part) => {
                if (part['Part Number'] && part['Part Name']) {
                    this.partsDatabase[part['Part Number']] = part['Part Name'];
                    store.add({
                        partNumber: part['Part Number'].trim(),
                        partName: part['Part Name'].trim()
                    });
                }
            });

            tx.oncomplete = () => resolve();
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

    // Start camera
    async startScanning() {
        try {
            const video = document.getElementById('scanner-preview');
            video.style.display = 'block';

            this.showAlert('📷 Requesting camera access... (check notification)', 'info');

            this.codeReader = new ZXing.BrowserMultiFormatReader();

            console.log('Getting video input devices...');
            this.videoStream = await this.codeReader.getVideoInputDevices();

            if (this.videoStream.length === 0) {
                throw new Error('No camera found on device');
            }

            const selectedDeviceId = this.videoStream[0].deviceId;
            console.log('Using device:', selectedDeviceId);

            this.showAlert('✓ Camera access granted! Point at barcode...', 'success');

            await this.codeReader.decodeFromVideoDevice(
                selectedDeviceId,
                video,
                (result, err) => {
                    if (result) {
                        console.log('Barcode scanned:', result.getText());
                        this.handleBarcodeScan(result.getText());
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Scan error:', err);
                    }
                }
            );

            this.isScanning = true;
        } catch (err) {
            console.error('Camera error:', err);

            // Provide helpful error message based on error type
            let errorMsg = '';
            if (err.message.includes('enumerate')) {
                errorMsg = '❌ Camera enumeration failed\n\nUse manual entry instead:\n1. Scroll down\n2. Enter part number manually\n3. Click "Lookup Part"';
            } else if (err.message.includes('Permission denied')) {
                errorMsg = '❌ Camera permission denied\n\nGo to Settings → Apps → [Browser] → Permissions → Camera → Allow\n\nOr use manual entry below';
            } else if (err.message.includes('NotFoundError') || err.message.includes('No camera')) {
                errorMsg = '❌ No camera found\n\nUse manual entry instead:\n1. Scroll down to "Manual Entry"\n2. Enter part number\n3. Click "Lookup Part"';
            } else {
                errorMsg = `❌ ${err.message || 'Camera access failed'}\n\nUse manual entry as alternative`;
            }

            this.showAlert(errorMsg, 'error');
            video.style.display = 'none';
        }
    }

    // Stop camera
    async stopScanning() {
        if (this.codeReader) {
            this.codeReader.reset();
            document.getElementById('scanner-preview').style.display = 'none';
            this.isScanning = false;
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
