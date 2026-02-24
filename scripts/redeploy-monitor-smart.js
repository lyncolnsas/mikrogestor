
const fs = require("fs");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("📦 Smart Monitor Deployment...");

    // 1. Find the GOOD server (Active keys)
    const servers = await prisma.vpnServer.findMany();
    // Prefer one with keys
    const validServer = servers.find(s => s.publicKey && s.publicKey.length > 10) || servers[0];

    if (!validServer) {
        console.error("❌ No VPN Server found in DB.");
        process.exit(1);
    }

    console.log(`✅ Target Server: ${validServer.name} (${validServer.id})`);

    // 2. Kill old monitor (simple pkill pattern)
    try {
        // We can't easily kill by PID without tracking, but we can kill by name if we used a specific script name
        // For now, let's just overwrite the script. The old process might still run, but we will start a new one.
        // In a real env, we should use a proper service manager (s6, supervisord).
        // Let's rely on the user restarting container mostly, OR allow multiple monitors (safe enough if they just report stats).
    } catch { }

    // 3. Write Script
    const scriptContent = `#!/bin/bash
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin

# Config
SYNC_URL="http://localhost:3000/api/saas/vpn-sync?serverId=${validServer.id}&secret=${validServer.secret}"
STATUS_URL="http://localhost:3000/api/saas/vpn-status"
SERVER_ID="${validServer.id}"
SECRET="${validServer.secret}"

echo "Starting VPN Monitor Loop for ${validServer.name}..."

while true; do
  # 1. REPORT STATS
  if command -v wg >/dev/null 2>&1; then
      STATS_JSON=$(wg show wg0 dump | tail -n +2 | awk '{
          printf "{\\"publicKey\\\":\\"%s\\",\\"handshake\\\":%s,\\\"rx\\\":%s,\\\"tx\\\":%s},", $1, $5, $6, $7
      }' | sed '$s/,$//')
      
      PAYLOAD="{\\"serverId\\":\\"$SERVER_ID\\",\\"secret\\":\\"$SECRET\\",\\"peers\\":[$\{STATS_JSON:-}]}"
      
      curl -s --connect-timeout 5 -X POST "$STATUS_URL" \
           -H "Content-Type: application/json" \
           -d "$PAYLOAD" > /dev/null
  fi
  sleep 30 
done
`;

    const targetPath = "/usr/local/bin/vpn-monitor.sh";
    fs.writeFileSync(targetPath, scriptContent);
    fs.chmodSync(targetPath, "755");

    console.log(`✅ Monitor script updated at ${targetPath}`);
    console.log("▶️  Spawning NEW background process...");

    const out = fs.openSync('/var/log/vpn-monitor.log', 'a');
    const err = fs.openSync('/var/log/vpn-monitor.log', 'a');

    const subprocess = spawn(targetPath, [], {
        detached: true,
        stdio: ['ignore', out, err]
    });

    subprocess.unref();

    console.log(`🚀 Monitor started! PID: ${subprocess.pid}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
