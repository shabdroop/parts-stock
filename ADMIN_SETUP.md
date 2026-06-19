# Admin Panel Setup Guide

## Overview

Instead of uploading CSV directly from Android (which has mobile browser limitations), use the **Admin Panel** on your PC to upload CSV files. The Android app then automatically fetches the data from the server.

**Architecture:**
```
Google Sheets → CSV → Admin Panel (PC) → Server → Android App
```

---

## Installation

### Step 1: Install Flask

Open Command Prompt and run:

```bash
pip install flask
```

Or install all requirements at once:

```bash
pip install -r requirements.txt
```

**Verify installation:**
```bash
python -c "import flask; print(f'Flask {flask.__version__} installed')"
```

---

## Running the Backend Server

### Start the Admin Server

Open Command Prompt and run:

```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python server.py
```

**Expected output:**
```
======================================================================
Inventory Check - Admin Server
======================================================================

Admin Panel:  http://127.0.0.1:5000/
              http://192.168.150.103:5000/  (from Android)

Android App:  http://192.168.150.103:8000/

======================================================================
Running on http://127.0.0.1:5000 - Press CTRL+C to quit
======================================================================
```

The server runs on **port 5000** (different from app server on port 8000).

---

## Two Servers Running Together

You now have **two servers**:

| Server | Port | Purpose | URL |
|--------|------|---------|-----|
| Admin Panel | 5000 | Upload CSV files | http://192.168.150.103:5000 |
| Inventory App | 8000 | Android app | http://192.168.150.103:8000 |

**Keep both running:**
1. Command Prompt Window 1: `python server.py` (port 5000)
2. Command Prompt Window 2: `python -m http.server 8000` (port 8000)

---

## Using the Admin Panel

### Access Admin Panel

From your PC:
```
http://127.0.0.1:5000
```

From Android on same network:
```
http://192.168.150.103:5000
```

### Upload CSV File

1. **Get CSV from Google Sheets**
   - Open your Google Sheet
   - Click File → Download → CSV (.csv)
   - Save to your PC

2. **Upload via Admin Panel**
   - Go to http://192.168.150.103:5000
   - Drag & drop CSV onto "Upload Area" OR click "Choose File"
   - Wait for success message
   - Should show: ✓ Successfully uploaded! X parts

3. **Verify Upload**
   - Status shows: "✓ CSV file uploaded successfully"
   - Shows number of parts and file size
   - Preview shows first 10 rows

### File Requirements

CSV must have these columns (exact names):
- **Part Number** - e.g., SKU-001
- **Part Name** - e.g., Widget A

**Example CSV format:**
```
Part Number,Part Name
SKU-001,Widget A
SKU-002,Widget B
SKU-005,Bolt Assembly
```

### Download/Delete CSV

- **Download:** Click "⬇️ Download CSV" to get the file back
- **Delete:** Click "🗑️ Delete File" to remove from server

---

## Android App Setup

### First Time Setup

1. Open Android browser
2. Go to: http://192.168.150.103:8000
3. Go to **⚙️ Setup** tab
4. Click **"🔄 Fetch from Admin Server"**
5. Should show: ✓ Fetched from server! Imported X parts

### What Happens

When you tap "Fetch from Admin Server":
- App connects to http://192.168.150.103:5000
- Downloads the CSV from admin panel
- Stores all parts locally in IndexedDB
- Shows success message

### Start Scanning

Once CSV is loaded:
1. Go to **📷 Scan** tab
2. Click "Start Camera"
3. Point at barcode
4. Part auto-fills from database
5. Enter Physical Count & Location
6. Save & repeat

---

## Workflow Example

### Admin Staff (You on PC)

1. **Get new parts list**
   ```
   Open Google Sheets → File → Download → CSV
   ```

2. **Upload to server**
   ```
   Go to http://192.168.150.103:5000
   Drag & drop CSV file
   Wait for success
   ```

3. **Tell warehouse staff**
   ```
   "CSV is updated, please re-fetch from Setup tab"
   ```

### Warehouse Staff (On Android)

1. **Open app**
   ```
   http://192.168.150.103:8000
   ```

2. **Re-fetch latest CSV**
   ```
   ⚙️ Setup → "🔄 Fetch from Admin Server"
   Should show updated part count
   ```

3. **Start scanning**
   ```
   📷 Scan → Start Camera → Scan barcodes
   ```

4. **Export results**
   ```
   📋 Records → "📥 Export to CSV"
   Send file back to admin
   ```

---

## API Endpoints

The admin server provides these API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Admin panel UI |
| `/api/upload` | POST | Upload CSV file |
| `/api/status` | GET | Check if CSV uploaded |
| `/api/download` | GET | Download CSV (for app) |
| `/api/preview` | GET | Preview CSV (first 10 rows) |
| `/api/delete` | POST | Delete uploaded CSV |
| `/api/app-config` | GET | Get config for app |

### Example: Fetch CSV from Android App

```javascript
fetch('http://192.168.150.103:5000/api/download')
  .then(response => response.text())
  .then(csv => console.log(csv))
```

---

## Troubleshooting

### "Failed to connect to admin server"

**Problem:** Android can't reach PC on port 5000

**Solutions:**
1. Check PC IP is correct: `192.168.150.103`
2. Verify server running: Check Command Prompt shows "Serving on 0.0.0.0:5000"
3. Check WiFi: Both PC and Android on same WiFi
4. Firewall: Windows Firewall might block port 5000

**To allow port 5000 in Windows Firewall:**
```
Settings → Privacy & Security → Firewall → Allow app through firewall
Allow Python (python.exe) through
```

### "CSV file won't upload"

**Problem:** Upload fails or shows error

**Solutions:**
1. Check file size < 5MB
2. Verify CSV columns: "Part Number" and "Part Name" (exact)
3. Try opening CSV in Excel first to validate
4. Check file not corrupted
5. Check Command Prompt shows no Python errors

### "App says 'CSV not available on server'"

**Problem:** App can't fetch CSV from admin

**Solutions:**
1. Upload CSV first via admin panel
2. Verify admin panel shows "✓ CSV file uploaded successfully"
3. Check app server IP is correct: `192.168.150.103:5000`
4. Refresh app page (pull down or Ctrl+R)

### "Server crashes or won't start"

**Problem:** Python server won't start

**Solutions:**
1. Check Python installed: `python --version`
2. Check Flask installed: `pip install flask`
3. Check port 5000 not in use: 
   ```bash
   netstat -ano | findstr :5000
   ```
4. Check syntax: `python -m py_compile server.py`

---

## File Management

### Where Files are Stored

Uploaded CSV files are stored in:
```
C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock\uploads\
```

### Keep Backups

After uploading CSV:
```
1. Download from admin: "⬇️ Download CSV"
2. Save as backup: uploads/parts_backup_YYYY-MM-DD.csv
3. Keep original Google Sheet
```

### Replace CSV

To update parts list:
1. Delete old CSV: Admin panel → "🗑️ Delete File"
2. Upload new CSV: Admin panel → "Choose File"
3. Tell staff to re-fetch: App → Setup → "Fetch from Server"

---

## Performance

| Operation | Time |
|-----------|------|
| Upload CSV (100 parts) | 1-2s |
| App fetches CSV | 1-2s |
| Save to device storage | <100ms |
| Barcode scan | 1-2s |

---

## Security Notes

⚠️ **This is for local network use only:**
- Admin panel: `http://192.168.150.103:5000` (not encrypted)
- Only accessible on local WiFi
- For public use, add authentication

**To add HTTPS (if needed later):**
```bash
pip install pyopenssl
# Then modify server.py to use ssl_context
```

---

## Next Steps

1. ✅ Install Flask: `pip install flask`
2. ✅ Start admin server: `python server.py`
3. ✅ Start app server: `python -m http.server 8000`
4. ✅ Upload CSV via admin panel: `http://192.168.150.103:5000`
5. ✅ Access app on Android: `http://192.168.150.103:8000`
6. ✅ Fetch CSV from app: Setup tab → "Fetch from Server"

---

## Command Quick Reference

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Start admin server (Port 5000):**
```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python server.py
```

**Start app server (Port 8000):**
```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python -m http.server 8000
```

**Check if ports in use:**
```bash
netstat -ano | findstr :5000
netstat -ano | findstr :8000
```

**Kill process on port (if needed):**
```bash
# Get the PID, then:
taskkill /PID <PID> /F
```

---

## Getting Help

If something doesn't work:

1. **Check console errors**
   - Admin: Open browser → F12 → Console tab
   - App: Open browser → F12 → Console tab

2. **Check server logs**
   - Look at Command Prompt window running Python
   - Error messages show there

3. **Verify connectivity**
   ```bash
   ping 192.168.150.103
   ```

4. **Restart services**
   - Kill Python processes
   - Restart both servers
   - Clear browser cache
   - Reload app

---

Last Updated: 2026-06-19
