const fs = require('fs');
const path = require('path');

const electronFiles = ['main.js', 'preload.js', 'autostart.js', 'updater.js'];
for (const f of electronFiles) {
  const p = path.join(__dirname, '..', 'electron', f);
  const bak = p + '.bak';
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, p);
    fs.unlinkSync(bak);
    console.log(`[Restore] Restored ${f}`);
  }
}
