
const fs = require("fs");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("📦 Internal Deployment: Fetching VPN Credentials...");

    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.error("❌ No VPN Server found in DB.");
        process.exit(1);
    }

    // We assume the API is available locally at localhost:3000 inside the container
    const scriptContent = `#!/bin/bash
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin

# Config
SYNC_URL="http://localhost:3000/api/saas/vpn-sync?serverId=${server.id}&secret=${server.secret}"
STATUS_URL="http://localhost:3000/api/saas/vpn-status"
SERVER_ID="${server.id}"
SECRET="${server.secret}"

echo "Starting VPN Monitor Loop..."

while true; do
  # 1. REPORT STATS
  if command -v wg >/dev/null 2>&1; then
      STATS_JSON=$(wg show wg0 dump | tail -n +2 | awk '{
          printf "{\\"publicKey\\":\\"%s\\",\\"handshake\\":%s,\\"rx\\":%s,\\"tx\\":%s},", $1, $5, $6, $7
      }' | sed '$s/,$//')
      
      # Only send if we have stats (or at least send empty array to heartbeat)
      PAYLOAD="{\\"serverId\\":\\"$SERVER_ID\\",\\"secret\\":\\"$SECRET\\",\\"peers\\":[$\{STATS_JSON:-}]}"
      
      curl -s --connect-timeout 5 -X POST "$STATUS_URL" \
           -H "Content-Type: application/json" \
           -d "$PAYLOAD" > /dev/null
  else
      echo "wg command not found"
  fi

  # 2. SYNC PEERS (Simple check)
  # This part ensures config is refreshed if API changes
  # For now, we skip complex sync to avoid disrupting manual edits, 
  # but in production this should be the full sync script.
  
  sleep 60
done
`;

    const targetPath = "/usr/local/bin/vpn-monitor.sh";
    fs.writeFileSync(targetPath, scriptContent);
    fs.chmodSync(targetPath, "755");

    console.log(`✅ Script written to ${targetPath}`);
    console.log("▶️  Spawning background process...");

    // Spawn detached process
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
