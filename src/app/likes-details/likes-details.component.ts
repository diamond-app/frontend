import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { InfiniteScroller } from "../infinite-scroller";

@Component({
  selector: "likes-details",
  templateUrl: "./likes-details.component.html",
})
export class LikesDetailsComponent implements OnInit {
  @Input() postHashHex: string;
  diamonds = [];
  loading = false;
  errorLoading = false;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    if (!this.postHashHex) {
      this.postHashHex = this.route.snapshot.params.postHashHex;
    }
  }

  // Infinite scroll metadata.
  pageOffset = 0;
  lastPage = null;
  pageSize = 50;

  getPage = (page: number) => {
    // After we have filled the lastPage, do not honor any more requests.
    if (this.lastPage != null && page > this.lastPage) {
      return [];
    }
    this.loading = true;
    return this.backendApi
      .GetLikesForPost(
        this.globalVars.localNode,
        this.postHashHex,
        this.pageOffset,
        this.pageSize,
        this.globalVars.loggedInUser?.PublicKeyBase58Check
      )
      .toPromise()
      .then(
        (res) => {
          let likersPage = res.Likers;

          // Update the pageOffset now that we have successfully fetched a page.
          this.pageOffset += likersPage.length;

          // If we've hit the end of the followers with profiles, set last page and anonymous follower count.
          if (likersPage.length < this.pageSize) {
            this.lastPage = page;
          }

          this.loading = false;

          // Return the page.
          return likersPage;
        },
        (err) => {
          this.errorLoading = true;
        }
      );
  };

  navigateToPost() {
    this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.postHashHex], {
      queryParamsHandling: "merge",
    });
  }

  infiniteScroller: InfiniteScroller = new InfiniteScroller(this.pageSize, this.getPage, false);
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
