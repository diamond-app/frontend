import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BackendApiService } from "../../../app/backend-api.service";
import { GlobalVarsService } from "../../../app/global-vars.service";

@Injectable({
  providedIn: "root",
})
export class CloudflareStreamService {
  constructor(
    private httpClient: HttpClient,
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService
  ) {}

  checkVideoStatusById(assetId: string): Promise<[boolean, boolean, boolean]> {
    if (assetId === "") {
      console.error("Invalid VideoID");
      return Promise.resolve([false, true, true]);
    }

    return this.backendApi
      .GetVideoStatus(assetId)
      .toPromise()
      .then(({ status }) => {
        const phase = status?.phase;
        if (phase === "ready") {
          return [true, true, false];
        } else if (phase === "failed") {
          return [false, true, true];
        } else {
          return [false, false, false];
        }
      });
  }

  checkVideoStatusByURL(assetId: string): Promise<[boolean, boolean, boolean]> {
    if (assetId === "") {
      console.error("Unable to extract VideoID");
      return Promise.resolve([false, true, true]);
    }
    return this.checkVideoStatusById(assetId);
  }
}
