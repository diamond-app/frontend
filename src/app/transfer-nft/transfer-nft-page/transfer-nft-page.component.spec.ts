import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TransferNftPageComponent } from "./transfer-nft-page.component";

describe("TransferNftPageComponent", () => {
  let component: TransferNftPageComponent;
  let fixture: ComponentFixture<TransferNftPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransferNftPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransferNftPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
