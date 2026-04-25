/* eslint-disable no-console */
// Backfill width/height for media docs that were uploaded before the upload
// handler started persisting dimensions.
//
// Run inside the backend container so the uploads/ filesystem is reachable:
//   docker compose -f docker-compose.prod.yml exec backend \
//     node scripts/backfill-media-dimensions.js
//
// Or for dev:
//   docker compose -f docker-compose.dev.yml exec backend \
//     node scripts/backfill-media-dimensions.js
//
// Honors MONGO_URI from the container env. Pass --dry to preview without writing.

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const DRY_RUN = process.argv.includes('--dry');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set — run this inside the backend container');
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('media');

  const filter = {
    type: 'image',
    mimeType: { $ne: 'image/svg+xml' },
    $or: [
      { width: { $exists: false } },
      { width: null },
      { width: 0 },
      { height: { $exists: false } },
      { height: null },
      { height: 0 },
    ],
  };

  const total = await col.countDocuments(filter);
  console.log(`Found ${total} media docs missing dimensions${DRY_RUN ? ' (dry run)' : ''}`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const cursor = col.find(filter);

  for await (const doc of cursor) {
    const rel = doc.path && doc.path.startsWith('/') ? doc.path.slice(1) : doc.path;
    if (!rel) {
      console.warn(`[skip] ${doc._id}: no path`);
      skipped++;
      continue;
    }
    const fullPath = path.resolve(process.cwd(), rel);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[skip] ${doc.path}: file not found at ${fullPath}`);
      skipped++;
      continue;
    }

    try {
      const meta = await sharp(fullPath).rotate().metadata();
      if (!meta.width || !meta.height) {
        console.warn(`[skip] ${doc.path}: sharp returned no dimensions`);
        skipped++;
        continue;
      }
      if (DRY_RUN) {
        console.log(`[dry] ${doc.path} -> ${meta.width}x${meta.height}`);
      } else {
        await col.updateOne(
          { _id: doc._id },
          { $set: { width: meta.width, height: meta.height } },
        );
        console.log(`[ok]  ${doc.path} -> ${meta.width}x${meta.height}`);
      }
      updated++;
    } catch (err) {
      console.error(`[fail] ${doc.path}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${updated} ${DRY_RUN ? 'would update' : 'updated'}, ${failed} failed, ${skipped} skipped.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
