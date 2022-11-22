import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashoutModalComponent } from './cashout-modal.component';

describe('CashoutModalComponent', () => {
  let component: CashoutModalComponent;
  let fixture: ComponentFixture<CashoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CashoutModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CashoutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
