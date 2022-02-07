import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceBoxWidgetComponent } from './balance-box-widget.component';

describe('BalanceBoxComponent', () => {
  let component: BalanceBoxWidgetComponent;
  let fixture: ComponentFixture<BalanceBoxWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BalanceBoxWidgetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BalanceBoxWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
