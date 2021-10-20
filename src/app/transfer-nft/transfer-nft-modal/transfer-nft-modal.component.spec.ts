import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferNftModalComponent } from "./transfer-nft-modal.component";

describe("TransferNftModalComponent", () => {
  let component: TransferNftModalComponent;
  let fixture: ComponentFixture<TransferNftModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferNftModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferNftModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
