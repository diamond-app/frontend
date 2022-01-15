import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TradeCreatorModalComponent } from "./trade-creator-modal.component";

describe("TradeCreatorComponent", () => {
  let component: TradeCreatorModalComponent;
  let fixture: ComponentFixture<TradeCreatorModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TradeCreatorModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TradeCreatorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
