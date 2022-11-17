import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwitterSyncPageComponent } from './twitter-sync-page.component';

describe('TwitterSyncPageComponent', () => {
  let component: TwitterSyncPageComponent;
  let fixture: ComponentFixture<TwitterSyncPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TwitterSyncPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TwitterSyncPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
