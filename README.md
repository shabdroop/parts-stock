# 📦 Inventory Check - Offline Barcode Scanner

A Progressive Web App (PWA) for physical inventory management with barcode scanning, designed to work fully offline on Android devices in low-connectivity areas.

## Features

- ✅ **Barcode Scanning** - Use device camera to scan barcodes
- ✅ **Offline First** - Works completely offline, no internet needed
- ✅ **Local Storage** - All data saved locally on device (IndexedDB)
- ✅ **Part Database** - Import part numbers and names from CSV
- ✅ **Mobile Optimized** - Clean UI designed for Android devices
- ✅ **Data Export** - Export completed inventory to CSV/Excel
- ✅ **No Installation** - Runs in browser, optional PWA install

## Quick Start

### 1. Prepare Your Data
Export your parts list from Google Sheets as CSV:
- Open your Google Sheet
- Click **File** → **Download** → **Comma Separated Values (.csv)**
- Save the file
- **Important:** Ensure it has columns named exactly:
  - `Part Number` (or `PartNumber`)
  - `Part Name` (or `PartName`)

### 2. Deploy on Server
You need to serve these files on a web server. Options:

#### Option A: GitHub Pages (Recommended)
```bash
# Push these files to a GitHub repository
# Go to Settings → Pages → Deploy from main branch
# Your app will be at: https://yourusername.github.io/repo-name
```

#### Option B: Simple Local Server
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx http-server)
npx http-server
```

#### Option C: Docker
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

#### Option D: Cloud Hosting
- Vercel: `vercel deploy`
- Netlify: Drag and drop folder
- AWS S3 + CloudFront
- Google Cloud Storage

### 3. Access on Android Device
1. Open any mobile browser (Chrome, Firefox, etc.)
2. Go to your deployed URL
3. **Optional:** Install as PWA:
   - Chrome: Tap menu (⋮) → "Install app" or "Add to Home screen"
   - Works offline after installation

### 4. First Time Setup
1. Go to **⚙️ Setup** tab
2. Click **"Choose CSV File"** and select your exported parts CSV
3. Wait for import to complete
4. Check "Parts in Database" count to confirm

### 5. Start Scanning
1. Go to **📷 Scan** tab
2. Click **"Start Camera"** 
3. Grant camera permission when prompted
4. Point camera at barcode (part number barcode)
5. System automatically:
   - Reads barcode
   - Looks up part name from database
   - Shows scan result
6. Fill in:
   - **Physical Count** - quantity found
   - **Location** - e.g., "A1-02-03" (Bay-Rack-Bin)
7. Click **"Save Record"**
8. Camera resets for next scan

### 6. Review Records
Go to **📋 Records** tab to:
- View all scanned records in table format
- Click **Edit** to modify any record
- Delete records if needed

### 7. Export Inventory
1. Go to **📋 Records** tab
2. Click **"📥 Export to CSV"**
3. File downloads: `inventory-YYYY-MM-DD.csv`
4. Open in Excel, Google Sheets, or any spreadsheet app

## Data Structure

### Saved Records Include:
- **Timestamp** - Date and time of scan
- **Part Number** - From barcode
- **Part Name** - Looked up from CSV database
- **Physical Count** - Quantity found
- **Location** - Bay/Rack/Bin location

### Example CSV Output:
```
Timestamp,Part Number,Part Name,Physical Count,Location
6/19/2026, 11:30:45 AM,SKU-001,Widget A,15,A1-02-03
6/19/2026, 11:32:10 AM,SKU-005,Bolt B,32,B2-01-01
```

## Offline Capability

- ✅ Works completely offline after first load
- ✅ Camera/barcode scanning works offline
- ✅ All data stored locally on device
- ✅ No sync needed
- ✅ Export to CSV anytime (no internet required)

## Technical Details

### Storage
- **IndexedDB** for part database and records
- Local storage persists data permanently on device
- No cloud sync (unless you add it)

### Barcode Scanning
- Uses ZXing.js library (open source)
- Supports all common barcode formats:
  - Code 128, Code 39
  - UPC-A, UPC-E
  - EAN-8, EAN-13
  - QR Codes (bonus!)

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+ (iOS/iPadOS)
- Samsung Internet

## Troubleshooting

### Camera Not Working
- Check permissions: Settings → Apps → Chrome → Permissions → Camera
- Try different browser
- Make sure URL uses HTTPS (required for camera access)

### Barcode Not Scanning
- Ensure barcode is clear and well-lit
- Try different angles and distances
- Check barcode format is in ZXing's supported list
- Make sure part exists in imported database

### CSV Not Importing
- Check file has columns: "Part Number" and "Part Name"
- Ensure no special characters that break CSV
- Try opening in Excel first to validate format

### Data Not Saving
- Check device storage isn't full
- Try clearing browser cache
- Check IndexedDB storage (Chrome DevTools → Application → IndexedDB)

## File Structure

```
.
├── index.html          # Main UI
├── app.js              # Application logic
├── service-worker.js   # Offline support
├── manifest.json       # PWA configuration
└── README.md          # This file
```

## Development Notes

### Adding Features
- Modify `app.js` for logic changes
- Modify `index.html` for UI changes
- Service worker caches automatically

### Performance
- First load: ~500KB (includes ZXing library)
- Subsequent loads: <50KB (cached)
- Camera: Uses native device hardware
- Database: IndexedDB queries are instant

## Advanced: Enable Cloud Sync

To sync data back to Google Sheets:
1. Set up Google Sheets API
2. Modify `app.js` to add sync on export
3. Add authentication flow

(Contact developer for implementation)

## Support

### Common Use Cases

**Multiple Locations?**
- Use location field: "Warehouse-A1-02-03"
- Filter/sort by location in Excel after export

**Bulk Upload?**
- Export CSV
- Combine multiple CSVs with standard tools
- Upload to Google Sheets as needed

**Multiple Users?**
- Each device has own local data
- Combine CSVs from all devices after inventory

**Partial Inventory?**
- Don't need to scan everything at once
- Data saved immediately
- Continue anytime, export when done

## License

Open source - modify as needed for your use case.

## Version
v1.0 - 2026-06-19
