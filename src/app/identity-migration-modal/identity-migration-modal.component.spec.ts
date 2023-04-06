import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentityMigrationModalComponent } from './identity-migration-modal.component';

describe('IdentityMigrationModalComponent', () => {
  let component: IdentityMigrationModalComponent;
  let fixture: ComponentFixture<IdentityMigrationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IdentityMigrationModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IdentityMigrationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
