import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PostEntryResponse, ProfileEntryResponse } from "deso-protocol";
import { BsModalRef } from "ngx-bootstrap/modal";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { finalize, map, switchMap, tap } from "rxjs/operators";
import {
  AssociationReactionValue,
  AssociationType,
  BackendApiService,
  PostAssociationCountsResponse,
} from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { InfiniteScroller } from "../infinite-scroller";
import { orderBy } from "lodash";

@Component({
  selector: "reactions-details",
  templateUrl: "./reactions-details.component.html",
  styleUrls: ["./reactions-details.component.scss"],
})
export class ReactionsDetailsComponent implements OnInit {
  @Input() postHashHex: string;
  @Input() bsModalRef: BsModalRef | null = null;

  loading = false;
  reactionTabs: Array<AssociationReactionValue> = [];
  activeReactionTab: AssociationReactionValue | null = null;
  postReactionCounts: PostAssociationCountsResponse = { Counts: {}, Total: 0 };
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
            AssociationType.reaction,
            Object.values(AssociationReactionValue),
            true
          );
        })
      )
      .subscribe((c: PostAssociationCountsResponse) => {
        this.postReactionCounts = c;
        this.reactionTabs = this.processTabs(c.Counts);
        this.selectTab(this.reactionTabs[0]);
      });
  }

  selectTab(tab: AssociationReactionValue) {
    this.activeReactionTab = tab;
    this.usersReacted = [];
    this.fetchData(tab as AssociationReactionValue);
  }

  private fetchData(value: AssociationReactionValue) {
    if (this.reactionTabs.length === 0) {
      this.loading = false;
      return;
    }

    this.loading = true;

    this.backendApi
      .GetAllPostAssociations(
        this.postHashHex,
        AssociationType.reaction,
        undefined,
        value,
        true,
        this.postReactionCounts.Counts[this.activeReactionTab]
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
              return (profile?.DESOBalanceNanos || 0) + desoLockedNanos;
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

  private processTabs(reactionCounts: { [key in AssociationReactionValue]?: number }) {
    const filledInReactions = Object.entries(reactionCounts || {}).filter(([key, value]) => value > 0);
    return orderBy(filledInReactions, ([_key, value]) => value, "desc").map(([key]) => key as AssociationReactionValue);
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
