# Troubleshooting Guide

## Issue 1: "Error: Failed to Fetch"

### What It Means
The app (port 8000) cannot connect to the admin server (port 5000) to download the CSV file.

### Causes & Solutions

**1. Admin Server Not Running**
```
Check: Is Flask server running?
Solution: 
  cd C:\Users\shabd\Desktop\Shabd_Apps\Parts Stock
  python server.py
```

**2. CORS (Cross-Origin) Error**
```
Fixed in latest version - Flask-CORS now enabled
Make sure you:
  1. pip install flask-cors (done!)
  2. Restarted server.py
  3. Clear browser cache (Ctrl+Shift+Delete)
```

**3. Wrong Server URL**
```
Check: Is IP address correct?
  Your IP: 192.168.150.103

Verify:
  - App Setup tab shows: "Server: http://192.168.150.103:5000"
  - This is the correct IP for your PC
```

**4. No CSV Uploaded**
```
Check: Did you upload CSV to admin panel first?
  1. Go to: http://192.168.150.103:5000
  2. Upload CSV file
  3. Should show: "✓ Successfully uploaded! X parts"
  4. Then try app again
```

**5. Network Issue**
```
Check: Are PC and Android on same WiFi?
  - Both devices must be on same network
  - Different WiFi networks won't work

Verify:
  - Check WiFi connection on both
  - Try ping from Android (go to app console)
  - Or test: http://192.168.150.103:5000 directly
```

### Debug Steps

1. **Open browser console on Android:**
   - Chrome: Menu (⋮) → More tools → Developer tools → Console
   - Press F12 (on some devices)

2. **Look for error messages:**
   - "Failed to fetch" = network issue
   - "CORS error" = server configuration
   - "404" = wrong URL

3. **Check server logs:**
   - Look at Command Prompt where Flask is running
   - Error messages show there

4. **Test directly:**
   - Go to: http://192.168.150.103:5000/api/status
   - Should show: `{"uploaded": true, ...}` or `{"uploaded": false}`

---

## Issue 2: No Camera Permission Popup

### What Should Happen
When you click "Start Camera", Android should show a popup asking for permission:
```
[App] wants to access your camera
  [ Don't allow ]  [ Allow ]
```

### Why It's Not Showing

**1. Fetch Error Blocking Camera Code**
```
Problem: If "Failed to Fetch" error occurs first,
         the app stops and doesn't reach camera code

Solution:
  1. Fix the fetch error above first
  2. Clear browser cache
  3. Reload app: http://192.168.150.103:8000
  4. Try camera again
```

**2. Browser Doesn't Have Camera Permission Settings**
```
Some browsers don't allow camera access from HTTP (only HTTPS)

Solution:
  Option A: Try different browser (Chrome often works better)
  Option B: Use http:// (not https://) with local IP
  Option C: Use HTTPS with proper certificate (advanced)
```

**3. No Camera on Device**
```
Check: Does device have a camera?
Solution: Test with device camera app first
```

**4. Camera Already in Use**
```
Check: Is another app using camera?
Solution: Close other apps using camera, try again
```

### How to Grant Camera Permission

**Android Chrome:**
1. First time → Permission popup appears → Tap "Allow"
2. If denied → Settings → Apps → Chrome → Permissions → Camera → Allow
3. Go back to app and try again

**Android Firefox:**
1. First time → Permission popup appears → Tap "Allow"
2. If denied → Settings → Apps → Firefox → Permissions → Camera → Allow
3. Go back to app and try again

**Android Samsung Browser:**
1. First time → Permission popup appears → Tap "Allow"
2. If denied → Settings → Apps → Samsung Internet → Permissions → Camera → Allow

### Debug Camera Issues

1. **Check if camera works:**
   - Open Camera app on device
   - Should see live video
   - If not, camera might be broken

2. **Check browser permissions:**
   - Open Settings
   - Apps → [Your Browser]
   - Permissions → Camera
   - Should show "Allow"

3. **Check browser console for errors:**
   - F12 → Console
   - Look for "camera" or "permission" errors
   - Common errors:
     - "Permission denied" = User denied permission
     - "NotFoundError" = No camera device
     - "NotAllowedError" = Browser blocked access

---

## Issue 3: CSV Won't Fetch After Upload

### Symptoms
- Admin panel shows "✓ Successfully uploaded"
- But app shows "Error: Failed to Fetch"

### Solutions

**1. Clear Browser Cache**
```
Android:
  Chrome → Menu (⋮) → Settings → Privacy
  → Clear browsing data → Cached images and files → Clear

Firefox:
  Menu (⋮) → Settings → Privacy
  → Clear browsing data → Cache → Clear
```

**2. Reload App Page**
```
Swipe down at top of page (Android refresh)
Or: Ctrl+R / Cmd+R
Or: Close tab and open new tab
```

**3. Verify CSV Upload**
```
Check admin panel:
  1. Go to: http://192.168.150.103:5000
  2. Should show: "✓ CSV file uploaded successfully"
  3. Should show: "Parts in Database: X"
  4. Should show: "Preview" section with first 10 parts
```

**4. Check CSV Format**
```
CSV must have EXACT column names:
  ✓ Part Number
  ✓ Part Name
  
NOT:
  ✗ PartNumber (no space)
  ✗ Part_Number (underscore)
  ✗ PART NUMBER (all caps - sometimes OK)
```

**5. Try Different Browser**
```
Android browsers:
  - Chrome (recommended)
  - Firefox
  - Samsung Internet
  - Edge
  
Try all to see which works best
```

---

## Issue 4: Barcode Scanning Not Working

### Symptoms
- Camera starts
- Can see video
- Point at barcode
- Nothing happens

### Solutions

**1. Barcode Not in Database**
```
Check:
  1. Go to Admin panel
  2. Preview shows uploaded parts
  3. Your barcode must be in "Part Number" column

If not:
  1. Upload updated CSV with more parts
  2. Reload app
  3. Try scanning again
```

**2. Barcode Format Not Supported**
```
ZXing.js supports:
  ✓ Code 128 (best)
  ✓ Code 39
  ✓ UPC-A / UPC-E
  ✓ EAN-8 / EAN-13
  ✓ QR Code (backup)

If barcode won't scan:
  1. Try different angle
  2. Better lighting
  3. Different barcode format
  4. Try QR code (always works)
```

**3. Camera Quality**
```
Try:
  1. Better lighting (natural light helps)
  2. Hold steady (shaky = harder to read)
  3. Closer to barcode (10-20cm away)
  4. Different angle
```

**4. ZXing Library Not Loaded**
```
Check browser console for errors:
  1. F12 → Console
  2. Look for "ZXing" errors
  3. If missing, page didn't load properly
  4. Try: Ctrl+Shift+R (hard refresh)
```

---

## Issue 5: Records Not Saving

### Symptoms
- Scan works
- Enter count and location
- Click Save
- Record disappears / doesn't appear in Records tab

### Solutions

**1. Device Storage Full**
```
Check: Phone storage not full
Solution: Delete some files, try again
```

**2. Browser Storage Quota Exceeded**
```
Solution:
  1. Go to Records tab
  2. Export existing records to CSV
  3. Clear all records (delete them)
  4. Continue scanning
```

**3. IndexedDB Disabled**
```
Check: Browser allows local storage
Android Chrome:
  Settings → Privacy → Clear browsing data
  Make sure only "Cookies" is checked
  NOT "Site data"
```

**4. Try Different Browser**
```
If Chrome has issues:
  Try Firefox or Samsung Internet
  Storage might work better
```

---

## General Troubleshooting Steps

### 1. Check Both Servers Running
```bash
# In Command Prompt, you should see two windows:
Window 1: "Serving HTTP on 0.0.0.0:5000" (admin)
Window 2: "Serving HTTP on 0.0.0.0:8000" (app)

If missing:
  - Check Task Manager (processes tab)
  - Kill python.exe processes
  - Restart both servers
```

### 2. Test Network Connection
```
From Android browser:
  1. Go to: http://192.168.150.103:5000
  2. Should load admin panel
  3. If yes, network is OK
  4. If no, check WiFi
```

### 3. Check IP Address
```
Windows Command Prompt:
  ipconfig | findstr "IPv4"
  
Look for: 192.168.150.xxx

If different from 192.168.150.103:
  - Use correct IP in app URL
  - Update app Setup tab server URL
```

### 4. Clear Everything & Restart
```
1. Close all browser tabs
2. Kill Python processes:
   Ctrl+Shift+Esc → Find python.exe → End Task
3. Clear browser cache:
   Chrome/Firefox → Clear browsing data
4. Restart both servers:
   - Admin: python server.py
   - App: python -m http.server 8000
5. Reload page in browser
6. Try again
```

### 5. Check Browser Console
```
Developer Tools:
  1. F12 or Menu (⋮) → More tools → Developer tools
  2. Click "Console" tab
  3. Look for red error messages
  4. Note the exact error text
  5. Refer to this guide or share error
```

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch" | Server not responding | Start Flask server |
| "CORS error" | Cross-origin blocked | Restart server with flask-cors |
| "404 Not Found" | Wrong URL path | Check IP address |
| "Permission denied" | Camera permission not granted | Grant camera permission in settings |
| "NotFoundError" | No camera on device | Check device has camera |
| "Connection refused" | Server not running | Start server in Command Prompt |
| "net::ERR_CONNECTION_REFUSED" | Port in use or server crashed | Kill Python, restart server |

---

## Server Not Starting?

### Python Error When Running `python server.py`

**Error: ModuleNotFoundError: No module named 'flask'**
```
Solution: pip install flask
```

**Error: ModuleNotFoundError: No module named 'flask_cors'**
```
Solution: pip install flask-cors
```

**Error: Address already in use**
```
Cause: Port 5000 already in use
Solution:
  1. taskkill /PID <PID> /F
  2. Or: netstat -ano | findstr :5000
  3. Kill the process using port
  4. Restart server
```

---

## Quick Fixes Checklist

- [ ] Both servers running (two Command Prompt windows)
- [ ] Correct IP address (192.168.150.103)
- [ ] CSV uploaded to admin panel
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Page reloaded (Ctrl+R or pull down)
- [ ] Camera permission granted (Settings → Permissions)
- [ ] Same WiFi on both devices
- [ ] Barcode in database (check preview)
- [ ] Good lighting for barcode
- [ ] No other apps using camera

---

## Still Having Issues?

1. **Check console errors:** F12 → Console → Look for red text
2. **Check server logs:** Look at Command Prompt running Python
3. **Note exact error message:** Share the exact text
4. **Try different browser:** Chrome, Firefox, Samsung Internet
5. **Restart everything:** Kill processes, restart servers, reload app

---

## Contact Support

If none of these work:
1. Screenshot console errors (F12)
2. Screenshot Command Prompt logs
3. Note exact URL you're visiting
4. Note exact error message
5. Share device type (Android version, phone model)

---

**Last Updated:** 2026-06-19
