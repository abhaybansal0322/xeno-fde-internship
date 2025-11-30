const ngrok = require('ngrok');
const axios = require('axios');
const { exec } = require('child_process');
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

async function getRunningTunnels() {
    try {
        const response = await axios.get(NGROK_API);
        return response.data.tunnels;
    } catch (e) {
        return null; // ngrok likely not running
    }
}

async function killNgrokProcess() {
    return new Promise((resolve) => {
        const command = process.platform === 'win32' ? 'taskkill /F /IM ngrok.exe' : 'pkill ngrok';
        exec(command, () => {
            resolve();
        });
    });
}

(async function () {
    const token = process.env.NGROK_AUTHTOKEN;

    if (!token) {
        console.warn('⚠️  NGROK_AUTHTOKEN not found in .env. Starting without authtoken (session will expire)...');
    }

    try {
        // 1. Check if ngrok is already running
        const tunnels = await getRunningTunnels();

        if (tunnels) {
            console.log('🔎 Ngrok is already running...');
            console.log('\nPress Ctrl+C to stop the tunnel');
            process.stdin.resume();

        } catch (error) {
            console.error('❌ Error starting ngrok:', error.message || error);
            // If it's the specific "already exists" error that slipped through
            if (JSON.stringify(error).includes('already exists')) {
                console.log('💡 Tip: Try manually killing ngrok in Task Manager or running "taskkill /F /IM ngrok.exe" in terminal.');
            }
            process.exit(1);
        }
    }) ();
