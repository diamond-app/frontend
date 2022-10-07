import { Location } from "@angular/common";
import { Component, EventEmitter, Output } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslocoService } from "@ngneat/transloco";
import { ToastrService } from "ngx-toastr";
import { Datasource } from "ngx-ui-scroll";
import { BackendApiService, PostEntryResponse, ProfileEntryResponse } from "src/app/backend-api.service";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { GlobalVarsService } from "src/app/global-vars.service";
import { Thread, ThreadManager } from "src/app/post-thread-page/helpers/thread-manager";
import { environment } from "src/environments/environment";
import { SwalHelper } from "src/lib/helpers/swal-helper";

@Component({
  selector: "app-blog-detail",
  templateUrl: "./blog-detail.component.html",
  styleUrls: ["./blog-detail.component.scss"],
})
export class BlogDetailComponent {
  isLoading = true;
  currentPost: PostEntryResponse;
  recentPosts: PostEntryResponse[] = [];
  scrollingDisabled = false;
  threadManager?: ThreadManager;
  isLoadingMoreReplies = false;
  title = "";
  currentPostHashHex = "";
  datasource = new Datasource<Thread>({
    get: (index, count, success) => {
      const numThreads = this.threadManager?.threadCount ?? 0;
      if (this.scrollingDisabled && index > numThreads) {
        success([]);
      } else if (numThreads > index + count) {
        // MinIndex doesn't actually prevent us from going below 0, causing initial posts to disappear on long thread
        const start = index < 0 ? 0 : index;
        success(this.threadManager?.threads.slice(start, index + count) ?? []);
      } else if (this.currentPostHashHex) {
        this.getPost(this.currentPostHashHex, index, count)?.subscribe(
          (res) => {
            // If we got more comments, push them onto the list of comments, increase comment count
            // and determine if we should continue scrolling
            if (res.PostFound.Comments?.length) {
              if (res.PostFound.Comments.length < count) {
                this.scrollingDisabled = true;
              }
              this.threadManager?.addThreads(res.PostFound.Comments);
              success(this.threadManager?.threads.slice(index, index + count) ?? []);
            } else {
              // If there are no more comments, we should stop scrolling
              this.scrollingDisabled = true;
              success([]);
            }
          },
          (err) => {
            this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
          }
        );
      }
    },
    settings: {
      startIndex: 0,
      minIndex: 0,
      bufferSize: 10,
      windowViewport: true,
      infinite: true,
    },
  });

  @Output() diamondSent = new EventEmitter();
  @Output() postLoaded = new EventEmitter();
  @Output() postDeleted = new EventEmitter();
  @Output() userBlocked = new EventEmitter();

  constructor(
    private backendApi: BackendApiService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private toastr: ToastrService,
    private transloco: TranslocoService,
    public globalVars: GlobalVarsService,
    public location: Location
  ) {
    // This line forces the component to reload when only a url param changes.  Without this, the UiScroll component
    // behaves strangely and can reuse data from a previous post.
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.route.params.subscribe((routeParams) => {
      this._setStateFromActivatedRoute(routeParams as { postHashHex: string; username: string; slug: string });
    });
  }

  getPublishDate(timeStampNanos: number) {
    return new Date(timeStampNanos / 1000000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  getPost(postHashHex: string, commentOffset = 0, commentLimit = 20) {
    return this.backendApi.GetSinglePost(
      this.globalVars.localNode,
      postHashHex,
      this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
      false /*FetchParents */,
      commentOffset,
      commentLimit,
      this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
      2 /*ThreadLevelLimit*/,
      1 /*ThreadLeafLimit*/,
      true /*LoadAuthorThread*/
    );
  }

  refreshPosts(postHashHex: string) {
    return this.getPost(postHashHex)
      .toPromise()
      .then((res) => {
        if (!res || !res.PostFound) {
          this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
          return;
        }
        // we've loaded a regular post on the blog detail page
        if (!res.PostFound.PostExtraData?.BlogDeltaRtfFormat) {
          this.router.navigate(["/" + this.globalVars.RouteNames.POSTS, this.route.snapshot.params.postHashHex], {
            queryParamsHandling: "merge",
          });
          return;
        }

        // Set current post
        this.currentPost = res.PostFound as PostEntryResponse;
        this.threadManager = new ThreadManager(res.PostFound);
        this.title = `${this.globalVars.addOwnershipApostrophe(
          this.currentPost.ProfileEntryResponse.Username
        )} Blog Post`;
        this.titleService.setTitle(this.currentPost.ProfileEntryResponse.Username + ` on ${environment.node.name}`);
        this._fetchRecentPosts(res.PostFound.ProfileEntryResponse);
      });
  }

  /**
   * When adding a reply to a subcomment, we need to know if it already has a
   * reply rendered in the UI. If it does, we just increment the comment count.
   * If it doesn't currently have a reply in the UI we increment the parent
   * comment count AND render the new reply.
   */
  async appendToSubcommentList(
    replyParent: PostEntryResponse,
    threadParent: PostEntryResponse,
    newPost: PostEntryResponse
  ) {
    const thread = this.threadManager?.getThread(threadParent.PostHashHex);

    if (!thread) {
      // NOTE: This should *never* happen unless there is a bug. It's totally
      // unexpected in any case. Likely we should show a ui error.
      console.error(`No thread found for PostHashHex ${threadParent.PostHashHex}`);
      return;
    }

    await this.datasource.adapter.relax(); // Wait until it's ok to modify the data
    await this.datasource.adapter.replace({
      predicate: (item) => {
        const dataSourceItem = item as any;
        const post = dataSourceItem.data.parent;
        if (post.PostHashHex === threadParent.PostHashHex) {
          const beforeReplyCount = thread.children.length;
          this.threadManager?.addReplyToComment(thread, replyParent, newPost);
          const afterReplyCount = thread.children.length;

          if (beforeReplyCount === afterReplyCount) {
            // if we hit this case, it means only the count was incremented for an intermediate
            // reply. The new reply was not actually rendered in the UI.
            this.toastr.info("Your post was sent!", undefined, { positionClass: "toast-top-center", timeOut: 3000 });
          }
          return true;
        }

        return false;
      },
      items: [thread],
    });
  }

  /**
   * This prepends a new top level comment thread to the current post. Note this is transitory
   * and only for UX convenience. If the comments are reloaded from the api it will appear in
   * its true chronological position.
   */
  async prependToCommentList(postEntryResponse: PostEntryResponse) {
    this.threadManager?.prependComment(postEntryResponse);

    const thread = this.threadManager?.getThread(postEntryResponse.PostHashHex);

    if (!thread) {
      // NOTE: This should *never* happen unless there is a bug. It's totally
      // unexpected in any case. Likely we should throw an error and show a ui
      // error.
      console.error(`No thread found for PostHashHex ${postEntryResponse.PostHashHex}`);
      return;
    }

    await this.datasource.adapter.relax();
    await this.datasource.adapter.prepend(thread);
  }

  /**
   * When a subcomment is hidden we just need to decrement its parent's comment
   * count. The feed component will internally adjust its UI to hide the
   * content.
   */
  async onSubcommentHidden(commentToHide: PostEntryResponse, parentComment: PostEntryResponse, thread: Thread) {
    await this.datasource.adapter.relax();
    await this.datasource.adapter.replace({
      predicate: (item) => {
        const dataSourceItem = item as any;
        if (dataSourceItem.data.parent.PostHashHex === thread.parent.PostHashHex) {
          this.threadManager?.hideComment(thread, commentToHide, parentComment);
          return true;
        }

        return false;
      },
      items: [thread],
    });
  }

  isPostBlocked(post: any): boolean {
    return this.globalVars.hasUserBlockedCreator(post.PosterPublicKeyBase58Check);
  }

  afterUserBlocked(blockedPubKey: any) {
    this.globalVars.loggedInUser.BlockedPubKeys[blockedPubKey] = {};
  }

  loadMoreReplies(thread: Thread, subcomment: PostEntryResponse) {
    const errorMsg = this.transloco.translate("generic_toast_error");
    this.isLoadingMoreReplies = true;
    this.getPost(subcomment.PostHashHex, 0, 1)
      ?.toPromise()
      .then((res) => {
        if (!res || !res.PostFound) {
          // this *should* never happen.
          this.toastr.error(errorMsg, undefined, {
            positionClass: "toast-top-center",
            timeOut: 3000,
          });
          return;
        }

        this.threadManager?.addChildrenToThread(thread, res.PostFound);
      })
      .catch((err) => {
        console.log(err);
        this.toastr.error(errorMsg, undefined, {
          positionClass: "toast-top-center",
          timeOut: 3000,
        });
      })
      .finally(() => {
        this.isLoadingMoreReplies = false;
      });
  }

  // TODO
  async afterCommentCreatedCallback(comment: PostEntryResponse) {
    this.threadManager?.prependComment(comment);

    const thread = this.threadManager?.getThread(comment.PostHashHex);

    if (!thread) {
      // NOTE: This should *never* happen unless there is a bug. It's totally
      // unexpected in any case. Likely we should throw an error and show a ui
      // error.
      console.error(`No thread found for PostHashHex ${comment.PostHashHex}`);
      return;
    }

    await this.datasource.adapter.relax();
    await this.datasource.adapter.prepend(thread);
  }

  hidePost() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Hide post?",
      html: `This can’t be undone. The post will be removed from your profile, from search results, and from the feeds of anyone who follows you.`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      if (response.isConfirmed) {
        this.currentPost.IsHidden = true;

        this.backendApi
          .SubmitPost(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            this.currentPost.PostHashHex /*PostHashHexToModify*/,
            "" /*ParentPostHashHex*/,
            "" /*Title*/,
            {
              Body: this.currentPost.Body,
              ImageURLs: this.currentPost.ImageURLs,
            } /*BodyObj*/,
            "",
            this.currentPost.PostExtraData,
            "" /*Sub*/,
            true /*IsHidden*/,
            this.globalVars.feeRateDeSoPerKB * 1e9 /*feeRateNanosPerKB*/
          )
          .subscribe(
            (response) => {
              this.globalVars.logEvent("post : hide");
              this.postDeleted.emit(response.PostEntryResponse);
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.parsePostError(err);
              this.globalVars.logEvent("post : hide : error", { parsedError });
              this.globalVars._alertError(parsedError);
            }
          );
      }
    });
  }

  blockUser() {
    SwalHelper.fire({
      target: this.globalVars.getTargetComponentSelector(),
      title: "Block user?",
      html: `This will hide all comments from this user on your posts as well as hide them from your view on your feed and other threads.`,
      showCancelButton: true,
      customClass: {
        confirmButton: "btn btn-light",
        cancelButton: "btn btn-light no",
      },
      reverseButtons: true,
    }).then((response: any) => {
      if (response.isConfirmed) {
        this.backendApi
          .BlockPublicKey(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            this.currentPost.PosterPublicKeyBase58Check
          )
          .subscribe(
            () => {
              this.globalVars.logEvent("user : block");
              this.globalVars.loggedInUser.BlockedPubKeys[this.currentPost.PosterPublicKeyBase58Check] = {};
              this.userBlocked.emit(this.currentPost.PosterPublicKeyBase58Check);
            },
            (err) => {
              console.error(err);
              const parsedError = this.backendApi.stringifyError(err);
              this.globalVars.logEvent("user : block : error", { parsedError });
              this.globalVars._alertError(parsedError);
            }
          );
      }
    });
  }

  async _setStateFromActivatedRoute({ postHashHex, username, slug }) {
    this.threadManager?.reset();
    this.isLoading = true;
    try {
      if (username) {
        const { Profile } = await this.backendApi.GetSingleProfile(this.globalVars.localNode, "", username).toPromise();
        if (!Profile?.ExtraData?.BlogSlugMap) {
          throw new Error(`No slug mapping for username ${username}`);
        }
        const slugMap = JSON.parse(Profile.ExtraData.BlogSlugMap);
        this.currentPostHashHex = slugMap[slug];
      } else {
        this.currentPostHashHex = postHashHex;
      }

      await this.refreshPosts(this.currentPostHashHex).finally(() => {
        this.isLoading = false;
      });
    } catch (e) {
      console.error(e);
      this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
    }
    this.datasource.adapter.reset();
  }

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
          (p: PostEntryResponse) =>
            !p.IsHidden &&
            typeof (p.PostExtraData as BlogPostExtraData).BlogDeltaRtfFormat !== "undefined" &&
            p.PostHashHex !== this.currentPost.PostHashHex
        ).slice(0, 5)
      )
      .then((posts) => {
        this.recentPosts = posts.map((p: PostEntryResponse) => ({
          ...p,
          ProfileEntryResponse: profile,
        }));
      });
  }
}
