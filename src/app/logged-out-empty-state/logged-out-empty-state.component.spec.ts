import { ComponentFixture, TestBed } from "@angular/core/testing";

import { LoggedOutEmptyStateComponent } from "./logged-out-empty-state.component";

describe("LoggedOutEmptyStateComponent", () => {
  let component: LoggedOutEmptyStateComponent;
  let fixture: ComponentFixture<LoggedOutEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoggedOutEmptyStateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoggedOutEmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
