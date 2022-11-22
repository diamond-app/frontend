import { ComponentFixture, TestBed } from "@angular/core/testing";

import { EmailSubscribeComponent } from "./email-subscribe.component";

describe("SettingsComponent", () => {
  let component: EmailSubscribeComponent;
  let fixture: ComponentFixture<EmailSubscribeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmailSubscribeComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailSubscribeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
