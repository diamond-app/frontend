// @ts-strict
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { BackendApiService, PostEntryResponse, ProfileEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { sortBy } from "lodash";

@Component({
  selector: "creator-profile-blog-posts",
  templateUrl: "./creator-profile-blog-posts.component.html",
  styleUrls: ["./creator-profile-blog-posts.component.scss"],
})
export class CreatorProfileBlogPostsComponent implements AfterViewInit {
  @Input() profile!: ProfileEntryResponse;
  @Input() afterCommentCreatedCallback: any = null;
  @Input() showProfileAsReserved!: boolean;

  blogPosts: PostEntryResponse[] = [];
  loadingFirstPage = true;
  pauseVideos = true;

  @Output() blockUser = new EventEmitter();

  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.loadingFirstPage = true;
    this.backendApi
      .GetPostsForPublicKey(
        this.globalVars.localNode,
        "",
        this.profile.Username,
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
        )
      )
      .then((posts) => {
        this.blogPosts = this.sortPosts(
          posts.map((p: PostEntryResponse) => ({ ...p, ProfileEntryResponse: this.profile }))
        );
      })
      .finally(() => {
        console.log("Posts after: ", this.blogPosts);
        this.loadingFirstPage = false;
      });
  }

  sortPosts(posts: PostEntryResponse[]): PostEntryResponse[] {
    return sortBy(posts, [
      // Sort first by pinned post (sort order is ascending by default, ergo pinned gets a 0 and non-pinned gets 1)
      (post) => {
        return post?.PostExtraData?.BlogPostIsPinned === "true" ? 0 : 1;
      },
      // Sort second by timestamp nanos descending (sort order for the sortby function is automatically ascending,
      // so we need to inverse the timestamp nanos)
      (post) => {
        return post.TimestampNanos * -1;
      },
    ]);
  }

  // If the user pins a blog post,
  updatePinnedPosts(pinnedMetadata: { postHashHex: string; isPinned: boolean }): void {
    this.blogPosts = this.sortPosts(
      this.blogPosts.map((post) => {
        if (post.PostHashHex === pinnedMetadata.postHashHex) {
          post.PostExtraData.BlogPostIsPinned = pinnedMetadata?.isPinned ? "true" : "false";
        }
        return post;
      })
    );
    this.cdr.detectChanges();
  }

  async _prependComment(uiPostParent: PostEntryResponse, index: number, newComment: PostEntryResponse) {
    const affectedBlogPost = this.blogPosts[index];
    this.blogPosts = [
      ...this.blogPosts.slice(0, index),
      { ...affectedBlogPost, CommentCount: affectedBlogPost.CommentCount + 1 },
      ...this.blogPosts.slice(index + 1),
    ];
  }

  userBlocked() {
    this.blockUser.emit();
  }

  pauseAllVideos(isPaused: boolean) {
    this.pauseVideos = isPaused;
  }

  profileBelongsToLoggedInUser(): boolean {
    return (
      this.globalVars.loggedInUser?.ProfileEntryResponse &&
      this.globalVars.loggedInUser.ProfileEntryResponse.PublicKeyBase58Check === this.profile.PublicKeyBase58Check
    );
  }
}
