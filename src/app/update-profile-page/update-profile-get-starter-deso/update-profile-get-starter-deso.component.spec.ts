import { ComponentFixture, TestBed } from "@angular/core/testing";

import { UpdateProfileGetStarterDESOComponent } from "./update-profile-get-starter-deso.component";

describe("UpdateProfileGetStarterDESOComponent", () => {
  let component: UpdateProfileGetStarterDESOComponent;
  let fixture: ComponentFixture<UpdateProfileGetStarterDESOComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateProfileGetStarterDESOComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateProfileGetStarterDESOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
