const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceDir = __dirname;
const buildDir = path.resolve(__dirname, '..');
const resourcesDir = path.resolve(__dirname, '..', '..', 'resources');

const SIZES = {
    'icon-16.png': 16,
    'icon-32.png': 32,
    'icon-48.png': 48,
    'icon-64.png': 64,
    'icon-128.png': 128,
    'icon-256.png': 256,
    'icon-512.png': 512,
};

async function convert() {
    console.log('🔄 Converting app icon...');

    // 1. Read the SVG
    const svgBuffer = fs.readFileSync(path.join(sourceDir, 'app-icon.svg'));

    // 2. Generate all sizes
    for (const [name, size] of Object.entries(SIZES)) {
        const outPath = path.join(sourceDir, name);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outPath);
        console.log(`  ✓ ${name} (${size}x${size})`);
    }

    // 3. Copy 512 as main icon
    fs.copyFileSync(
        path.join(sourceDir, 'icon-512.png'),
        path.join(buildDir, 'icon.png')
    );
    console.log('  ✓ build/icon.png');

    fs.copyFileSync(
        path.join(sourceDir, 'icon-512.png'),
        path.join(resourcesDir, 'icon.png')
    );
    console.log('  ✓ resources/icon.png');

    // 4. Convert tray icon
    console.log('🔄 Converting tray icon...');
    const traySvg = fs.readFileSync(path.join(sourceDir, 'tray-icon.svg'));

    // Generate tray at 16x16 (standard tray size)
    await sharp(traySvg)
        .resize(16, 16)
        .png()
        .toFile(path.join(sourceDir, 'tray-16.png'));
    console.log('  ✓ tray-16.png');

    // Also generate 22x22 and 24x24 for HiDPI trays
    await sharp(traySvg)
        .resize(22, 22)
        .png()
        .toFile(path.join(sourceDir, 'tray-22.png'));

    await sharp(traySvg)
        .resize(24, 24)
        .png()
        .toFile(path.join(sourceDir, 'tray-24.png'));

    // Copy to resources (use 24x24 as default, it scales well)
    fs.copyFileSync(
        path.join(sourceDir, 'tray-24.png'),
        path.join(resourcesDir, 'tray-icon.png')
    );
    console.log('  ✓ resources/tray-icon.png');

    console.log('✅ All icons generated!');
    console.log('');
    console.log('📁 Files to use:');
    console.log('  Main icon: build/icon.png (512x512)');
    console.log('  App icon:  resources/icon.png (512x512)');
    console.log('  Tray icon: resources/tray-icon.png (24x24)');
    console.log('');
    console.log('📦 For ICO: use a tool to combine 16/32/48/64/256 PNGs');
    console.log('📦 For ICNS: use iconutil on macOS or png2icns tool');
}

convert().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
