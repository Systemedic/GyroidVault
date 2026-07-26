# GyroidVault v1.4.1 Release Notes

GyroidVault v1.4.1 introduces interactive 3D G-code layer slicing inspection, dynamic build plate scaling, IP rate-limit management for administrators, duplicate file scanning, and dedicated Security and Maintenance settings panels.

---

## What's New in v1.4.1

### Interactive 3D G-Code Layer Previewer
- Added a full 3D G-code layer inspector powered by WebGL.
- Includes a layer range slider with real-time layer numbers (`Layer X / Y`) and live Z-height readouts (in mm).
- Automatic camera auto-framing and bounding-box centering ensure 3D G-code models are positioned cleanly in the viewport regardless of slicer offsets.

### Dynamic Build Volume Grid & Filament Colors
- The 3D G-code grid dynamically scales to match your printer's build volume based on metadata (Bambu Lab 256x256, Prusa 250x210, Creality Ender 220x220, Voron 300x300).
- Highlight colors adapt automatically to parsed filament colors and materials.

### Security & IP Auto-Block Management
- Dedicated **Security & Access** panel in Admin Settings.
- Modern iOS-style toggle switches for Open Registration and Private Instance Mode.
- Live **IP Auto-Block Table**: View IP addresses flagged for failed login attempts with a 1-click **Unblock** button.

### Duplicate File Finder
- Dedicated **Maintenance & Duplicates** panel in Admin Settings.
- Scans your entire 3D library using SHA-256 file hashes to detect duplicate STL, 3MF, and G-code files across folders and models.

### Global Search Shortcut (`Ctrl + K` / `Cmd + K`)
- Pressing `Ctrl + K` (or `Cmd + K` on macOS) from any page immediately focuses the global search bar.

### User Interface & Usability Improvements
- The **Send to Printer** button now only renders when at least one printer is configured in settings.
- Added direct **Preview G-Code** action buttons in G-code profile cards and file lists.

### Bug Fixes
- **Terabyte Formatting**: Extended file size formatting scale to TB and PB, resolving `"1.1 undefined"` library size formatting issues for large collections.
- **Deletion Security Guards**: Added strict authentication and role-based guards on model and file deletion API endpoints.

---

## Upgrade Instructions

### Unraid (Community Apps)
Update the container repository tag to `ghcr.io/teecodedev/gyroidvault:v1.4.1` or `:latest` and click **Apply**.

### Docker Compose
```yaml
image: ghcr.io/teecodedev/gyroidvault:v1.4.1
```
Run `docker compose pull && docker compose up -d`.
