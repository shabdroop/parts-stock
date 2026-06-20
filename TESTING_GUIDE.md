# 🧪 QR Code & Barcode Detection Testing Guide

## 📋 Current Implementation

### Detection Algorithm
```
Frame from camera (5 FPS = every 200ms)
    ↓
1. Try Native BarcodeDetector API (Chrome Android)
    ↓ (if available & not found)
2. Try jsQR (every frame) - inversionAttempts: attemptBoth
    ↓ (if not found & frame % 20 == 0)
3. Try jsQR with enhanced contrast (every 20 frames)
    ↓
Success → Process code
Or → Continue to next frame
```

### Key Parameters
- **Frame Rate**: 5 FPS (200ms interval)
- **jsQR Inversion**: attemptBoth (normal + inverted)
- **Contrast Enhancement**: Applied every 20 frames in poor lighting
- **Canvas Context**: Optimized with alpha: false
- **Video Resolution**: 640×480 (safe for all Android)

---

## 🧪 Test Cases

### Test 1: Simple QR Code (Bright Light)
**Setup:**
- Use: https://qr-server.com/qr/create/?data=TEST123
- Light: Well-lit room, natural daylight preferred
- Distance: 15-30cm from camera

**Expected Result:**
```
Frame 1-5: Camera warming up
Frame 5-10: Detection algorithm runs
Result: "✓ Detected: TEST123" (within 2 seconds)
```

**Debug Output (Open DevTools Console):**
```
Camera active: { width: 640, height: 480, facingMode: "environment" }
Frame grabbing started at 5 FPS
Frame 10 captured: 640x480
✓ Barcode detected (Native API): TEST123
OR
✓ QR code detected (jsQR) at frame 8: TEST123
```

**If it fails:**
- Check console for errors
- Try rotating the QR code 90°
- Try different distance (closer/farther)
- Try different lighting angle

---

### Test 2: QR Code with Slight Rotation
**Setup:**
- Same QR code from Test 1
- Rotate device 45° (tilt camera)
- Medium light

**Expected Result:**
- Detection should still work
- May take slightly longer (1-3 seconds)

**Debug Output:**
```
Frame 15-25: Multiple detection attempts
✓ QR code detected (jsQR) at frame 20: TEST123
```

---

### Test 3: Poor Lighting (Dark Room)
**Setup:**
- Use same QR code
- Very dim light or dark room
- Camera at 15-20cm

**Expected Result:**
- Should detect within 3-5 seconds
- Contrast enhancement activates (every 20 frames)

**Debug Output:**
```
Frame 10 captured: 640x480
Frame 20 captured: 640x480
✓ QR code detected (jsQR+enhanced) at frame 20: TEST123
```

**If it fails:**
- Turn on phone flashlight to illuminate QR code
- Reduce distance to 10cm
- Try rotating for better lighting angle

---

### Test 4: Different QR Code Data
**Setup:**
- Generate different QR code: https://qr-server.com/qr/create/?data=HELLO-WORLD-12345
- Bright lighting
- Steady hand

**Expected Result:**
```
✓ Detected: HELLO-WORLD-12345
```

---

### Test 5: Manual Capture & Image Upload
**Setup:**
- Take screenshot of QR code or download QR code image
- Use "Upload Barcode Image" button
- Try rotating image with 🔄 button

**Expected Result:**
- Image preview shows
- "Scanning for barcode/QR code..." appears
- Code detected and shows in input field
- Can manually enter if not detected

---

### Test 6: Multiple QR Codes
**Setup:**
- Generate 5 different QR codes
- Point camera at each one

**Expected Result:**
- Each one detected separately
- Detection time: 1-3 seconds per code
- No false positives or false negatives

---

## 🐛 Debugging Checklist

### If Detection Fails

**Step 1: Check Browser Console**
```
Open DevTools (F12) → Console tab
Look for any error messages starting with ✗ or Error:
```

**Step 2: Verify Library Loaded**
```
Console command: typeof jsQR
Expected result: "function"

Console command: 'BarcodeDetector' in window
Expected result: true (Chrome Android) or false (other browsers)
```

**Step 3: Check Camera**
```
Console should show:
"Camera active: { width: 640, height: 480, facingMode: "environment" }"
"Frame grabbing started at 5 FPS"
"Frame 10 captured: 640x480" (every 10 frames)
```

**Step 4: Test with Image Upload**
If live scanning fails:
1. Take a photo of the QR code
2. Use "Upload Barcode Image" button
3. Try rotating the image with 🔄
4. Check if image upload detection works

**Step 5: Check Lighting**
- Try in brighter light
- Try with phone flashlight
- Try outdoors in daylight
- Try at different angles

---

## 📊 Expected Performance

### Desktop (Webcam)
- ✓ Detection: 1-2 seconds
- ✓ Success Rate: 95%+
- ✓ Works in most lighting

### Android Phone
- ✓ Detection: 1-3 seconds
- ✓ Success Rate: 85-95% (depending on lighting)
- ✓ Works better with adequate light

### Low Light Conditions
- ✓ Detection: 2-5 seconds
- ✓ Success Rate: 70-85%
- ✓ Contrast enhancement helps

---

## 🔧 How to Report Issues

When reporting issues, include:

1. **Device & Browser:**
   - "Samsung Galaxy S20 / Chrome"
   - "iPhone 12 / Safari"
   - "Desktop / Firefox"

2. **Lighting:**
   - "Bright room"
   - "Dark room (phone flashlight on)"
   - "Outdoor daylight"

3. **QR Code Quality:**
   - "Clean printed QR code"
   - "QR code on phone screen"
   - "Damaged/faded QR code"

4. **Console Output:**
   - Open DevTools (F12)
   - Try scanning
   - Copy console messages

5. **Screenshot:**
   - Screenshot of QR code being scanned
   - What appeared on screen
   - Any error messages

---

## 🚀 Testing URL

**Live App:** https://shabdroop.github.io/parts-stock

### Quick Test Steps:
1. Open URL on mobile or desktop
2. Go to "📷 Scan" tab
3. Click "Start Live Scanner"
4. Point at QR code below:

```
https://qr-server.com/qr/create/?data=TEST-INVENTORY-001
https://qr-server.com/qr/create/?data=BARCODE-12345
https://qr-server.com/qr/create/?data=QR-MOBILE-APP
```

5. Should detect within 1-3 seconds
6. If not detected, try:
   - Different lighting
   - Different distance
   - Rotating device
   - Rotating image (if uploading)

---

## 📈 Success Metrics

Target detection success:
- ✓ **Bright lighting**: 95%+ first attempt
- ✓ **Normal lighting**: 85%+ within 3 seconds
- ✓ **Dark lighting**: 70%+ with enhancement or flashlight
- ✓ **Image upload**: 90%+ (manual or rotated)

---

## 📝 Notes

- Frame rate: 5 FPS is safe on all Android devices
- Detection runs on every frame (200ms intervals)
- Contrast enhancement only runs every 20 frames (CPU efficient)
- Native BarcodeDetector used if available on Chrome Android
- jsQR fallback works on all browsers with JavaScript support
- All data stored locally (no cloud)

