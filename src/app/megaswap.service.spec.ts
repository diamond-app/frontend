import { TestBed } from '@angular/core/testing';

import { MegaswapService } from './megaswap.service';

describe('MegaswapService', () => {
  let service: MegaswapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MegaswapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
