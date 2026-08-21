Welcome to version 1.5.0. This major feature release brings full support for Binary G-Code (`.bgcode`), a customizable primary 3D preview selector, rich metadata & preview modals in Folder Mode, real-time upload progress with speed & ETA, Autodesk Fusion 360 (`.f3d`) file support, Markdown descriptions with live preview, default print materials, and light/dark theme fixes.

## New Features

- **Binary G-Code (`.bgcode`) Support**: Full native support for binary G-code files (`GCDE` header, Deflate/zlib block decompression). Slicer metadata (printer model, filament type, nozzle/bed temperatures, layer height, infill %, print time) and embedded PNG thumbnails are automatically extracted.
- **Custom Primary 3D Preview Selector**: When a model contains multiple STL or 3MF files, you can now designate which file is used as the primary 3D preview and thumbnail with the `★ Set as Preview` action in the model detail view.
- **Rich Folder Mode Metadata & Previews**: File cards in Folder Mode now display essential slicer metadata chips (print time, filament, nozzle temp). Clicking any file opens a rich preview modal with 3D/G-code toolpath inspection, slicer specifications, and quick download/print actions.
- **Real-Time Upload Progress, Speed & ETA**: File uploads now show an interactive progress bar displaying transferred size, percentage, upload speed in MB/s, and estimated time remaining (ETA).
- **Direct Library Storage for Model Files**: Uploaded files associated with a model are now stored directly inside the model's subfolder within the mounted `/library` path, keeping your disk storage organized and eliminating lingering upload caches.
- **Autodesk Fusion 360 (`.f3d`) & STEP (`.stp`) Support**: You can now store, organize, filter, and download `.f3d` CAD files and `.stp` models directly in GyroidVault alongside your STLs and 3MFs.
- **Markdown Support in Model Descriptions**: Model descriptions now support full GitHub-flavored Markdown (headings, bold/italic, lists, blockquotes, code blocks, links, images). Includes interactive **Write** and **Preview** tabs when creating or editing models.
- **Default Material Setting for Print Logging**: Configure your preferred default material (e.g., PLA) under **Settings -> Materials**. New print logs will automatically pre-select your preferred material.

## Bug Fixes & Improvements

- **Persistent Default Categories**: Fixed an issue where container restarts or reloads would re-add previously deleted default categories. Category seeding is now protected by a persistent `seeded_defaults` system flag.
- **Light / Dark Mode Toggle Fix**: Added a complete light theme and fixed the top-right theme toggle so users can easily switch between Dark/Glass and Light mode with immediate visual icon updates.
