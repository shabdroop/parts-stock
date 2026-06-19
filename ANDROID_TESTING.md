# Testing Inventory Check on Android Device (Local Network)

## Quick Start

### Your PC IP Address
```
192.168.150.103
```

### On Android Device
Open browser and go to:
```
http://192.168.150.103:8000
```

---

## Step-by-Step Setup

### 1. Ensure PC Server is Running
On your Windows PC, keep this running:
```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python -m http.server 8000
```

✅ Should show: `Serving HTTP on 0.0.0.0 port 8000`

### 2. Android Device - Prerequisites
- ✅ Android phone/tablet on same WiFi as PC
- ✅ Any browser (Chrome, Firefox, Samsung Internet)
- ✅ Camera app works (test first)

### 3. Open App on Android
1. Open browser on Android device
2. Type in address bar: `http://192.168.150.103:8000`
3. Hit Enter
4. Wait for page to load (first load ~2-3 seconds)

### 4. First Time Setup
1. Go to **⚙️ Setup** tab
2. Download sample CSV:
   - Go to `C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock\sample_parts.csv`
   - Send to phone via email/WhatsApp/drive OR use CSV provided below

3. **Quick Sample CSV** (if needed)
   ```
   Part Number,Part Name
   SKU-001,Widget A - Standard Size
   SKU-002,Widget B - Premium
   SKU-005,Bolt Assembly - Grade 8
   SKU-010,Washer - Stainless Steel
   SKU-015,Spring - Compression Type
   SKU-020,Bearing - Double Row
   SKU-025,Seal Kit - Hydraulic
   SKU-030,Gasket - Rubber
   ```

4. On Android, tap **"Choose CSV File"** → Select your parts CSV
5. Should show: `✓ Imported 8 parts`

### 5. Test Barcode Scanning
1. Go to **📷 Scan** tab
2. Tap **"Start Camera"**
3. Grant camera permission when prompted
4. Point camera at a barcode containing `SKU-001` to `SKU-030`
   - Use barcodes from your existing inventory
   - Or create test barcodes with:
     - Google Sheets: Insert → QR code
     - Online: https://barcode.tec-it.com/

5. When barcode scans:
   - System shows: ✓ Part found in database
   - Auto-fills Part Number and Part Name
   - Shows form for Physical Count and Location

### 6. Add Inventory Records
After barcode scan:
1. **Physical Count** = quantity you found (e.g., 15)
2. **Location** = where it is (e.g., A1-02-03)
3. Tap **"Save Record"**
4. Form clears for next scan

### 7. Review Records
1. Go to **📋 Records** tab
2. See all scanned items in table
3. Can edit any record:
   - Tap **"Edit"** button
   - Change part name, count, or location
   - Or delete if needed

### 8. Export Results
1. Go to **📋 Records** tab
2. Tap **"📥 Export to CSV"**
3. File downloads: `inventory-YYYY-MM-DD.csv`
4. Open in Excel, Google Sheets, or share

---

## Troubleshooting on Android

### "Cannot reach localhost:8000"
- ❌ **Problem**: Wrong IP or server not running
- ✅ **Solution**:
  - Check PC IP: `192.168.150.103` is correct
  - Verify PC server running (should see "Serving HTTP")
  - Restart Python server
  - Check both devices on same WiFi network

### "Camera not working"
- ❌ **Problem**: App can't access camera
- ✅ **Solution**:
  - Android > Settings > Apps > [Browser] > Permissions > Camera → Allow
  - Close browser and reopen
  - Try different browser (Chrome, Firefox, Samsung Internet)

### "CSV won't import"
- ❌ **Problem**: File format wrong
- ✅ **Solution**:
  - Must have columns: `Part Number` and `Part Name` (exact names)
  - Test with sample_parts.csv first
  - Try uploading from Downloads folder

### "Barcode not scanning"
- ❌ **Problem**: Barcode format not supported
- ✅ **Solution**:
  - Clear barcode, bright lighting, steady hand
  - Try different barcode formats (Code 128 works best)
  - Test with QR code first (always works)
  - Check ZXing.js loaded: DevTools → Console (no errors)

### "Records not saving"
- ❌ **Problem**: Storage issue
- ✅ **Solution**:
  - Android storage not full
  - Close other apps
  - Clear browser cache: Settings > Apps > [Browser] > Storage > Clear
  - Restart app

### "App crashes/blank screen"
- ❌ **Problem**: Browser error
- ✅ **Solution**:
  - Press F12 on PC (developer tools) → Console tab → look for errors
  - Refresh page (Ctrl+R or swipe down)
  - Try different browser
  - Check app.js and index.html loaded (no 404 errors)

---

## Testing Checklist

Use this to verify everything works:

- [ ] Server running on PC
- [ ] Can reach `http://192.168.150.103:8000` from Android
- [ ] App loads and shows header "Inventory Check"
- [ ] Three tabs visible: Scan, Records, Setup
- [ ] Can import sample CSV (8 parts loaded)
- [ ] Can start camera (permission granted)
- [ ] Can scan test barcode → finds part in database
- [ ] Can enter Physical Count and Location
- [ ] Can save record → appears in Records tab
- [ ] Can edit/delete records
- [ ] Can export to CSV
- [ ] File downloaded successfully

---

## Data Files

All data is stored **locally on the Android device** using IndexedDB:
- **Parts database** = from your CSV import
- **Inventory records** = from scans you perform
- **No cloud sync** = no internet needed after initial CSV

To move data between devices:
1. Export CSV from device A
2. Send CSV to device B (email, WhatsApp, etc.)
3. Import CSV on device B

---

## Advanced Testing

### Test with Multiple Users
1. Import CSV on Device A
2. Staff scans inventory on Device A
3. Export CSV when done
4. Import same CSV on Device B
5. Staff continues scanning on Device B
6. Combine CSVs in Excel/Sheets later

### Test Offline (No WiFi)
1. Load app once: `http://192.168.150.102:8000`
2. Turn OFF WiFi
3. App still works (Service Worker caches it)
4. Scan barcodes (camera works offline)
5. Save records (IndexedDB works offline)
6. Turn WiFi back ON
7. Export data

### Test Edge Cases
- Scan same barcode twice → should allow duplicates
- Scan barcode not in database → should show error
- Edit record location many times → should update each time
- Export with 0 records → should show alert
- Import empty CSV → should show error

---

## Performance Expectations

| Operation | Time |
|-----------|------|
| App load | 2-3s (first time) |
| App load | <1s (cached) |
| Barcode scan | 1-2s |
| Save record | <100ms |
| Export 100 records | 2-3s |
| Camera startup | 1-2s |

---

## Network Info

If you have multiple network interfaces, use this:
```powershell
# On PC, run:
ipconfig
```

Look for line like:
```
IPv4 Address. . . . . . . . . . . : 192.168.150.103
```

Replace `192.168.150.103` with whatever you see in your ipconfig.

---

## Next Steps After Testing

1. ✅ Verify all features work on Android
2. ✅ Gather feedback from staff
3. ✅ Train staff on workflow
4. ✅ Export sample data, review in Excel
5. ✅ Plan full inventory rollout

Then choose permanent hosting:
- GitHub Pages (free, simple)
- Vercel (free, fast)
- Firebase Hosting (free tier available)
- Your own server (full control)

See main README.md for hosting options.

---

**Need help?** Check console errors:
- Android: Chrome > Menu > Developer tools > Console
- PC: F12 in browser > Console tab > look for red errors
