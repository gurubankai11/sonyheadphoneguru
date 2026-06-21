// Canvas Scrollytelling Engine for Sony WH-1000XM6
document.addEventListener('DOMContentLoaded', () => {

  // Frame settings
  const totalFrames = 240;
  const images = [];
  let loadedCount = 0;
  let currentFrame = 1;
  let targetFrame = 1;
  const lerpSpeed = 0.08; // Adjust for scroll damping inertia (lower is smoother)

  // Sizing and DOM Elements
  const canvas = document.getElementById('product-canvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPercentage = document.getElementById('preloader-percentage');
  const scrollTrack = document.getElementById('scroll-track');
  const cards = document.querySelectorAll('.story-card');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navbar = document.getElementById('navbar');
  const hudPoints = document.querySelectorAll('.hud-point');

  // Interactive Swatches & Filter Styles
  const colorDots = document.querySelectorAll('.color-dot');
  const colorLabel = document.getElementById('color-name');
  const formColorInput = document.getElementById('form-color');

  // Color CSS filter matrices to simulate real material changes on grayscale headphones
  const colorFilters = {
    'Matte Black': 'none',
    'Liquid Platinum': 'brightness(1.6) contrast(0.95) saturate(0.15) sepia(0.05)',
    'Sage Gray': 'brightness(1.1) contrast(1.05) saturate(0.2) sepia(0.2) hue-rotate(85deg)'
  };

  // Helper to resolve frame path
  function getFramePath(index) {
    const paddedIndex = String(index).padStart(3, '0');
    return `ezgif-frame-${paddedIndex}.png`;
  }

  // 1. Image Preloader
  function startPreloading() {
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = onFrameLoad;
      img.onerror = onFrameLoad; // Ensure progress continues if file error
      images.push(img);
    }
  }

  function onFrameLoad() {
    loadedCount++;
    const progressPercent = Math.min(100, Math.round((loadedCount / totalFrames) * 100));

    // Update preloader UI
    preloaderBar.style.width = `${progressPercent}%`;
    preloaderPercentage.textContent = `${String(progressPercent).padStart(2, '0')}%`;

    if (loadedCount === totalFrames) {
      setTimeout(dismissPreloader, 600); // Elegant delay for user transition
    }
  }

  function dismissPreloader() {
    preloader.style.opacity = '0';
    preloader.style.filter = 'blur(10px)';

    // Bind interactions after load
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', handleScroll);

    // Initial calls
    resizeCanvas();
    handleScroll();

    // Start canvas animation rendering loop
    requestAnimationFrame(renderLoop);

    // Remove preloader after transition
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 1200);
  }

  // 2. Responsive Canvas Scaling
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);

    // Draw current frame immediately to prevent blank flashes
    drawFrame(Math.round(currentFrame));
  }

  // 3. Draw Frame to Canvas (Contain Mode)
  function drawFrame(frameIndex) {
    const img = images[frameIndex - 1];
    if (!img || !img.complete) return;

    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let renderWidth, renderHeight;
    let x, y;

    if (imgRatio > canvasRatio) {
      renderWidth = canvasWidth;
      renderHeight = canvasWidth / imgRatio;
      x = 0;
      y = (canvasHeight - renderHeight) / 2;
    } else {
      renderWidth = canvasHeight * imgRatio;
      renderHeight = canvasHeight;
      x = (canvasWidth - renderWidth) / 2;
      y = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, x, y, renderWidth, renderHeight);
  }

  // 4. Scroll Tracking
  function handleScroll() {
    const trackRect = scrollTrack.getBoundingClientRect();
    const totalScrollableHeight = trackRect.height - window.innerHeight;

    const scrollTop = -trackRect.top;
    let scrollPercent = scrollTop / totalScrollableHeight;
    scrollPercent = Math.max(0, Math.min(1, scrollPercent));

    // Map scroll index to target frame (Assembled -> Exploded -> Assembled)
    if (scrollPercent <= 0.5) {
      const progress = scrollPercent * 2;
      targetFrame = Math.max(1, Math.min(totalFrames, Math.round(progress * (totalFrames - 1)) + 1));
    } else {
      const progress = (scrollPercent - 0.5) * 2;
      targetFrame = Math.max(1, Math.min(totalFrames, Math.round((1 - progress) * (totalFrames - 1)) + 1));
    }

    // Update navbar design state
    if (scrollPercent > 0.01) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Update narrative elements
    updateNarrative(scrollPercent);
  }

  // 5. Scroll-linked Narrative Logic
  let specsAnimated = false;

  function updateNarrative(scrollPercent) {
    const percentVal = scrollPercent * 100;

    cards.forEach(card => {
      const range = card.dataset.range.split(',').map(Number);
      if (percentVal >= range[0] && percentVal < range[1]) {
        card.classList.add('active');
        // Specific interaction for specs counting
        if (card.id === 'card-specs') {
          animateSpecs();
        }
      } else {
        card.classList.remove('active');
        // Reset spec animation flag if scrolled far away to allow replay
        if (card.id === 'card-specs' && (percentVal < 68 || percentVal > 92)) {
          specsAnimated = false;
        }
      }
    });

    // Sync navbar link active classes
    let currentActive = 'hero';
    if (percentVal >= 15 && percentVal < 40) currentActive = 'acoustic';
    else if (percentVal >= 40 && percentVal < 58) currentActive = 'processor';
    else if (percentVal >= 58 && percentVal < 74) currentActive = 'array';
    else if (percentVal >= 74) currentActive = 'specs';

    navLinks.forEach(link => {
      if (link.dataset.section === currentActive) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Spec counting animation
  function animateSpecs() {
    if (specsAnimated) return;
    specsAnimated = true;

    const ancVal = document.getElementById('spec-anc');
    const batteryVal = document.getElementById('spec-battery');

    // Count up battery from 0 to 50
    let batteryCount = 0;
    const batteryTimer = setInterval(() => {
      batteryCount += 2;
      if (batteryCount >= 50) {
        batteryCount = 50;
        clearInterval(batteryTimer);
      }
      batteryVal.textContent = `${batteryCount}h`;
    }, 25);

    // Count down ANC from 0 to -48
    let ancCount = 0;
    const ancTimer = setInterval(() => {
      ancCount -= 2;
      if (ancCount <= -48) {
        ancCount = -48;
        clearInterval(ancTimer);
      }
      ancVal.textContent = `${ancCount}dB`;
    }, 20);
  }

  // 6. Easing Loop (LERP)
  function renderLoop() {
    // Interpolate current frame position towards target scroll position
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.05) {
      currentFrame += diff * lerpSpeed;
      drawFrame(Math.round(currentFrame));
    }

    // Update frame display in tech HUD
    document.getElementById('frame-counter').textContent = String(Math.round(currentFrame)).padStart(3, '0');

    // Update technical lines visibility based on frame range
    // Peak disassembly is when headphones are exploded (frame >= 180 out of 240)
    const showHUD = currentFrame >= 180;
    hudPoints.forEach(pt => {
      if (showHUD) {
        pt.classList.add('active');
      } else {
        pt.classList.remove('active');
      }
    });

    requestAnimationFrame(renderLoop);
  }

  // 7. Navbar smooth scroll behavior
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      let targetPercent = 0;

      switch (section) {
        case 'hero': targetPercent = 0.05; break;
        case 'acoustic': targetPercent = 0.28; break;
        case 'processor': targetPercent = 0.49; break;
        case 'array': targetPercent = 0.66; break;
        case 'specs': targetPercent = 0.82; break;
      }

      const totalScrollableHeight = scrollTrack.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: targetPercent * totalScrollableHeight,
        behavior: 'smooth'
      });
    });
  });

  // 8. Color Switcher Logic
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      const color = dot.dataset.color;
      colorLabel.textContent = color;
      formColorInput.value = color;

      // Apply CSS visual filter overlay to canvas element
      canvas.style.filter = colorFilters[color] || 'none';
      canvas.style.transition = 'filter 0.5s cubic-bezier(0.25, 1, 0.5, 1)';

      showToast(`Selected Color Finish: ${color}`);
    });
  });

  // 9. Toast Notification Handler
  function showToast(message) {
    const toast = document.getElementById('toast-notify');
    const toastText = document.getElementById('toast-text');

    toastText.textContent = message;
    toast.classList.add('show');

    // Clear previous timeout if multiple clicks occur
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout);
    }

    window.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // 10. Drawer Pre-order Modal
  const preorderModal = document.getElementById('preorder-modal');
  const openPreorderBtns = [
    document.getElementById('nav-preorder-btn'),
    document.getElementById('main-preorder-btn')
  ];
  const closeModalBtn = document.getElementById('close-modal-btn');
  const preorderForm = document.getElementById('preorder-form');

  function openModal() {
    preorderModal.classList.add('active');
  }

  function closeModal() {
    preorderModal.classList.remove('active');
  }

  openPreorderBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', openModal);
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Close modal on background click
  preorderModal.addEventListener('click', (e) => {
    if (e.target === preorderModal) {
      closeModal();
    }
  });

  // Form submission handler
  if (preorderForm) {
    preorderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const userName = document.getElementById('form-name').value;
      const userColor = formColorInput.value;

      closeModal();
      showToast(`Reservation Successful: ${userColor} reserved for ${userName}!`);

      // Reset form fields
      preorderForm.reset();
      formColorInput.value = userColor; // retain chosen color
    });
  }

  // Initialize Preloading
  startPreloading();

});
