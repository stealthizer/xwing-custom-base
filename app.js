// Application state
const state = {
    selectedSize: 'small',
    selectedFaction: 'none',
    overlays: {
        nameplate: false,
        frontarc: false,
        reararc: false
    },
    pilotName: '',
    initiative: ''
};

// Handle base size selection
const handleSelectSize = (size) => {
    state.selectedSize = size;

    // Update button states
    const buttons = ['btn-small', 'btn-medium', 'btn-large'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        btn.classList.remove('border-blue-500', 'bg-blue-600');
        btn.classList.add('border-gray-600', 'bg-gray-700');
    });

    const selectedBtn = document.getElementById(`btn-${size}`);
    selectedBtn.classList.remove('border-gray-600', 'bg-gray-700');
    selectedBtn.classList.add('border-blue-500', 'bg-blue-600');

    updatePreview();
};

// Handle faction change
const handleFactionChange = () => {
    const select = document.getElementById('faction-select');
    state.selectedFaction = select.value;
    updatePreview();
};

// Handle overlay checkbox changes
const handleOverlayChange = () => {
    state.overlays.nameplate = document.getElementById('overlay-nameplate').checked;
    state.overlays.frontarc = document.getElementById('overlay-frontarc').checked;
    state.overlays.reararc = document.getElementById('overlay-reararc').checked;
    updatePreview();
};

// Handle pilot information changes
const handlePilotInfoChange = () => {
    state.pilotName = document.getElementById('pilot-name').value;
    state.initiative = document.getElementById('initiative').value;
    updatePreview();
};

// Build the image path based on current state
const buildImagePath = (overlay = null) => {
    if (!state.selectedSize) return null;

    // Base tile (no faction)
    if (!overlay) {
        return `./img/ship-tile-${state.selectedSize}.png`;
    }

    // Overlay tiles (with faction)
    if (state.selectedFaction === 'none') return null;

    return `./img/ship-tile-${state.selectedFaction}-${state.selectedSize}-${overlay}.png`;
};

// Load an image and return a promise
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // Resolve with null if image doesn't exist
        img.src = src;
    });
};

// Update the preview with composite image
const updatePreview = async () => {
    const placeholder = document.getElementById('preview-placeholder');
    const canvas = document.getElementById('preview-canvas');
    const previewImage = document.getElementById('preview-image');
    const infoText = document.getElementById('info-text');

    if (!state.selectedSize) {
        placeholder.classList.remove('hidden');
        canvas.classList.add('hidden');
        previewImage.classList.add('hidden');
        infoText.textContent = 'No base selected';
        return;
    }

    placeholder.classList.add('hidden');

    // Build info text
    const sizeText = state.selectedSize.charAt(0).toUpperCase() + state.selectedSize.slice(1);
    const factionText = state.selectedFaction === 'none'
        ? 'No Faction'
        : state.selectedFaction.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const overlaysList = [];
    if (state.overlays.nameplate) overlaysList.push('Nameplate');
    if (state.overlays.frontarc) overlaysList.push('Front Arc');
    if (state.overlays.reararc) overlaysList.push('Rear Arc');

    const overlaysText = overlaysList.length > 0 ? ` | Overlays: ${overlaysList.join(', ')}` : '';
    infoText.textContent = `${sizeText} Base | ${factionText}${overlaysText}`;

    // Load all images
    const baseImagePath = buildImagePath();
    const baseImage = await loadImage(baseImagePath);

    if (!baseImage) {
        placeholder.classList.remove('hidden');
        canvas.classList.add('hidden');
        previewImage.classList.add('hidden');
        return;
    }

    // Load overlay images if applicable
    // Order matters: rear arc, front arc, then nameplate on top
    const overlayImages = [];

    if (state.overlays.reararc) {
        const img = await loadImage(buildImagePath('reararc'));
        if (img) overlayImages.push(img);
    }

    if (state.overlays.frontarc) {
        const img = await loadImage(buildImagePath('frontarc'));
        if (img) overlayImages.push(img);
    }

    if (state.overlays.nameplate) {
        const img = await loadImage(buildImagePath('nameplate'));
        if (img) overlayImages.push(img);
    }

    // Set canvas size to match base image
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // Draw composite image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base image
    ctx.drawImage(baseImage, 0, 0);

    // Draw overlay images
    overlayImages.forEach(img => {
        ctx.drawImage(img, 0, 0);
    });

    // Draw text overlays (pilot name and initiative)
    drawTextOverlays(ctx, canvas.width, canvas.height);

    // Show canvas
    canvas.classList.remove('hidden');
    previewImage.classList.add('hidden');
};

// Draw text overlays on the canvas
const drawTextOverlays = (ctx, width, height) => {
    // Calculate positions based on base size
    // Initiative is positioned over the left hexagonal area of the nameplate
    const sizeConfig = {
        small: {
            nameY: height * 0.78,
            nameX: width * 0.55,
            nameFontSize: width * 0.038,
            initiativeX: width * 0.12,
            initiativeY: height * 0.78,
            initiativeFontSize: width * 0.08
        },
        medium: {
            nameY: height * 0.80,
            nameX: width * 0.55,
            nameFontSize: width * 0.032,
            initiativeX: width * 0.11,
            initiativeY: height * 0.80,
            initiativeFontSize: width * 0.065
        },
        large: {
            nameY: height * 0.84,
            nameX: width * 0.55,
            nameFontSize: width * 0.027,
            initiativeX: width * 0.095,
            initiativeY: height * 0.84,
            initiativeFontSize: width * 0.055
        }
    };

    const config = sizeConfig[state.selectedSize] || sizeConfig.small;

    // Draw pilot name
    if (state.pilotName && state.pilotName.trim() !== '') {
        ctx.save();
        ctx.font = `bold ${config.nameFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(state.pilotName, config.nameX, config.nameY);
        ctx.restore();
    }

    // Draw initiative number
    if (state.initiative && state.initiative.trim() !== '') {
        ctx.save();
        ctx.font = `bold ${config.initiativeFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(state.initiative, config.initiativeX, config.initiativeY);
        ctx.restore();
    }
};

// Handle export
const handleExport = () => {
    const canvas = document.getElementById('preview-canvas');

    if (!state.selectedSize) {
        alert('Please select a base size first');
        return;
    }

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `xwing-base-${state.selectedSize}-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
};

// Keyboard event handlers for accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            target.click();
            e.preventDefault();
        }
    }
});

// Initialize application
const initialize = () => {
    // Set small base as selected by default
    const smallBtn = document.getElementById('btn-small');
    smallBtn.classList.remove('border-gray-600', 'bg-gray-700');
    smallBtn.classList.add('border-blue-500', 'bg-blue-600');

    // Load initial preview
    updatePreview();

    console.log('X-Wing Custom Base Creator initialized');
};

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
