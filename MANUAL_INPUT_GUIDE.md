# Manual Input Guide - Camera Fallback Option

## Problem & Solution

**Problem:** Camera barcode scanning may fail on some Android devices due to browser limitations.

**Solution:** Manual input option added as a fallback. Staff can manually enter part numbers.

---

## Two Methods Available

### Method 1: Barcode Scanning (Primary)

```
1. Go to 📷 Scan tab
2. Click "Start Camera"
3. Grant camera permission
4. Point at barcode
5. Part auto-fills
6. Enter Physical Count & Location
7. Save
```

**Pros:**
- Fast and efficient
- Less typing
- Fewer mistakes

**Cons:**
- May not work on all Android devices
- Requires good barcode quality
- Lighting dependent

---

### Method 2: Manual Entry (Fallback)

```
1. Go to 📷 Scan tab
2. Scroll down to "Option 2: Manual Entry"
3. Type part number (e.g., SKU-001)
4. Click "🔍 Lookup Part"
5. If found → Part name appears
6. Enter Physical Count & Location
7. Click "Save Record"
```

**Pros:**
- Always works (no camera needed)
- Can use with damaged barcodes
- Can use with printed lists

**Cons:**
- Slower (requires typing)
- More prone to typos

---

## Using Manual Entry

### Step-by-Step

**1. Open Scan Tab**
- App: http://192.168.150.103:8000
- Tab: 📷 **Scan**

**2. Scroll Down**
- Find section: **"✏️ Option 2: Manual Entry"**

**3. Enter Part Number**
- Type exactly as in database
- Examples: `SKU-001`, `SKU-005`, `SKU-010`
- Must match exactly (case-sensitive)

**4. Click "Lookup Part"**
- Button searches database
- Shows result:
  - ✅ If found: "Part found: Widget A"
  - ❌ If not found: "Part not found"

**5. Enter Physical Count**
- Number of items found in inventory
- Example: `15`, `32`, `1`

**6. Enter Location**
- Bay/Rack/Bin location
- Format: `A1-02-03`
- Example: `Warehouse-A`, `Rack-2`, `Bin-15`

**7. Click "Save Record"**
- Record saved locally
- Form clears for next entry

---

## Common Part Numbers (Sample)

```
SKU-001 → Widget A - Standard Size
SKU-002 → Widget B - Premium
SKU-005 → Bolt Assembly - Grade 8
SKU-010 → Washer - Stainless Steel
SKU-015 → Spring - Compression Type
SKU-020 → Bearing - Double Row
SKU-025 → Seal Kit - Hydraulic
SKU-030 → Gasket - Rubber
```

---

## Tips for Accuracy

### Avoid Typos
- Double-check part number before clicking "Lookup Part"
- Use copy-paste if you have a list
- Match case exactly (e.g., `SKU-001` not `sku-001`)

### If Part Not Found
- Check spelling
- Look at database (Admin panel preview)
- Make sure CSV is uploaded
- Try refreshing the app

### Speed Up Entry
- Memorize common part numbers
- Keep reference list nearby
- Use keyboard shortcuts (Tab key)

---

## Comparing Methods

| Aspect | Barcode | Manual |
|--------|---------|--------|
| Speed | Very fast | Slower |
| Accuracy | High | Prone to typos |
| Device requirement | Camera | Keyboard |
| Works offline | Yes | Yes |
| Works in low light | No | Yes |
| Works with damaged barcodes | No | Yes |
| Requires setup | Permission + camera | Just typing |

---

## Hybrid Approach (Recommended)

Use **both methods together**:

1. **Use barcode when possible**
   - Quick
   - Accurate
   - Efficient

2. **Fall back to manual for:**
   - Failed scans
   - Damaged/unreadable barcodes
   - Low lighting
   - Camera not working
   - Missing barcode labels

---

## Testing Manual Entry

### Try with Sample Data

**Part Number:** `SKU-001`
**Result:** Should find "Widget A - Standard Size"

**Part Number:** `SKU-005`
**Result:** Should find "Bolt Assembly - Grade 8"

**Part Number:** `INVALID`
**Result:** Should show "Part not found"

---

## Workflow Example

```
Warehouse Staff Inventory Check:

1. Load app: http://192.168.150.103:8000
2. Go to 📷 Scan tab
3. For each item:
   ├─ Try barcode scanning first
   │  ├─ If works → Part auto-fills → Enter count/location → Save
   │  └─ If fails → Manual entry
   └─ Manual entry:
      ├─ Scroll to "Option 2"
      ├─ Type part number (SKU-001)
      ├─ Click "Lookup Part"
      ├─ If found → Enter count/location → Save
      └─ If not found → Check database → Try again
4. Repeat for all items
5. Go to 📋 Records → Export CSV
6. Send to admin
```

---

## Error Messages & Fixes

### "Part not found in database: SKU-001"

**Cause:** Part number doesn't exist in CSV
**Fix:**
1. Check spelling
2. Go to Admin panel: http://192.168.150.103:5000
3. Check preview shows this part
4. If not → Upload updated CSV

### "Enter a part number"

**Cause:** Field is empty
**Fix:**
1. Type part number in field
2. Click "Lookup Part"

### "Part found: [Name]" but wrong part

**Cause:** Typed wrong part number
**Fix:**
1. Click "Clear" button
2. Re-enter correct part number
3. Click "Lookup Part"

---

## Advantages of Manual Input

✅ **No camera needed** - Works on any device
✅ **No permissions required** - Simpler setup
✅ **Handles damaged barcodes** - Even if barcode is unreadable
✅ **Flexible** - Can use printed lists or memory
✅ **Reliable** - Works in any lighting
✅ **Simple** - Just type and click

---

## Quick Checklist

For successful manual entry:

- [ ] Part number typed correctly
- [ ] Clicked "Lookup Part"
- [ ] Saw ✅ "Part found" message
- [ ] Entered Physical Count (number)
- [ ] Entered Location (text like A1-02-03)
- [ ] Clicked "Save Record"
- [ ] Form cleared for next entry

---

## Support

If manual entry not working:

1. **Check CSV uploaded:** Admin panel shows uploaded status
2. **Verify part in database:** Admin panel preview
3. **Check spelling:** Match case exactly
4. **Refresh app:** Reload page (Ctrl+R)
5. **Clear cache:** Settings → Clear browsing data
6. **Check console:** F12 → Console → Look for errors

---

## Conclusion

Manual entry provides a reliable, simple alternative when barcode scanning is unavailable. Staff can complete full inventory checks using either or both methods.

**Recommended:** Use barcode when possible for speed, manual entry as fallback.

---

Last Updated: 2026-06-19
