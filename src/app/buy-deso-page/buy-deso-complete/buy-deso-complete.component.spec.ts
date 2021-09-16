import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDESOCompleteComponent } from "./buy-deso-complete.component";

describe("BuyDESOCompleteComponent", () => {
  let component: BuyDESOCompleteComponent;
  let fixture: ComponentFixture<BuyDESOCompleteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDESOCompleteComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDESOCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
