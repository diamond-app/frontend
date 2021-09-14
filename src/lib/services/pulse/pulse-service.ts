import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BackendApiService, ProfileEntryResponse, User } from "../../../app/backend-api.service";
import { Observable, of } from "rxjs";
import { GlobalVarsService } from "../../../app/global-vars.service";
import { map, switchMap } from "rxjs/operators";
import * as _ from "lodash";

class PulseLeaderboardResult {
  public_key: string;
  diamonds?: number;
  net_change_24h_bitclout_nanos?: number;
}

class PulseLeaderboardResponse {
  results: PulseLeaderboardResult[];
  pagination: {
    current_page: number;
    total_pages: number;
  };
}

const DeSoLocked = "bitclout_locked_24h";
const Diamonds = "diamonds_received_24h";

export enum PulseLeaderboardType {
  DeSoLocked = "bitclout_locked_24h",
  Diamonds = "diamonds_received_24h",
}

export class LeaderboardResponse {
  Profile: ProfileEntryResponse;
  DeSoLockedGained: number;
  DiamondsReceived: number;
  User: User;
}

export const LeaderboardToDataAttribute = {
  [PulseLeaderboardType.DeSoLocked]: "net_change_24h_bitclout_nanos",
  [PulseLeaderboardType.Diamonds]: "diamonds",
};

@Injectable({
  providedIn: "root",
})
export class PulseService {
  static pulseApiURL = "https://pulse.bitclout.com/api/bitclout/leaderboard";
  static pulseRef = "ref=bcl";
  static pulsePageSize = 20;
  constructor(
    private httpClient: HttpClient,
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService
  ) {}

  constructPulseURL(
    leaderboardType: string,
    pageIndex: number = 0,
    pageSize: number = PulseService.pulsePageSize
  ): string {
    return `${PulseService.pulseApiURL}/${leaderboardType}?${PulseService.pulseRef}&page_size=${pageSize}&page_index=${pageIndex}`;
  }

  getDiamondsReceivedLeaderboard(): Observable<any> {
    return this.getDiamondsReceivedPage(0);
  }

  getDiamondsReceivedPage(
    pageNumber: number,
    pageSize: number = PulseService.pulsePageSize,
    skipFilters = false
  ): Observable<any> {
    return this.httpClient.get(this.constructPulseURL(PulseLeaderboardType.Diamonds, pageNumber, pageSize)).pipe(
      switchMap((res: PulseLeaderboardResponse) => {
        return this.getProfilesForPulseLeaderboard(res, PulseLeaderboardType.Diamonds, skipFilters);
      })
    );
  }

  getDeSoLockedLeaderboard(): Observable<LeaderboardResponse[]> {
    return this.getDeSoLockedPage(0);
  }

  getDeSoLockedPage(
    pageNumber: number,
    pageSize: number = PulseService.pulsePageSize,
    skipFilters = false
  ): Observable<any> {
    return this.httpClient
      .get(this.constructPulseURL(PulseLeaderboardType.DeSoLocked, pageNumber, pageSize))
      .pipe(
        switchMap((res: PulseLeaderboardResponse) =>
          this.getProfilesForPulseLeaderboard(res, PulseLeaderboardType.DeSoLocked, skipFilters)
        )
      );
  }

  getProfilesForPulseLeaderboard(
    res: PulseLeaderboardResponse,
    leaderboardType: PulseLeaderboardType,
    skipFilters: boolean = false
  ): Observable<LeaderboardResponse[]> {
    const results = res.results;
    if (results.length === 0) {
      return of([]);
    }
    return this.backendApi
      .GetUsersStateless(
        this.globalVars.localNode,
        results.map((result) => result.public_key),
        true
      )
      .pipe(
        map((res: any) => {
          if (!skipFilters) {
            res.UserList = _.filter(
              res.UserList,
              (o) => o.ProfileEntryResponse !== null && !o.IsGraylisted && !o.IsBlacklisted
            );
            if (res.UserList.length > 10) {
              res.UserList = res.UserList.slice(0, 10);
            }
          }

          return res.UserList.map((user: User, index: number) => {
            return {
              User: user,
              Profile: user.ProfileEntryResponse,
              DeSoLockedGained:
                leaderboardType === PulseLeaderboardType.DeSoLocked
                  ? results[index][LeaderboardToDataAttribute[leaderboardType]]
                  : null,
              DiamondsReceived:
                leaderboardType === PulseLeaderboardType.Diamonds
                  ? results[index][LeaderboardToDataAttribute[leaderboardType]]
                  : null,
            };
          });
        })
      );
  }
}
