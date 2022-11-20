import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EarningsCardComponent } from './earnings-card.component';

describe('EarningsCardComponent', () => {
  let component: EarningsCardComponent;
  let fixture: ComponentFixture<EarningsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EarningsCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EarningsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
