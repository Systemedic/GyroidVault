const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decompressBuffer(buf, compressionType) {
  if (compressionType === 0) return buf;
  if (compressionType === 1) {
    try {
      return zlib.inflateSync(buf);
    } catch (e) {
      try {
        return zlib.inflateRawSync(buf);
      } catch (e2) {
        return null;
      }
    }
  }
  return null;
}

function parseBgcodeMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    // Read up to 512KB for headers, metadata and thumbnails
    const readSize = Math.min(524288, stats.size);
    const buffer = Buffer.alloc(readSize);
    fs.readSync(fd, buffer, 0, readSize, 0);
    fs.closeSync(fd);

    let metadataText = '';

    // Check BGCODE magic "GCDE"
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'GCDE') {
      let offset = 4;
      const version = buffer.readUInt16LE(offset); offset += 2;
      const checksumType = buffer.readUInt16LE(offset); offset += 2;
      const checksumLen = checksumType === 0 ? 0 : 4;

      while (offset + 12 <= buffer.length) {
        const blockType = buffer.readUInt16LE(offset); offset += 2;
        const compressionType = buffer.readUInt16LE(offset); offset += 2;
        const uncompressedSize = buffer.readUInt32LE(offset); offset += 4;
        const compressedSize = buffer.readUInt32LE(offset); offset += 4;

        if (offset + compressedSize > buffer.length) break;

        const blockData = buffer.subarray(offset, offset + compressedSize);
        offset += compressedSize + checksumLen;

        // Block Type 0 (File metadata) or 1 (Print parameters) or 2 (Slicer metadata)
        if (blockType === 0 || blockType === 1 || blockType === 2) {
          const decompressed = decompressBuffer(blockData, compressionType);
          if (decompressed) {
            metadataText += '\n' + decompressed.toString('utf8');
          }
        }
      }
    }

    // Fallback if binary block decompress didn't get text: scan buffer strings
    if (!metadataText.trim()) {
      metadataText = buffer.toString('binary');
    }

    return extractMetadataFromText(metadataText, filePath);
  } catch (err) {
    console.error('Failed to parse BGCODE metadata:', err);
    return null;
  }
}

function extractBgcodeThumbnail(filePath, outputDir) {
  try {
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    const readSize = Math.min(2 * 1024 * 1024, stats.size);
    const buffer = Buffer.alloc(readSize);
    fs.readSync(fd, buffer, 0, readSize, 0);
    fs.closeSync(fd);

    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'GCDE') {
      let offset = 4;
      const version = buffer.readUInt16LE(offset); offset += 2;
      const checksumType = buffer.readUInt16LE(offset); offset += 2;
      const checksumLen = checksumType === 0 ? 0 : 4;

      while (offset + 12 <= buffer.length) {
        const blockType = buffer.readUInt16LE(offset); offset += 2;
        const compressionType = buffer.readUInt16LE(offset); offset += 2;
        const uncompressedSize = buffer.readUInt32LE(offset); offset += 4;
        const compressedSize = buffer.readUInt32LE(offset); offset += 4;

        if (offset + compressedSize > buffer.length) break;

        const blockData = buffer.subarray(offset, offset + compressedSize);
        offset += compressedSize + checksumLen;

        // Block Type 3 is Thumbnail
        if (blockType === 3) {
          const decompressed = decompressBuffer(blockData, compressionType) || blockData;
          // PNG magic: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
          const pngIdx = decompressed.indexOf(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
          if (pngIdx !== -1) {
            const pngData = decompressed.subarray(pngIdx);
            const filename = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
            const outputPath = path.join(outputDir, filename);
            fs.writeFileSync(outputPath, pngData);
            return filename;
          }
        }
      }
    }

    // Fallback: direct PNG header scan in buffer
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const pngIdx = buffer.indexOf(pngHeader);
    if (pngIdx !== -1) {
      // Find IEND marker (0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82)
      const iendMarker = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
      const iendIdx = buffer.indexOf(iendMarker, pngIdx);
      const endOffset = iendIdx !== -1 ? iendIdx + 8 : buffer.length;
      const pngData = buffer.subarray(pngIdx, endOffset);
      const filename = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, pngData);
      return filename;
    }

    return null;
  } catch (err) {
    console.error('Failed to extract BGCODE thumbnail:', err);
    return null;
  }
}

function extractMetadataFromText(content, filePath) {
  const metadata = {};

  const patterns = {
    layerHeight: [
      /;\s*layer_height\s*=\s*([\d.]+)/i, 
      /layer_height\s*=\s*([\d.]+)/i,
      /;\s*Layer height:\s*([\d.]+)/i, 
      /;\s*SETTING_3.*layer_height\\n([\d.]+)/,
      /G1.*Z([\d.]+).*Layer height/i,
      /;\s*HEIGHT:([\d.]+)/i
    ],
    infill: [
      /;\s*sparse_infill_density\s*=\s*([\d.]+)%/i,
      /sparse_infill_density\s*=\s*([\d.]+)%/i,
      /;\s*infill_percentage\s*=\s*([\d.]+)/i, 
      /;\s*Infill density:\s*([\d.]+)/i, 
      /;\s*SETTING_3.*infill_sparse_density\\n([\d.]+)/,
      /;\s*fill_density\s*=\s*([\d.]+)/i,
      /fill_density\s*=\s*([\d.]+)%?/i
    ],
    printTime: [
      /;\s*estimated printing time \(normal mode\)\s*=\s*([^\n\r]+)/i,
      /;\s*estimated_printing_time\s*=\s*([^\n\r]+)/i,
      /estimated_printing_time\s*=\s*([^\n\r]+)/i,
      /estimated_print_time\s*=\s*([^\n\r]+)/i,
      /;\s*estimated_print_time\s*=\s*([^\n\r]+)/i, 
      /;\s*TIME:(\d+)/i, 
      /;\s*print_time\s*:\s*(\d+)/i,
      /print_time\s*=\s*([^\n\r]+)/i,
      /;\s*total_time\s*:\s*([^\n\r]+)/i,
      /;\s*estimated_time\s*:\s*([^\n\r]+)/i
    ],
    filamentUsed: [
      /;\s*filament used \[m\]\s*=\s*([\d.]+)/i,
      /filament_used\s*=\s*([\d.]+)/i,
      /;\s*Filament used:\s*([\d.]+m)/i,
      /;\s*filament_used\s*=\s*([\d.]+)/i, 
      /;\s*filament used \[mm\]\s*=\s*([\d.]+)/i
    ],
    slicer: [
      /;\s*generated by ([\w\s.]+)/i, 
      /;\s*Slicer: ([\w\s.]+)/i, 
      /;\s*Slicer\s*:\s*([\w\s.]+)/i,
      /;\s*Klipper info: ([\w\s.]+)/i,
      /slicer_version\s*=\s*([^\r\n]+)/i
    ],
    filamentType: [
      /;\s*filament_type\s*=\s*([^\r\n]+)/i,
      /filament_type\s*=\s*([^\r\n]+)/i,
      /;\s*material_type\s*=\s*([^\r\n]+)/i,
      /material_type\s*=\s*([^\r\n]+)/i
    ],
    printerModel: [
      /;\s*printer_model\s*=\s*([^\n\r]+)/i,
      /printer_model\s*=\s*([^\n\r]+)/i,
      /;\s*machine_type\s*=\s*([^\n\r]+)/i,
      /machine_type\s*=\s*([^\n\r]+)/i
    ],
    weight: [
      /;\s*total filament used \[g\]\s*=\s*([\d.]+)/i,
      /total filament used \[g\]\s*=\s*([\d.]+)/i,
      /;\s*filament_weight\s*=\s*([\d.]+)/i,
      /filament_weight\s*=\s*([\d.]+)/i,
      /;\s*filament used \[g\]\s*=\s*([\d.]+)/i
    ],
    supports: [
      /;\s*support_material\s*=\s*([01])/i,
      /support_material\s*=\s*([01])/i
    ],
    tempNozzle: [
      /;\s*nozzle_temperature\s*=\s*([^\r\n]+)/i,
      /nozzle_temperature\s*=\s*([^\r\n]+)/i,
      /;\s*first_layer_temperature\s*=\s*([^\r\n]+)/i,
      /temperature\s*=\s*([^\r\n]+)/i,
      /;\s*temperature\s*=\s*([^\r\n]+)/i,
      /M104\s+S([1-9]\d{2,})/i
    ],
    tempBed: [
      /;\s*hot_plate_temp\s*=\s*([^\r\n]+)/i,
      /hot_plate_temp\s*=\s*([^\r\n]+)/i,
      /;\s*textured_plate_temp\s*=\s*([^\r\n]+)/i,
      /;\s*bed_temperature\s*=\s*([^\r\n]+)/i,
      /bed_temperature\s*=\s*([^\r\n]+)/i,
      /;\s*first_layer_bed_temperature\s*=\s*([^\r\n]+)/i,
      /M140\s+S([3-9]\d+)/i
    ],
    wallLoops: [
      /;\s*wall_loops\s*=\s*([\d]+)/i,
      /;\s*perimeters\s*=\s*([\d]+)/i,
      /;\s*wall_thickness\s*=\s*([\d.]+)/i
    ],
    topBottomLayers: [
      /;\s*top_solid_layers\s*=\s*([\d]+)/i,
      /;\s*bottom_solid_layers\s*=\s*([\d]+)/i,
      /;\s*top_layers\s*=\s*([\d]+)/i,
      /;\s*bottom_layers\s*=\s*([\d]+)/i
    ],
    infillPattern: [
      /;\s*sparse_infill_pattern\s*=\s*([^\r\n]+)/i,
      /fill_pattern\s*=\s*([^\r\n]+)/i,
      /;\s*fill_pattern\s*=\s*([^\r\n]+)/i,
      /;\s*infill_pattern\s*=\s*([^\r\n]+)/i
    ],
    filamentCost: [
      /;\s*filament_cost\s*=\s*([^\r\n]+)/i,
      /filament_cost\s*=\s*([^\r\n]+)/i,
      /;\s*cost\s*=\s*([\d.]+)/i
    ],
    maxVolumetricSpeed: [
      /;\s*filament_max_volumetric_speed\s*=\s*([^\r\n]+)/i
    ]
  };

  const getDominantValue = (str) => {
    if (!str) return null;
    const parts = str.split(/[;,]/).map(p => p.trim()).filter(p => p);
    if (parts.length <= 1) return str;
    
    const counts = {};
    parts.forEach(p => counts[p] = (counts[p] || 0) + 1);
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    if (sorted[0][1] > (sorted[1] ? sorted[1][1] : 0)) {
      return sorted[0][0];
    }
    return parts[0];
  };

  for (const [key, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const match = content.match(regex);
      if (match) {
        let val = match[1].trim();
        
        if (['filamentType', 'tempNozzle', 'tempBed', 'layerHeight', 'infill', 'infillPattern', 'maxVolumetricSpeed', 'filamentCost'].includes(key)) {
          val = getDominantValue(val);
        }
        
        metadata[key] = val;
        break;
      }
    }
  }

  // Format print time if it's in seconds (Cura / raw number)
  if (metadata.printTime && /^\d+$/.test(metadata.printTime)) {
    const totalSecs = parseInt(metadata.printTime);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    metadata.printTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return Object.keys(metadata).length ? metadata : null;
}

function parseGcodeMetadata(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check if BGCODE format
    const fdCheck = fs.openSync(filePath, 'r');
    const magicBuf = Buffer.alloc(4);
    fs.readSync(fdCheck, magicBuf, 0, 4, 0);
    fs.closeSync(fdCheck);

    if (ext === '.bgcode' || magicBuf.toString('ascii') === 'GCDE') {
      return parseBgcodeMetadata(filePath);
    }

    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    
    // Read first 32KB and last 128KB (metadata often at the end in PrusaSlicer/Bambu)
    const START_SIZE = 32768;
    const END_SIZE = 131072;
    
    const startBuffer = Buffer.alloc(Math.min(START_SIZE, stats.size));
    fs.readSync(fd, startBuffer, 0, startBuffer.length, 0);
    
    const endBuffer = Buffer.alloc(Math.min(END_SIZE, stats.size));
    fs.readSync(fd, endBuffer, 0, endBuffer.length, Math.max(0, stats.size - END_SIZE));
    fs.closeSync(fd);

    const content = startBuffer.toString() + "\n---END---\n" + endBuffer.toString();
    return extractMetadataFromText(content, filePath);
  } catch (e) {
    console.error('Error parsing G-code:', e);
    return null;
  }
}

function extractGcodeThumbnail(filePath, outputDir) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const fdCheck = fs.openSync(filePath, 'r');
    const magicBuf = Buffer.alloc(4);
    fs.readSync(fdCheck, magicBuf, 0, 4, 0);
    fs.closeSync(fdCheck);

    if (ext === '.bgcode' || magicBuf.toString('ascii') === 'GCDE') {
      return extractBgcodeThumbnail(filePath, outputDir);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const thumbRegex = /;\s*thumbnail\s+begin\s+(\d+)x(\d+)\s+(\d+)\s*([\s\S]+?);\s*thumbnail\s+end/i;
    const match = content.match(thumbRegex);
    if (!match) return null;

    const base64Data = match[4].replace(/;\s*/g, '').trim();
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
    return filename;
  } catch (e) {
    console.error('Failed to extract G-code thumbnail:', e);
    return null;
  }
}

module.exports = { parseGcodeMetadata, extractGcodeThumbnail, parseBgcodeMetadata, extractBgcodeThumbnail };
