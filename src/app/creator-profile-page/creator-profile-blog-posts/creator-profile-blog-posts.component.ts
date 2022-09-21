// @ts-strict
import { AfterViewInit, Component, EventEmitter, Input, Output } from "@angular/core";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { BackendApiService, PostEntryResponse, ProfileEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";

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

  constructor(private globalVars: GlobalVarsService, private backendApi: BackendApiService) {}

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
        Posts.filter(
          (p: PostEntryResponse) => typeof (p.PostExtraData as BlogPostExtraData).BlogDeltaRtfFormat !== "undefined"
        )
      )
      .then((posts) => {
        this.blogPosts = posts.map((p: PostEntryResponse) => ({ ...p, ProfileEntryResponse: this.profile }));
      })
      .finally(() => {
        this.loadingFirstPage = false;
      });
  }

  async _prependComment(uiPostParent: PostEntryResponse, index: number, newComment: PostEntryResponse) {
    const uiPostParentHashHex = this.globalVars.getPostContentHashHex(uiPostParent);
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
