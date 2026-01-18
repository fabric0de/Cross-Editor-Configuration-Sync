#!/bin/bash
# Profile Sync Helper Script
# This script runs in the background, waits for IDE to close, updates storage.json, and relaunches

LOG_FILE="/tmp/cecs_script.log"
exec >> "$LOG_FILE" 2>&1
set -x

echo "--- Script started at $(date) ---"

APP_NAME="$1"
STORAGE_PATH="$2"
PROFILES_FILE="$3"
APP_BUNDLE_PATH="$4"

echo "APP_NAME: $APP_NAME"
echo "STORAGE_PATH: $STORAGE_PATH"
echo "PROFILES_FILE: $PROFILES_FILE"
echo "APP_BUNDLE_PATH: $APP_BUNDLE_PATH"

echo "[CECS Helper] Waiting for application to close..."

MAX_RETRIES=60
COUNT=0

# Detection logic
PROCESS_PATTERN="$APP_NAME"
if [ ! -z "$APP_BUNDLE_PATH" ]; then
    # If bundle path provided, look for processes running from it
    # Use Content/MacOS as pattern to match main process
    PROCESS_PATTERN="$APP_BUNDLE_PATH/Contents/MacOS"
fi

# Detection function using ps and grep (more reliable than pgrep on some systems)
check_process() {
    ps -ax | grep -v grep | grep "$PROCESS_PATTERN" > /dev/null
}

echo "[CECS Helper] Monitoring pattern: $PROCESS_PATTERN"

# Initial check: allow up to 5 seconds to detect the process initially
# This prevents race conditions where we might check too early or pattern mismatch
for i in {1..5}; do
    if check_process; then
        echo "[CECS Helper] Process detected. Watching for exit..."
        break
    fi
    echo "[CECS Helper] Process not found yet, retrying ($i/5)..."
    sleep 1
done

# Now wait for it to disappear
while check_process; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "[CECS Helper] Timeout waiting for app to close."
        exit 1
    fi
done

echo "[CECS Helper] Application closed. Updating storage.json..."

# Update storage.json with Python
python3 << EOF
import json
import os

storage_path = "$STORAGE_PATH"
profiles_file = "$PROFILES_FILE"

try:
    with open(storage_path, 'r') as f:
        data = json.load(f)
    
    if os.path.exists(profiles_file):
        with open(profiles_file, 'r') as f:
            new_profiles = json.load(f)
            
        data['userDataProfiles'] = new_profiles
        
        with open(storage_path, 'w') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"[CECS Helper] Updated storage.json with {len(new_profiles)} profiles")
    else:
        print(f"[CECS Helper] Profiles file not found: {profiles_file}")

except Exception as e:
    print(f"[CECS Helper] Error: {e}")
EOF

# Clean up temp profiles file
if [ -f "$PROFILES_FILE" ]; then
    rm "$PROFILES_FILE"
fi


# Relaunch function
launch_app() {
    if [ ! -z "$APP_BUNDLE_PATH" ]; then
        echo "Executing: open -n \"$APP_BUNDLE_PATH\""
        open -n "$APP_BUNDLE_PATH" 2>&1
    else
        echo "Executing: open -a \"$APP_NAME\""
        open -a "$APP_NAME" 2>&1
    fi
}

# Start relaunch immediately


# Relaunch function
launch_app() {
    echo "Starting relaunch sequence..."
    
    # Priority 1: Direct CLI Binary Execution (Most Reliable)
    # Looks for binary in .../Contents/Resources/app/bin/
    if [ ! -z "$APP_BUNDLE_PATH" ]; then
        CLI_DIR="$APP_BUNDLE_PATH/Contents/Resources/app/bin"
        if [ -d "$CLI_DIR" ]; then
            # Get the first file in the bin directory
            CLI_BIN_NAME=$(ls "$CLI_DIR" | head -n 1)
            CLI_PATH="$CLI_DIR/$CLI_BIN_NAME"
            
            if [ -x "$CLI_PATH" ]; then
                echo "Found CLI binary: $CLI_PATH"
                echo "Executing CLI binary in background..."
                # Run detached
                nohup "$CLI_PATH" > /dev/null 2>&1 &
                
                # Give it a moment to start
                sleep 2
                
                # Verify if it started
                if pgrep -f "$APP_BUNDLE_PATH/Contents/MacOS" > /dev/null; then
                    echo "CLI launch successful."
                    return 0
                else
                    echo "CLI launch appeared to fail (process not found yet). Trying fallbacks..."
                fi
            fi
        fi
    fi

    # Priority 2: osascript (Strong GUI Activation)
    echo "Attempting to launch app using osascript..."
    RESULT=0
    
    if [ ! -z "$APP_BUNDLE_PATH" ]; then
        osascript -e "tell application \"$APP_BUNDLE_PATH\" to activate" 2>&1
        RESULT=$?
    else
        osascript -e "tell application \"$APP_NAME\" to activate" 2>&1
        RESULT=$?
    fi
    
    if [ $RESULT -ne 0 ]; then
        # Priority 3: open command (Standard macOS launch)
        echo "osascript failed. Attempting open command..."
        if [ ! -z "$APP_BUNDLE_PATH" ]; then
            open "$APP_BUNDLE_PATH" 2>&1
        else
            open -a "$APP_NAME" 2>&1
        fi
    fi
}

launch_app

# Verify relaunch
echo "[CECS Helper] Verifying relaunch..."
DETECTED=0
for i in {1..10}; do
    if check_process; then
        echo "[CECS Helper] Application relaunched successfully!"
        DETECTED=1
        break
    fi
    sleep 1
done

if [ $DETECTED -eq 0 ]; then
    echo "[CECS Helper] Relaunch failed or too slow. Trying fallback (osascript)..."
    if [ ! -z "$APP_BUNDLE_PATH" ]; then
        osascript -e "tell application \"$APP_BUNDLE_PATH\" to activate" 2>&1
    else
        osascript -e "tell application \"$APP_NAME\" to activate" 2>&1
    fi
fi

echo "[CECS Helper] Done!"
