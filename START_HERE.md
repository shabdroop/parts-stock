# 🚀 START HERE - Admin Panel Setup

## ✅ Current Status

**Both servers are running:**
- ✓ Admin Panel: http://192.168.150.103:5000
- ✓ Inventory App: http://192.168.150.103:8000

---

## 📋 Quick Setup (5 minutes)

### 1. Open Admin Panel on Your PC

Open browser and go to:
```
http://127.0.0.1:5000
```

Or from another device on same WiFi:
```
http://192.168.150.103:5000
```

### 2. Prepare CSV File

**From Google Sheets:**
1. Open your Google Sheet with parts
2. Click: File → Download → CSV (.csv)
3. Save to your PC

**CSV must have columns:**
- Part Number
- Part Name

**Example:**
```
Part Number,Part Name
SKU-001,Widget A
SKU-002,Widget B
SKU-005,Bolt Assembly
```

### 3. Upload CSV to Admin Panel

In admin panel:
1. Drag & drop CSV file onto upload area
2. OR click "Choose File"
3. Wait for success message
4. Should show: ✓ Successfully uploaded! X parts

### 4. Test on Android Device

1. Take Android phone on same WiFi as PC
2. Open browser
3. Go to: http://192.168.150.103:8000
4. Go to **⚙️ Setup** tab
5. Click **"🔄 Fetch from Admin Server"**
6. Should show: ✓ Fetched from server! Imported X parts

### 5. Start Scanning

1. Go to **📷 Scan** tab
2. Click "Start Camera"
3. Grant camera permission
4. Point at barcode with part number (SKU-001, SKU-002, etc.)
5. Part name auto-fills
6. Enter Physical Count & Location
7. Tap "Save Record"

### 6. Export Results

1. Go to **📋 Records** tab
2. Click "📥 Export to CSV"
3. CSV downloads with all scanned data

---

## 🎯 Two-Server Architecture

You now have two separate servers:

```
┌─────────────────────────────────────┐
│  YOUR PC (192.168.150.103)          │
├─────────────────────────────────────┤
│                                     │
│  Port 5000: Admin Panel             │
│  └─ Upload CSV                      │
│  └─ View uploaded parts             │
│  └─ Download CSV                    │
│                                     │
│  Port 8000: Inventory App           │
│  └─ Access http://...8000 on app   │
│  └─ Fetch CSV from server           │
│  └─ Scan barcodes                  │
│  └─ Save records                    │
│                                     │
└─────────────────────────────────────┘
         ↓                ↓
    ANDROID PHONES CONNECT TO BOTH
```

---

## 📁 Files You Need

| File | Purpose |
|------|---------|
| `server.py` | Backend admin server |
| `templates/admin.html` | Admin panel UI |
| `index.html` | Inventory app UI |
| `app.js` | Inventory app logic |
| `service-worker.js` | Offline support |
| `sample_parts.csv` | Test data |

---

## 🔧 If Servers Stop Running

### Restart Both Servers

**Option 1: Using Command Prompt**

Open TWO Command Prompt windows:

**Window 1 (Admin Server - Port 5000):**
```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python server.py
```

**Window 2 (App Server - Port 8000):**
```bash
cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
python -m http.server 8000
```

**Keep both windows open!**

---

## 📱 Android Phone Checklist

- [ ] On same WiFi as PC
- [ ] Browser app works
- [ ] Can reach http://192.168.150.103:5000 (admin)
- [ ] Can reach http://192.168.150.103:8000 (app)
- [ ] Camera works (test in camera app)
- [ ] Can grant app permissions

---

## ⚡ Testing Quick Steps

1. **Admin Panel Test**
   - Go to http://192.168.150.103:5000
   - Click "Choose File"
   - Upload sample_parts.csv
   - Should show: "✓ Successfully uploaded! 8 parts"

2. **App Test**
   - Go to http://192.168.150.103:8000
   - Go to Setup tab
   - Click "🔄 Fetch from Admin Server"
   - Should show: "✓ Fetched from server! 8 parts"

3. **Scanning Test**
   - Go to Scan tab
   - Click "Start Camera"
   - Point at any barcode
   - Should recognize part if in database

---

## 🆘 Troubleshooting

### "Cannot reach admin panel"
```
Check: 192.168.150.103:5000 accessible?
Solution: Verify server running in Command Prompt
```

### "Cannot reach app"
```
Check: 192.168.150.103:8000 accessible?
Solution: Verify app server running
```

### "Fetch from server fails"
```
Check: CSV uploaded to admin panel?
Solution: Go to http://192.168.150.103:5000 and upload CSV first
```

### "Camera not working"
```
Check: Settings → Apps → Browser → Permissions → Camera allowed?
Solution: Grant camera permission, reload app
```

---

## 📚 Full Documentation

For detailed information, see:
- **ADMIN_SETUP.md** - Complete admin panel guide
- **ANDROID_TESTING.md** - Android testing detailed guide
- **README.md** - Full app documentation
- **QUICK_START.txt** - Quick reference card

---

## 🎓 How It Works (Simple Explanation)

**Admin Uploads CSV:**
```
1. You upload parts list to admin panel (port 5000)
2. Server stores CSV file in 'uploads' folder
3. CSV stays on server waiting for app to fetch it
```

**App Fetches CSV:**
```
1. Staff opens app on Android (port 8000)
2. Goes to Setup tab
3. Clicks "Fetch from Admin Server"
4. App downloads CSV from port 5000
5. Stores parts in device's local storage (IndexedDB)
6. No internet needed after this!
```

**Staff Scans Barcodes:**
```
1. Barcode is scanned
2. App looks up in local parts database
3. If found: auto-fills part name
4. Staff enters count & location
5. Record saved locally on device
```

**Export Results:**
```
1. Staff goes to Records tab
2. Clicks Export
3. CSV downloads to phone
4. Can send to office or store server
```

---

## 💡 Pro Tips

- ✅ Keep both Command Prompt windows open
- ✅ Don't close windows during testing
- ✅ Clear browser cache if things look strange
- ✅ Test with sample_parts.csv first
- ✅ Keep PC and phone on same WiFi
- ✅ Restart servers if connection issues

---

## Next Steps

1. ✅ **Now:** Admin panel at http://192.168.150.103:5000
2. ✅ **Now:** App at http://192.168.150.103:8000
3. **Next:** Upload your CSV via admin panel
4. **Next:** Test on Android device
5. **Next:** Train staff on workflow
6. **Later:** Consider permanent hosting (GitHub Pages, Vercel, etc.)

---

## Support

Having issues? Check:
1. Both servers running in Command Prompt
2. Correct IP address: 192.168.150.103
3. Correct ports: 5000 (admin) and 8000 (app)
4. Browser console errors: F12 → Console tab
5. WiFi connection status

---

**Ready to test?** 🎯

Open: http://192.168.150.103:5000
