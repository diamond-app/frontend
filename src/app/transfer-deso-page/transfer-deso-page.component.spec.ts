import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferDESOPageComponent } from "./transfer-deso-page.component";

describe("TransferDESOPageComponent", () => {
  let component: TransferDESOPageComponent;
  let fixture: ComponentFixture<TransferDESOPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferDESOPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferDESOPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
