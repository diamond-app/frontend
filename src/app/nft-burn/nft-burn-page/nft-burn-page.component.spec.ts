import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { NftBurnPageComponent } from "./nft-burn-page.component";

describe("PlaceBidPageComponent", () => {
  let component: NftBurnPageComponent;
  let fixture: ComponentFixture<NftBurnPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NftBurnPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NftBurnPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
