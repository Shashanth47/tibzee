// Standalone Circular Gallery using OGL (UMD build).
// Requires: <script src="https://unpkg.com/ogl/dist/ogl.umd.js"></script>
// This file should be included with: <script src="js.txt"></script>
// and a container element with id "comm-gallery" or a custom selector.

const { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } = window.ogl || {};

// Lightweight DOM fallback if OGL is unavailable
function initFallback({ selector = '#comm-gallery', items } = {}) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.classList.add('comm-fallback');
  container.innerHTML = '';
  const track = document.createElement('div');
  track.className = 'comm-fallback-track';
  container.appendChild(track);
  const getIconSvg = key => {
    switch (key) {
      case 'users':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3"/><path d="M4 20a8 8 0 0 1 16 0H4Z"/></svg>';
      case 'chat':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v12H8l-4 4V4Z"/></svg>';
      case 'pie':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v9h9A9 9 0 1 0 12 3Z" fill="white"/><path d="M13 2a9 9 0 0 1 9 9h-9V2Z" fill="white"/></svg>';
      case 'star':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.3 5.8 21l1.2-6.9L2 8.9l7-1L12 1l3 6.9 7 1-5 5.2L18.2 21Z"/></svg>';
      case 'clock':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="white" stroke-width="2"/><path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';
      case 'megaphone':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M3 10h9l6-3v10l-6-3H3v-4Z"/></svg>';
      case 'puzzle':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M9 3h4v3a2 2 0 1 0 0 4h3v4h-3a2 2 0 1 0 0 4v3H9v-3a2 2 0 1 0 0-4H6v-4h3a2 2 0 1 0 0-4V3Z"/></svg>';
      case 'cloud':
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M7 17a5 5 0 0 1 1-9 6 6 0 0 1 11 3h1a4 4 0 1 1 0 8H7Z"/></svg>';
      default:
        return '<svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/></svg>';
    }
  };
  items.forEach(({ title, description = '', iconKey = 'star', accentClass = 'accent-blue' }, i) => {
    const card = document.createElement('div');
    card.className = `comm-card ${accentClass}`;
    card.innerHTML = `
      <div class="comm-card-header">
        <div class="comm-card-icon" aria-hidden="true">${getIconSvg(iconKey)}</div>
        <div class="comm-card-title">${title}</div>
      </div>
      <div class="comm-card-desc">${description}</div>
    `;
    track.appendChild(card);
  });
  // Drag to scroll
  let isDown = false, startX = 0, scrollLeft = 0;
  track.addEventListener('mousedown', e => {
    isDown = true; startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; container.classList.add('dragging');
  });
  window.addEventListener('mouseup', () => { isDown = false; container.classList.remove('dragging'); });
  window.addEventListener('mousemove', e => {
    if (!isDown) return; e.preventDefault(); const x = e.pageX - track.offsetLeft; const walk = (x - startX) * 1.2; track.scrollLeft = scrollLeft - walk;
  });
  // Smooth wheel scroll
  container.addEventListener('wheel', e => {
    e.preventDefault(); track.scrollLeft += (e.deltaY || e.wheelDelta || e.detail) > 0 ? 120 : -120;
  }, { passive: false });
}

if (!window.ogl) {
  console.error('OGL library not found. Falling back to DOM-based gallery.');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

function createTextTexture(gl, text, font = 'bold 30px monospace', color = 'black') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }
  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font
  }) {
    this.extra = 0;
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }
  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: true
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          // Smooth antialiasing for edges
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }
  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }
  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }
  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }
  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane.program.uniforms.uViewportSizes) {
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  constructor(
    container,
    {
      items,
      bend,
      textColor = '#ffffff',
      borderRadius = 0,
      font = 'bold 30px Figtree',
      scrollSpeed = 2,
      scrollEase = 0.05
    } = {}
  ) {
    document.documentElement.classList.remove('no-js');
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }
  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  createScene() {
    this.scene = new Transform();
  }
  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  }
  createMedias(items, bend = 1, textColor, borderRadius, font) {
    const defaultItems = [
      { image: `https://picsum.photos/seed/1/800/600?grayscale`, text: 'Bridge' },
      { image: `https://picsum.photos/seed/2/800/600?grayscale`, text: 'Desk Setup' },
      { image: `https://picsum.photos/seed/3/800/600?grayscale`, text: 'Waterfall' },
      { image: `https://picsum.photos/seed/4/800/600?grayscale`, text: 'Strawberries' },
      { image: `https://picsum.photos/seed/5/800/600?grayscale`, text: 'Deep Diving' },
      { image: `https://picsum.photos/seed/16/800/600?grayscale`, text: 'Train Track' },
      { image: `https://picsum.photos/seed/17/800/600?grayscale`, text: 'Santorini' },
      { image: `https://picsum.photos/seed/8/800/600?grayscale`, text: 'Blurry Lights' },
      { image: `https://picsum.photos/seed/9/800/600?grayscale`, text: 'New York' },
      { image: `https://picsum.photos/seed/10/800/600?grayscale`, text: 'Good Boy' },
      { image: `https://picsum.photos/seed/21/800/600?grayscale`, text: 'Coastline' },
      { image: `https://picsum.photos/seed/12/800/600?grayscale`, text: 'Palm Trees' }
    ];
    const galleryItems = items && items.length ? items : defaultItems;
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font
      });
    });
  }
  onTouchDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
  }
  onTouchMove(e) {
    if (!this.isDown) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  }
  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }
  onWheel(e) {
    const delta = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }
  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }
  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }
  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) {
      this.medias.forEach(media => media.update(this.scroll, direction));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }
  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('mousewheel', this.boundOnWheel);
    window.addEventListener('wheel', this.boundOnWheel);
    window.addEventListener('mousedown', this.boundOnTouchDown);
    window.addEventListener('mousemove', this.boundOnTouchMove);
    window.addEventListener('mouseup', this.boundOnTouchUp);
    window.addEventListener('touchstart', this.boundOnTouchDown);
    window.addEventListener('touchmove', this.boundOnTouchMove);
    window.addEventListener('touchend', this.boundOnTouchUp);
  }
  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('mousewheel', this.boundOnWheel);
    window.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('mousedown', this.boundOnTouchDown);
    window.removeEventListener('mousemove', this.boundOnTouchMove);
    window.removeEventListener('mouseup', this.boundOnTouchUp);
    window.removeEventListener('touchstart', this.boundOnTouchDown);
    window.removeEventListener('touchmove', this.boundOnTouchMove);
    window.removeEventListener('touchend', this.boundOnTouchUp);
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
  }
}

// Initialization helper for non-React usage
function initCircularGallery({ selector = '#comm-gallery', items, bend = 3, textColor = '#ffffff', borderRadius = 0.05, font = 'bold 30px Figtree', scrollSpeed = 2, scrollEase = 0.05 } = {}) {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn('Circular gallery container not found for selector:', selector);
    return null;
  }
  const app = new App(container, { items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase });
  return app;
}

// Auto-init on DOM ready with the requested three feature cards
document.addEventListener('DOMContentLoaded', () => {
  const featureItems = [
    {
      title: 'Parent Communication Hub',
      description: "Keep parents in the loop with real-time updates on their child's progress, achievements, and daily activities.",
      iconKey: 'users',
      accentClass: 'accent-blue'
    },
    {
      title: 'Personal Messages',
      description: "Send personalized messages directly to parents about their child's specific needs, milestones, or concerns.",
      iconKey: 'chat',
      accentClass: 'accent-purple'
    },
    {
      title: 'Classroom Broadcast',
      description: 'Share announcements, reminders, and updates with all parents at once. Perfect for field trips, events, and important notices.',
      iconKey: 'megaphone',
      accentClass: 'accent-green'
    },
    {
      title: 'Smart Attendance',
      description: 'Track attendance with a tap. Parents get instant notifications when their child arrives or leaves school.',
      iconKey: 'clock',
      accentClass: 'accent-pink'
    },
    {
      title: 'Star Rewards',
      description: 'Motivate students with digital stars for achievements, good behavior, and learning milestones. Parents see every celebration!',
      iconKey: 'star',
      accentClass: 'accent-yellow'
    },
    {
      title: 'Enhanced Learning',
      description: 'Combine games with communication tools to create a complete learning ecosystem that engages students and involves parents.',
      iconKey: 'puzzle',
      accentClass: 'accent-teal'
    },
    {
      title: 'Easy-Peasy Builder',
      description: "Just drag, drop, and you're done!",
      iconKey: 'puzzle',
      accentClass: 'accent-yellow'
    },
    {
      title: 'Smarty Reports',
      description: "Our AI shows you what your little learners love and where they're growing with detailed insights.",
      iconKey: 'pie',
      accentClass: 'accent-pink'
    },
    {
      title: 'Plays Anywhere',
      description: 'Your games work right in the browser — no downloads needed.',
      iconKey: 'cloud',
      accentClass: 'accent-teal'
    }
  ];
  if (window.ogl) {
    const oglItems = featureItems.map(i => ({
      image: `https://picsum.photos/seed/${encodeURIComponent(i.title)}/800/600?grayscale`,
      text: i.title
    }));
    initCircularGallery({ selector: '#comm-gallery', items: oglItems, bend: 3, textColor: '#1B1F2B', borderRadius: 0.06, font: 'bold 28px Nunito' });
  } else {
    initFallback({ selector: '#comm-gallery', items: featureItems });
  }
});

// Expose to window for manual control if needed
window.initCircularGallery = initCircularGallery;
