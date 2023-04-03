import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { BackendApiService } from "../backend-api.service";
import { GlobalVarsService } from "../global-vars.service";
import { InfiniteScroller } from "../infinite-scroller";

@Component({
  selector: "diamonds-details",
  templateUrl: "./diamonds-details.component.html",
  styleUrls: ["./diamonds-details.component.scss"],
})
export class DiamondsDetailsComponent implements OnInit {
  @Input() postHashHex: string;
  diamonds = [];
  errorLoading = false;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.postHashHex) {
      this.postHashHex = this.route.snapshot.params.postHashHex;
    }
  }

  // Infinite scroll metadata.
  pageOffset = 0;
  lastPage = null;
  pageSize = 25;

  getPage = (page: number) => {
    // After we have filled the lastPage, do not honor any more requests.
    if (this.lastPage !== null && page > this.lastPage) {
      return [];
    }

    return this.backendApi
      .GetDiamondsForPost(
        this.postHashHex,
        this.pageOffset,
        this.pageSize,
        this.globalVars.loggedInUser?.PublicKeyBase58Check
      )
      .toPromise()
      .then(
        (res) => {
          let diamondSendersPage = res.DiamondSenders;

          // Update the pageOffset now that we have successfully fetched a page.
          this.pageOffset += diamondSendersPage.length;

          // If we've hit the end of the followers with profiles, set last page and anonymous follower count.
          if (diamondSendersPage.length < this.pageSize) {
            this.lastPage = page;
          }
          // Return the page.
          return diamondSendersPage;
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

  infiniteScroller: InfiniteScroller = new InfiniteScroller(this.pageSize, this.getPage, this.globalVars.isMobile());
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
