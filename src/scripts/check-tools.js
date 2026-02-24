const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function test() {
    console.log("=== Node.js Tool Verification ===");
    try {
        const { stdout: pgVer } = await execAsync("pg_dump --version");
        console.log("pg_dump:", pgVer.trim());

        const { stdout: psqlVer } = await execAsync("psql --version");
        console.log("psql:", psqlVer.trim());

        const { stdout: sedVer } = await execAsync("sed --version");
        console.log("sed:", sedVer.trim());

        // Test the actual pipeline with a dummy string
        const testCmd = 'echo "tenant_template" | sed "s/tenant_template/success/g"';
        const { stdout: sedTest } = await execAsync(testCmd);
        console.log("sed test:", sedTest.trim());

        if (sedTest.trim() === "success") {
            console.log("✅ Pipeline tools are functional!");
        } else {
            console.error("❌ Pipeline test failed output:", sedTest);
        }

    } catch (e) {
        console.error("❌ Error during tool check:", e.message);
        if (e.stderr) console.error("Stderr:", e.stderr);
    }
}

test();
