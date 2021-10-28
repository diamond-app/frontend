import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferNftAcceptModalComponent } from "./transfer-nft-accept-modal.component";

describe("PlaceBidModalComponent", () => {
  let component: TransferNftAcceptModalComponent;
  let fixture: ComponentFixture<TransferNftAcceptModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferNftAcceptModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferNftAcceptModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
