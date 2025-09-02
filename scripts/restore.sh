#!/bin/bash

set -e

# Configuration
BACKUP_DIR="/opt/parkinggarage/backups"
TARGET_DB="/opt/parkinggarage/data/parkinggarage.db"
TARGET_LOGS="/opt/parkinggarage/logs"
TARGET_CONFIG="/opt/parkinggarage/.env"
SERVICE_NAME="parkinggarage"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Usage function
usage() {
    echo "Usage: $0 <backup_file>"
    echo "       $0 --list                    # List available backups"
    echo "       $0 --latest                  # Restore from latest backup"
    echo "       $0 --interactive            # Interactive backup selection"
    echo ""
    echo "Examples:"
    echo "  $0 /opt/parkinggarage/backups/parkinggarage_20240902_120000_complete.tar.gz"
    echo "  $0 --latest"
    echo "  $0 --list"
    echo "  $0 --interactive"
    exit 1
}

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# List available backups
list_backups() {
    echo "Available backups:"
    echo "=================="
    
    if ls "$BACKUP_DIR"/parkinggarage_*_complete.tar.gz > /dev/null 2>&1; then
        printf "%-40s %-10s %-20s\n" "Backup File" "Size" "Date"
        printf "%-40s %-10s %-20s\n" "----------" "----" "----"
        
        for backup in $(ls -t "$BACKUP_DIR"/parkinggarage_*_complete.tar.gz 2>/dev/null); do
            local filename=$(basename "$backup")
            local size=$(ls -lh "$backup" | awk '{print $5}')
            local date=$(ls -l "$backup" | awk '{print $6, $7, $8}')
            printf "%-40s %-10s %-20s\n" "$filename" "$size" "$date"
        done
    else
        echo "No backups found in $BACKUP_DIR"
        return 1
    fi
}

# Get latest backup
get_latest_backup() {
    ls -t "$BACKUP_DIR"/parkinggarage_*_complete.tar.gz 2>/dev/null | head -n1 || echo ""
}

# Interactive backup selection
interactive_backup_selection() {
    echo "🔍 Available backups for restore:"
    echo ""
    
    local backups=()
    while IFS= read -r backup; do
        backups+=("$backup")
    done < <(ls -t "$BACKUP_DIR"/parkinggarage_*_complete.tar.gz 2>/dev/null)
    
    if [ ${#backups[@]} -eq 0 ]; then
        error "No backups found for restore"
    fi
    
    # Display numbered list
    for i in "${!backups[@]}"; do
        local backup="${backups[i]}"
        local filename=$(basename "$backup")
        local size=$(ls -lh "$backup" | awk '{print $5}')
        local date=$(ls -l "$backup" | awk '{print $6, $7, $8}')
        echo "[$((i+1))] $filename (Size: $size, Date: $date)"
    done
    
    echo ""
    read -p "Select backup number (1-${#backups[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#backups[@]} ]; then
        echo "${backups[$((selection-1))]}"
    else
        error "Invalid selection"
    fi
}

# Validate backup file
validate_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Validating backup file..."
    
    # Check if it's a valid tar.gz file
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        error "Invalid or corrupted backup file: $backup_file"
    fi
    
    # Check if required files exist in archive
    local has_database=false
    local archive_contents=$(tar -tzf "$backup_file" 2>/dev/null)
    
    if echo "$archive_contents" | grep -q "\.db$"; then
        has_database=true
    fi
    
    if [ "$has_database" = false ]; then
        error "Backup file does not contain database: $backup_file"
    fi
    
    log "✅ Backup file validation passed"
}

# Stop application services
stop_services() {
    log "Stopping application services..."
    
    # Stop PM2 process
    if command -v pm2 &> /dev/null && pm2 list | grep -q "$SERVICE_NAME"; then
        log "Stopping PM2 service: $SERVICE_NAME"
        su - parkinggarage -c "pm2 stop $SERVICE_NAME" || true
        sleep 2
    fi
    
    # Stop any other Node.js processes
    local node_pids=$(pgrep -f "node.*server" || true)
    if [ -n "$node_pids" ]; then
        log "Stopping Node.js processes: $node_pids"
        kill -TERM $node_pids 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        node_pids=$(pgrep -f "node.*server" || true)
        if [ -n "$node_pids" ]; then
            kill -KILL $node_pids 2>/dev/null || true
        fi
    fi
    
    log "✅ Services stopped"
}

# Start application services
start_services() {
    log "Starting application services..."
    
    # Start PM2 service
    if command -v pm2 &> /dev/null; then
        su - parkinggarage -c "cd /opt/parkinggarage && pm2 start ecosystem.config.js" || \
        su - parkinggarage -c "cd /opt/parkinggarage && pm2 start parkinggarage" || \
        error "Failed to start PM2 service"
    else
        # Fallback to direct start
        su - parkinggarage -c "cd /opt/parkinggarage && npm start" &
        sleep 3
    fi
    
    log "✅ Services started"
}

# Create safety backup
create_safety_backup() {
    log "Creating safety backup of current state..."
    
    local safety_dir="/tmp/restore-safety-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$safety_dir"
    
    # Backup current database
    if [ -f "$TARGET_DB" ]; then
        cp "$TARGET_DB" "$safety_dir/parkinggarage.db.backup" || true
        log "Current database backed up to: $safety_dir"
    fi
    
    # Backup current configuration
    if [ -f "$TARGET_CONFIG" ]; then
        cp "$TARGET_CONFIG" "$safety_dir/.env.backup" || true
    fi
    
    echo "$safety_dir" > /tmp/restore-safety-path
    log "✅ Safety backup created: $safety_dir"
}

# Restore database
restore_database() {
    local backup_file="$1"
    local temp_dir=$(mktemp -d)
    
    log "Restoring database from backup..."
    
    # Extract backup
    tar -xzf "$backup_file" -C "$temp_dir" 2>/dev/null || error "Failed to extract backup"
    
    # Find database file in extracted content
    local db_file=$(find "$temp_dir" -name "*.db" | head -n1)
    if [ -z "$db_file" ]; then
        rm -rf "$temp_dir"
        error "No database file found in backup"
    fi
    
    log "Found database file: $(basename "$db_file")"
    
    # Verify extracted database integrity
    if ! sqlite3 "$db_file" "PRAGMA integrity_check;" | grep -q "ok"; then
        rm -rf "$temp_dir"
        error "Extracted database failed integrity check"
    fi
    
    # Create target directory if needed
    mkdir -p "$(dirname "$TARGET_DB")"
    
    # Replace current database
    cp "$db_file" "$TARGET_DB" || error "Failed to restore database file"
    chown parkinggarage:parkinggarage "$TARGET_DB" 2>/dev/null || true
    chmod 644 "$TARGET_DB"
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "✅ Database restored successfully"
}

# Restore logs (optional)
restore_logs() {
    local backup_file="$1"
    local temp_dir=$(mktemp -d)
    
    log "Restoring logs from backup..."
    
    # Extract backup
    tar -xzf "$backup_file" -C "$temp_dir" 2>/dev/null || return 0
    
    # Find logs archive
    local logs_archive=$(find "$temp_dir" -name "*_logs.tar.gz" | head -n1)
    if [ -n "$logs_archive" ]; then
        # Create logs directory
        mkdir -p "$TARGET_LOGS"
        
        # Extract logs
        tar -xzf "$logs_archive" -C "$(dirname "$TARGET_LOGS")" 2>/dev/null || true
        chown -R parkinggarage:parkinggarage "$TARGET_LOGS" 2>/dev/null || true
        
        log "✅ Logs restored successfully"
    else
        log "ℹ️  No logs found in backup (optional)"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Restore configuration (optional)
restore_configuration() {
    local backup_file="$1"
    local temp_dir=$(mktemp -d)
    
    log "Restoring configuration from backup..."
    
    # Extract backup
    tar -xzf "$backup_file" -C "$temp_dir" 2>/dev/null || return 0
    
    # Find config file
    local config_file=$(find "$temp_dir" -name "*_config.env" | head -n1)
    if [ -n "$config_file" ]; then
        # Backup current config
        if [ -f "$TARGET_CONFIG" ]; then
            cp "$TARGET_CONFIG" "$TARGET_CONFIG.pre-restore" || true
        fi
        
        # Restore configuration (merge with current to preserve secrets)
        if [ -f "$TARGET_CONFIG" ]; then
            # Merge configurations (preserve sensitive data from current config)
            local temp_config=$(mktemp)
            
            # Copy restored config as base
            cp "$config_file" "$temp_config"
            
            # Preserve sensitive values from current config
            while IFS='=' read -r key value; do
                if [[ "$key" =~ (PASSWORD|SECRET|KEY|TOKEN) ]] && [ -n "$value" ]; then
                    if grep -q "^$key=" "$temp_config"; then
                        sed -i "s|^$key=.*|$key=$value|" "$temp_config"
                    else
                        echo "$key=$value" >> "$temp_config"
                    fi
                fi
            done < <(grep -E "(PASSWORD|SECRET|KEY|TOKEN)" "$TARGET_CONFIG" 2>/dev/null || true)
            
            # Replace config file
            mv "$temp_config" "$TARGET_CONFIG"
        else
            # No current config, use restored one
            cp "$config_file" "$TARGET_CONFIG"
        fi
        
        chown parkinggarage:parkinggarage "$TARGET_CONFIG" 2>/dev/null || true
        chmod 640 "$TARGET_CONFIG"
        
        log "✅ Configuration restored successfully"
    else
        log "ℹ️  No configuration found in backup (optional)"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Verify restoration
verify_restoration() {
    log "Verifying restoration..."
    
    # Check database integrity
    if [ -f "$TARGET_DB" ]; then
        if sqlite3 "$TARGET_DB" "PRAGMA integrity_check;" | grep -q "ok"; then
            log "✅ Database integrity verified"
        else
            error "Database integrity check failed after restore"
        fi
    else
        error "Database file not found after restore"
    fi
    
    # Check basic database content
    local vehicle_count=$(sqlite3 "$TARGET_DB" "SELECT COUNT(*) FROM vehicles;" 2>/dev/null || echo "0")
    local spot_count=$(sqlite3 "$TARGET_DB" "SELECT COUNT(*) FROM parking_spots;" 2>/dev/null || echo "0")
    local session_count=$(sqlite3 "$TARGET_DB" "SELECT COUNT(*) FROM parking_sessions;" 2>/dev/null || echo "0")
    
    log "📊 Restored data summary:"
    log "   Vehicles: $vehicle_count"
    log "   Parking spots: $spot_count"
    log "   Sessions: $session_count"
}

# Test application health
test_application_health() {
    log "Testing application health..."
    
    local max_attempts=12
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "✅ Application health check passed"
            return 0
        fi
        
        log "Waiting for application to start... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    error "Application failed to start after restore"
}

# Main restore function
restore_database_full() {
    local backup_file="$1"
    local start_time=$(date +%s)
    
    log "🔄 Starting database restoration process..."
    log "Backup file: $(basename "$backup_file")"
    
    # Validate backup
    validate_backup "$backup_file"
    
    # Create safety backup
    create_safety_backup
    
    # Stop services
    stop_services
    
    # Restore components
    restore_database "$backup_file"
    restore_logs "$backup_file"
    restore_configuration "$backup_file"
    
    # Verify restoration
    verify_restoration
    
    # Start services
    start_services
    
    # Wait for startup and test
    sleep 10
    test_application_health
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "✅ Restoration completed successfully in ${duration}s"
    log "🗑️  Safety backup available at: $(cat /tmp/restore-safety-path 2>/dev/null || echo "N/A")"
    log "📱 Application should be accessible at: http://localhost:3000"
}

# Rollback to safety backup
rollback_to_safety() {
    local safety_path=$(cat /tmp/restore-safety-path 2>/dev/null)
    
    if [ -z "$safety_path" ] || [ ! -d "$safety_path" ]; then
        error "No safety backup found for rollback"
    fi
    
    log "🔄 Rolling back to safety backup..."
    
    # Stop services
    stop_services
    
    # Restore from safety backup
    if [ -f "$safety_path/parkinggarage.db.backup" ]; then
        cp "$safety_path/parkinggarage.db.backup" "$TARGET_DB"
        log "✅ Database rolled back"
    fi
    
    if [ -f "$safety_path/.env.backup" ]; then
        cp "$safety_path/.env.backup" "$TARGET_CONFIG"
        log "✅ Configuration rolled back"
    fi
    
    # Start services
    start_services
    
    log "✅ Rollback completed"
}

# Main script logic
case "${1:-}" in
    --list)
        list_backups
        ;;
    --latest)
        LATEST_BACKUP=$(get_latest_backup)
        if [ -n "$LATEST_BACKUP" ]; then
            log "Using latest backup: $(basename "$LATEST_BACKUP")"
            read -p "Are you sure you want to restore from this backup? (y/N): " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                restore_database_full "$LATEST_BACKUP"
            else
                log "Restore cancelled"
            fi
        else
            error "No backups found"
        fi
        ;;
    --interactive)
        SELECTED_BACKUP=$(interactive_backup_selection)
        if [ -n "$SELECTED_BACKUP" ]; then
            log "Selected backup: $(basename "$SELECTED_BACKUP")"
            read -p "Are you sure you want to restore from this backup? (y/N): " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                restore_database_full "$SELECTED_BACKUP"
            else
                log "Restore cancelled"
            fi
        fi
        ;;
    --rollback)
        rollback_to_safety
        ;;
    --help)
        usage
        ;;
    "")
        usage
        ;;
    *)
        if [ ! -f "$1" ]; then
            error "File not found: $1"
        fi
        
        log "Restore file: $(basename "$1")"
        read -p "Are you sure you want to restore from this backup? This will overwrite current data. (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            restore_database_full "$1"
        else
            log "Restore cancelled"
        fi
        ;;
esac