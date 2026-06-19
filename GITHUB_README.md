# 📦 Inventory Check - Offline Barcode Scanner

A Progressive Web App (PWA) for physical inventory management with barcode scanning and manual entry options. Works completely offline on Android devices in low-connectivity areas.

## ✨ Features

- ✅ **Barcode Scanning** - ZXing.js camera integration
- ✅ **Manual Entry** - Fallback when camera unavailable
- ✅ **CSV Import** - Load part database from Google Sheets
- ✅ **Part Lookup** - Auto-fill part details
- ✅ **Record Management** - Add, edit, delete inventory records
- ✅ **CSV Export** - Download results anytime
- ✅ **Offline-First** - IndexedDB local storage
- ✅ **Admin Panel** - Backend CSV file management
- ✅ **Two-Server Architecture** - Admin + App servers

## 🚀 Quick Start

### Backend Admin Server (Port 5000)

```bash
pip install -r requirements.txt
python server.py
```

Access: `http://localhost:5000` or `http://192.168.150.103:5000`

### Inventory App Server (Port 8000)

```bash
python -m http.server 8000
```

Access: `http://localhost:8000` or `http://192.168.150.103:8000`

## 📱 Usage

### Setup

1. **Export CSV from Google Sheets**
   - File → Download → CSV (.csv)
   - Ensure columns: "Part Number", "Part Name"

2. **Upload to Admin Panel**
   - Open: `http://192.168.150.103:5000`
   - Drag & drop CSV file
   - Confirm: ✓ CSV uploaded

3. **Fetch in App**
   - Open: `http://192.168.150.103:8000`
   - ⚙️ Setup tab → "Fetch from Admin Server"
   - Confirm: ✓ Parts loaded

### Scanning

**Method 1: Barcode Scanning**
- 📷 Scan tab → Start Camera
- Point at barcode
- Part auto-fills
- Enter count & location
- Save

**Method 2: Manual Entry**
- Scroll to "Manual Entry"
- Type part number (e.g., SKU-001)
- Click "Lookup Part"
- Enter count & location
- Save

### Export

- 📋 Records tab
- Click "Export to CSV"
- Download results

## 📁 Project Structure

```
.
├── server.py                 # Flask admin server
├── templates/
│   └── admin.html           # Admin panel UI
├── index.html               # App UI
├── app.js                   # App logic
├── service-worker.js        # Offline support
├── manifest.json            # PWA config
├── requirements.txt         # Python dependencies
├── sample_parts.csv         # Test data
└── uploads/                 # Uploaded CSVs
```

## 🔧 Technology Stack

**Frontend**
- HTML5 / CSS3 / JavaScript
- ZXing.js (barcode scanning)
- PapaParse (CSV handling)
- Service Worker (offline)
- IndexedDB (local storage)

**Backend**
- Python Flask (REST API)
- Flask-CORS (cross-origin)

## ⚙️ API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Admin panel |
| `/api/upload` | POST | Upload CSV |
| `/api/download` | GET | Download CSV |
| `/api/status` | GET | Check CSV status |
| `/api/preview` | GET | Preview CSV data |
| `/api/delete` | POST | Delete CSV |

## 📊 Data Structure

Records saved with:
- Timestamp
- Part Number
- Part Name
- Physical Count
- Location (Bay/Rack/Bin)

## 🌐 Deployment Options

### Option 1: GitHub Pages (Recommended)
```bash
git push origin main
# Enable in Settings → Pages
# Access via: https://yourusername.github.io/parts-stock
```

### Option 2: Vercel
```bash
npm install -g vercel
vercel
```

### Option 3: Firebase
```bash
firebase init
firebase deploy
```

### Option 4: Local Network
Keep both servers running on PC:
- Admin: `python server.py` (port 5000)
- App: `python -m http.server 8000` (port 8000)

## 🎯 Known Issues & Solutions

### Camera Not Working on HTTP Local IP

**Issue:** Browser blocks camera access on `http://192.168.x.x` (not secure context)

**Solutions:**
1. Use HTTPS with self-signed certificate
2. Deploy to cloud (GitHub Pages, Vercel - automatic HTTPS)
3. Use manual entry option (always works)

**Recommended:** Deploy to GitHub Pages for camera + HTTPS support

### CSV Import Issues

- Ensure column names: "Part Number", "Part Name" (exact)
- File size < 5MB
- Valid CSV format (comma-separated)

### Manual Entry Not Finding Parts

- Check part number matches exactly (case-sensitive)
- Verify CSV uploaded to admin panel
- Check admin preview shows the part

## 📚 Documentation

- **START_HERE.md** - Quick overview
- **ADMIN_SETUP.md** - Admin panel guide
- **MANUAL_INPUT_GUIDE.md** - Manual entry instructions
- **TROUBLESHOOTING.md** - Common issues & fixes
- **CORS_FIXED.md** - CORS setup details

## 🛠️ Development

### Add New Feature
1. Update `index.html` (UI)
2. Update `app.js` (logic)
3. Test in browser (F12 → Console)
4. Commit & push

### Debug
- Browser console: F12 → Console
- Server logs: Check Command Prompt
- Network: F12 → Network tab

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/parts-stock.git
cd parts-stock

# Install Python dependencies
pip install -r requirements.txt

# Start servers
# Terminal 1:
python server.py

# Terminal 2:
python -m http.server 8000
```

Access:
- Admin: http://localhost:5000
- App: http://localhost:8000

## 🔐 Security Notes

- **Local Network Only** - No authentication (add if going public)
- **HTTP on Local IP** - Camera blocked (use HTTPS for camera)
- **IndexedDB** - All data stored locally (no cloud sync)
- **No Server-Side Data** - Each device stores own records

For production/public use:
- Add authentication
- Use HTTPS
- Add rate limiting
- Validate all inputs

## 📝 License

Open source - modify freely for your needs

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report issues
- Suggest features
- Submit pull requests
- Improve documentation

## 👥 Support

For issues or questions:
1. Check TROUBLESHOOTING.md
2. Check browser console (F12)
3. Check server logs
4. Review API endpoints

---

**Version:** 1.0  
**Last Updated:** 2026-06-19  
**Status:** Production Ready (with manual entry fallback)

Try it now! Start with manual input, upgrade to camera later. 🚀
