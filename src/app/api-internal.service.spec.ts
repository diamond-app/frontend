import { TestBed } from "@angular/core/testing";
import { ApiInternalService } from "./api-internal.service";

describe("InternalApiService", () => {
  let service: ApiInternalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiInternalService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
