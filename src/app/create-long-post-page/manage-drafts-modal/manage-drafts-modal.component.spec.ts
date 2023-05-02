import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ManageDraftsModalComponent } from "./manage-drafts-modal.component";

describe("ManageDraftsModalComponent", () => {
  let component: ManageDraftsModalComponent;
  let fixture: ComponentFixture<ManageDraftsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManageDraftsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageDraftsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
