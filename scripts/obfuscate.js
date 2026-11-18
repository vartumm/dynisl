const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  numbersToExpressions: true,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayThreshold: 0.8,
  splitStrings: true,
  splitStringsChunkLength: 8,
  transformObjectKeys: true,
  unicodeEscapeSequence: true,
  selfDefending: true
};

function obfuscateFile(filePath) {
  console.log(`[Obfuscator] Hardening ${path.basename(filePath)}...`);
  const code = fs.readFileSync(filePath, 'utf8');
  const obfuscationResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
  fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf8');
}

function run() {
  console.log('[DynIsl] === Starting Code Protection & Obfuscation ===');

  // 1. Obfuscate frontend assets
  const distAssetsDir = path.join(__dirname, '..', 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const files = fs.readdirSync(distAssetsDir);
    for (const f of files) {
      if (f.endsWith('.js')) {
        obfuscateFile(path.join(distAssetsDir, f));
      }
    }
  }

  // 2. Obfuscate electron runtime files
  const electronFiles = ['main.js', 'preload.js', 'autostart.js', 'updater.js'];
  for (const f of electronFiles) {
    const p = path.join(__dirname, '..', 'electron', f);
    if (fs.existsSync(p)) {
      const bak = p + '.bak';
      if (!fs.existsSync(bak)) {
        fs.copyFileSync(p, bak);
      }
      obfuscateFile(p);
    }
  }

  console.log('[DynIsl] === Code Protection & Anti-Tamper Completed Successfully ===');
}

run();
