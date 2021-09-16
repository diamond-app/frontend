import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferDESOComponent } from "./transfer-deso.component";

describe("TransferDESOComponent", () => {
  let component: TransferDESOComponent;
  let fixture: ComponentFixture<TransferDESOComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferDESOComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferDESOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
