// Application state
const state = {
    selectedSize: 'small',
    selectedFaction: 'rebel-alliance',
    frontArc: 'none',
    backArc: 'none',
    pilotName: '',
    initiative: '',
    shipIcon: null // Will store the loaded Image object
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

// Determine nameplate type based on state
const getNameplateType = () => {
    const hasInitiative = state.initiative && state.initiative.trim() !== '';
    const hasPilotName = state.pilotName && state.pilotName.trim() !== '';

    if (hasPilotName) {
        return 'full'; // Show full nameplate if pilot name is provided
    } else if (hasInitiative) {
        return 'initiative'; // Show initiative-only nameplate if only initiative is provided
    } else {
        return 'none'; // No nameplate if neither is provided
    }
};

// Handle ship icon upload
const handleShipIconChange = () => {
    const fileInput = document.getElementById('ship-icon');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.shipIcon = img;
                updatePreview();
            };
            img.onerror = () => {
                alert('Error loading ship icon. Please try a different image.');
                state.shipIcon = null;
                fileInput.value = '';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            state.shipIcon = null;
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        state.shipIcon = null;
        updatePreview();
    }
};

// Build the image path based on current state
const buildImagePath = (overlay = null, nameplateType = null) => {
    if (!state.selectedSize) return null;

    // Base tile (no faction)
    if (!overlay) {
        return `./img/${state.selectedSize}/ship-tile-${state.selectedSize}.png`;
    }

    // Overlay tiles (with faction)
    if (state.selectedFaction === 'none') return null;

    // Nameplate overlay (in nameplate subfolder with type suffix)
    if (overlay === 'nameplate' && nameplateType) {
        return `./img/${state.selectedSize}/${state.selectedFaction}/nameplate/${state.selectedFaction}-${state.selectedSize}-nameplate-${nameplateType}.png`;
    }

    // Arc overlays (in faction folder)
    return `./img/${state.selectedSize}/${state.selectedFaction}/${state.selectedFaction}-${state.selectedSize}-${overlay}.png`;
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
    const nameplateType = getNameplateType();
    if (nameplateType !== 'none') {
        const nameplateText = nameplateType === 'initiative' ? 'Nameplate (Initiative)' : 'Nameplate (Full)';
        overlaysList.push(nameplateText);
    }
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

    // Load nameplate based on the determined type (reuse nameplateType from earlier)
    if (nameplateType !== 'none') {
        const img = await loadImage(buildImagePath('nameplate', nameplateType));
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

    // Draw text overlays (pilot name, initiative, and ship icon)
    drawTextOverlays(ctx, canvas.width, canvas.height);

    // Show canvas
    canvas.classList.remove('hidden');
    previewImage.classList.add('hidden');
};

// Draw text overlays on the canvas
const drawTextOverlays = (ctx, width, height) => {
    // Calculate positions based on base size
    // Initiative is positioned over the left hexagonal area of the nameplate
    // Ship icon is positioned on the right side of the nameplate
    const sizeConfig = {
        small: {
            nameY: height * 0.835,
            nameX: width * 0.50,
            nameFontSize: width * 0.06,
            initiativeX: width * 0.11,
            initiativeY: height * 0.7,
            initiativeFontSize: width * 0.21,
            iconX: width * 0.89,
            iconY: height * 0.7,
            iconSize: width * 0.18
        },
        medium: {
            nameY: height * 0.92,
            nameX: width * 0.50,
            nameFontSize: width * 0.05,
            initiativeX: width * 0.072,
            initiativeY: height * 0.82,
            initiativeFontSize: width * 0.18,
            iconX: width * 0.928,
            iconY: height * 0.82,
            iconSize: width * 0.14
        },
        large: {
            nameY: height * 0.925,
            nameX: width * 0.5,
            nameFontSize: width * 0.04,
            initiativeX: width * 0.07,
            initiativeY: height * 0.835,
            initiativeFontSize: width * 0.16,
            iconX: width * 0.93,
            iconY: height * 0.835,
            iconSize: width * 0.12
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
        ctx.font = `900 ${config.initiativeFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#FF8C00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(state.initiative, config.initiativeX, config.initiativeY);
        ctx.restore();
    }

    // Draw ship icon if available and nameplate is shown
    const nameplateType = getNameplateType();
    if (state.shipIcon && nameplateType !== 'none') {
        ctx.save();

        // Calculate the scaling to fit the icon within the designated size
        const maxSize = config.iconSize;
        const aspectRatio = state.shipIcon.width / state.shipIcon.height;

        let drawWidth, drawHeight;
        if (aspectRatio > 1) {
            // Wider than tall
            drawWidth = maxSize;
            drawHeight = maxSize / aspectRatio;
        } else {
            // Taller than wide or square
            drawHeight = maxSize;
            drawWidth = maxSize * aspectRatio;
        }

        // Center the icon on the designated position
        const drawX = config.iconX - (drawWidth / 2);
        const drawY = config.iconY - (drawHeight / 2);

        ctx.drawImage(state.shipIcon, drawX, drawY, drawWidth, drawHeight);
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
