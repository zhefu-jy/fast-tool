const rcedit = require('rcedit').rcedit;
const fs = require('fs');

async function patchIcon() {
  try {
    console.log('Patching executable...');
    await rcedit('dist/fast-tool/fast-tool-win_x64.exe', {
      icon: 'appIcon.ico'
    });
    console.log('Icon successfully patched!');
  } catch (error) {
    console.error('Error patching icon:', error);
  }
}

patchIcon();
