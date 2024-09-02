import { Component, ElementRef, input, signal, viewChild } from '@angular/core';

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

  canvasRef = viewChild<ElementRef>('canvas');

  private ctx!: CanvasRenderingContext2D;
  cropMode = signal<boolean>(false);
  rotation = signal<number>(0);
  zoomScale = signal<number>(1);

  image = new Image();
  originalImageData!: ImageData;
  beforeCropImageData!: ImageData;
  cropRect = { x: 0, y: 0, width: 200, height: 200 };
  draggingCrop = signal<boolean>(false);
  resizingCrop = signal<boolean>(false);
  cornerResize = signal<boolean>(false);
  startX = signal<number>(0);
  startY = signal<number>(0);

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
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    this.ctx.fillRect(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
    this.ctx.globalCompositeOperation = 'destination-atop';
    // this.ctx.drawImage(this.image, this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height, this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6]);
    this.ctx.strokeRect(this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);
    this.ctx.restore();
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
        if (e.target.result.startsWith('data:image/')) {
          this.image.src = e.target.result;
          this.image.onload = () => {
            this.drawImage();
            this.originalImageData = this.ctx.getImageData(0, 0, this.canvasRef()?.nativeElement.width, this.canvasRef()?.nativeElement.height);
          };
        } else {
          input.value = '';
          alert('יש להעלות תמונה בפורמט תמונה');
        }
      };
      reader.readAsDataURL(file);
    }
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
    tempCanvas.width = this.cropRect.width;
    tempCanvas.height = this.cropRect.height;
    tempCtx.drawImage(this.canvasRef()?.nativeElement, this.cropRect.x + 2, this.cropRect.y + 2, this.cropRect.width - 4, this.cropRect.height - 4, 0, 0, this.cropRect.width - 4, this.cropRect.height - 4);
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
    const link = document.createElement('a');
    link.href = this.canvasRef()?.nativeElement.toDataURL('image/png');
    link.download = 'image.png';
    link.click();
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
    if (!this.cropMode()) return; // Only handle if in crop mode

    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    this.startX.set(event.clientX - rect.left);
    this.startY.set(event.clientY - rect.top);

    if (this.isInCropArea(this.startX(), this.startY())) {
      this.draggingCrop.set(true); // Start dragging crop area
    } else if (this.isInResizeArea(this.startX(), this.startY())) {
      this.resizingCrop.set(true); // Start resizing crop area
    }
  }

  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef()?.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

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
      this.cropRect.width = Math.max(x - this.cropRect.x, 10); // Minimum width
      this.cropRect.height = Math.max(y - this.cropRect.y, 10); // Minimum height
    }

    this.drawImage(); // Redraw image
    this.drawCropLayout(); // Redraw crop layout
  }

  onMouseUp() {
    this.draggingCrop.set(false);
    this.resizingCrop.set(false);
    this.cornerResize.set(false);
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

  isInResizeArea(x: number, y: number): boolean {
    const resizeMargin = 10; // Pixels around the crop area corners to detect resizing
    return (
      (x > this.cropRect.x - resizeMargin && x < this.cropRect.x + resizeMargin && y > this.cropRect.y - resizeMargin && y < this.cropRect.y + resizeMargin) || // Top-left corner
      (x > this.cropRect.x + this.cropRect.width - resizeMargin && x < this.cropRect.x + this.cropRect.width + resizeMargin && y > this.cropRect.y - resizeMargin && y < this.cropRect.y + resizeMargin) || // Top-right corner
      (x > this.cropRect.x - resizeMargin && x < this.cropRect.x + resizeMargin && y > this.cropRect.y + this.cropRect.height - resizeMargin && y < this.cropRect.y + this.cropRect.height + resizeMargin) || // Bottom-left corner
      (x > this.cropRect.x + this.cropRect.width - resizeMargin && x < this.cropRect.x + this.cropRect.width + resizeMargin && y > this.cropRect.y + this.cropRect.height - resizeMargin && y < this.cropRect.y + this.cropRect.height + resizeMargin) // Bottom-right corner
    );
  }
}
