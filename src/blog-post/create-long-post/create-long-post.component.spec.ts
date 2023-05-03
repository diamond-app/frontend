import { ComponentFixture, TestBed } from "@angular/core/testing";

import { CreateLongPostComponent } from "./notifications-list.component";

describe("NotificationsListComponent", () => {
  let component: CreateLongPostComponent;
  let fixture: ComponentFixture<CreateLongPostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateLongPostComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateLongPostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
