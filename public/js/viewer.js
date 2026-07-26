/* ─── 3D STL Viewer ───────────────────────────────────────────────────── */
const Viewer = {
  activeViewers: [],

  cleanup() {
    for (const v of this.activeViewers) {
      if (v.animId) cancelAnimationFrame(v.animId);
      if (v.renderer) { v.renderer.dispose(); }
      if (v.controls) v.controls.dispose();
      if (v.resizeObserver) v.resizeObserver.disconnect();
    }
    this.activeViewers = [];
  },

  create(containerId, fileUrl, fileType = null) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return;
    const is3MF = fileType === '3mf' || (!fileType && fileUrl.toLowerCase().includes('.3mf'));
    const isGcode = fileType === 'gcode' || (!fileType && fileUrl.toLowerCase().includes('.gcode'));
    console.log('[Viewer] Create:', { fileUrl, fileType, is3MF, isGcode });
    
    if (isGcode && typeof GCodePreview !== 'undefined') {
      container.style.position = 'relative';
      container.innerHTML = `
        <canvas style="width:100%;height:100%;display:block;"></canvas>
        <div class="gcode-controls-bar" style="position:absolute;bottom:12px;left:12px;right:12px;background:rgba(18,18,30,0.85);backdrop-filter:blur(8px);border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:flex;align-items:center;gap:12px;color:var(--text-primary);z-index:10;font-size:0.85rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
          <span id="gcode-layer-label" style="font-weight:600;white-space:nowrap;min-width:110px;">Loading G-Code...</span>
          <input type="range" id="gcode-layer-slider" min="1" max="1" value="1" disabled style="flex:1;cursor:pointer;accent-color:var(--accent-cyan);">
          <span id="gcode-z-label" style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;">Z: -- mm</span>
        </div>
      `;
      const canvas = container.querySelector('canvas');
      const preview = GCodePreview.init({
        canvas: canvas,
        topLayerColor: new THREE.Color(0x00d4ff).getHex(),
        lastSegmentColor: new THREE.Color(0xffffff).getHex(),
        buildVolume: {x: 250, y: 250, z: 250},
        initialCameraPosition: [0, 400, 450],
        backgroundColor: 0x161625
      });
      
      const viewer = { preview, isGcode: true, animId: null, renderer: { dispose: () => preview.dispose && preview.dispose() } };
      this.activeViewers.push(viewer);
      
      const layerLabel = container.querySelector('#gcode-layer-label');
      const layerSlider = container.querySelector('#gcode-layer-slider');
      const zLabel = container.querySelector('#gcode-z-label');

      // Load G-Code via fetch and process chunks
      fetch(fileUrl)
        .then(response => {
          if (!response.body) throw new Error('ReadableStream not supported.');
          return preview._readFromStream(response.body);
        })
        .then(() => {
          console.log('G-Code loaded');
          const layers = preview.layers || [];
          const totalLayers = layers.length || 1;
          
          if (totalLayers > 1) {
            layerSlider.max = totalLayers;
            layerSlider.value = totalLayers;
            layerSlider.disabled = false;
            
            const updateLayerUI = () => {
              const val = parseInt(layerSlider.value, 10);
              preview.endLayer = val;
              preview.render();
              
              const currentLayer = layers[val - 1];
              let currentZ = 0;
              if (currentLayer) {
                if (currentLayer.commands) {
                  const cmdWithZ = currentLayer.commands.find(c => c.params && c.params.z !== undefined);
                  if (cmdWithZ) currentZ = cmdWithZ.params.z;
                }
                if (currentZ === 0 && currentLayer.height) currentZ = currentLayer.height;
              }
              if (!currentZ && preview.parser && preview.parser.curZ) currentZ = preview.parser.curZ;

              layerLabel.innerText = `Layer ${val} / ${totalLayers}`;
              zLabel.innerText = currentZ ? `Z: ${(Number(currentZ)).toFixed(2)} mm` : '';
            };

            layerSlider.oninput = updateLayerUI;
            updateLayerUI();
          } else {
            layerLabel.innerText = 'G-Code Preview';
            zLabel.innerText = '';
          }
        })
        .catch(err => {
          console.error('GCode load error:', err);
          container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:.85rem;flex-direction:column;gap:8px">
            <span style="font-size:1.5rem">⚠️</span>
            <span>Could not load 3D G-Code preview</span>
          </div>`;
        });
        
      return viewer;
    }

    if (typeof fflate !== 'undefined') { 
      window.fflate = fflate; 
      THREE.fflate = fflate; 
    }
    const loaderClass = is3MF ? (THREE.ThreeMFLoader || THREE['3MFLoader'] || THREE.MFLoader) : (THREE.STLLoader);
    console.log('[Viewer] Using loader:', loaderClass?.name || 'Unknown');
    if (!loaderClass) return;
    const loader = new loaderClass();

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161625);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Lighting
    scene.add(new THREE.AmbientLight(0x606080, 0.6));

    const light1 = new THREE.DirectionalLight(0x00d4ff, 0.7);
    light1.position.set(1, 2, 1);
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0x8b5cf6, 0.5);
    light2.position.set(-2, -1, -1);
    scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 0.4);
    light3.position.set(0, -1, 2);
    scene.add(light3);

    // Grid
    const grid = new THREE.GridHelper(200, 30, 0x252545, 0x1a1a35);
    scene.add(grid);

    // Load STL
    loader.load(
      fileUrl,
      (object) => {
        let targetObject = null;
        if (is3MF) {
          const box = new THREE.Box3().setFromObject(object);
          const size = new THREE.Vector3();
          box.getSize(size);
          
          // Bambu Studio 3MF format doesn't contain standard 3D geometries, resulting in an empty bounding box
          if (box.isEmpty() || (size.x === 0 && size.y === 0 && size.z === 0)) {
            const fallbackUrl = container.dataset.fallbackThumbnail;
            if (fallbackUrl) {
              container.innerHTML = `<img src="${fallbackUrl}" style="width:100%;height:100%;object-fit:contain;padding:20px;box-sizing:border-box;">`;
            } else {
              container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">Preview not supported for this 3MF file format</div>';
            }
            if (container.nextElementSibling) {
              container.nextElementSibling.style.visibility = 'hidden';
            }
            return;
          }

          const center = new THREE.Vector3();
          box.getCenter(center);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 60 / maxDim;
          object.scale.set(scale, scale, scale);
          
          // Center and sit on floor
          object.position.x = -center.x * scale;
          object.position.y = (-center.y * scale) + (size.y * scale) / 2;
          object.position.z = -center.z * scale;
          
          targetObject = object;
          if (typeof viewer !== 'undefined') viewer.targetObject = targetObject;
          scene.add(object);
        } else {
          const geometry = object;
          if (!geometry.attributes.normal || geometry.attributes.normal.count === 0) geometry.computeVertexNormals();
          
          // Use built-in centering for STL geometry
          geometry.center();
          
          const material = new THREE.MeshPhongMaterial({
            color: 0x00ccee,
            specular: 0x333355,
            shininess: 35,
            flatShading: false,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // Get size after centering
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          const size = new THREE.Vector3();
          box.getSize(size);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 60 / maxDim;
          mesh.scale.set(scale, scale, scale);

          // STL is often Z-up, rotate to Y-up
          mesh.rotation.x = -Math.PI / 2;
          
          // After rotation: 
          // geometry Y (width) -> world Y? No, rotation is around X.
          // geometry Z (height) -> world Y.
          mesh.position.y = (size.z * scale) / 2;
          targetObject = mesh;
          if (typeof viewer !== 'undefined') viewer.targetObject = targetObject;
          scene.add(mesh);
        }

        // Auto-frame: look at the center of the scaled object
        const box = new THREE.Box3().setFromObject(targetObject);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Position camera relative to the object's size
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.2; // Add some padding

        camera.position.set(cameraZ * 0.6, cameraZ * 0.5, cameraZ);
        controls.target.copy(center);
        controls.update();
      },
      undefined,
      (error) => {
        console.error('STL load error:', error);
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:.85rem;flex-direction:column;gap:8px">
          <span style="font-size:1.5rem">⚠️</span>
          <span>Could not load 3D preview</span>
        </div>`;
        if (container.nextElementSibling) {
          container.nextElementSibling.style.visibility = 'hidden';
        }
      }
    );

    // Animation loop
    const viewer = { renderer, controls, animId: null, resizeObserver: null };
    window.addEventListener('error', (e) => {
      const msg = e.message || (e.error && e.error.message);
      if (msg && (msg.includes('signalUnknownCredential') || msg.includes('webauthnInterceptor'))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
      }
    }, true);
    const animate = () => {
      viewer.animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);
    viewer.resizeObserver = resizeObserver;

    this.activeViewers.push(viewer);
    return { ...viewer, scene, camera };
  },

  async takeSnapshot(modelId, renderer, scene, camera) {
    if (!renderer || !scene || !camera) return;
    
    // Render one frame with specific settings for thumbnail
    renderer.render(scene, camera);
    
    return new Promise((resolve) => {
      renderer.domElement.toBlob(async (blob) => {
        if (!blob) return resolve(null);
        const file = new File([blob], `thumb_${modelId}.png`, { type: 'image/png' });
        try {
          const res = await API.uploadThumbnail(modelId, file);
          resolve(res);
        } catch(e) {
          console.error('Snapshot upload failed:', e);
          resolve(null);
        }
      }, 'image/png');
    });
  },

  // Auto-generate thumbnails for dashboard cards
  toggleWireframe() {
    for (const v of this.activeViewers) {
      if (v.targetObject) {
        v.targetObject.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.wireframe = !child.material.wireframe;
            child.material.needsUpdate = true;
          }
        });
      }
    }
  },

  toggleXRay() {
    for (const v of this.activeViewers) {
      if (v.targetObject) {
        v.targetObject.traverse((child) => {
          if (child.isMesh && child.material) {
            const isXray = child.material.opacity < 1;
            if (isXray) {
              child.material.opacity = 1.0;
              child.material.transparent = false;
              child.material.depthWrite = true;
            } else {
              child.material.opacity = 0.3;
              child.material.transparent = true;
              child.material.depthWrite = false;
            }
            child.material.needsUpdate = true;
          }
        });
      }
    }
  },

  async generateThumbnails() {
    if (typeof THREE === 'undefined' || !THREE.STLLoader) return;
    const targets = document.querySelectorAll('.stl-thumb-target');
    if (targets.length === 0) return;

    // Create a single off-screen renderer
    const width = 300;
    const height = 200;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161625);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    
    // Lighting
    scene.add(new THREE.AmbientLight(0x606080, 0.6));
    const light1 = new THREE.DirectionalLight(0x00d4ff, 0.7); light1.position.set(1, 2, 1); scene.add(light1);
    const light2 = new THREE.DirectionalLight(0x8b5cf6, 0.5); light2.position.set(-2, -1, -1); scene.add(light2);
    const light3 = new THREE.DirectionalLight(0xffffff, 0.4); light3.position.set(0, -1, 2); scene.add(light3);
    const grid = new THREE.GridHelper(200, 30, 0x252545, 0x1a1a35);
    scene.add(grid);

    if (typeof fflate !== 'undefined') { window.fflate = fflate; THREE.fflate = fflate; }

    for (const target of targets) {
      target.classList.remove('stl-thumb-target'); 
      const url = target.dataset.stlUrl;
      if (!url) continue;

      try {
        if (typeof fflate !== 'undefined') { window.fflate = fflate; THREE.fflate = fflate; }
        const is3MF = url.toLowerCase().includes('.3mf');
        const loaderClass = is3MF ? (THREE.ThreeMFLoader || THREE['3MFLoader'] || THREE.MFLoader) : THREE.STLLoader;
        if (!loaderClass) continue;
        const loader = new loaderClass();
        const object = await new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
        
        // Remove previous objects
        while(scene.children.length > 0){ 
          const child = scene.children[0];
          if (child.type === 'Mesh' || child.type === 'Group') {
            scene.remove(child);
          } else {
            break; // Keep lights/grid
          }
        }
        // Re-add lights and grid if they were at the end, but better to just filter
        scene.children.filter(c => c.type === 'Mesh' || c.type === 'Group').forEach(c => scene.remove(c));

        let maxDim = 0;
        let modelCenterY = 0;

        if (is3MF) {
          const box = new THREE.Box3().setFromObject(object);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 60 / maxDim;
          object.scale.set(scale, scale, scale);
          
          object.position.x = -center.x * scale;
          object.position.y = (-center.y * scale) + (size.y * scale) / 2;
          object.position.z = -center.z * scale;
          
          modelCenterY = (size.y * scale) / 2;
          scene.add(object);
        } else {
          const geometry = object;
          if (!geometry.attributes.normal || geometry.attributes.normal.count === 0) geometry.computeVertexNormals();
          geometry.center();
          
          const material = new THREE.MeshPhongMaterial({ color: 0x00ccee, specular: 0x333355, shininess: 35 });
          const mesh = new THREE.Mesh(geometry, material);
          
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          const size = new THREE.Vector3();
          box.getSize(size);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 60 / maxDim;
          mesh.scale.set(scale, scale, scale);
          
          mesh.rotation.x = -Math.PI / 2;
          modelCenterY = (size.z * scale) / 2;
          mesh.position.y = modelCenterY;
          scene.add(mesh);
        }
        
        // Position camera consistently for normalized object size (60)
        camera.position.set(50, 45 + modelCenterY, 65);
        camera.lookAt(0, modelCenterY, 0);
        
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        
        target.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.3s" onload="this.style.opacity=1">`;
        target.style.background = 'transparent';

        const modelId = target.closest('[data-model-id]')?.dataset.modelId;
        if (modelId) {
          fetch(dataUrl).then(res => res.blob()).then(blob => {
            const file = new File([blob], `thumb_${modelId}.png`, { type: 'image/png' });
            API.uploadThumbnail(modelId, file).catch(() => {});
          });
        }
      } catch (e) {
        console.error('Failed to generate thumb for', url, e);
      }
    }
    
    renderer.dispose();
    renderer.forceContextLoss();
  }
};

