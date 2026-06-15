import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const CROP_W = 280;
const CROP_H = 336; // ratio 5:6 — photo carte membre
const OUTPUT_W = 400;
const OUTPUT_H = 480;

@Component({
  selector: 'app-photo-crop-modal',
  imports: [],
  template: `
    <div class="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div class="crop-modal__backdrop" (click)="cancelled.emit()"></div>
      <div class="crop-modal__panel">
        <h3 id="crop-title">Recadrer la photo</h3>
        <p class="crop-modal__hint">Glissez pour repositionner, utilisez le zoom pour ajuster.</p>

        <div
          class="crop-modal__viewport"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp()"
          (pointercancel)="onPointerUp()"
          (pointerleave)="onPointerUp()"
        >
          <canvas #previewCanvas [width]="cropW" [height]="cropH" class="crop-modal__canvas"></canvas>
          <div class="crop-modal__frame" aria-hidden="true"></div>
        </div>

        <label class="crop-modal__zoom">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            [value]="zoomFactor()"
            (input)="onZoom($event)"
          />
        </label>

        <div class="crop-modal__actions">
          <button type="button" class="crop-modal__btn crop-modal__btn--ghost" (click)="cancelled.emit()">
            Annuler
          </button>
          <button type="button" class="crop-modal__btn crop-modal__btn--primary" (click)="confirm()">
            Appliquer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .crop-modal {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .crop-modal__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
    }

    .crop-modal__panel {
      position: relative;
      z-index: 1;
      width: min(100%, 360px);
      background: var(--color-surface);
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
    }

    .crop-modal__panel h3 {
      margin: 0 0 0.25rem;
      font-size: 1.05rem;
      color: var(--color-text);
    }

    .crop-modal__hint {
      margin: 0 0 1rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .crop-modal__viewport {
      position: relative;
      width: 280px;
      height: 336px;
      margin: 0 auto 1rem;
      border-radius: 10px;
      overflow: hidden;
      cursor: grab;
      touch-action: none;
      user-select: none;
      background: #0f172a;
    }

    .crop-modal__viewport:active {
      cursor: grabbing;
    }

    .crop-modal__canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .crop-modal__frame {
      position: absolute;
      inset: 0;
      border: 2px solid #f2b705;
      border-radius: 10px;
      pointer-events: none;
      box-shadow: inset 0 0 0 9999px rgba(15, 23, 42, 0.25);
    }

    .crop-modal__zoom {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .crop-modal__zoom input {
      width: 100%;
      accent-color: var(--color-primary);
    }

    .crop-modal__actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .crop-modal__btn {
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .crop-modal__btn--ghost {
      background: var(--color-hover);
      color: var(--color-text-muted);
    }

    .crop-modal__btn--primary {
      background: var(--color-primary);
      color: #fff;
    }
  `,
})
export class PhotoCropModalComponent {
  readonly imageSrc = input.required<string>();
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  readonly cropW = CROP_W;
  readonly cropH = CROP_H;

  readonly zoomFactor = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);

  private readonly previewCanvas = viewChild<ElementRef<HTMLCanvasElement>>('previewCanvas');

  private img: HTMLImageElement | null = null;
  private baseScale = 1;
  private dragging = false;
  private dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

  constructor() {
    afterNextRender(() => this.loadImage());
  }

  onZoom(event: Event): void {
    this.zoomFactor.set(Number((event.target as HTMLInputElement).value));
    this.clampOffset();
    this.redraw();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.img) return;
    this.dragging = true;
    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
      ox: this.offsetX(),
      oy: this.offsetY(),
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.offsetX.set(this.dragStart.ox + (event.clientX - this.dragStart.x));
    this.offsetY.set(this.dragStart.oy + (event.clientY - this.dragStart.y));
    this.clampOffset();
    this.redraw();
  }

  onPointerUp(): void {
    this.dragging = false;
  }

  confirm(): void {
    if (!this.img) return;

    const out = document.createElement('canvas');
    out.width = OUTPUT_W;
    out.height = OUTPUT_H;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

    const { sx, sy, sw, sh, dx, dy, dw, dh } = this.getCropRect();
    ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);

    this.confirmed.emit(out.toDataURL('image/jpeg', 0.88));
  }

  private loadImage(): void {
    const img = new Image();
    img.onload = () => {
      this.img = img;
      this.baseScale = Math.max(CROP_W / img.width, CROP_H / img.height);
      this.zoomFactor.set(1);
      this.offsetX.set(0);
      this.offsetY.set(0);
      this.redraw();
    };
    img.onerror = () => this.cancelled.emit();
    img.src = this.imageSrc();
  }

  private currentScale(): number {
    return this.baseScale * this.zoomFactor();
  }

  private getImageDrawParams(): { x: number; y: number; w: number; h: number } {
    const img = this.img!;
    const scale = this.currentScale();
    const w = img.width * scale;
    const h = img.height * scale;
    const x = CROP_W / 2 - w / 2 + this.offsetX();
    const y = CROP_H / 2 - h / 2 + this.offsetY();
    return { x, y, w, h };
  }

  private getCropRect(): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
  } {
    const img = this.img!;
    const { x, y, w, h } = this.getImageDrawParams();
    const scale = this.currentScale();

    const visX = Math.max(0, -x);
    const visY = Math.max(0, -y);
    const visW = Math.min(CROP_W, w - visX);
    const visH = Math.min(CROP_H, h - visY);

    const sx = visX / scale;
    const sy = visY / scale;
    const sw = visW / scale;
    const sh = visH / scale;

    const dx = (x < 0 ? 0 : x) * (OUTPUT_W / CROP_W);
    const dy = (y < 0 ? 0 : y) * (OUTPUT_H / CROP_H);
    const dw = visW * (OUTPUT_W / CROP_W);
    const dh = visH * (OUTPUT_H / CROP_H);

    return { sx, sy, sw, sh, dx, dy, dw, dh };
  }

  private clampOffset(): void {
    if (!this.img) return;

    const { w, h } = this.getImageDrawParams();
    const maxOx = Math.max(0, (w - CROP_W) / 2);
    const maxOy = Math.max(0, (h - CROP_H) / 2);

    this.offsetX.update((v) => Math.min(maxOx, Math.max(-maxOx, v)));
    this.offsetY.update((v) => Math.min(maxOy, Math.max(-maxOy, v)));
  }

  private redraw(): void {
    const canvas = this.previewCanvas()?.nativeElement;
    const img = this.img;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CROP_W, CROP_H);

    const { x, y, w, h } = this.getImageDrawParams();
    ctx.drawImage(img, x, y, w, h);
  }
}
