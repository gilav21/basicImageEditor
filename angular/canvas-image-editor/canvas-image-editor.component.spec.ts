import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasImageEditorComponent } from './canvas-image-editor.component';

describe('CanvasImageEditorComponent', () => {
  let component: CanvasImageEditorComponent;
  let fixture: ComponentFixture<CanvasImageEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasImageEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CanvasImageEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
