import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { AssociationType, BackendApiService, PostAssociationCountsResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { InfiniteScroller } from "../../infinite-scroller";
import { orderBy } from "lodash";
import { finalize, map, switchMap, tap } from "rxjs/operators";
import { BsModalRef } from "ngx-bootstrap/modal";
import { PostEntryResponse, ProfileEntryResponse } from "deso-protocol";

@Component({
  selector: "poll-details",
  templateUrl: "./poll-details.component.html",
  styleUrls: ["./poll-details.component.scss"],
})
export class PollDetailsComponent implements OnInit {
  @Input() postHashHex: string;
  @Input() bsModalRef: BsModalRef | null = null;

  loading = false;
  voteTabs: Array<string> = [];
  activeVoteTab: string | null = null;
  postVoteCounts: PostAssociationCountsResponse = { Counts: {}, Total: 0 };
  usersReacted: Array<{ publicKey: string; profile: ProfileEntryResponse | null }> = [];

  // Infinite scroll metadata.
  pageOffset = 0;
  lastPage = null;
  pageSize = 50;
  infiniteScroller: InfiniteScroller;
  datasource: IDatasource<IAdapter<any>>;
  post: PostEntryResponse;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.postHashHex) {
      this.postHashHex = this.route.snapshot.params.postHashHex;
    }

    this.loading = true;

    this.backendApi
      .GetSinglePost(this.postHashHex, this.globalVars.loggedInUser?.PublicKeyBase58Check, false, 0, 0, false)
      .pipe(
        tap((res) => {
          this.post = res.PostFound;
        }),
        switchMap((res) => {
          return this.backendApi.GetPostAssociationsCounts(
            res.PostFound,
            AssociationType.pollResponse,
            JSON.parse(this.post.PostExtraData.PollOptions),
            true
          );
        })
      )
      .subscribe((c: PostAssociationCountsResponse) => {
        this.postVoteCounts = c;
        this.voteTabs = this.processTabs(c.Counts);
        this.selectTab(this.voteTabs[0]);
      });
  }

  selectTab(tab: string) {
    this.activeVoteTab = tab;
    this.usersReacted = [];
    this.fetchData(tab as string);
  }

  private fetchData(value: string) {
    if (this.voteTabs.length === 0) {
      this.loading = false;
      return;
    }

    this.loading = true;

    this.backendApi
      .GetAllPostAssociations(
        this.postHashHex,
        AssociationType.pollResponse,
        undefined,
        value,
        true,
        this.postVoteCounts.Counts[this.activeVoteTab]
      )
      .pipe(
        map(({ Associations, PublicKeyToProfileEntryResponse }) => {
          return orderBy(
            Associations.map((e) => ({
              publicKey: e.TransactorPublicKeyBase58Check,
              profile: PublicKeyToProfileEntryResponse[e.TransactorPublicKeyBase58Check],
            })),
            ({ profile }) => {
              const desoLockedNanos = profile?.CoinEntry?.DeSoLockedNanos || 0;
              return ((profile as any)?.DESOBalanceNanos || 0) + desoLockedNanos;
            },
            ["desc"]
          );
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((users: any) => {
        this.usersReacted = users;
        this.infiniteScroller = new InfiniteScroller(this.pageSize, this.getPage.bind(this), false);
        this.datasource = this.infiniteScroller.getDatasource();
      });
  }

  private processTabs(voteCounts: { [key in string]?: number }) {
    const votesReacted = Object.entries(voteCounts || {}).filter(([key, value]) => value > 0);
    return orderBy(votesReacted, ([_key, value]) => value, "desc").map(([key]) => key as string);
  }

  getPage(page: number) {
    const lastPage = Math.ceil(this.usersReacted.length / this.pageSize);
    // After we have filled the lastPage, do not honor any more requests.
    if (page > lastPage) {
      return [];
    }
    const currentPageIdx = page * this.pageSize + this.pageOffset;
    const nextPageIdx = currentPageIdx + this.pageSize;
    return this.usersReacted.slice(currentPageIdx, nextPageIdx);
  }
}
