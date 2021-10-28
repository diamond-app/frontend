import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferNftAcceptPageComponent } from "./transfer-nft-accept-page.component";

describe("PlaceBidPageComponent", () => {
  let component: TransferNftAcceptPageComponent;
  let fixture: ComponentFixture<TransferNftAcceptPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferNftAcceptPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferNftAcceptPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
