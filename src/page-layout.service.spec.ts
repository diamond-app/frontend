import { TestBed } from "@angular/core/testing";

import { PageLayoutService } from "./page-layout.service";

describe("PageLayoutService", () => {
  let service: PageLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PageLayoutService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
