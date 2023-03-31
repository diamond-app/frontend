//@ts-strict
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

export interface OpenProsperAPIResult<T> {
  ok: boolean;
  value: T;
}

interface OpenProsperHashtags {
  Hashtag: string;
  Count: number;
  AccountCount: number;
}

interface OpenProsperTopHashtags {
  Hours24: {
    FromTstampSecs: number;
    ToTstampSecs: number;
    Top10Hashtags: OpenProsperHashtags[];
  };
}

export interface OpenProsperAggregateEarnings {
  last24h: number;
  last7d: number;
  last30d: number;
  allTime: number;
}

export interface OpenProsperEarningsDetail {
  DiamondsReceivedNanos: number;
  FREarnedNanos: number;
  NFTEarnings: number;
  NFTEarningsBreakdown: {
    NFTPrimarySaleNanos: number;
    NFTOwnSecondarySaleNanos: number;
    NFTOtherSecondarySaleNanos: number;
    NFTRoyaltySplitSaleNanos: number;
    NFTBuyNowNanos: number;
  };
}

export enum OpenProsperLeaderboardType {
  Hashtags = "trending-hashtags-x8k6jw1",
}

const buildURL = (endpoint: string) => `https://openprosperapi.xyz/api/v0/${endpoint}`;
const API_HEADERS = {
  // NOTE: the api requires this header, but it's currently not used for
  // anything, so just setting it to a dummy placeholder value. we may need to
  // revisit this if the api changes how it handles it.
  "op-token": "0",
};

@Injectable({
  providedIn: "root",
})
export class OpenProsperService {
  constructor(private httpClient: HttpClient) {}

  getTrendingHashtagsPage(): Observable<OpenProsperHashtags[]> {
    return this.httpClient
      .get<OpenProsperAPIResult<OpenProsperTopHashtags>>(buildURL(`p/social/${OpenProsperLeaderboardType.Hashtags}`))
      .pipe(map((res) => res.value.Hours24.Top10Hashtags));
  }

  getAggregateEarnings(): Observable<OpenProsperAggregateEarnings> {
    return this.httpClient
      .post<OpenProsperAPIResult<OpenProsperAggregateEarnings>>(buildURL("p/economic/creator-earnings"), null, {
        headers: API_HEADERS,
      })
      .pipe(map((r) => r.value));
  }
}
