import { ComponentFixture, TestBed } from "@angular/core/testing";

import { GetStarterDESOComponent } from "./get-starter-deso.component";

describe("GetStarterDESOComponent", () => {
  let component: GetStarterDESOComponent;
  let fixture: ComponentFixture<GetStarterDESOComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GetStarterDESOComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GetStarterDESOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
