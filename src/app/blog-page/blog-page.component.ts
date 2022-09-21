// @ts-strict
import { AfterViewInit, Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BackendApiService, PostEntryResponse } from "src/app/backend-api.service";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-blog-page",
  templateUrl: "./blog-page.component.html",
  styleUrls: ["./blog-page.component.scss"],
})
export class BlogPageComponent implements AfterViewInit {
  private pendingPageData: Promise<[any, PostEntryResponse[]]>;
  blogPosts: PostEntryResponse[] = [];
  username: string;

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {
    // For not we have no way to fetch only the blog posts. We just fetch the last 1000
    // items and filter to only blog posts
    this.username = route.snapshot.params.username;
    this.pendingPageData = Promise.all([
      this.backendApi
        .GetSingleProfile(this.globalVars.localNode, "", this.username)
        .toPromise()
        .then(({ Profile }) => Profile),
      this.backendApi
        .GetPostsForPublicKey(
          this.globalVars.localNode,
          "",
          this.username,
          this.globalVars.loggedInUser?.PublicKeyBase58Check,
          "",
          1000,
          false /*MediaRequired*/
        )
        .toPromise()
        .then(({ Posts }) =>
          Posts.filter(
            (p: PostEntryResponse) => typeof (p.PostExtraData as BlogPostExtraData).BlogDeltaRtfFormat !== "undefined"
          )
        ),
    ]);
  }

  ngAfterViewInit(): void {
    this.pendingPageData.then(([ProfileEntryResponse, posts]) => {
      this.blogPosts = posts.map((p) => ({ ...p, ProfileEntryResponse }));
    });
  }
}
