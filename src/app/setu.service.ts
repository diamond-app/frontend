import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

const buildURL = (endpoint: string) => `${environment.setuAPI}/${endpoint}`;

@Injectable({
  providedIn: "root",
})
export class SetuService {
  constructor(private http: HttpClient) {}

  getSettings() {
    return this.http.post(buildURL("real-time-sync/get-current-subscriptions"), {
      public_key: "BC1YLivYU6g9w3LXNnS7Amiji3AoQQjDNKgTX8GEeaTo7J9551nFCTB",
      twitter_user_id: "1470865227570814976",
    });
  }
}
