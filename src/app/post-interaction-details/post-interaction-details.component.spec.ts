import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostInteractionDetailsComponent } from './post-interaction-details.component';

describe('PostInteractionDetailsComponent', () => {
  let component: PostInteractionDetailsComponent;
  let fixture: ComponentFixture<PostInteractionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PostInteractionDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostInteractionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
