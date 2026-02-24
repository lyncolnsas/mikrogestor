const os = require('os');
const { execSync } = require('child_process');

async function reportStats() {
    console.log("📊 Starting System Stats Collection...");
    const serverId = process.env.VPN_SERVER_ID;
    const secret = process.env.VPN_SERVER_SECRET;

    // Auto-detect IP to reach the app on its bound interface (usually not 127.0.0.1 in Docker alpine)
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';

    // Prioritize 172.* (Docker bridge) or 192.* or others over 127.0.0.1 or 10.255.* (VPN)
    const candidates = [];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                // Ignore the VPN network itself (usually 10.255.*)
                if (!net.address.startsWith('10.255.')) {
                    candidates.push(net.address);
                }
            }
        }
    }
    if (candidates.length > 0) localIp = candidates[0];

    const apiUrl = `http://${localIp}:3000/api/saas/vpn-status`;
    console.log(`🔗 Targeting API at: ${apiUrl}`);

    if (!serverId || !secret) {
        console.warn("⚠️ VPN_SERVER_ID or VPN_SERVER_SECRET not set. Skipping stats report.");
        return;
    }

    try {
        // 1. Collect Stats
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // Disk stats via df (Alpine/Linux)
        let diskTotal = 0, diskUsed = 0;
        try {
            const dfOutput = execSync('df -B1 /').toString().split('\n')[1].split(/\s+/);
            diskTotal = parseInt(dfOutput[1]);
            diskUsed = parseInt(dfOutput[2]);
        } catch (e) {
            console.error("Failed to get disk stats:", e.message);
        }

        // 2. Collect WireGuard Peers
        let peers = [];
        try {
            // wg show <interface> dump
            // Format: public-key preshared-key endpoint allowed-ips latest-handshake transfer-rx transfer-tx persistent-keepalive
            const wgOutput = execSync('wg show wg0 dump').toString().trim();
            if (wgOutput) {
                const lines = wgOutput.split('\n');
                // Skip first line (server private key/config)
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split('\t');
                    if (parts.length >= 7) {
                        peers.push({
                            publicKey: parts[0],
                            handshake: parseInt(parts[4]) || 0,
                            rx: parts[5],
                            tx: parts[6]
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("⚠️ Could not collect WireGuard peers (is wg0 up?):", e.message);
        }

        console.log(`📡 Reporting ${peers.length} peers:`, JSON.stringify(peers, null, 2));

        const payload = {
            serverId,
            secret,
            peers, // Required by API
            system: {
                cpu: parseFloat(cpuUsage.toFixed(2)),
                memory: {
                    used: usedMem,
                    total: totalMem
                },
                disk: {
                    used: diskUsed,
                    total: diskTotal
                }
            }
        };

        // 3. Send to API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`✅ Stats reported successfully for ${serverId}`);
        } else {
            const errorText = await response.text();
            console.error(`❌ Failed to report stats. Status: ${response.status}. Response: ${errorText}`);
        }
    } catch (err) {
        console.error("💥 Error during stats reporting:", err.message);
    }
}

// Check if API is likely up
reportStats();
