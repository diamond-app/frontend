import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { NftBurnModalComponent } from "./nft-burn-modal.component";

describe("PlaceBidModalComponent", () => {
  let component: NftBurnModalComponent;
  let fixture: ComponentFixture<NftBurnModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NftBurnModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NftBurnModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
