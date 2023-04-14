import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TwitterSyncSettingsComponent } from "./twitter-sync-settings.component";

describe("TwitterSyncSettingsComponent", () => {
  let component: TwitterSyncSettingsComponent;
  let fixture: ComponentFixture<TwitterSyncSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TwitterSyncSettingsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TwitterSyncSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
