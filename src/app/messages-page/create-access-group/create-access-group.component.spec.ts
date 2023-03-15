import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateAccessGroupComponent } from './create-access-group.component';

describe('CreateAccessGroupComponent', () => {
  let component: CreateAccessGroupComponent;
  let fixture: ComponentFixture<CreateAccessGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateAccessGroupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateAccessGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
