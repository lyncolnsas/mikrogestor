

const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  serverExternalPackages: ["jimp", "sharp", "@whiskeysockets/baileys"],

};

export default nextConfig;
