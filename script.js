const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const cropButton = document.getElementById('cropToggle');
const rotateButton = document.getElementById('rotate');
const uploadInput = document.getElementById('upload');
const saveButton = document.getElementById('save');
const cancelButton = document.getElementById('cancel');
const saveToComputerButton = document.getElementById('saveToComputer');

let cropMode = false;
let rotation = 0;
let zoomScale = 1;
let image = new Image();
let originalImageData = null;  // Save original image data for cancelling
let cropRect = { x: 0, y: 0, width: 200, height: 200 };
let draggingCrop = false;
let resizingCrop = false;
let cornerResize = false;
let startX, startY;

// Draw the image on the canvas
function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.rotate((rotation * Math.PI) / 180);
	var factor  = Math.min ( canvas.width / image.width, canvas.height / image.height );
	ctx.scale(factor, factor);
	ctx.drawImage(image, 0, 0);
	ctx.scale(1 / factor, 1 / factor);
    ctx.restore();
}

// Draw the crop area with a transparent rectangle showing the image
function drawCropLayout() {
    ctx.save();
    
    // Darken the whole canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Display the image inside the crop area
    ctx.globalCompositeOperation = 'destination-atop';
    ctx.drawImage(image, cropRect.x, cropRect.y, cropRect.width, cropRect.height, cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    
    // Draw the border around the crop area
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    ctx.restore();
}

// Toggle cropping mode
cropButton.addEventListener('click', () => {
    cropMode = !cropMode;
    if (cropMode) {
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);  // Save the original image data
        drawCropLayout();
        toggleButtons(true);
    } else {
        drawImage();
        toggleButtons(false);
    }
});

// Upload an image to the canvas
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            image.src = event.target.result;
            image.onload = function () {
                drawImage();
            };
        };
        reader.readAsDataURL(file);
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (cropMode) {
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (isInCropArea(startX, startY)) {
            draggingCrop = true;
        } else if (isInResizeArea(startX, startY)) {
            resizingCrop = true;
            cornerResize = true;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!cropMode) {
        drawImage();
        drawZoomBox(x, y); // Draw zoom box at the mouse position
    }

    if (cropMode) {
        if (draggingCrop) {
            const dx = x - startX;
            const dy = y - startY;

            cropRect.x += dx;
            cropRect.y += dy;

            startX = x;
            startY = y;
        } else if (resizingCrop && cornerResize) {
            cropRect.width = x - cropRect.x;
            cropRect.height = y - cropRect.y;
        }

        drawImage();
        drawCropLayout();
    }
});

canvas.addEventListener('mouseup', () => {
    draggingCrop = false;
    resizingCrop = false;
    cornerResize = false;
});

// Check if the mouse is inside the cropping area
function isInCropArea(x, y) {
    return x > cropRect.x && x < cropRect.x + cropRect.width && y > cropRect.y && y < cropRect.y + cropRect.height;
}

// Check if the mouse is on a resize corner
function isInResizeArea(x, y) {
    const cornerSize = 10;
    return (x >= cropRect.x + cropRect.width - cornerSize && x <= cropRect.x + cropRect.width + cornerSize &&
            y >= cropRect.y + cropRect.height - cornerSize && y <= cropRect.y + cropRect.height + cornerSize);
}

// Rotate the image by 90 degrees
rotateButton.addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    drawImage();
    if (cropMode) drawCropLayout();
});

// Zoom on hover
canvas.addEventListener('wheel', (e) => {
    if (!cropMode) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        zoomLens(x, y, e.deltaY);
    }
});

function zoomLens(x, y, deltaY) {
    const zoomFactor = deltaY * -0.01;
    zoomScale = Math.min(Math.max(zoomScale + zoomFactor, 1), 10);

    drawImage();
    drawZoomBox(x, y); // Draw the zoom box after adjusting the zoom scale
}

// Draw a zoomed-in box around the mouse position
function drawZoomBox(x, y) {
    const zoomSize = 100; // Size of the zoom box
    const zoomLevel = zoomScale; // Zoom scale factor

    // Calculate source coordinates for zooming
    const sx = x - zoomSize / (2 * zoomLevel);
    const sy = y - zoomSize / (2 * zoomLevel);
    const sw = zoomSize / zoomLevel;
    const sh = zoomSize / zoomLevel;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - zoomSize / 2, y - zoomSize / 2, zoomSize, zoomSize);
    ctx.clip(); // Clip the area to be zoomed

    // Draw the zoomed-in area
    ctx.drawImage(canvas, sx, sy, sw, sh, x - zoomSize / 2, y - zoomSize / 2, zoomSize, zoomSize);
    ctx.restore();
}

// Save the cropped area only
saveButton.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = cropRect.width;
    tempCanvas.height = cropRect.height;

    tempCtx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);

    // Replace the current image with the cropped version scaled to the full canvas
    image.src = tempCanvas.toDataURL('image/png');
    image.onload = function () {
        drawImage();
        cropMode = false;
        toggleButtons(false);
    };
});

// Cancel the crop and restore the original image
cancelButton.addEventListener('click', () => {
    if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);  // Restore the original image data
        cropMode = false;
        toggleButtons(false);
    }
});

// Save the current image to the computer
saveToComputerButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'image.png';
    link.click();
});

// Toggle button visibility based on crop mode
function toggleButtons(cropping) {
    const display = cropping ? 'none' : 'inline';
    uploadInput.style.display = display;
    cropButton.style.display = display;
    rotateButton.style.display = display;
    saveToComputerButton.style.display = display;
    
    saveButton.style.display = cropping ? 'inline' : 'none';
    cancelButton.style.display = cropping ? 'inline' : 'none';
}
