#!/bin/bash

# Configuration
APP_URL="http://localhost:3000"
HEALTH_ENDPOINT="/health"
LOG_FILE="/opt/parkinggarage/logs/health.log"
ALERT_EMAIL="admin@yourdomain.com"
MAX_RESPONSE_TIME=5 # seconds
WEBHOOK_URL="" # Optional Slack/Discord webhook

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    # Email alert (if mail is configured)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" $ALERT_EMAIL 2>/dev/null || true
    fi
    
    # Webhook alert (if configured)
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 $subject\\n$message\"}" &> /dev/null || true
    fi
    
    # Log the alert
    log "ALERT SENT: $subject - $message"
}

# Health checks
check_api_health() {
    local response_time
    local http_status
    
    response_time=$(curl -w "%{time_total}" -s -o /dev/null $APP_URL$HEALTH_ENDPOINT --max-time $MAX_RESPONSE_TIME 2>/dev/null || echo "timeout")
    http_status=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL$HEALTH_ENDPOINT --max-time $MAX_RESPONSE_TIME 2>/dev/null || echo "000")
    
    if [ "$http_status" = "200" ] && [ "$response_time" != "timeout" ]; then
        log "✅ API Health: OK (${response_time}s)"
        return 0
    else
        log "❌ API Health: FAILED (HTTP: $http_status, Time: ${response_time}s)"
        send_alert "API Health Check Failed" "HTTP Status: $http_status\\nResponse Time: ${response_time}s\\nEndpoint: $APP_URL$HEALTH_ENDPOINT"
        return 1
    fi
}

check_database_health() {
    local db_path="/opt/parkinggarage/data/parkinggarage.db"
    
    if [ -f "$db_path" ] && sqlite3 "$db_path" "PRAGMA integrity_check;" 2>/dev/null | grep -q "ok"; then
        local db_size=$(ls -lh "$db_path" | awk '{print $5}')
        log "✅ Database Health: OK (Size: $db_size)"
        return 0
    else
        log "❌ Database Health: FAILED"
        send_alert "Database Health Check Failed" "Database integrity check failed or file missing\\nPath: $db_path"
        return 1
    fi
}

check_disk_space() {
    local disk_usage
    local available_space
    
    disk_usage=$(df /opt/parkinggarage 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    available_space=$(df -h /opt/parkinggarage 2>/dev/null | awk 'NR==2 {print $4}' || echo "N/A")
    
    if [ "$disk_usage" -lt 80 ]; then
        log "✅ Disk Space: OK (${disk_usage}% used, ${available_space} available)"
        return 0
    else
        log "⚠️  Disk Space: WARNING (${disk_usage}% used, ${available_space} available)"
        if [ "$disk_usage" -gt 90 ]; then
            send_alert "Critical Disk Space Warning" "Disk usage: ${disk_usage}%\\nAvailable: ${available_space}\\nPath: /opt/parkinggarage"
        fi
        return 1
    fi
}

check_pm2_status() {
    local pm2_status
    
    if command -v pm2 &> /dev/null; then
        pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="parkinggarage") | .pm2_env.status' 2>/dev/null || echo "not_found")
        
        if [ "$pm2_status" = "online" ]; then
            log "✅ PM2 Process: OK (Status: $pm2_status)"
            return 0
        else
            log "❌ PM2 Process: FAILED (Status: $pm2_status)"
            send_alert "PM2 Process Check Failed" "Application process status: $pm2_status\\nAttempting restart..."
            
            # Attempt restart
            su - parkinggarage -c "pm2 restart parkinggarage" &> /dev/null || true
            sleep 5
            
            # Check again after restart
            pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="parkinggarage") | .pm2_env.status' 2>/dev/null || echo "not_found")
            if [ "$pm2_status" = "online" ]; then
                log "✅ PM2 Process: Restarted successfully"
                return 0
            else
                log "❌ PM2 Process: Restart failed"
                return 1
            fi
        fi
    else
        log "⚠️  PM2 not available, checking Node.js process..."
        if pgrep -f "node.*server" > /dev/null; then
            log "✅ Node.js Process: OK"
            return 0
        else
            log "❌ Node.js Process: NOT RUNNING"
            send_alert "Node.js Process Check Failed" "No Node.js server process found"
            return 1
        fi
    fi
}

check_memory_usage() {
    local memory_usage
    local memory_available
    
    memory_usage=$(free | grep Mem | awk '{printf("%.1f", ($3/$2) * 100.0)}')
    memory_available=$(free -h | grep Mem | awk '{print $7}')
    
    if [ "$(echo "$memory_usage < 85" | bc -l 2>/dev/null || echo "1")" = "1" ]; then
        log "✅ Memory Usage: OK (${memory_usage}% used, ${memory_available} available)"
        return 0
    else
        log "⚠️  Memory Usage: HIGH (${memory_usage}% used, ${memory_available} available)"
        if [ "$(echo "$memory_usage > 95" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
            send_alert "Critical Memory Usage Warning" "Memory usage: ${memory_usage}%\\nAvailable: ${memory_available}"
        fi
        return 1
    fi
}

check_nginx_status() {
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx: OK (Active)"
        return 0
    else
        log "❌ Nginx: FAILED (Inactive)"
        send_alert "Nginx Service Failed" "Nginx service is not active\\nAttempting restart..."
        
        # Attempt restart
        systemctl restart nginx &> /dev/null || true
        sleep 2
        
        if systemctl is-active --quiet nginx; then
            log "✅ Nginx: Restarted successfully"
            return 0
        else
            log "❌ Nginx: Restart failed"
            return 1
        fi
    fi
}

check_database_connections() {
    local active_connections
    
    # Check SQLite connections (approximately by checking if database is locked)
    if timeout 5 sqlite3 /opt/parkinggarage/data/parkinggarage.db "PRAGMA quick_check;" &> /dev/null; then
        log "✅ Database Connections: OK"
        return 0
    else
        log "⚠️  Database Connections: Possible lock or high load"
        return 1
    fi
}

# Performance metrics collection
collect_performance_metrics() {
    local cpu_usage
    local load_avg
    local uptime_info
    
    # CPU usage (1 minute average)
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}' | cut -d'%' -f1)
    
    # Load average
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    # System uptime
    uptime_info=$(uptime -p)
    
    log "📊 Performance Metrics:"
    log "   CPU Usage: ${cpu_usage}%"
    log "   Load Average: $load_avg"
    log "   System Uptime: $uptime_info"
    
    # Alert on high CPU or load
    if [ "$(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
        send_alert "High CPU Usage Alert" "CPU usage: ${cpu_usage}%\\nLoad average: $load_avg"
    fi
}

# Main health check execution
main() {
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    log "🔍 Starting comprehensive health check..."
    
    local checks_passed=0
    local total_checks=7
    local warnings=0
    
    # Run all health checks
    check_api_health && ((checks_passed++)) || true
    check_database_health && ((checks_passed++)) || true
    check_disk_space && ((checks_passed++)) || warnings=$((warnings+1))
    check_pm2_status && ((checks_passed++)) || true
    check_memory_usage && ((checks_passed++)) || warnings=$((warnings+1))
    check_nginx_status && ((checks_passed++)) || true
    check_database_connections && ((checks_passed++)) || warnings=$((warnings+1))
    
    # Collect performance metrics
    collect_performance_metrics
    
    # Summary
    log "📋 Health check completed: $checks_passed/$total_checks checks passed"
    if [ $warnings -gt 0 ]; then
        log "⚠️  Warnings: $warnings"
    fi
    
    # Overall status
    if [ $checks_passed -ge 5 ]; then
        log "✅ Overall Status: HEALTHY"
        exit 0
    elif [ $checks_passed -ge 3 ]; then
        log "⚠️  Overall Status: DEGRADED"
        exit 1
    else
        log "❌ Overall Status: CRITICAL"
        send_alert "System Critical Status" "Only $checks_passed/$total_checks health checks passed\\nImmediate attention required"
        exit 2
    fi
}

# Script execution options
case "${1:-}" in
    --api-only)
        check_api_health
        ;;
    --database-only)
        check_database_health
        ;;
    --performance-only)
        collect_performance_metrics
        ;;
    --silent)
        LOG_FILE="/dev/null"
        main
        ;;
    *)
        main
        ;;
esac