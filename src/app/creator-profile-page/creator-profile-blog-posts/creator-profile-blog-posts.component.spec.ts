import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorProfileBlogPostsComponent } from './creator-profile-blog-posts.component';

describe('CreatorProfileBlogPostsComponent', () => {
  let component: CreatorProfileBlogPostsComponent;
  let fixture: ComponentFixture<CreatorProfileBlogPostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreatorProfileBlogPostsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreatorProfileBlogPostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
