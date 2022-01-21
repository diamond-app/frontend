import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";
import { Datasource, IDatasource } from "ngx-ui-scroll";
import { ToastrService } from "ngx-toastr";
import { Title } from "@angular/platform-browser";
import { Location } from "@angular/common";
import { environment } from "src/environments/environment";
import { Post, Thread, ThreadManager } from "../helpers/thread-manager";

import * as _ from "lodash";
import { document } from "ngx-bootstrap/utils";
import { Subscription } from "rxjs";

@Component({
  selector: "post-thread",
  templateUrl: "./post-thread.component.html",
  styleUrls: ["./post-thread.component.scss"],
})
export class PostThreadComponent implements AfterViewInit {
  currentPost;
  currentPostHashHex: string;
  scrollingDisabled = false;
  showToast = false;
  commentLimit = 20;
  datasource: IDatasource<Thread>;
  subscriptions = new Subscription();
  threadManager: ThreadManager;

  @Input() hideHeader: boolean = false;
  @Input() hideCurrentPost: boolean = false;
  @Output() postLoaded = new EventEmitter();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public globalVars: GlobalVarsService,
    private backendApi: BackendApiService,
    private toastr: ToastrService,
    private titleService: Title,
    private location: Location
  ) {
    // This line forces the component to reload when only a url param changes.  Without this, the UiScroll component
    // behaves strangely and can reuse data from a previous post.
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    this.datasource = this.getDataSource();
    this.route.params.subscribe((params) => {
      this._setStateFromActivatedRoute(route);
    });
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.datasource.adapter.lastVisible$.subscribe((lastVisible) => {
        if (lastVisible.element.parentElement) {
          setTimeout(() => {
            this.correctDataPaddingForwardElementHeight(lastVisible.element.parentElement);
            //   this.correctDataPaddingForwardElementHeight(lastVisible.element.parentElement);
          }, 1);
        }
      })
    );
  }

  // Thanks to @brabenetz for the solution on forward padding with the ngx-ui-scroll component.
  // https://github.com/dhilt/ngx-ui-scroll/issues/111#issuecomment-697269318
  correctDataPaddingForwardElementHeight(viewportElement: HTMLElement): void {
    const dataPaddingForwardElement: HTMLElement = viewportElement.querySelector(`[data-padding-forward]`);
    if (dataPaddingForwardElement) {
      dataPaddingForwardElement.setAttribute("style", "height: 0px;");
    }
  }

  /**
   * Builds the data source that will be used to pull items for the
   * ngx-ui-scroll component.
   */
  getDataSource() {
    return new Datasource<Thread>({
      get: (index, count, success) => {
        if (this.scrollingDisabled && index > this.threadManager.threadCount) {
          success([]);
        } else if (this.threadManager.threadCount > index + count) {
          // MinIndex doesn't actually prevent us from going below 0, causing initial posts to disappear on long thread
          const start = index < 0 ? 0 : index;
          success(this.threadManager.threads.slice(start, index + count));
        } else {
          this.getPost(false, index, count).subscribe(
            (res) => {
              // If we got more comments, push them onto the list of comments, increase comment count
              // and determine if we should continue scrolling
              if (res.PostFound.Comments?.length) {
                if (res.PostFound.Comments.length < count) {
                  this.scrollingDisabled = true;
                }
                this.threadManager.addThreads(res.PostFound.Comments);
                success(this.threadManager.threads.slice(index, index + count));
              } else {
                // If there are no more comments, we should stop scrolling
                this.scrollingDisabled = true;
                success([]);
              }
            },
            (err) => {
              // TODO: post threads: rollbar
              console.error(err);
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
  }

  /**
   * When adding a reply to a subcomment, we need to know if it already has a
   * reply rendered in the UI. If it does, we just increment the comment count.
   * If it doesn't currently have a reply in the UI we increment the parent
   * comment count AND render the new reply.
   */
  async appendToSubcommentList(replyParent: Post, threadParent: Post, newPost: Post) {
    await this.datasource.adapter.relax(); // Wait until it's ok to modify the data
    await this.datasource.adapter.replace({
      predicate: (item) => {
        const dataSourceItem = item as any;
        const post = dataSourceItem.data.parent;
        if (post.PostHashHex === threadParent.PostHashHex) {
          const beforeReplyCount = this.threadManager.getThread(threadParent.PostHashHex).children.length;
          this.threadManager.addReplyToComment(threadParent.PostHashHex, replyParent, newPost);
          const afterReplyCount = this.threadManager.getThread(threadParent.PostHashHex).children.length;

          if (beforeReplyCount === afterReplyCount) {
            // if we hit this case, it means only the count was incremented for an intermediate
            // reply. The new reply was not actually rendered in the UI.
            this.toastr.info("Your post was sent!", null, { positionClass: "toast-top-center", timeOut: 3000 });
          }
          return true;
        }
      },
      items: [this.threadManager.getThread(threadParent.PostHashHex)],
    });
  }

  /**
   * Called if a users replies to a parent post of the current post in the page
   * header.
   */
  updateParentCommentCountAndShowToast(parentPost: Post) {
    parentPost.CommentCount += 1;

    // Show toast when adding comment to parent post
    this.toastr.info("Your post was sent!", null, { positionClass: "toast-top-center", timeOut: 3000 });
  }

  /**
   * This prepends a new top level comment thread to the current post. Note this is transitory
   * and only for UX convenience. If the comments are reloaded from the api it will appear in
   * its true chronological position.
   */
  async prependToCommentList(postEntryResponse: Post) {
    this.threadManager.prependComment(postEntryResponse);
    await this.datasource.adapter.relax();
    await this.datasource.adapter.prepend(this.threadManager.getThread(postEntryResponse.PostHashHex));
  }

  /**
   * If the main post for the the page is hidden, we just bail and go back to
   * home feed. TODO: this has a bug. Posts cached in the global state can still
   * show up in the user's the global feed after deletion. Maybe we can fix this
   * by optimizing the fetch for the feed to be faster and not need client side
   * caching for the feed.
   */
  onCurrentPostHidden() {
    this.router.navigate(["/"], { queryParamsHandling: "merge" });
  }

  /**
   * When a subcomment is hidden we just need to decrement its parent's comment
   * count. The feed component will internally adjust its UI to hide the
   * content.
   */
  async onSubcommentHidden(commentToHide: Post, parentComment: Post, threadParent) {
    await this.datasource.adapter.relax();
    await this.datasource.adapter.replace({
      predicate: (item) => {
        const dataSourceItem = item as any;
        if (dataSourceItem.data.parent.PostHashHex === threadParent.PostHashHex) {
          this.threadManager.hideComment(commentToHide, parentComment, threadParent.PostHashHex);
          return true;
        }
      },
      items: [this.threadManager.getThread(threadParent.PostHashHex)],
    });
  }

  getPost(fetchParents: boolean = true, commentOffset: number = 0, commentLimit: number = this.commentLimit) {
    // Hit the Get Single Post endpoint with specific parameters
    let readerPubKey = "";
    if (this.globalVars.loggedInUser) {
      readerPubKey = this.globalVars.loggedInUser.PublicKeyBase58Check;
    }

    return this.backendApi.GetSinglePost(
      this.globalVars.localNode,
      this.currentPostHashHex /*PostHashHex*/,
      readerPubKey /*ReaderPublicKeyBase58Check*/,
      fetchParents,
      commentOffset,
      commentLimit,
      this.globalVars.showAdminTools() /*AddGlobalFeedBool*/
    );
  }

  refreshPosts() {
    // Fetch the post entry
    this.getPost().subscribe(
      (res) => {
        if (!res || !res.PostFound) {
          this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
          return;
        }
        if (
          res.PostFound.IsNFT &&
          (!this.route.snapshot.url.length || this.route.snapshot.url[0].path != this.globalVars.RouteNames.NFT)
        ) {
          this.router.navigate(["/" + this.globalVars.RouteNames.NFT, this.currentPostHashHex], {
            queryParamsHandling: "merge",
          });
          return;
        }
        // Set current post
        this.currentPost = res.PostFound;
        this.threadManager = new ThreadManager(res.PostFound);
        const postType = this.currentPost.RepostedPostEntryResponse ? "Repost" : "Post";
        this.postLoaded.emit(
          `${this.globalVars.addOwnershipApostrophe(this.currentPost.ProfileEntryResponse.Username)} ${postType}`
        );
        this.titleService.setTitle(this.currentPost.ProfileEntryResponse.Username + ` on ${environment.node.name}`);
      },
      (err) => {
        // TODO: post threads: rollbar
        console.error(err);
        this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
      }
    );
  }

  _setStateFromActivatedRoute(route) {
    // get the username of the target user (user whose followers / following we're obtaining)
    this.currentPostHashHex = route.snapshot.params.postHashHex;

    // it's important that we call this here and not in ngOnInit. Angular does not reload components when only a param changes.
    // We are responsible for refreshing the components.
    // if the user is on a thread page and clicks on a comment, the currentPostHashHex will change, but angular won't "load a new
    // page" and re-render the whole component using the new post hash. instead, angular will
    // continue using the current component and merely change the URL. so we need to explictly
    // refresh the posts every time the route changes.
    if (this.threadManager?.threadCount > 0) {
      this.threadManager.reset();
    }

    this.refreshPosts();
    this.datasource.adapter.reset();
  }

  isPostBlocked(post: any): boolean {
    return this.globalVars.hasUserBlockedCreator(post.PosterPublicKeyBase58Check);
  }

  afterUserBlocked(blockedPubKey: any) {
    this.globalVars.loggedInUser.BlockedPubKeys[blockedPubKey] = {};
  }
}
