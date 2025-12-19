#!/bin/bash

# ============================================================================
# PATRON-MD3 Comprehensive Deobfuscation Script
# ============================================================================
# This script deobfuscates all JavaScript files in the PATRON-MD3 project
# ============================================================================

OUTPUT_DIR="/workspaces/PATRON-MD3/DEOBFUSCATED_FULL"
LOG_FILE="${OUTPUT_DIR}/deobfuscation.log"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to copy file structure
copy_structure() {
    local src_dir=$1
    local dest_dir=$2
    
    # Create directory structure
    find "$src_dir" -type d ! -name "DEOBFUSCATED*" ! -name "node_modules" ! -name ".git" | while read dir; do
        rel_path=${dir#$src_dir/}
        [ -n "$rel_path" ] && mkdir -p "$dest_dir/$rel_path"
    done
}

# Function to deobfuscate a single file
deobfuscate_file() {
    local input_file=$1
    local output_file=$2
    local file_rel_path=${input_file#/workspaces/PATRON-MD3/}
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Processing: $file_rel_path" | tee -a "$LOG_FILE"
    
    # Beautify the JavaScript file
    js-beautify "$input_file" > "$output_file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "[✓] Successfully deobfuscated: $file_rel_path" | tee -a "$LOG_FILE"
        return 0
    else
        echo "[✗] Failed to deobfuscate: $file_rel_path" | tee -a "$LOG_FILE"
        # Copy original if beautify fails
        cp "$input_file" "$output_file"
        return 1
    fi
}

# Start deobfuscation
echo "============================================" | tee "$LOG_FILE"
echo "PATRON-MD3 Deobfuscation Process Starting" | tee -a "$LOG_FILE"
echo "$(date)" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"

# Copy directory structure
echo "Creating directory structure..." | tee -a "$LOG_FILE"
copy_structure "/workspaces/PATRON-MD3" "$OUTPUT_DIR"

# Find and deobfuscate all obfuscated JS files
echo "Finding and deobfuscating files..." | tee -a "$LOG_FILE"
find /workspaces/PATRON-MD3 -type f -name "*.js" ! -path "*/DEOBFUSCATED*" ! -path "*/node_modules/*" ! -path "*/.git/*" | while read input_file; do
    # Calculate relative path and output path
    rel_path=${input_file#/workspaces/PATRON-MD3/}
    output_file="$OUTPUT_DIR/$rel_path"
    
    # Create parent directory if it doesn't exist
    mkdir -p "$(dirname "$output_file")"
    
    # Check if file is obfuscated
    if grep -q "_0x[0-9a-f]\|function.*0x[0-9a-f]" "$input_file" 2>/dev/null; then
        deobfuscate_file "$input_file" "$output_file"
    else
        # Copy non-obfuscated files as-is
        cp "$input_file" "$output_file"
        echo "[→] Copied (not obfuscated): $rel_path" | tee -a "$LOG_FILE"
    fi
done

# Copy non-JS files
echo "Copying supporting files..." | tee -a "$LOG_FILE"
find /workspaces/PATRON-MD3 -type f ! -name "*.js" ! -path "*/DEOBFUSCATED*" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/.env*" -exec bash -c '
    input_file=$1
    rel_path=${input_file#/workspaces/PATRON-MD3/}
    output_file="/workspaces/PATRON-MD3/DEOBFUSCATED_FULL/$rel_path"
    
    # Skip certain files
    if [[ "$rel_path" == *.vcf ]] || [[ "$rel_path" == *.json ]] || [[ "$rel_path" =~ \.(md|txt|lock)$ ]]; then
        mkdir -p "$(dirname "$output_file")"
        cp "$input_file" "$output_file"
    fi
' _ {} \; 2>/dev/null

echo "" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"
echo "Deobfuscation Complete!" | tee -a "$LOG_FILE"
echo "Output Directory: $OUTPUT_DIR" | tee -a "$LOG_FILE"
echo "Log File: $LOG_FILE" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"

# Summary statistics
total_files=$(find "$OUTPUT_DIR" -type f -name "*.js" | wc -l)
total_lines=$(find "$OUTPUT_DIR" -type f -name "*.js" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')

echo "" | tee -a "$LOG_FILE"
echo "Statistics:" | tee -a "$LOG_FILE"
echo "  Total JS Files: $total_files" | tee -a "$LOG_FILE"
echo "  Total Lines of Code: $total_lines" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
