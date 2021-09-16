import { ComponentFixture, TestBed } from "@angular/core/testing";

import { GetStarterDESOPageComponent } from "./get-starter-deso-page.component";

describe("GetStarterDESOPageComponent", () => {
  let component: GetStarterDESOPageComponent;
  let fixture: ComponentFixture<GetStarterDESOPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GetStarterDESOPageComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GetStarterDESOPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
