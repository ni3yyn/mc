const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');
const dest = path.join(__dirname, '..', 'dist', 'fonts');

if (fs.existsSync(source)) {
  fs.ensureDirSync(dest);
  fs.copySync(source, dest, { overwrite: true });
  console.log('✅ Icon fonts copied to dist/fonts');
} else {
  console.error('❌ Font source not found:', source);
}