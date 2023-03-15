import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import {
  AssociationReactionValue,
  AssociationType,
  BackendApiService,
  PostAssociation,
  PostAssociationCountsResponse,
  PostEntryResponse,
  ProfileEntryResponse,
  User,
} from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { InfiniteScroller } from "../infinite-scroller";
import { difference, keyBy, orderBy, uniq } from "lodash";
import { finalize, map, mergeMap, switchMap, tap } from "rxjs/operators";
import { of } from "rxjs";
import { BsModalRef } from "ngx-bootstrap/modal";

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
      .GetSinglePost(
        this.globalVars.localNode,
        this.postHashHex,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        false,
        0,
        0,
        false
      )
      .pipe(
        tap((res) => {
          this.post = res.PostFound;
        }),
        switchMap((res) => {
          return this.backendApi.GetPostAssociationsCounts(
            this.globalVars.localNode,
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
        this.globalVars.localNode,
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
              return (profile as any).DESOBalanceNanos + desoLockedNanos;
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
