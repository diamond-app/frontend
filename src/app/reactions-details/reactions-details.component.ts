import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import {
  AssociationReactionValue,
  AssociationType,
  BackendApiService,
  PostAssociation,
  PostAssociationCountsResponse,
  User,
} from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { InfiniteScroller } from "../infinite-scroller";
import { difference, keyBy, orderBy, uniq } from "lodash";
import { finalize, map, mergeMap } from "rxjs/operators";
import { of } from "rxjs";

@Component({
  selector: "reactions-details",
  templateUrl: "./reactions-details.component.html",
  styleUrls: ["./reactions-details.component.scss"],
})
export class ReactionsDetailsComponent implements OnInit {
  @Input() postHashHex: string;

  loading = false;
  reactionTabs: Array<AssociationReactionValue> = [];
  activeReactionTab: AssociationReactionValue | string = "";
  postReactionCounts: PostAssociationCountsResponse = { Counts: {}, Total: 0 };
  userKeysReacted: Array<string> = [];
  usersByKey: { [publicKey: string]: User } = {};

  // Infinite scroll metadata.
  pageOffset = 0;
  lastPage = null;
  pageSize = 50;
  infiniteScroller: InfiniteScroller;
  datasource: IDatasource<IAdapter<any>>;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.postHashHex) {
      this.postHashHex = this.route.snapshot.params.postHashHex;
    }

    this.backendApi
      .GetPostAssociationsCounts(
        this.globalVars.localNode,
        this.postHashHex,
        AssociationType.reaction,
        Object.values(AssociationReactionValue)
      )
      .subscribe((c: PostAssociationCountsResponse) => {
        this.postReactionCounts = c;
        this.reactionTabs = this.processTabs(c.Counts);
        this.selectTab(this.reactionTabs[0]);
      });
  }

  selectTab(tab: string) {
    this.activeReactionTab = tab;
    this.userKeysReacted = [];
    this.fetchData(tab as AssociationReactionValue);
  }

  private fetchData(value: AssociationReactionValue) {
    if (this.reactionTabs.length === 0) {
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
        this.postReactionCounts.Counts[this.activeReactionTab]
      )
      .pipe(
        mergeMap((Associations) => {
          return this.fetchReactedUsers(Associations).pipe(
            map((usersByKey) => {
              return orderBy(
                Associations.map((e) => e.TransactorPublicKeyBase58Check),
                (key) => usersByKey[key].BalanceNanos,
                ["desc"]
              );
            })
          );
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((users: any) => {
        this.userKeysReacted = users;
        this.infiniteScroller = new InfiniteScroller(this.pageSize, this.getPage.bind(this), false);
        this.datasource = this.infiniteScroller.getDatasource();
      });
  }

  private fetchReactedUsers(reactions: Array<PostAssociation>) {
    const userKeysToFetch = this.getUserPublicKeys(reactions);

    if (!userKeysToFetch.length) {
      return of(this.usersByKey);
    }

    return this.backendApi.GetUsersStateless(this.globalVars.localNode, this.getUserPublicKeys(reactions), true).pipe(
      map(({ UserList }) => {
        this.usersByKey = { ...this.usersByKey, ...keyBy(UserList, "PublicKeyBase58Check") };
        return this.usersByKey;
      })
    );
  }

  private processTabs(reactionCounts: { [key in AssociationReactionValue]?: number }) {
    const filledInReactions = Object.entries(reactionCounts || {}).filter(([key, value]) => value > 0);
    return orderBy(filledInReactions, ([_key, value]) => value, "desc").map(([key]) => key as AssociationReactionValue);
  }

  private getUserPublicKeys(reactions: Array<PostAssociation>) {
    const userKeysReacted = uniq(reactions.map((e) => e.TransactorPublicKeyBase58Check));
    return difference(userKeysReacted, Object.keys(this.usersByKey));
  }

  getPage(page: number) {
    const lastPage = Math.ceil(this.userKeysReacted.length / this.pageSize);
    // After we have filled the lastPage, do not honor any more requests.
    if (page > lastPage) {
      return [];
    }
    const currentPageIdx = page * this.pageSize + this.pageOffset;
    const nextPageIdx = currentPageIdx + this.pageSize;
    return this.userKeysReacted.slice(currentPageIdx, nextPageIdx);
  }
}
