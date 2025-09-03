#!/bin/bash
# ==============================================================================
# Database Backup Script for ParkingGarage Application
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/app/backups"
SOURCE_DB="/app/data/parkinggarage.db"
SOURCE_LOGS="/app/logs"
SOURCE_CONFIG="/app/.env"
RETENTION_DAYS=30
MAX_BACKUPS=100
REMOTE_BACKUP_ENABLED=false
S3_BUCKET="your-backup-bucket"
COMPRESSION_LEVEL=6

# Email notification settings
NOTIFICATION_EMAIL="admin@yourdomain.com"
SEND_SUCCESS_NOTIFICATIONS=false
SEND_ERROR_NOTIFICATIONS=true

# Webhook settings (optional)
WEBHOOK_URL=""

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="parkinggarage_$TIMESTAMP"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

send_notification() {
    local subject="$1"
    local message="$2"
    local is_error="$3"
    
    # Email notification
    if command -v mail &> /dev/null; then
        if [ "$is_error" = "true" ] && [ "$SEND_ERROR_NOTIFICATIONS" = "true" ]; then
            echo "$message" | mail -s "$subject" $NOTIFICATION_EMAIL 2>/dev/null || true
        elif [ "$is_error" = "false" ] && [ "$SEND_SUCCESS_NOTIFICATIONS" = "true" ]; then
            echo "$message" | mail -s "$subject" $NOTIFICATION_EMAIL 2>/dev/null || true
        fi
    fi
    
    # Webhook notification
    if [ -n "$WEBHOOK_URL" ]; then
        local emoji="✅"
        if [ "$is_error" = "true" ]; then
            emoji="❌"
        fi
        
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$emoji $subject\\n$message\"}" &> /dev/null || true
    fi
}

# Create database backup
create_database_backup() {
    log "Creating database backup..."
    
    local db_backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_database.db"
    
    if [ -f "$SOURCE_DB" ]; then
        # Create a consistent backup using SQLite backup API
        if command -v sqlite3 &> /dev/null; then
            sqlite3 "$SOURCE_DB" ".backup $db_backup_file"
        else
            # Fallback to file copy
            cp "$SOURCE_DB" "$db_backup_file"
        fi
        
        # Verify backup integrity
        if sqlite3 "$db_backup_file" "PRAGMA integrity_check;" | grep -q "ok"; then
            local original_size=$(ls -lh "$SOURCE_DB" | awk '{print $5}')
            local backup_size=$(ls -lh "$db_backup_file" | awk '{print $5}')
            
            log "✅ Database backup created successfully"
            log "   Original: $original_size, Backup: $backup_size"
            
            return 0
        else
            error "Database backup integrity check failed"
            rm -f "$db_backup_file"
            return 1
        fi
    else
        error "Source database not found: $SOURCE_DB"
        return 1
    fi
}

# Create logs backup
create_logs_backup() {
    log "Creating logs backup..."
    
    local logs_backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_logs.tar.gz"
    
    if [ -d "$SOURCE_LOGS" ]; then
        tar -czf "$logs_backup_file" -C "$(dirname "$SOURCE_LOGS")" "$(basename "$SOURCE_LOGS")" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            local backup_size=$(ls -lh "$logs_backup_file" | awk '{print $5}')
            log "✅ Logs backup created successfully (Size: $backup_size)"
            return 0
        else
            error "Failed to create logs backup"
            return 1
        fi
    else
        log "⚠️  Logs directory not found, skipping logs backup"
        return 0
    fi
}

# Create configuration backup
create_config_backup() {
    log "Creating configuration backup..."
    
    local config_backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_config.env"
    
    if [ -f "$SOURCE_CONFIG" ]; then
        # Remove sensitive information before backup
        grep -v -E "(PASSWORD|SECRET|KEY|TOKEN)" "$SOURCE_CONFIG" > "$config_backup_file" 2>/dev/null || cp "$SOURCE_CONFIG" "$config_backup_file"
        
        if [ $? -eq 0 ]; then
            local backup_size=$(ls -lh "$config_backup_file" | awk '{print $5}')
            log "✅ Configuration backup created successfully (Size: $backup_size)"
            return 0
        else
            error "Failed to create configuration backup"
            return 1
        fi
    else
        log "⚠️  Configuration file not found, skipping config backup"
        return 0
    fi
}

# Compress backups
compress_backups() {
    log "Compressing backups..."
    
    local backup_archive="$BACKUP_DIR/${BACKUP_PREFIX}_complete.tar.gz"
    
    # Create compressed archive of all backup files
    tar -czf "$backup_archive" -C "$BACKUP_DIR" \
        "${BACKUP_PREFIX}_database.db" \
        "${BACKUP_PREFIX}_logs.tar.gz" \
        "${BACKUP_PREFIX}_config.env" \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Remove individual backup files
        rm -f "$BACKUP_DIR/${BACKUP_PREFIX}_database.db"
        rm -f "$BACKUP_DIR/${BACKUP_PREFIX}_logs.tar.gz"
        rm -f "$BACKUP_DIR/${BACKUP_PREFIX}_config.env"
        
        local archive_size=$(ls -lh "$backup_archive" | awk '{print $5}')
        log "✅ Backup archive created successfully (Size: $archive_size)"
        echo "$backup_archive"
        return 0
    else
        error "Failed to create backup archive"
        return 1
    fi
}

# Upload to remote storage
upload_to_remote() {
    local backup_file="$1"
    
    if [ "$REMOTE_BACKUP_ENABLED" != "true" ]; then
        return 0
    fi
    
    log "Uploading to remote storage..."
    
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local s3_path="s3://$S3_BUCKET/database/$(basename "$backup_file")"
        
        if aws s3 cp "$backup_file" "$s3_path" --storage-class STANDARD_IA; then
            log "✅ Remote backup uploaded successfully to: $s3_path"
            return 0
        else
            error "Failed to upload backup to S3"
            return 1
        fi
    else
        log "⚠️  Remote backup configured but AWS CLI not available or S3 bucket not set"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    local deleted_count=0
    
    # Remove backups older than retention period
    if [ -d "$BACKUP_DIR" ]; then
        # Find and remove old backups by date
        while IFS= read -r -d '' file; do
            rm -f "$file"
            ((deleted_count++))
        done < <(find "$BACKUP_DIR" -name "parkinggarage_*.tar.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
        
        # Remove excess backups (keep only MAX_BACKUPS most recent)
        local total_backups=$(ls -1 "$BACKUP_DIR"/parkinggarage_*.tar.gz 2>/dev/null | wc -l)
        if [ "$total_backups" -gt "$MAX_BACKUPS" ]; then
            local excess=$((total_backups - MAX_BACKUPS))
            ls -1t "$BACKUP_DIR"/parkinggarage_*.tar.gz | tail -n "$excess" | xargs -r rm -f
            deleted_count=$((deleted_count + excess))
        fi
        
        if [ $deleted_count -gt 0 ]; then
            log "🗑️  Removed $deleted_count old backup(s)"
        fi
    fi
}

# Get backup statistics
get_backup_stats() {
    local backup_count=0
    local total_size=0
    
    if [ -d "$BACKUP_DIR" ]; then
        backup_count=$(ls -1 "$BACKUP_DIR"/parkinggarage_*.tar.gz 2>/dev/null | wc -l)
        total_size=$(du -sb "$BACKUP_DIR" 2>/dev/null | cut -f1)
        total_size_human=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    fi
    
    log "📊 Backup Statistics:"
    log "   Total backups: $backup_count"
    log "   Total size: $total_size_human"
    log "   Retention: $RETENTION_DAYS days"
    log "   Max backups: $MAX_BACKUPS"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Test archive integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        log "✅ Backup archive integrity verified"
        
        # Extract and test database
        local temp_dir=$(mktemp -d)
        tar -xzf "$backup_file" -C "$temp_dir" 2>/dev/null
        
        local db_file=$(find "$temp_dir" -name "*.db" | head -n1)
        if [ -n "$db_file" ] && sqlite3 "$db_file" "PRAGMA integrity_check;" | grep -q "ok"; then
            log "✅ Database integrity verified"
            rm -rf "$temp_dir"
            return 0
        else
            error "Database integrity check failed"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        error "Backup archive is corrupted"
        return 1
    fi
}

# Main backup function
main() {
    local start_time=$(date +%s)
    local success=true
    local error_messages=""
    
    log "🚀 Starting backup process..."
    
    # Create individual backups
    if ! create_database_backup; then
        success=false
        error_messages="$error_messages\n- Database backup failed"
    fi
    
    create_logs_backup || true  # Non-critical
    create_config_backup || true  # Non-critical
    
    # Create compressed archive
    local backup_file
    if backup_file=$(compress_backups); then
        log "📦 Backup file created: $(basename "$backup_file")"
        
        # Verify backup
        if verify_backup "$backup_file"; then
            # Upload to remote storage
            upload_to_remote "$backup_file" || true  # Non-critical
        else
            success=false
            error_messages="$error_messages\n- Backup verification failed"
        fi
    else
        success=false
        error_messages="$error_messages\n- Archive creation failed"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Get statistics
    get_backup_stats
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Final status
    if [ "$success" = true ]; then
        log "✅ Backup process completed successfully in ${duration}s"
        send_notification "Backup Completed Successfully" "Backup created: $(basename "$backup_file")\nDuration: ${duration}s\n$(get_backup_stats)" "false"
        exit 0
    else
        error "❌ Backup process completed with errors in ${duration}s"
        error "Error details:$error_messages"
        send_notification "Backup Process Failed" "Errors encountered during backup:\n$error_messages\nDuration: ${duration}s" "true"
        exit 1
    fi
}

# Handle script options
case "${1:-}" in
    --database-only)
        log "Running database backup only..."
        create_database_backup && log "Database backup completed" || error "Database backup failed"
        ;;
    --verify)
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            echo "Usage: $0 --verify <backup_file>"
            exit 1
        fi
        ;;
    --cleanup)
        cleanup_old_backups
        ;;
    --stats)
        get_backup_stats
        ;;
    --help)
        echo "Usage: $0 [OPTION]"
        echo "Options:"
        echo "  --database-only    Backup database only"
        echo "  --verify FILE      Verify backup integrity"
        echo "  --cleanup          Remove old backups"
        echo "  --stats            Show backup statistics"
        echo "  --help             Show this help message"
        ;;
    *)
        main
        ;;
esac