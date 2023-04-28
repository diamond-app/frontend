import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DraftsTableComponent } from "./drafts-table.component";

describe("DraftsTableComponent", () => {
  let component: DraftsTableComponent;
  let fixture: ComponentFixture<DraftsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DraftsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DraftsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
