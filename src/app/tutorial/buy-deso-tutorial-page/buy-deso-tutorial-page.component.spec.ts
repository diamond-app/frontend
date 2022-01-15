import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { BuyDesoTutorialPageComponent } from "./buy-deso-tutorial-page.component";

describe("BuyCreatorCoinsTutorialPageComponent", () => {
  let component: BuyDesoTutorialPageComponent;
  let fixture: ComponentFixture<BuyDesoTutorialPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDesoTutorialPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDesoTutorialPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
