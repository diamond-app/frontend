import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SwipeToChooseComponent } from "./swipe-to-choose.component";

describe("SwipeToChooseComponent", () => {
  let component: SwipeToChooseComponent;
  let fixture: ComponentFixture<SwipeToChooseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SwipeToChooseComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SwipeToChooseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
