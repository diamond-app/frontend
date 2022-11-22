import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositEventHistoryComponent } from './deposit-event-history.component';

describe('DepositEventHistoryComponent', () => {
  let component: DepositEventHistoryComponent;
  let fixture: ComponentFixture<DepositEventHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepositEventHistoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DepositEventHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
