import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";

class OpenProsperHashtag {
  Hashtag: string;
  Count: number;
  AccountCount: number;
}

class OpenProsperHashtagResult {
  ok: boolean;
  value: {
    Hours24: {
      FromTstampSecs: number;
      ToTstampSecs: number;
      Top10Hashtags: OpenProsperHashtag[];
    };
  };
}

export enum OpenProsperLeaderboardType {
  Hashtags = "trending-hashtags-x8k6jw1",
}

@Injectable({
  providedIn: "root",
})
export class OpenProsperService {
  static openProsperApiUrl = "https://openprosperapi.xyz/api/v0/p/social";
  constructor(private httpClient: HttpClient) {}

  constructOpenProsperURL(leaderboardType: string): string {
    return `${OpenProsperService.openProsperApiUrl}/${leaderboardType}`;
  }

  getTrendingHashtagsPage(): Observable<any> {
    return this.httpClient.get(this.constructOpenProsperURL(OpenProsperLeaderboardType.Hashtags)).pipe(
      switchMap((res: OpenProsperHashtagResult) => {
        return of(res.value.Hours24.Top10Hashtags);
      })
    );
  }

}
