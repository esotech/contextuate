#!/bin/bash
# ============================================================================
# Contextuate Monitor - Database Setup Script
# ============================================================================
#
# Quick setup script for initializing MySQL or PostgreSQL databases
# for the Contextuate Monitor system.
#
# Usage:
#   ./setup.sh mysql      # Setup MySQL database
#   ./setup.sh postgres   # Setup PostgreSQL database
#   ./setup.sh both       # Setup both databases
#
# ============================================================================

set -e  # Exit on error

# Configuration
DB_NAME="contextuate_monitor"
MYSQL_USER="root"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
PG_USER="postgres"
PG_HOST="localhost"
PG_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================================================
# Helper Functions
# ============================================================================

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed or not in PATH"
        return 1
    fi
    return 0
}

# ============================================================================
# MySQL Setup
# ============================================================================

setup_mysql() {
    print_info "Setting up MySQL database..."

    # Check if mysql client is available
    if ! check_command mysql; then
        print_error "MySQL client not found. Please install MySQL client."
        return 1
    fi

    # Read password securely
    echo -n "MySQL password for user '$MYSQL_USER': "
    read -s MYSQL_PASSWORD
    echo

    # Test connection
    print_info "Testing MySQL connection..."
    if ! mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
        print_error "Failed to connect to MySQL. Check credentials and server."
        return 1
    fi

    # Create database
    print_info "Creating database '$DB_NAME'..."
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

    # Apply schema
    print_info "Applying MySQL schema..."
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/mysql-schema.sql"

    # Optional: Load sample data
    read -p "Load sample data for testing? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Loading sample data..."
        mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/sample-data.sql"
    fi

    # Verify
    print_info "Verifying MySQL setup..."
    TABLES=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" -s --skip-column-names | wc -l)
    print_info "Created $TABLES tables"

    # Show table info
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" <<EOF
SELECT 'Sessions:' as '';
SELECT COUNT(*) as session_count FROM sessions;
SELECT 'Events:' as '';
SELECT COUNT(*) as event_count FROM events;
EOF

    print_info "MySQL setup complete!"
    print_info "Connection string: mysql://$MYSQL_USER:***@$MYSQL_HOST:$MYSQL_PORT/$DB_NAME"
}

# ============================================================================
# PostgreSQL Setup
# ============================================================================

setup_postgresql() {
    print_info "Setting up PostgreSQL database..."

    # Check if psql client is available
    if ! check_command psql; then
        print_error "PostgreSQL client (psql) not found. Please install PostgreSQL client."
        return 1
    fi

    # Read password securely
    echo -n "PostgreSQL password for user '$PG_USER': "
    read -s PGPASSWORD
    export PGPASSWORD
    echo

    # Test connection
    print_info "Testing PostgreSQL connection..."
    if ! psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -c "SELECT 1;" &> /dev/null; then
        print_error "Failed to connect to PostgreSQL. Check credentials and server."
        unset PGPASSWORD
        return 1
    fi

    # Create database
    print_info "Creating database '$DB_NAME'..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8';
EOF

    # Apply schema
    print_info "Applying PostgreSQL schema..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/postgresql-schema.sql"

    # Optional: Load sample data
    read -p "Load sample data for testing? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Loading sample data..."
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/sample-data.sql"
    fi

    # Verify
    print_info "Verifying PostgreSQL setup..."
    TABLES=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    print_info "Created $TABLES tables"

    # Show table info
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" <<EOF
\echo '--- Sessions ---'
SELECT COUNT(*) as session_count FROM sessions;
\echo '--- Events ---'
SELECT COUNT(*) as event_count FROM events;
\echo '--- Views ---'
\dv
\echo '--- Functions ---'
\df
EOF

    unset PGPASSWORD

    print_info "PostgreSQL setup complete!"
    print_info "Connection string: postgresql://$PG_USER:***@$PG_HOST:$PG_PORT/$DB_NAME"
}

# ============================================================================
# Docker Setup (Optional)
# ============================================================================

setup_docker_mysql() {
    print_info "Setting up MySQL in Docker..."

    if ! check_command docker; then
        print_error "Docker not found. Please install Docker."
        return 1
    fi

    docker run -d \
        --name contextuate-mysql \
        -e MYSQL_ROOT_PASSWORD=contextuate \
        -e MYSQL_DATABASE=$DB_NAME \
        -p 3306:3306 \
        mysql:8.0

    print_info "Waiting for MySQL to start..."
    sleep 10

    MYSQL_USER="root"
    MYSQL_PASSWORD="contextuate"
    MYSQL_HOST="127.0.0.1"

    print_info "Applying schema..."
    mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/mysql-schema.sql"

    print_info "MySQL Docker container started!"
    print_info "Container: contextuate-mysql"
    print_info "Connection: mysql://root:contextuate@127.0.0.1:3306/$DB_NAME"
    print_info "Stop with: docker stop contextuate-mysql"
    print_info "Remove with: docker rm contextuate-mysql"
}

setup_docker_postgresql() {
    print_info "Setting up PostgreSQL in Docker..."

    if ! check_command docker; then
        print_error "Docker not found. Please install Docker."
        return 1
    fi

    docker run -d \
        --name contextuate-postgres \
        -e POSTGRES_PASSWORD=contextuate \
        -e POSTGRES_DB=$DB_NAME \
        -p 5432:5432 \
        postgres:15

    print_info "Waiting for PostgreSQL to start..."
    sleep 5

    export PGPASSWORD="contextuate"
    PG_USER="postgres"
    PG_HOST="127.0.0.1"

    print_info "Applying schema..."
    psql -h "$PG_HOST" -U "$PG_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/postgresql-schema.sql"

    unset PGPASSWORD

    print_info "PostgreSQL Docker container started!"
    print_info "Container: contextuate-postgres"
    print_info "Connection: postgresql://postgres:contextuate@127.0.0.1:5432/$DB_NAME"
    print_info "Stop with: docker stop contextuate-postgres"
    print_info "Remove with: docker rm contextuate-postgres"
}

# ============================================================================
# Main
# ============================================================================

show_usage() {
    cat << EOF
Contextuate Monitor - Database Setup Script

Usage:
  $0 [command]

Commands:
  mysql               Setup MySQL database
  postgres            Setup PostgreSQL database
  postgresql          Alias for postgres
  both                Setup both MySQL and PostgreSQL
  docker-mysql        Setup MySQL in Docker container
  docker-postgres     Setup PostgreSQL in Docker container
  docker-both         Setup both databases in Docker
  help                Show this help message

Environment Variables:
  MYSQL_HOST          MySQL host (default: localhost)
  MYSQL_PORT          MySQL port (default: 3306)
  MYSQL_USER          MySQL user (default: root)
  PG_HOST             PostgreSQL host (default: localhost)
  PG_PORT             PostgreSQL port (default: 5432)
  PG_USER             PostgreSQL user (default: postgres)

Examples:
  $0 mysql
  $0 postgres
  $0 docker-mysql
  MYSQL_HOST=192.168.1.100 $0 mysql

EOF
}

# Parse command line
case "${1:-help}" in
    mysql)
        setup_mysql
        ;;
    postgres|postgresql)
        setup_postgresql
        ;;
    both)
        setup_mysql
        echo
        setup_postgresql
        ;;
    docker-mysql)
        setup_docker_mysql
        ;;
    docker-postgres|docker-postgresql)
        setup_docker_postgresql
        ;;
    docker-both)
        setup_docker_mysql
        echo
        setup_docker_postgresql
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_usage
        exit 1
        ;;
esac

exit 0
