import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDesoTutorialComponent } from "./buy-deso-tutorial.component";

describe("BuyCreatorCoinsTutorialComponent", () => {
  let component: BuyDesoTutorialComponent;
  let fixture: ComponentFixture<BuyDesoTutorialComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDesoTutorialComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDesoTutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
