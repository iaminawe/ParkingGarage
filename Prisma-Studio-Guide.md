# Prisma Studio Guide

## 🎯 Overview

Prisma Studio is a visual database browser that provides an intuitive interface for exploring, editing, and managing your SQLite database. It's perfect for inspecting your seeded data and understanding the relationships between different entities.

## 🚀 Getting Started

### Quick Start

```bash
# Start Prisma Studio
npm run db:studio

# Opens automatically at http://localhost:5555
```

### Alternative Commands

```bash
# Direct command
npx prisma studio

# Custom port (if 5555 is busy)
npx prisma studio --port 5556

# With specific schema file
npx prisma studio --schema=./prisma/schema.prisma
```

## 📊 Interface Overview

### Main Dashboard
- **Table List**: Left sidebar shows all database tables
- **Record View**: Main area displays table records
- **Filter Panel**: Advanced search and filtering options
- **Action Toolbar**: Create, edit, delete, and export functions

### Navigation Features
- **Click Tables**: Select different tables from the sidebar
- **Foreign Key Navigation**: Click on foreign key values to jump to related records
- **Breadcrumb Trail**: Track your navigation path
- **Search Box**: Quick search across all tables

## 🔍 Key Features

### Data Browsing
- **Paginated Views**: Handle large datasets efficiently
- **Column Sorting**: Click headers to sort data
- **Relationship Visualization**: See how tables connect
- **Data Type Display**: Visual indicators for different data types

### Advanced Filtering
- **Multiple Conditions**: Combine filters for complex queries
- **Date Range Filters**: Filter by time periods
- **Text Search**: Find records containing specific text
- **Null/Empty Filters**: Find missing or empty values

### Data Editing
- **Inline Editing**: Modify records directly in the interface
- **Bulk Operations**: Select multiple records for batch actions
- **Data Validation**: Automatic validation based on schema
- **Transaction Safety**: Changes are wrapped in transactions

### Export Capabilities
- **CSV Export**: Export filtered data to CSV files
- **Selected Records**: Export only chosen records
- **Full Table Export**: Download entire tables
- **Custom Queries**: Export results of complex filters

## 🎯 Common Use Cases

### Development Workflow

```bash
# 1. Seed your database
npm run db:seed -- --size=medium --clear

# 2. Start Studio to inspect data
npm run db:studio

# 3. Browse seeded data at localhost:5555
```

### Debugging Data Issues

1. **Identify Problem**: Use filters to find specific records
2. **Trace Relationships**: Follow foreign keys to related data
3. **Verify Constraints**: Check data integrity across tables
4. **Export for Analysis**: Download problematic data for review

### Testing Data Validation

1. **Browse Generated Data**: Verify seed script output
2. **Check Distributions**: Ensure realistic data patterns
3. **Validate Relationships**: Confirm foreign key integrity
4. **Export Test Data**: Create fixtures for unit tests

## 📋 Table-Specific Tips

### Users Table
- **Check Authentication**: Verify hashed passwords and 2FA settings
- **Review Roles**: Confirm role distribution (Admin, Manager, User)
- **Inspect Sessions**: Navigate to related user sessions
- **Security Audit**: Check login history and device tracking

### Parking Spots
- **Spot Distribution**: Verify realistic type percentages
- **Status Patterns**: Check available vs occupied ratios
- **Physical Dimensions**: Validate width/length/height data
- **Floor Organization**: Confirm hierarchical structure

### Parking Sessions
- **Time Patterns**: Look for realistic business hours distribution
- **Duration Analysis**: Check parking duration patterns
- **Payment Status**: Verify payment completion rates
- **Active Sessions**: Monitor currently active parking

### Vehicles
- **Owner Relationships**: Check user-vehicle associations
- **Make/Model Data**: Verify realistic vehicle combinations
- **Financial Tracking**: Review rates and payment amounts
- **License Plates**: Confirm uniqueness and format

### Payments & Transactions
- **Payment Methods**: Check distribution of payment types
- **Transaction Status**: Monitor success/failure rates
- **Financial Integrity**: Verify amounts and calculations
- **Audit Trail**: Track payment history and references

## 🛠️ Advanced Features

### Query Building
- **Filter Combinations**: Use AND/OR logic for complex queries
- **Date Range Queries**: Find records within time periods
- **Relationship Filters**: Filter based on related table data
- **Null Value Handling**: Search for missing or empty fields

### Data Management
- **Bulk Editing**: Select multiple records for batch updates
- **Record Creation**: Add new records with proper relationships
- **Data Validation**: Automatic constraint checking
- **Change Tracking**: Monitor modifications in real-time

### Performance Optimization
- **Efficient Pagination**: Handle large datasets smoothly
- **Index Utilization**: Leverage database indexes for speed
- **Relationship Loading**: Smart loading of related data
- **Memory Management**: Optimize for large result sets

## ⚠️ Security & Best Practices

### Development Only
- **Never in Production**: Studio provides full database access
- **Local Development**: Use only on development machines
- **No Authentication**: Studio has no built-in security
- **Data Protection**: Be careful with sensitive information

### Data Safety
- **Backup Before Changes**: Always backup before bulk operations
- **Test Changes**: Verify modifications before committing
- **Relationship Integrity**: Maintain foreign key constraints
- **Transaction Awareness**: Understand rollback implications

### Performance Considerations
- **Large Datasets**: Be cautious with analytics-sized data
- **Memory Usage**: Monitor system resources with large queries
- **Network Impact**: Consider bandwidth for remote databases
- **Concurrent Access**: Avoid conflicts with running applications

## 🔗 Integration with Seed Data

### Recommended Workflow

1. **Generate Seed Data**:
   ```bash
   npm run db:seed -- --size=medium --clear
   ```

2. **Start Studio**:
   ```bash
   npm run db:studio
   ```

3. **Explore Key Areas**:
   - User authentication patterns
   - Parking spot distributions
   - Session time patterns
   - Payment transaction flows

### Validation Checklist

- [ ] **User Data**: Check role distribution and authentication setup
- [ ] **Spot Types**: Verify realistic spot type percentages
- [ ] **Time Patterns**: Confirm business hours bias in sessions
- [ ] **Relationships**: Validate foreign key integrity
- [ ] **Financial Data**: Check payment amounts and methods
- [ ] **Security Data**: Review audit logs and session tracking

## 🎯 Tips & Tricks

### Efficient Navigation
- **Keyboard Shortcuts**: Learn Studio's keyboard shortcuts
- **Bookmark Queries**: Save complex filter combinations
- **Tab Usage**: Open multiple tables in browser tabs
- **Quick Search**: Use global search for fast record location

### Data Analysis
- **Sort Strategies**: Use multiple column sorting for insights
- **Filter Patterns**: Build reusable filter templates
- **Export Workflows**: Develop consistent export procedures
- **Change Monitoring**: Track data modifications over time

### Troubleshooting
- **Connection Issues**: Check database file permissions
- **Performance Problems**: Monitor system resources
- **Data Corruption**: Verify schema integrity
- **Version Conflicts**: Ensure Prisma CLI compatibility

## 📚 Related Resources

- [[Enhanced Database Seeding|Enhanced-Database-Seeding]] - Generate test data
- [[Database Schema|Database-Schema]] - Understanding the data model  
- [[Development Setup|Getting-Started]] - Setting up your environment
- [[API Reference|API-Documentation]] - Using the data via API

## 🏷️ Tags

`database` `prisma` `visual-tools` `development` `debugging` `data-management`

---

*For technical details, see the [Database Documentation](../docs/DATABASE.md).*
