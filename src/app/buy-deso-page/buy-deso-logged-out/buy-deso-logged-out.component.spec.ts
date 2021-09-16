import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDESOLoggedOutComponent } from "./buy-deso-logged-out.component";

describe("BuyDESOLoggedOutComponent", () => {
  let component: BuyDESOLoggedOutComponent;
  let fixture: ComponentFixture<BuyDESOLoggedOutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDESOLoggedOutComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDESOLoggedOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
