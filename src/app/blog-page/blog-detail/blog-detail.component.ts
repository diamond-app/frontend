import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BackendApiService, PostEntryResponse, ProfileEntryResponse } from "src/app/backend-api.service";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-blog-detail",
  templateUrl: "./blog-detail.component.html",
  styleUrls: ["./blog-detail.component.scss"],
})
export class BlogDetailComponent implements OnInit {
  isLoading = true;
  post: PostEntryResponse;
  recentPosts: PostEntryResponse[] = [];

  @Output() diamondSent = new EventEmitter();

  ngOnInit() {}

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe(() => {
      // TODO: error handling
      this.isLoading = true;
      this.backendApi
        .GetSinglePost(
          this.globalVars.localNode,
          route.snapshot.params.postHashHex /*PostHashHex*/,
          this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
          false /*FetchParents */,
          0 /*CommentOffset*/,
          20 /*CommentLimit*/,
          this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
          2 /*ThreadLevelLimit*/,
          1 /*ThreadLeafLimit*/,
          false /*LoadAuthorThread*/
        )
        .toPromise()
        .then(({ PostFound }) => {
          this.post = PostFound;
          return PostFound;
        })
        .then((post: PostEntryResponse) => {
          // NOTE: don't return this since it would block rendering for the
          // initial post fetch.
          this._fetchRecentPosts(post.ProfileEntryResponse);
        })
        .finally(() => {
          this.isLoading = false;
        });
    });
  }

  // TODO
  afterCommentCreatedCallback() {}

  // TODO
  afterRepostCreatedCallback() {}

  _fetchRecentPosts(profile: ProfileEntryResponse) {
    this.backendApi
      .GetPostsForPublicKey(
        this.globalVars.localNode,
        "",
        profile.Username,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        "",
        1000, // NOTE: we currently cant filter to only blog posts on the api, just get the last 1000 posts and filter them.
        false /*MediaRequired*/
      )
      .toPromise()
      .then(({ Posts }) =>
        // Filter to only posts that have a blog post rich text extra data field.
        Posts.filter(
          (p: PostEntryResponse) => typeof (p.PostExtraData as BlogPostExtraData).BlogDeltaRtfFormat !== "undefined"
        ).slice(0, 10)
      )
      .then((posts) => {
        this.recentPosts = posts.map((p: PostEntryResponse) => ({
          ...p,
          ProfileEntryResponse: profile,
        }));
      });
  }
}
