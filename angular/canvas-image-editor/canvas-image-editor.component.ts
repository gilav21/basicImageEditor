import { Component, effect, ElementRef, input, output, signal, viewChild, ɵUSE_RUNTIME_DEPS_TRACKER_FOR_JIT } from '@angular/core';
import { set } from 'lodash';

@Component({
  selector: 'app-canvas-image-editor',
  standalone: true,
  imports: [],
  templateUrl: './canvas-image-editor.component.html',
  styleUrl: './canvas-image-editor.component.scss'
})
export class CanvasImageEditorComponent {

  canvasWidth = input<number>(800);
  canvasHeight = input<number>(600);
  zoomSize = input<number>(100);
  cropOutlineColor = input<string>('#FF0000');
  backgroundColor = input<string>('transparent');
  borderColor = input<string>('black');
  borderStyle = input<string>('dashed');
  buttonsBackgroundColor = input<string>('#5993aa');
  buttonsTextColor = input<string>('white');
  base64 = input<string>('');

  imageDone = output<string>();

  canvasRef = viewChild<ElementRef>('canvas');
  zoomCanvasRef = viewChild<ElementRef>('zoomCanvas');

  private ctx!: CanvasRenderingContext2D;
  private zoomCtx!: CanvasRenderingContext2D;
  cropMode = signal<boolean>(false);
  rotation = signal<number>(0);
  zoomScale = signal<number>(1);
  resizeCorner = signal<string | null>(null);
  draggingCrop = signal<boolean>(false);
  resizingCrop = signal<boolean>(false);
  cornerResize = signal<boolean>(false);
  startX = signal<number>(0);
  startY = signal<number>(0);
  isLoading = signal<boolean>(false);


  image = new Image();
  originalImageData!: ImageData | undefined;
  beforeCropImageData!: ImageData;
  cropRect = { x: 0, y: 0, width: 200, height: 200 };

  constructor() {
    effect(() => {
      if (this.base64()) {
        if (!this.setImage(this.base64())) {
          alert('תמונה לא תקנית');
        }
      }
    });
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef()?.nativeElement.getContext('2d')!;
    this.zoomCtx = this.zoomCanvasRef()?.nativeElement.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  drawImage() {

    this.ctx.clearRect(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    this.ctx.save();

    // Translate to the center of the canvas
    this.ctx.translate(this.canvasRef()?.nativeElement.width / 2, this.canvasRef()?.nativeElement.height / 2);
    this.ctx.rotate((this.rotation() * Math.PI) / 180);

    const scale = Math.min(this.canvasRef()?.nativeElement.width / this.image.width, this.canvasRef()?.nativeElement.height / this.image.height);
    this.ctx.scale(scale, scale);

    // Draw the image centered
    this.ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, this.image.width, this.image.height);
    this.ctx.restore();
  }

  drawCropLayout() {
    // Store the original image
    const originalImageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);

    // Draw semi-transparent gray overlay
    this.ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    this.ctx.fillRect(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);

    // Use 'destination-out' to clear the crop area
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    this.ctx.fillRect(this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);

    // Reset composite operation
    this.ctx.globalCompositeOperation = 'source-over';

    // Draw the original image only in the crop area
    this.ctx.putImageData(originalImageData, 0, 0, this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);

    // Draw the crop outline
    this.ctx.strokeStyle = this.cropOutlineColor();
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6]);
    this.ctx.strokeRect(this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);

    // Draw resize handles
    const handleSize = 10;
    const handleOffset = 5; // Offset to place handles outside the crop area
    this.ctx.fillStyle = this.cropOutlineColor();

    // // Corner handles
    // this.ctx.fillRect(this.cropRect.x - handleSize - handleOffset, this.cropRect.y - handleSize - handleOffset, handleSize, handleSize); // Top-left
    // this.ctx.fillRect(this.cropRect.x + this.cropRect.width + handleOffset, this.cropRect.y - handleSize - handleOffset, handleSize, handleSize); // Top-right
    // this.ctx.fillRect(this.cropRect.x - handleSize - handleOffset, this.cropRect.y + this.cropRect.height + handleOffset, handleSize, handleSize); // Bottom-left
    // this.ctx.fillRect(this.cropRect.x + this.cropRect.width + handleOffset, this.cropRect.y + this.cropRect.height + handleOffset, handleSize, handleSize); // Bottom-right
  }

  toggleCropMode() {
    this.cropMode.update(value => !value);
    if (this.cropMode()) {
      this.beforeCropImageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
      this.drawCropLayout();
    } else {
      this.drawImage();
    }
  }

  onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.originalImageData = undefined;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (!this.setImage(e.target.result)) {
          alert('יש להעלות תמונה בפורמט תמונה');
          input.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  setImage(base64: string): boolean {
    if (base64.startsWith('data:image/')) {
      this.image.src = base64;
      this.image.onload = () => {
        this.canvasRef()!.nativeElement.width = this.image.width;
        this.canvasRef()!.nativeElement.height = this.image.height;
        this.drawImage();
        if (!this.originalImageData) {
          this.originalImageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
        }
      };
      return true;
    }
    return false;
  }


  rotateImage() {
    this.rotation.update(value => (value + 90) % 360);
    this.drawImage();
    if (this.cropMode()) {
      this.drawCropLayout();
    }
  }

  saveCrop() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    const offset = 2; // Small offset to avoid capturing border
    tempCanvas.width = this.cropRect.width - 2 * offset;
    tempCanvas.height = this.cropRect.height - 2 * offset;

    tempCtx.drawImage(
      this.canvasRef()?.nativeElement,
      this.cropRect.x + offset,
      this.cropRect.y + offset,
      this.cropRect.width - 2 * offset,
      this.cropRect.height - 2 * offset,
      0,
      0,
      this.cropRect.width - 2 * offset,
      this.cropRect.height - 2 * offset
    );

    this.image.src = tempCanvas.toDataURL('image/png');
    this.image.onload = () => {
      this.drawImage();
      this.cropMode.update(value => false);
    };
  }

  cancelCrop() {
    if (this.beforeCropImageData) {
      this.ctx.putImageData(this.beforeCropImageData, 0, 0);
      this.cropMode.update(value => false);
    }
  }

  saveToComputer() {
    // const link = document.createElement('a');
    // link.href = this.canvasRef()?.nativeElement.toDataURL('image/png');
    // link.download = 'image.png';
    // link.click();
    this.imageDone.emit(this.image.src);
  }

  resetImage() {
    this.ctx.clearRect(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    this.cropMode.update(value => false);
    this.zoomScale.update(value => 1);
    this.rotation.update(value => 0);
    this.cropRect.x = 0;
    this.cropRect.y = 0;
    this.cropRect.width = this.canvasRef()?.nativeElement.width;
    this.cropRect.height = this.canvasRef()?.nativeElement.height;
    if (this.originalImageData) {
      this.ctx.putImageData(this.originalImageData, 0, 0);
      this.saveCrop();
      this.cropRect.width = 200;
      this.cropRect.height = 200;
    }
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent) {
    if (!this.cropMode()) return;

    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();

    const [canvasX, canvasY] = this.getCanvasCoordinates(event);
    this.startX.set(canvasX);
    this.startY.set(canvasY);

    if (this.isInCropArea(this.startX(), this.startY())) {
      this.draggingCrop.set(true);
    } else {
      const corner = this.isInResizeArea(this.startX(), this.startY());
      if (corner) {
        this.resizingCrop.set(true);
        this.resizeCorner.set(corner);
      }
    }
  }

  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const [canvasX, canvasY] = this.getCanvasCoordinates(event);
    // Set cursor style
    this.canvasRef()!.nativeElement.style.cursor = this.getCursorStyle(canvasX, canvasY);

    if (!this.cropMode()) {
      this.drawImage();
      if (this.zoomScale() > 1) {
        this.updateZoomWindow(x, y, canvasX, canvasY);
      } else {
        this.zoomCtx.clearRect(0, 0, this.zoomCanvasRef()?.nativeElement.width, this.zoomCanvasRef()?.nativeElement.height);
      }
      return;
    }

    if (this.draggingCrop()) {
      const dx = canvasX - this.startX();
      const dy = canvasY - this.startY();
      this.cropRect.x += dx;
      this.cropRect.y += dy;
      this.startX.set(canvasX);
      this.startY.set(canvasY);
    } else if (this.resizingCrop()) {
      const resizeArea = this.resizeCorner();
      let newWidth = this.cropRect.width;
      let newHeight = this.cropRect.height;
      let newX = this.cropRect.x;
      let newY = this.cropRect.y;

      switch (resizeArea) {
        case 'top-left':
          newWidth = this.cropRect.width + (this.cropRect.x - canvasX);
          newHeight = this.cropRect.height + (this.cropRect.y - canvasY);
          newX = canvasX;
          newY = canvasY;
          break;
        case 'top-right':
          newWidth = canvasX - this.cropRect.x;
          newHeight = this.cropRect.height + (this.cropRect.y - canvasY);
          newY = canvasY;
          break;
        case 'bottom-left':
          newWidth = this.cropRect.width + (this.cropRect.x - canvasX);
          newHeight = canvasY - this.cropRect.y;
          newX = canvasX;
          break;
        case 'bottom-right':
          newWidth = canvasX - this.cropRect.x;
          newHeight = canvasY - this.cropRect.y;
          break;
        case 'left':
          newWidth = this.cropRect.width + (this.cropRect.x - canvasX);
          newX = canvasX;
          break;
        case 'right':
          newWidth = canvasX - this.cropRect.x;
          break;
        case 'top':
          newHeight = this.cropRect.height + (this.cropRect.y - canvasY);
          newY = canvasY;
          break;
        case 'bottom':
          newHeight = canvasY - this.cropRect.y;
          break;
      }

      if (newWidth > 10 && newHeight > 10) {
        this.cropRect.x = newX;
        this.cropRect.y = newY;
        this.cropRect.width = newWidth;
        this.cropRect.height = newHeight;
      }
    }

    this.drawImage();
    this.drawCropLayout();
  }

  onMouseUp() {
    this.draggingCrop.set(false);
    this.resizingCrop.set(false);
    this.resizeCorner.set(null);
    this.canvasRef()!.nativeElement.style.cursor = 'default';

  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.cropMode()) return;

    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const [canvasX, canvasY] = this.getCanvasCoordinates(event);

    this.zoom(x, y, canvasX, canvasY, event);
  }

  isInCropArea(x: number, y: number): boolean {
    return x > this.cropRect.x && x < this.cropRect.x + this.cropRect.width && y > this.cropRect.y && y < this.cropRect.y + this.cropRect.height;
  }

  isInResizeArea(x: number, y: number): string | null {
    const handleSize = 10;
    const handleOffset = 0;
    const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = this.cropRect;

    // Check corners
    if (x >= cropX - handleSize - handleOffset && x <= cropX - handleOffset && y >= cropY - handleSize - handleOffset && y <= cropY - handleOffset) return 'top-left';
    if (x >= cropX + cropWidth + handleOffset && x <= cropX + cropWidth + handleSize + handleOffset && y >= cropY - handleSize - handleOffset && y <= cropY - handleOffset) return 'top-right';
    if (x >= cropX - handleSize - handleOffset && x <= cropX - handleOffset && y >= cropY + cropHeight + handleOffset && y <= cropY + cropHeight + handleSize + handleOffset) return 'bottom-left';
    if (x >= cropX + cropWidth + handleOffset && x <= cropX + cropWidth + handleSize + handleOffset && y >= cropY + cropHeight + handleOffset && y <= cropY + cropHeight + handleSize + handleOffset) return 'bottom-right';

    // Check sides
    if (x >= cropX - handleSize - handleOffset && x <= cropX - handleOffset && y > cropY && y < cropY + cropHeight) return 'left';
    if (x >= cropX + cropWidth + handleOffset && x <= cropX + cropWidth + handleSize + handleOffset && y > cropY && y < cropY + cropHeight) return 'right';
    if (x > cropX && x < cropX + cropWidth && y >= cropY - handleSize - handleOffset && y <= cropY - handleOffset) return 'top';
    if (x > cropX && x < cropX + cropWidth && y >= cropY + cropHeight + handleOffset && y <= cropY + cropHeight + handleSize + handleOffset) return 'bottom';

    return null;
  }

  getCursorStyle(x: number, y: number): string {
    if (!this.cropMode()) return 'default';

    const resizeArea = this.isInResizeArea(x, y);
    if (resizeArea) {
      switch (resizeArea) {
        case 'top-left':
        case 'bottom-right':
          return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
          return 'nesw-resize';
        case 'left':
        case 'right':
          return 'ew-resize';
        case 'top':
        case 'bottom':
          return 'ns-resize';
      }
    }

    return this.isInCropArea(x, y) ? 'move' : 'default';
  }

  applyThreshold(threshold: number) {
    this.isLoading.set(true);
    const imageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      const value = brightness > threshold ? 255 : 0; // Simple threshold

      data[i] = data[i + 1] = data[i + 2] = value; // Apply threshold
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = this.canvasRef()?.nativeElement.width;
    tempCanvas.height = this.canvasRef()?.nativeElement.height;
    tempCtx.putImageData(imageData, 0, 0);
    this.image.src = tempCanvas.toDataURL('image/png');
    this.drawImage();
    this.isLoading.set(false);
  }

  sharpenImage() {
    this.isLoading.set(true);
    setTimeout(() => {
      const imageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
      const data = imageData.data;
      const weight = 1; // Sharpening weight

      // Convolution matrix for a simple sharpen filter
      const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];

      const side = Math.round(Math.sqrt(kernel.length));
      const halfSide = Math.floor(side / 2);

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = this.canvasRef()?.nativeElement.width;
      tempCanvas.height = this.canvasRef()?.nativeElement.height;

      // Create a copy of the image data to apply the convolution
      const output = tempCtx.createImageData(this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
      const outputData = output.data;

      for (let y = 0; y < this.canvasRef()?.nativeElement.height; y++) {
        for (let x = 0; x < this.canvasRef()?.nativeElement.width; x++) {
          let r = 0, g = 0, b = 0, a = 0;
          for (let ky = -halfSide; ky <= halfSide; ky++) {
            for (let kx = -halfSide; kx <= halfSide; kx++) {
              const px = x + kx;
              const py = y + ky;
              if (px >= 0 && px < this.canvasRef()?.nativeElement.width && py >= 0 && py < this.canvasRef()?.nativeElement.height) {
                const pos = (py * this.canvasRef()?.nativeElement.width + px) * 4;
                const weight = kernel[(ky + halfSide) * side + (kx + halfSide)];
                r += data[pos] * weight;
                g += data[pos + 1] * weight;
                b += data[pos + 2] * weight;
                a += data[pos + 3] * weight;
              }
            }
          }
          const i = (y * this.canvasRef()?.nativeElement.width + x) * 4;
          outputData[i] = r;
          outputData[i + 1] = g;
          outputData[i + 2] = b;
          outputData[i + 3] = a;
        }
      }

      tempCanvas.width = this.canvasRef()?.nativeElement.width;
      tempCanvas.height = this.canvasRef()?.nativeElement.height;
      tempCtx.putImageData(output, 0, 0);
      this.image.src = tempCanvas.toDataURL('image/png');
      this.drawImage();
      this.isLoading.set(false);
    }, 0);
  }

  highPassSharpen(amount: number = 1.0) {
    this.isLoading.set(true);
    const imageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    const data = imageData.data;
    const output = this.ctx.createImageData(this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    const outputData = output.data;

    // Create a copy of the original image data for high-pass filtering
    const highPassData = new Float32Array(data.length);

    // Calculate high-pass filter
    for (let y = 1; y < this.canvasRef()?.nativeElement.height - 1; y++) {
      for (let x = 1; x < this.canvasRef()?.nativeElement.width - 1; x++) {
        for (let c = 0; c < 3; c++) { // R, G, B channels
          const i = (y * this.canvasRef()?.nativeElement.width + x) * 4 + c;
          const originalValue = data[i];
          const averageValue =
            (data[((y - 1) * this.canvasRef()?.nativeElement.width + x - 1) * 4 + c] +
              data[((y - 1) * this.canvasRef()?.nativeElement.width + x) * 4 + c] +
              data[((y - 1) * this.canvasRef()?.nativeElement.width + x + 1) * 4 + c] +
              data[(y * this.canvasRef()?.nativeElement.width + x - 1) * 4 + c] +
              data[(y * this.canvasRef()?.nativeElement.width + x + 1) * 4 + c] +
              data[((y + 1) * this.canvasRef()?.nativeElement.width + x - 1) * 4 + c] +
              data[((y + 1) * this.canvasRef()?.nativeElement.width + x) * 4 + c] +
              data[((y + 1) * this.canvasRef()?.nativeElement.width + x + 1) * 4 + c]) / 8;

          highPassData[i] = originalValue - averageValue; // High-pass filter result
        }
      }
    }

    // Apply high-pass filter to sharpen the image
    for (let i = 0; i < data.length; i += 4) {
      outputData[i] = Math.min(255, Math.max(0, data[i] + amount * highPassData[i]));
      outputData[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount * highPassData[i + 1]));
      outputData[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount * highPassData[i + 2]));
      outputData[i + 3] = data[i + 3]; // Preserve alpha channel
    }

    // Draw the sharpened image back to the canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = this.canvasRef()?.nativeElement.width;
    tempCanvas.height = this.canvasRef()?.nativeElement.height;
    tempCanvas.width = this.canvasRef()?.nativeElement.width;
    tempCanvas.height = this.canvasRef()?.nativeElement.height;
    tempCtx.putImageData(output, 0, 0);
    this.image.src = tempCanvas.toDataURL('image/png');
    this.drawImage();
    this.isLoading.set(false);
  }


  fix_dpi() {
    let dpi = window.devicePixelRatio;

    //get CSS height
    //the + prefix casts it to an integer
    //the slice method gets rid of "px"
    let style_height = +getComputedStyle(this.canvasRef()?.nativeElement).getPropertyValue("height").slice(0, -2);
    //get CSS width
    let style_width = +getComputedStyle(this.canvasRef()?.nativeElement).getPropertyValue("width").slice(0, -2);
    //scale the canvas
    this.canvasRef()?.nativeElement.setAttribute('height', style_height * dpi);
    this.canvasRef()?.nativeElement.setAttribute('width', style_width * dpi);
  }

  // ===========================================================================================================================

  zoom(x: number, y: number, canvasX: number, canvasY: number, event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY * -0.001;
    this.zoomScale.update(value => Math.min(Math.max(value + zoomFactor, 1), 10));
    if (this.zoomScale() > 1) {
      this.updateZoomWindow(x, y, canvasX, canvasY);
    } else {
      this.zoomCtx.clearRect(0, 0, this.zoomCanvasRef()?.nativeElement.width, this.zoomCanvasRef()?.nativeElement.height);
    }
  }

  updateZoomWindow(canvasX: number, canvasY: number, x: number, y: number): void {
    if (!this.image) return;

    const zoomCanvas = this.zoomCanvasRef()?.nativeElement;
    zoomCanvas.width = this.zoomSize();
    zoomCanvas.height = this.zoomSize();

    // Calculate the position to center the zoom window on the mouse cursor
    const zoomCanvasX = canvasX - this.zoomSize() / 2;
    const zoomCanvasY = canvasY - this.zoomSize() / 2;

    // Set the position of the zoom canvas
    zoomCanvas.style.position = 'absolute';
    zoomCanvas.style.left = `${zoomCanvasX}px`;
    zoomCanvas.style.top = `${zoomCanvasY}px`;


    this.zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);
    this.zoomCtx.drawImage(
      this.canvasRef()?.nativeElement,
      x - this.zoomSize() / (2 * this.zoomScale()),
      y - this.zoomSize() / (2 * this.zoomScale()),
      this.zoomSize() / this.zoomScale(),
      this.zoomSize() / this.zoomScale(),
      0,
      0,
      this.zoomSize(),
      this.zoomSize()
    );
  }

  private getCanvasCoordinates(event: MouseEvent): [number, number] {
    const canvas = this.canvasRef()?.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return [x, y];
  }


}
