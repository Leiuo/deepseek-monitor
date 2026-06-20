const fs = require('fs');
const path = require('path');

const sourceDir = __dirname;
const buildDir = path.resolve(__dirname, '..');

// ── ICO generation ──
function createIco() {
    console.log('🔄 Creating ICO...');

    const sizes = [
        { w: 16, file: 'icon-16.png' },
        { w: 32, file: 'icon-32.png' },
        { w: 48, file: 'icon-48.png' },
        { w: 256, file: 'icon-256.png' },
    ];

    // Read all PNG data
    const entries = sizes.map(s => ({
        ...s,
        data: fs.readFileSync(path.join(sourceDir, s.file)),
    }));

    const numEntries = entries.length;

    // ICO header: reserved(2) + type(2) + count(2) = 6 bytes
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);     // reserved
    header.writeUInt16LE(1, 2);     // type: 1 = icon
    header.writeUInt16LE(numEntries, 4); // count

    // Directory entries: 16 bytes each
    let offset = 6 + numEntries * 16;
    const dirEntries = entries.map((e) => {
        const dir = Buffer.alloc(16);
        dir.writeUInt8(e.w >= 256 ? 0 : e.w, 0); // width (0 = 256)
        dir.writeUInt8(e.w >= 256 ? 0 : e.w, 1); // height (0 = 256)
        dir.writeUInt8(0, 2);  // colors
        dir.writeUInt8(0, 3);  // reserved
        dir.writeUInt16LE(1, 4);  // planes
        dir.writeUInt16LE(32, 6); // bpp
        dir.writeUInt32LE(e.data.length, 8); // size
        dir.writeUInt32LE(offset, 12); // offset
        offset += e.data.length;
        return dir;
    });

    const icoBuffer = Buffer.concat([header, ...dirEntries, ...entries.map(e => e.data)]);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    console.log('  ✓ build/icon.ico');
}

// ── ICNS generation ──
function createIcns() {
    console.log('🔄 Creating ICNS...');

    const entries = [
        { type: 'ic07', file: 'icon-128.png' },
        { type: 'ic08', file: 'icon-256.png' },
        { type: 'ic09', file: 'icon-512.png' },
    ];

    const buffers = [];
    let totalSize = 8; // header

    for (const entry of entries) {
        const pngPath = path.join(sourceDir, entry.file);
        if (!fs.existsSync(pngPath)) {
            console.warn(`  ⚠ ${entry.file} not found, skipping`);
            continue;
        }
        const pngData = fs.readFileSync(pngPath);
        const entryHeader = Buffer.alloc(8);
        entryHeader.write(entry.type, 0, 4, 'ascii');
        entryHeader.writeUInt32BE(8 + pngData.length, 4);
        buffers.push(entryHeader);
        buffers.push(pngData);
        totalSize += 8 + pngData.length;
    }

    const header = Buffer.alloc(8);
    header.write('icns', 0, 4, 'ascii');
    header.writeUInt32BE(totalSize, 4);

    const icnsBuffer = Buffer.concat([header, ...buffers]);
    fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuffer);
    console.log('  ✓ build/icon.icns');
}

// ── Verify ──
function verify() {
    console.log('🔄 Verifying generated files...');
    const files = [
        { name: 'build/icon.png', minSize: 1000 },
        { name: 'build/icon.ico', minSize: 1000 },
        { name: 'build/icon.icns', minSize: 1000 },
        { name: 'resources/icon.png', minSize: 1000 },
        { name: 'resources/tray-icon.png', minSize: 100 },
    ];

    for (const f of files) {
        const fp = path.resolve(buildDir, '..', f.name);
        if (fs.existsSync(fp)) {
            const stat = fs.statSync(fp);
            const ok = stat.size >= f.minSize;
            console.log(`  ${ok ? '✓' : '⚠'} ${f.name} (${stat.size} bytes)`);
        } else {
            console.log(`  ✗ ${f.name} NOT FOUND`);
        }
    }
}

createIco();
createIcns();
verify();
console.log('✅ Done!');
