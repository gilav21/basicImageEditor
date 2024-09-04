import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';

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
  cropOutlineColor = input<string>('#FF0000');
  backgroundColor = input<string>('transparent');
  borderColor = input<string>('black');
  buttonsBackgroundColor = input<string>('#5993aa');
  buttonsTextColor = input<string>('white');
  base64 = input<string>('');

  imageDone = output<string>();

  canvasRef = viewChild<ElementRef>('canvas');

  private ctx!: CanvasRenderingContext2D;
  cropMode = signal<boolean>(false);
  rotation = signal<number>(0);
  zoomScale = signal<number>(1);
  resizeCorner = signal<string | null>(null);


  image = new Image();
  originalImageData!: ImageData;
  beforeCropImageData!: ImageData;
  cropRect = { x: 0, y: 0, width: 200, height: 200 };
  draggingCrop = signal<boolean>(false);
  resizingCrop = signal<boolean>(false);
  cornerResize = signal<boolean>(false);
  startX = signal<number>(0);
  startY = signal<number>(0);

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
        this.drawImage();
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
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
    this.ctx.putImageData(this.originalImageData, 0, 0);
    this.saveCrop();
    this.cropRect.width = 200;
    this.cropRect.height = 200;
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent) {
    if (!this.cropMode()) return;

    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    this.startX.set(event.clientX - rect.left);
    this.startY.set(event.clientY - rect.top);

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

    // Set cursor style
    this.canvasRef()!.nativeElement.style.cursor = this.getCursorStyle(x, y);

    if (!this.cropMode()) {
      this.drawImage();
      this.drawZoomBox(x, y);
      return;
    }

    if (this.draggingCrop()) {
      const dx = x - this.startX();
      const dy = y - this.startY();
      this.cropRect.x += dx;
      this.cropRect.y += dy;
      this.startX.set(x);
      this.startY.set(y);
    } else if (this.resizingCrop()) {
      const resizeArea = this.resizeCorner();
      let newWidth = this.cropRect.width;
      let newHeight = this.cropRect.height;
      let newX = this.cropRect.x;
      let newY = this.cropRect.y;

      switch (resizeArea) {
        case 'top-left':
          newWidth = this.cropRect.width + (this.cropRect.x - x);
          newHeight = this.cropRect.height + (this.cropRect.y - y);
          newX = x;
          newY = y;
          break;
        case 'top-right':
          newWidth = x - this.cropRect.x;
          newHeight = this.cropRect.height + (this.cropRect.y - y);
          newY = y;
          break;
        case 'bottom-left':
          newWidth = this.cropRect.width + (this.cropRect.x - x);
          newHeight = y - this.cropRect.y;
          newX = x;
          break;
        case 'bottom-right':
          newWidth = x - this.cropRect.x;
          newHeight = y - this.cropRect.y;
          break;
        case 'left':
          newWidth = this.cropRect.width + (this.cropRect.x - x);
          newX = x;
          break;
        case 'right':
          newWidth = x - this.cropRect.x;
          break;
        case 'top':
          newHeight = this.cropRect.height + (this.cropRect.y - y);
          newY = y;
          break;
        case 'bottom':
          newHeight = y - this.cropRect.y;
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
    if (this.cropMode()) return;
    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.zoomLens(x, y, event.deltaY);
  }

  zoomLens(x: number, y: number, deltaY: number) {
    const zoomFactor = deltaY * -0.01;
    this.zoomScale.update(value => Math.min(Math.max(value + zoomFactor, 1), 10));
    this.drawImage();
    this.drawZoomBox(x, y);
  }

  drawZoomBox(x: number, y: number) {
    const zoomSize = 100;
    const zoomLevel = this.zoomScale;

    const sx = x - zoomSize / (2 * zoomLevel());
    const sy = y - zoomSize / (2 * zoomLevel());
    const sw = zoomSize / zoomLevel();
    const sh = zoomSize / zoomLevel();

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x - zoomSize / 2, y - zoomSize / 2, zoomSize, zoomSize);
    this.ctx.clip();
    this.ctx.drawImage(this.canvasRef()?.nativeElement, sx, sy, sw, sh, x - zoomSize / 2, y - zoomSize / 2, zoomSize, zoomSize);
    this.ctx.restore();
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
}
