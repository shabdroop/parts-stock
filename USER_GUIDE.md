# 📱 Parts Stock Inventory System - User Guide

## 🎯 Quick Start

**App URL:** https://shabdroop.github.io/parts-stock

**Admin Server:** https://web-production-85db8e.up.railway.app

---

## 📋 Table of Contents

1. [Setup (First Time)](#setup)
2. [Scanning Parts](#scanning)
3. [Exporting Data](#exporting)
4. [Advanced Features](#advanced)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 <a name="setup"></a>Setup (First Time)

### Step 1: Open the App
1. Open your phone browser (Chrome, Safari, Firefox)
2. Visit: **https://shabdroop.github.io/parts-stock**
3. You'll see the home screen with three tabs: 📷 Scan, 📋 Records, ⚙️ Setup

### Step 2: Import Parts Database
Go to **⚙️ Setup** tab

#### Option A: Fetch from Admin Server (Recommended)
1. Click **"🔧 Open Admin Server"** button
2. Admin server opens in new window
3. Click **"Choose file"** button
4. Select your Excel (.xlsx) or CSV (.csv) file with part numbers
5. Click **"Upload"** button
6. Wait for success message
7. Go back to inventory app
8. Click **"🔄 Fetch from Admin Server"** button
9. Wait for parts to load (may take 30 seconds for large databases)
10. See message: **"✓ Parts loaded successfully! 7851 parts now available"**

#### Option B: Upload File Directly
1. Click **"Choose Excel or CSV File"** button
2. Select your Excel (.xlsx) or CSV (.csv) file
3. File uploads and parts appear in database
4. See confirmation: **"✓ Imported X parts"**

**File Requirements:**
- Must have columns: **"Part Number"** and **"Part Name"**
- Excel format: .xlsx or .xls
- CSV format: comma-separated values
- Example:
  ```
  Part Number,Part Name
  SKU-001,Resistor 10K
  SKU-002,Capacitor 100µF
  ```

### Step 3: Verify Parts Loaded
1. Go to **⚙️ Setup** tab
2. Look at **"Parts in Database"** box
3. Should show: **7851** (or your number of parts)
4. Ready to start scanning! ✓

---

## 📷 <a name="scanning"></a>Scanning Parts (Main Workflow)

### Method 1: Live Camera Scanning (Fastest)

**Step 1: Start Scanner**
1. Go to **📷 Scan** tab
2. Click **"Start Live Scanner"** button
3. Camera opens and shows video
4. Grant camera permission if prompted

**Step 2: Scan Barcode/QR Code**
1. Point camera at barcode or QR code
2. **Wait 1-2 seconds** for detection
3. Success message appears: **"✓ Detected: SKU-001"**

**Step 3: Enter Inventory Data**
After detection, form opens with:
- **Part Number**: Auto-filled ✓
- **Part Name**: Auto-filled ✓
- **Physical Count**: Enter number of items (e.g., 5)
- **Location**: Enter shelf/bin location (e.g., A1-02-03)
- **Remarks**: Optional notes (e.g., Damaged, Expired)

**Step 4: Save Record**
1. Click **"Save Record"** button
2. See success: **"✓ Record saved successfully"**
3. Ready to scan next part

---

### Method 2: Upload Image (With Trim Feature)

**Step 1: Upload Image**
1. Click **"📤 Upload Barcode Image"** button
2. Select image from phone or computer
3. Image preview appears with buttons

**Step 2: Trim/Extract Part Number** (if complex QR)
If QR code has multiple data fields:
1. Click **"✂️ Trim QR (Extract Part #)"** button
2. Dialog shows all fields
3. Select the correct part number
4. **10-second countdown** starts
5. During countdown:
   - Can edit part # if needed
   - Can rotate image (next step)
   - Auto-proceeds after 10 seconds
   - Or click **"✓ Use Code"** to skip waiting

**Step 3: Rotate Image (if needed)**
If barcode not detected:
1. Click **"🔄 Rotate Photo"** button
2. Image rotates 90°
3. **"🔍 Retry Lookup"** button appears (orange)
4. Auto-retry happens automatically
5. If still not detected, try again

**Step 4: Enter Code Manually**
1. Barcode/code appears in text box
2. Edit if needed
3. Click **"✓ Use Code"** button
4. Part lookup happens
5. Continue with inventory data entry

---

### Method 3: Manual Entry (If Part Not in Database)

**Step 1: Enter Part Number**
1. Scroll to **"✏️ Option 2: Manual Entry"**
2. Enter part number in text box
3. Click **"🔍 Lookup Part"** button

**Step 2: If Part Not Found**
1. See message: **"✗ Part number not found"**
2. Click **"➕ Add New Part"** button
3. Form opens for new part entry

**Step 3: Enter Part Details**
- **Part Number**: Auto-filled with code ✓
- **Part Name**: REQUIRED - must enter
- **Physical Count**: Number of items
- **Location**: Shelf/bin location
- **Remarks**: Auto-filled with **"Part Not in System Data"** (can edit)

**Step 4: Save New Part**
1. Click **"Save Record"** button
2. Part added to database and record saved

---

## 📊 <a name="exporting"></a>Exporting Data

### Viewing Records
1. Go to **📋 Records** tab
2. See table with all scanned items:
   - Timestamp
   - Part Number
   - Part Name
   - Physical Count
   - Location
   - Edit/Delete buttons

### Export to Excel

**Step 1: Click Export Button**
1. Click **"📊 Export to Excel"** button
2. Filename dialog appears
3. Default: `inventory-2026-06-20`

**Step 2: Enter Filename**
1. Enter custom filename (optional)
2. Example: `inventory-march-2026`
3. Auto-adds `.xlsx` extension
4. Click OK

**Step 3: Download**
1. File downloads to Downloads folder
2. See success message: **"✓ Inventory exported to: inventory-march-2026.xlsx"**
3. File has columns:
   - Timestamp
   - Part Number
   - Part Name
   - Physical Count
   - Location
   - Remarks

### Export to CSV

**Step 1: Click Export Button**
1. Click **"📄 Export to CSV"** button
2. Filename dialog appears
3. Default: `inventory-2026-06-20`

**Step 2: Enter Filename**
1. Enter custom filename (optional)
2. Example: `parts-batch-1`
3. Auto-adds `.csv` extension
4. Click OK

**Step 3: Download**
1. File downloads to Downloads folder
2. See success message: **"✓ Inventory exported to: parts-batch-1.csv"**
3. Open in Excel, Google Sheets, or any spreadsheet app

### Clear All Records

**WARNING: This deletes all data!**
1. Click **"🗑️ Clear All Records"** button
2. Confirmation dialog appears
3. Click OK to confirm deletion
4. All records removed (cannot undo!)

---

## 🎯 <a name="advanced"></a>Advanced Features

### Editing Records
1. Go to **📋 Records** tab
2. Find record in table
3. Click **"Edit"** button
4. Modal opens with editable fields
5. Change any field
6. Click **"Save Changes"** button

### Deleting Records
1. Go to **📋 Records** tab
2. Click **"Edit"** button for record
3. In modal, click **"Delete Record"** button
4. Record removed

### Offline Capability
- App works without internet after first load
- All data stored locally on your device
- Changes sync automatically
- Can work in areas with no WiFi (local storage only)

### Different Networks
- Admin server works on **different WiFi networks** ✓
- Works with **mobile data** ✓
- No same-network requirement
- Can sync from anywhere with internet

---

## 🔧 <a name="troubleshooting"></a>Troubleshooting

### Camera Not Working
**Problem:** Camera won't open or shows error

**Solutions:**
1. Check camera permission:
   - Android: Settings → Apps → Chrome → Permissions → Camera → Allow
   - iPhone: Settings → Safari → Camera → Allow
2. Close app and reopen
3. Restart phone
4. Try different app: Try Firefox or Edge instead of Chrome

### Barcode Not Detected
**Problem:** QR/barcode scans but doesn't detect

**Solutions:**
1. Try rotating image with **"🔄 Rotate Photo"** button
2. Try clicking **"🔍 Retry Lookup"** button
3. Try different lighting (brighter/darker)
4. Try different distance (closer/farther from camera, 10-30cm ideal)
5. Enter code manually instead

### Admin Server Not Connecting
**Problem:** Can't fetch parts from admin server

**Solutions:**
1. Check internet connection (WiFi or mobile data)
2. Visit admin server directly: https://web-production-85db8e.up.railway.app
3. Make sure file is uploaded to admin server
4. Try uploading file directly instead of fetching
5. Try different browser (Chrome, Firefox, Safari)

### File Not Uploading
**Problem:** Upload file button doesn't work

**Solutions:**
1. Check file format: must be .xlsx, .xls, or .csv
2. Check file has "Part Number" and "Part Name" columns
3. File size should be under 10MB
4. Try uploading smaller file first
5. Clear browser cache: Settings → More tools → Clear browsing data

### Records Not Saving
**Problem:** Click save but record doesn't appear

**Solutions:**
1. Make sure all required fields are filled:
   - Part Number ✓
   - Part Name ✓
   - Physical Count ✓
   - Location ✓
2. Check for error messages
3. Try again
4. Refresh page (Ctrl+R or Cmd+R)

---

## 💡 Tips & Tricks

### Efficient Scanning
1. **Pre-scan check**: Make sure part database is loaded first
2. **Good lighting**: Works better in bright areas
3. **Steady hand**: Hold camera steady while scanning
4. **Right distance**: 10-30cm from barcode is ideal
5. **Try rotating**: If detection fails, rotate image before retrying

### Data Organization
1. **Use descriptive names** for exports:
   - `inventory-march-batch-1`
   - `parts-checked-2026-06-20`
   - Avoid same-date filenames to prevent overwrites
2. **Add remarks** for notes:
   - "Damaged - needs replacement"
   - "New part - verify with supplier"
   - "Expired - remove from stock"
3. **Check location format**: Use consistent format like `A1-02-03`

### Security
1. **Local storage**: All data stays on your phone (not uploaded)
2. **No internet needed**: Works offline after first setup
3. **Privacy**: No tracking, no analytics

---

## 📞 Support

**For issues:**
1. Check "Troubleshooting" section above
2. Clear browser cache
3. Restart phone
4. Try different browser
5. Check internet connection

**For feature requests:**
Contact admin to discuss new features

---

## 📝 Quick Reference

| Task | Steps |
|------|-------|
| **Setup** | Setup tab → Fetch/Upload parts → Verify count |
| **Scan** | Scan tab → Start Scanner → Point at code → Enter data → Save |
| **Export** | Records tab → Click Export → Enter filename → Download |
| **Edit** | Records tab → Click Edit → Change fields → Save |
| **Delete** | Records tab → Click Edit → Delete Record |
| **Offline** | First load with internet → Works offline after |

---

## ✅ Checklist for First Use

- [ ] Opened app on phone
- [ ] Went to Setup tab
- [ ] Uploaded parts database (Excel/CSV)
- [ ] Verified parts count shows correct number
- [ ] Tested live camera scanning
- [ ] Successfully scanned and saved a record
- [ ] Tested export to Excel
- [ ] Shared app URL with team

---

**Version:** 1.0  
**Last Updated:** June 2026  
**App URL:** https://shabdroop.github.io/parts-stock
