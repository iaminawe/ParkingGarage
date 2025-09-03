# Critical Pathways Postman Collection

Streamlined collection testing **ONLY** the 3 critical pathways you specified.

## 📦 Import These 2 Files

1. **`Critical_Pathways_Postman_Collection.json`** - Main collection
2. **`Critical_Pathways_Environment.postman_environment.json`** - Environment variables

## 🚀 Quick Setup

### Import & Configure
1. **Import Collection**: Postman → Import → Select `Critical_Pathways_Postman_Collection.json`
2. **Import Environment**: Postman → Import → Select `Critical_Pathways_Environment.postman_environment.json`
3. **Select Environment**: Top-right dropdown → "Critical Pathways Environment"
4. **Update URL**: Click 👁️ → Edit → Change `base_url` to your server

### Run Tests
1. **Login First**: Run `🔐 Authentication → Login User`
2. **Test Pathways**: Run any requests in order

## 🎯 Critical Pathways Covered

### 🏢 **Garage Layout**
**✅ Manage floors and bays (areas within a floor)**
- `Initialize Garage Layout` - Creates 3 floors with 4 bays each

**✅ Define and manage parking spots with unique identifiers**
- Creates 300 spots with IDs like `F1-B1-S001` (Floor 1, Bay 1, Spot 1)

### 🅿️ **Parking Spot Management** 
**✅ List all parking spots with their availability status (available/occupied)**
- `List All Spots with Status` - Shows all spots with current status

**✅ Retrieve only available spots**
- `Get Available Spots Only` - Filters for available spots only

**✅ Ability to mark spots as occupied or available**
- `Mark Spot as Occupied` - Changes status to occupied
- `Mark Spot as Available` - Changes status to available

### 🚗 **Car Tracking**
**✅ Check a car in: Assign the car to an available spot**
- `Check Car In (Assign to Spot)` - Automatic spot assignment

**✅ Check a car out: Free up the spot**
- `Check Car Out (Free Spot)` - Frees spot automatically  

**✅ Track check-in and check-out times**
- Both requests record timestamps and calculate duration

## 🧪 Complete Test Scenario

### **`Complete Critical Pathway Flow`**
**Single request that tests ALL pathways:**

1. **🏢 Garage Layout**: Uses floor/bay structure with unique spot IDs
2. **🅿️ Spot Management**: Finds available spot and marks as occupied
3. **🚗 Car Tracking**: Records check-in time and starts session

**Run this one request to validate everything works!**

## ✅ Expected Results

### Successful Flow:
```
✅ Car checked in and assigned to spot
✅ Spot automatically assigned and occupied  
✅ Check-in time tracked
✅ Unique spot identifier created (F1-BA-S001 format)
✅ Status changed: available → occupied
```

### After Checkout:
```
✅ Car checked out successfully
✅ Spot freed and marked available
✅ Check-out time tracked with duration
✅ Status changed: occupied → available  
✅ Total cost calculated
```

## 🔧 Environment Variables

**Required (Update These):**
- `base_url` - Your API server URL
- `test_user_email` - Login email  
- `test_user_password` - Login password

**Auto-Populated:**
- `access_token` - Auth token from login
- `test_spot_id` - Spot ID for testing
- `assigned_spot_id` - Spot from check-in
- `session_id` - Parking session ID

## 📋 Testing Order

### Manual Testing:
```
1. 🔐 Authentication → Login User
2. 🏢 Garage Layout → Initialize Garage Layout
3. 🅿️ Parking Spot Management → List All Spots with Status
4. 🅿️ Parking Spot Management → Get Available Spots Only
5. 🚗 Car Tracking → Check Car In (Assign to Spot)
6. 🚗 Car Tracking → Check Car Out (Free Spot)
```

### Automated Testing:
```
1. 🔐 Authentication → Login User  
2. 🧪 COMPLETE Critical Pathway Test → Complete Critical Pathway Flow
```

**The automated test validates all critical pathways in one request!**

## 🚨 Troubleshooting

**401 Unauthorized**: Run login request first
**Spot already occupied**: Use different license plate or free the spot first
**Connection refused**: Check `base_url` and server status

That's it! This streamlined collection focuses **only** on your 3 critical pathways with minimal setup required.