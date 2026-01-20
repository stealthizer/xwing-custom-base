// Application state
const state = {
    selectedSize: 'small',
    selectedFaction: 'rebel-alliance',
    overlays: {
        nameplate: false
    },
    frontArc: 'none',
    backArc: 'none',
    pilotName: '',
    initiative: ''
};

// Toggle section collapse/expand
const toggleSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
    }
};

// Handle base size selection
const handleBaseSizeChange = () => {
    const select = document.getElementById('base-size-select');
    state.selectedSize = select.value;
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

    // Show/hide pilot information section based on nameplate checkbox
    const pilotInfoSection = document.getElementById('pilot-info-section');
    if (state.overlays.nameplate) {
        pilotInfoSection.classList.remove('hidden');
    } else {
        pilotInfoSection.classList.add('hidden');
    }

    updatePreview();
};

// Handle arc dropdown changes
const handleArcChange = () => {
    state.frontArc = document.getElementById('front-arc-select').value;
    state.backArc = document.getElementById('back-arc-select').value;
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
    return new Promise((resolve) => {
        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();
        // Only set crossOrigin if loading from HTTP/HTTPS (not file://)
        if (window.location.protocol !== 'file:') {
            img.crossOrigin = 'anonymous';
        }
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
    if (state.frontArc !== 'none') {
        const frontArcText = state.frontArc === 'frontarc' ? 'Front Arc' :
                           state.frontArc === 'fullfrontarc' ? 'Full Front Arc' :
                           'Bullseye Arc';
        overlaysList.push(frontArcText);
    }
    if (state.backArc !== 'none') overlaysList.push('Rear Arc');

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

    if (state.backArc !== 'none') {
        const img = await loadImage(buildImagePath(state.backArc));
        if (img) overlayImages.push(img);
    }

    if (state.frontArc !== 'none') {
        const img = await loadImage(buildImagePath(state.frontArc));
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
    console.log('Export button clicked');
    const canvas = document.getElementById('preview-canvas');

    if (!state.selectedSize) {
        alert('Please select a base size first');
        return;
    }

    console.log('Canvas state:', {
        hidden: canvas.classList.contains('hidden'),
        width: canvas.width,
        height: canvas.height
    });

    // Check if canvas has content
    if (canvas.classList.contains('hidden') || canvas.width === 0) {
        alert('Please wait for the preview to load');
        return;
    }

    console.log('Starting export...');

    // If running from file://, use toDataURL instead of toBlob
    if (window.location.protocol === 'file:') {
        try {
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `xwing-base-${state.selectedSize}-${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            console.log('Download initiated (file:// mode)');
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting image: ' + error.message);
        }
    } else {
        // Use toBlob for HTTP/HTTPS
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob');
                alert('Error exporting image. Please try again.');
                return;
            }
            console.log('Blob created, downloading...');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `xwing-base-${state.selectedSize}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            console.log('Download initiated');
        }, 'image/png');
    }
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
    // Set small base as selected by default in dropdown
    const baseSizeSelect = document.getElementById('base-size-select');
    baseSizeSelect.value = state.selectedSize;

    // Set last updated date
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        lastUpdatedElement.textContent = currentDate;
    }

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
