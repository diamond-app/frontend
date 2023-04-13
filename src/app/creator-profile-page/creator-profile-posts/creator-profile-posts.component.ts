import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import * as _ from "lodash";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { InfiniteScroller } from "src/app/infinite-scroller";
import { BackendApiService } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { PostEntryResponse, ProfileEntryResponse } from "deso-protocol";
import { isNil } from "lodash";

@Component({
  selector: "creator-profile-posts",
  templateUrl: "./creator-profile-posts.component.html",
  styleUrls: ["./creator-profile-posts.component.scss"],
})
export class CreatorProfilePostsComponent {
  static PAGE_SIZE = 10;
  static BUFFER_SIZE = 5;
  static WINDOW_VIEWPORT = true;
  static PADDING = 0.5;

  @Input() profile: ProfileEntryResponse;
  @Input() afterCommentCreatedCallback: any = null;
  @Input() showProfileAsReserved: boolean;

  lastPage = null;
  loadingFirstPage = true;
  loadingNextPage = false;
  pauseVideos = false;

  pagedKeys = {
    0: "",
  };

  @Output() blockUser = new EventEmitter();

  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  getPinnedPost(postHashHex: string): Promise<any> {
    return this.backendApi
      .GetSinglePost(
        postHashHex,
        this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
        false /*FetchParents */,
        0,
        0,
        this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
        0 /*ThreadLevelLimit*/,
        0 /*ThreadLeafLimit*/,
        false /*LoadAuthorThread*/
      )
      .toPromise();
  }

  userHasPinnedPost(): boolean {
    return (
      this.profile.ExtraData &&
      "PinnedPostHashHex" in this.profile.ExtraData &&
      this.profile.ExtraData["PinnedPostHashHex"] !== undefined &&
      this.profile.ExtraData["PinnedPostHashHex"] !== ""
    );
  }

  isPinnedPost(post: PostEntryResponse) {
    return this.userHasPinnedPost() && this.profile.ExtraData["PinnedPostHashHex"] === post.PostHashHex;
  }

  // If the user pins a post,
  updatePinnedPosts(pinnedMetadata: { postHashHex: string; isPinned: boolean }): void {
    this.profile.ExtraData.PinnedPostHashHex = pinnedMetadata.postHashHex;
    this.datasource.adapter.reset();
    this.getPage(0);
    this.cdr.detectChanges();
  }

  getPage(page: number) {
    if (!isNil(this.lastPage) && page > this.lastPage) {
      return [];
    }
    this.loadingNextPage = true;
    const lastPostHashHex = this.pagedKeys[page];
    return this.backendApi
      .GetPostsForPublicKey(
        "",
        this.profile.Username,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        lastPostHashHex,
        CreatorProfilePostsComponent.PAGE_SIZE,
        false /*MediaRequired*/
      )
      .toPromise()
      .then(async (res) => {
        const posts: PostEntryResponse[] = res.Posts;
        if (this.userHasPinnedPost() && page === 0) {
          const pinnedPost = await this.getPinnedPost(this.profile.ExtraData["PinnedPostHashHex"]);
          posts.unshift(pinnedPost.PostFound);
        }
        this.pagedKeys[page + 1] = res.LastPostHashHex || "";
        if (!posts || posts.length < CreatorProfilePostsComponent.PAGE_SIZE || this.pagedKeys[page + 1] === "") {
          this.lastPage = page;
        }

        return posts.map((post) => ({
          ...post,
          ProfileEntryResponse: this.profile,
        }));
      })
      .finally(() => {
        this.loadingFirstPage = false;
        this.loadingNextPage = false;
      });
  }

  async _prependComment(uiPostParent, index, newComment) {
    const uiPostParentHashHex = this.globalVars.getPostContentHashHex(uiPostParent);
    await this.datasource.adapter.relax();
    await this.datasource.adapter.update({
      predicate: ({ $index, data }: { $index: number; data: any }) => {
        let currentPost = data as PostEntryResponse;
        if ($index === index) {
          newComment.parentPost = currentPost;
          currentPost.Comments = currentPost.Comments || [];
          currentPost.Comments.unshift(_.cloneDeep(newComment));
          return [this.globalVars.incrementCommentCount(currentPost)];
        } else if (this.globalVars.getPostContentHashHex(currentPost) === uiPostParentHashHex) {
          // We also want to increment the comment count on any other notifications related to the same post hash hex.
          return [this.globalVars.incrementCommentCount(currentPost)];
        }
        // Leave all other items in the datasource as is.
        return true;
      },
    });
  }

  userBlocked() {
    this.blockUser.emit();
  }

  pauseAllVideos(isPaused) {
    this.pauseVideos = isPaused;
  }

  profileBelongsToLoggedInUser(): boolean {
    return (
      this.globalVars.loggedInUser?.ProfileEntryResponse &&
      this.globalVars.loggedInUser.ProfileEntryResponse.PublicKeyBase58Check === this.profile.PublicKeyBase58Check
    );
  }

  infiniteScroller: InfiniteScroller = new InfiniteScroller(
    CreatorProfilePostsComponent.PAGE_SIZE,
    this.getPage.bind(this),
    CreatorProfilePostsComponent.WINDOW_VIEWPORT,
    CreatorProfilePostsComponent.BUFFER_SIZE,
    CreatorProfilePostsComponent.PADDING
  );
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
