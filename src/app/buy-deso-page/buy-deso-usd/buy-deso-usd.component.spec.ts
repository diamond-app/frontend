import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDESOUSDComponent } from "./buy-deso-usd.component";

describe("BuyDESOUSDComponent", () => {
  let component: BuyDESOUSDComponent;
  let fixture: ComponentFixture<BuyDESOUSDComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDESOUSDComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDESOUSDComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
