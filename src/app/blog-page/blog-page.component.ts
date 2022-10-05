// @ts-strict
import { AfterViewInit, Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BackendApiService, PostEntryResponse, ProfileEntryResponse } from "src/app/backend-api.service";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-blog-page",
  templateUrl: "./blog-page.component.html",
  styleUrls: ["./blog-page.component.scss"],
})
export class BlogPageComponent implements AfterViewInit {
  private pendingPageData: Promise<[ProfileEntryResponse, PostEntryResponse[]]>;
  blogPosts: PostEntryResponse[] = [];
  profile?: ProfileEntryResponse;

  constructor(
    public backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {
    // For now we have no way to fetch only the blog posts. We just fetch the last 1000
    // items and filter to only blog posts
    this.pendingPageData = Promise.all([
      this.backendApi
        .GetSingleProfile(this.globalVars.localNode, "", route.snapshot.params.username)
        .toPromise()
        .then(({ Profile }) => Profile),
      this.backendApi
        .GetPostsForPublicKey(
          this.globalVars.localNode,
          "",
          route.snapshot.params.username,
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
      this.profile = ProfileEntryResponse;
      const pinnedPostIndex = posts.findIndex((p) => JSON.parse(p.PostExtraData?.BlogPostIsPinned ?? false));
      const pinnedPost = pinnedPostIndex > 0 ? posts[pinnedPostIndex] : null;
      const sortedPosts = pinnedPost
        ? [...posts.slice(0, pinnedPostIndex), ...posts.slice(pinnedPostIndex + 1)]
        : posts;
      sortedPosts.sort((a, b) => b.TimestampNanos - a.TimestampNanos);
      this.blogPosts = (pinnedPost ? [pinnedPost, ...sortedPosts] : sortedPosts).map((p) => ({
        ...p,
        ProfileEntryResponse,
      }));
    });
  }
}
