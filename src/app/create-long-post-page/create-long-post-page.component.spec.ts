import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CreateLongPostPageComponent } from "./notifications-page.component";

describe("NotificationsPageComponent", () => {
  let component: CreateLongPostPageComponent;
  let fixture: ComponentFixture<CreateLongPostPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CreateLongPostPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateLongPostPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
