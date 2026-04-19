#!/bin/bash

# Create sample GENAI folder structure with test data
# This script generates sample Sysdig reports for testing

GENAI_ROOT="${1:-.}/GENAI"

mkdir -p "$GENAI_ROOT/2025.42"
mkdir -p "$GENAI_ROOT/2026.32"

# Function to create a sample CSV file
create_sample_csv() {
    local file=$1
    local num_records=$2

    cat > "$file" << 'EOF'
Image Scan Report
Generated: 2025-04-19
Scanner: Sysdig
---
PackageName,PackageType,Path,Exploitable,SuggestedFix,CVE ID,Score
EOF

    # Add sample vulnerability records
    for ((i=1; i<=num_records; i++)); do
        cve_num=$((1000 + i))
        score=$(awk -v min=2 -v max=10 'BEGIN{srand(); print min+rand()*(max-min)}')
        exploitable=$((RANDOM % 2 == 0 ? "yes" : "no"))

        echo "openssl,deb,/usr/lib/libssl.so.1.1,${exploitable},upgrade to 1.1.1w,CVE-2025-${cve_num},$score" >> "$file"
    done
}

# Function to create a sample JSON file
create_sample_json() {
    local file=$1
    local base_os=$2

    cat > "$file" << EOF
{
  "info": {
    "scan_date": "2025-04-19",
    "version": "1.0"
  },
  "scanner": {
    "name": "Sysdig",
    "version": "1.5.0"
  },
  "result": {
    "image_scan": {
      "metadata": {
        "baseOs": "$base_os",
        "registry": "docker.io",
        "digest": "sha256:abc123def456"
      }
    }
  }
}
EOF
}

# Create sample reports for 2025.42 version
echo "Creating sample reports for version 2025.42..."

create_sample_csv "$GENAI_ROOT/2025.42/ai-service-assistant_2025.42.1.csv" 15
create_sample_json "$GENAI_ROOT/2025.42/ai-service-assistant_2025.42.1.json" "debian:11"

create_sample_csv "$GENAI_ROOT/2025.42/backend-service-ingestor_2025.42.13.csv" 20
create_sample_json "$GENAI_ROOT/2025.42/backend-service-ingestor_2025.42.13.json" "ubuntu:20.04"

create_sample_csv "$GENAI_ROOT/2025.42/frontend-ui_2025.42.5.csv" 8
create_sample_json "$GENAI_ROOT/2025.42/frontend-ui_2025.42.5.json" "alpine:3.17"

create_sample_csv "$GENAI_ROOT/2025.42/auth-service_2025.42.2.csv" 12
create_sample_json "$GENAI_ROOT/2025.42/auth-service_2025.42.2.json" "debian:12"

create_sample_csv "$GENAI_ROOT/2025.42/data-processor_2025.42.7.csv" 18
create_sample_json "$GENAI_ROOT/2025.42/data-processor_2025.42.7.json" "ubuntu:22.04"

# Create sample reports for 2026.32 version
echo "Creating sample reports for version 2026.32..."

create_sample_csv "$GENAI_ROOT/2026.32/ai-service-assistant_2026.32.0.csv" 10
create_sample_json "$GENAI_ROOT/2026.32/ai-service-assistant_2026.32.0.json" "debian:12"

create_sample_csv "$GENAI_ROOT/2026.32/backend-service-ingestor_2026.32.1.csv" 12
create_sample_json "$GENAI_ROOT/2026.32/backend-service-ingestor_2026.32.1.json" "ubuntu:22.04"

create_sample_csv "$GENAI_ROOT/2026.32/frontend-ui_2026.32.0.csv" 5
create_sample_json "$GENAI_ROOT/2026.32/frontend-ui_2026.32.0.json" "alpine:3.18"

echo "Sample data created at: $GENAI_ROOT"
echo "Set environment variable: export GENAI_ROOT_PATH=$GENAI_ROOT"

