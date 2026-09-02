const os = require("os");
const { spawn } = require("child_process");

function getPhysicalWifiIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = null;

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("vmware") ||
      lowerName.includes("virtual") ||
      lowerName.includes("vbox") ||
      lowerName.includes("wsl") ||
      lowerName.includes("vethernet") ||
      lowerName.includes("loopback")
    ) {
      continue;
    }

    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        if (
          lowerName.includes("wi-fi") ||
          lowerName.includes("wifi") ||
          lowerName.includes("wireless") ||
          lowerName.includes("ethernet")
        ) {
          return net.address;
        }
        fallbackIp = net.address;
      }
    }
  }

  return fallbackIp;
}

const physicalIp = getPhysicalWifiIp();
console.log("==========================================");
if (physicalIp) {
  console.log(`🌐 Physical Network IP detected: ${physicalIp}`);
  console.log(`📱 Expo Go link: exp://${physicalIp}:8081`);
} else {
  console.log("⚠️ Could not detect physical network IP, using default host.");
}
console.log("==========================================");

const env = { ...process.env };
if (physicalIp) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = physicalIp;
  env.EXPO_DEVTOOLS_LISTEN_ADDRESS = physicalIp;
}

const child = spawn("npx expo start --host lan --port 8081", [], {
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
