import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SignUpTransferDesoComponent } from "./sign-up-get-starter-deso.component";

describe("SignUpGetStarterDeSoComponent", () => {
  let component: SignUpTransferDesoComponent;
  let fixture: ComponentFixture<SignUpTransferDesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SignUpTransferDesoComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpTransferDesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
