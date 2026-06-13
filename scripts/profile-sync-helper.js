const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

const args = process.argv.slice(2);
const appName = args[0];
const storageJsonPath = args[1];
const profilesFilePath = args[2];
const appExePath = args[3];
const appBundlePath = args[4];

const logFile = path.join(os.tmpdir(), 'cecs_script.log');
const log = (msg) => {
    try {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
        // ignore
    }
};

log(`--- Helper Script Started ---`);
log(`APP_NAME: ${appName}`);
log(`STORAGE_PATH: ${storageJsonPath}`);
log(`PROFILES_FILE: ${profilesFilePath}`);
log(`APP_EXE_PATH: ${appExePath}`);

let retries = 0;
const maxRetries = 60;

function isAppRunning(callback) {
    if (process.platform === 'win32') {
        const exeName = appExePath ? path.basename(appExePath) : `${appName}.exe`;
        // Exclude our own PID
        exec(`tasklist /FI "IMAGENAME eq ${exeName}" /NH`, (err, stdout) => {
            if (err) return callback(false);

            // tasklist output has the format: "Code.exe    12345 Console..."
            // We need to check if there are any lines with the exeName that have a different PID
            const lines = stdout
                .split('\n')
                .filter((line) => line.toLowerCase().includes(exeName.toLowerCase()));
            const isOtherInstanceRunning = lines.some((line) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const pid = parseInt(parts[1], 10);
                    if (!isNaN(pid)) {
                        return pid !== process.pid;
                    }
                }
                return true; // If we can't parse the PID, assume it's running
            });

            callback(isOtherInstanceRunning);
        });
    } else {
        // macOS/Linux pgrep
        exec(`pgrep -x "${appName}"`, (err, stdout) => {
            if (err) return callback(false);
            const pids = stdout
                .trim()
                .split('\n')
                .map((p) => parseInt(p.trim(), 10))
                .filter((p) => !isNaN(p));
            const isOtherInstanceRunning = pids.some((pid) => pid !== process.pid);
            callback(isOtherInstanceRunning);
        });
    }
}

function checkAndProcess() {
    isAppRunning((isRunning) => {
        if (isRunning) {
            log(`[CECS Helper] Process detected. Waiting for it to close...`);
            retries++;
            if (retries >= maxRetries) {
                log(`[CECS Helper] Timeout waiting for app to close.`);
                process.exit(1);
            }
            setTimeout(checkAndProcess, 1000);
        } else {
            log(`[CECS Helper] Application closed. Updating storage.json...`);
            try {
                if (fs.existsSync(storageJsonPath) && fs.existsSync(profilesFilePath)) {
                    const storageData = JSON.parse(fs.readFileSync(storageJsonPath, 'utf8'));
                    const newProfiles = JSON.parse(fs.readFileSync(profilesFilePath, 'utf8'));
                    storageData.userDataProfiles = newProfiles;
                    fs.writeFileSync(storageJsonPath, JSON.stringify(storageData, null, 2), 'utf8');
                    log(`[CECS Helper] Updated storage.json successfully`);
                } else {
                    log(`[CECS Helper] Storage file or profiles file not found.`);
                }
            } catch (err) {
                log(`[CECS Helper] Error: ${err.message}`);
            }

            try {
                if (fs.existsSync(profilesFilePath)) {
                    fs.unlinkSync(profilesFilePath);
                }
            } catch (err) {
                log(`[CECS Helper] Failed to delete profiles file: ${err.message}`);
            }

            log(`[CECS Helper] Starting relaunch sequence...`);
            try {
                if (process.platform === 'darwin' && appBundlePath) {
                    const child = spawn('open', ['-n', appBundlePath], {
                        detached: true,
                        stdio: 'ignore'
                    });
                    child.unref();
                    log(`[CECS Helper] Relaunched via open -n: ${appBundlePath}`);
                } else {
                    const env = Object.assign({}, process.env);
                    delete env.ELECTRON_RUN_AS_NODE;
                    const child = spawn(appExePath, [], {
                        detached: true,
                        stdio: 'ignore',
                        env: env
                    });
                    child.unref();
                    log(`[CECS Helper] Relaunched successfully: ${appExePath}`);
                }
            } catch (err) {
                log(`[CECS Helper] Relaunch failed: ${err.message}`);
            }

            log(`[CECS Helper] Done!`);
            process.exit(0);
        }
    });
}

// Initial wait before checking to allow the IDE to quit fully
setTimeout(checkAndProcess, 3000);
