const ngrok = require('ngrok');
require('dotenv').config();

(async function () {
    const port = process.env.PORT || 3001;
    const token = process.env.NGROK_AUTHTOKEN;

    if (!token) {
        console.warn('⚠️  NGROK_AUTHTOKEN not found in .env. Starting without authtoken (session will expire)...');
        console.warn('👉 Sign up at https://dashboard.ngrok.com/signup to get a free authtoken for longer sessions.');
    }

    try {
        // Forcefully kill any existing ngrok processes
        const { exec } = require('child_process');
        const killNgrok = () => new Promise((resolve) => {
            const command = process.platform === 'win32' ? 'taskkill /F /IM ngrok.exe' : 'pkill ngrok';
            exec(command, (err) => {
                // Ignore errors (e.g., process not found)
                resolve();
            });
        });

        await killNgrok();
        // Wait a moment for the process to release the port
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`🚀 Starting ngrok tunnel on port ${port}...`);

        const url = await ngrok.connect({
            proto: 'http',
            addr: port,
            authtoken: token,
            region: 'us' // defaults to us
        });

        console.log('\n✅ Tunnel established!');
        console.log(`🌍 Public URL: ${url}`);
        console.log(`\n📋 Webhook URL for Shopify: ${url}/webhooks/shopify/orders/create`);
        console.log('   (Replace "orders/create" with your desired topic)');

        console.log('\nPress Ctrl+C to stop the tunnel');

        // Keep alive
        process.stdin.resume();
    } catch (error) {
        console.error('❌ Error starting ngrok:', error);
        process.exit(1);
    }
})();
