# Postman Collections for Parking Garage API

This folder contains both comprehensive and streamlined Postman collections for testing the Parking Garage API.

## 📦 Collections Available

### **🎯 Critical Pathways Only** (Recommended for Core Testing)
- **`Critical_Pathways_Postman_Collection.json`** - Streamlined collection (8 endpoints)
- **`Critical_Pathways_Environment.postman_environment.json`** - Essential variables
- **`Critical_Pathways_Guide.md`** - Focused usage guide

### **📊 Complete API Testing** (Full System Testing)  
- **`Parking_Garage_Complete_API.postman_collection.json`** - Full collection (50+ endpoints)
- **`Complete_API_Environment.postman_environment.json`** - Comprehensive variables

### **📁 Legacy Files**
- **`Legacy_Environment.postman_environment.json`** - Original environment (reference only)

## 🎯 Which Collection Should You Use?

### **Critical Pathways** → Quick Core Testing
**Perfect for:** Daily testing, CI/CD, core functionality validation
- ✅ Garage layout management (floors, bays, spots)
- ✅ Spot status management (available/occupied)
- ✅ Car tracking (check-in/check-out with time tracking)
- **8 endpoints** - Fast execution

### **Complete API** → Comprehensive Testing
**Perfect for:** Full system validation, integration testing, QA cycles
- All critical pathways PLUS:
- Vehicle management, session analytics, health monitoring
- Advanced features, search, exports, statistics
- **50+ endpoints** - Full coverage

## 🚀 Quick Setup

### For Critical Pathways:
1. **Import**: `Critical_Pathways_Postman_Collection.json`
2. **Import**: `Critical_Pathways_Environment.postman_environment.json`
3. **Select Environment**: "Critical Pathways Environment"
4. **Follow**: `Critical_Pathways_Guide.md` instructions

### For Complete API:
1. **Import**: `Parking_Garage_Complete_API.postman_collection.json`  
2. **Import**: `Complete_API_Environment.postman_environment.json`
3. **Select Environment**: "Complete API Environment"
4. **Update `base_url`**: Change to your server URL
5. **Run "Login User"** first to get authentication token

---

**Start with Critical Pathways for core testing, then use Complete API for comprehensive validation.**