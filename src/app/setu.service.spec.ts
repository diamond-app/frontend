import { TestBed } from '@angular/core/testing';

import { SetuService } from './setu.service';

describe('SetuService', () => {
  let service: SetuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SetuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
