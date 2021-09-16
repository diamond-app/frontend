import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDESOComponent } from "./buy-deso.component";

describe("BuyDESOComponent", () => {
  let component: BuyDESOComponent;
  let fixture: ComponentFixture<BuyDESOComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDESOComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDESOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
