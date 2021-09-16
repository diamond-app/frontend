import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDESOPageComponent } from "./buy-deso-page.component";

describe("BuyDESOPageComponent", () => {
  let component: BuyDESOPageComponent;
  let fixture: ComponentFixture<BuyDESOPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDESOPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDESOPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
