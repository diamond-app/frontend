import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { GlobalVarsService } from "../../global-vars.service";
import { BackendApiService } from "../../backend-api.service";
import { FeedComponent } from "../../feed/feed.component";
import { Datasource, IDatasource, IAdapter } from "ngx-ui-scroll";
import { ToastrService } from "ngx-toastr";
import { Title } from "@angular/platform-browser";
import { Location } from "@angular/common";
import { environment } from "src/environments/environment";
import { ThreadManager } from "../helpers/thread-manager";

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
  datasource: IDatasource<IAdapter<any>>;
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
    private changeRef: ChangeDetectorRef,
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

  // TODO: Cleanup - Update InfiniteScroller class to de-duplicate this logic
  // TODO: will have to deal with this when getting more data
  getDataSource() {
    return new Datasource<IAdapter<any>>({
      get: (index, count, success) => {
        if (this.scrollingDisabled && index > this.threadManager.threadCount) {
          success([]);
        } else if (this.threadManager.threadCount > index + count) {
          success(this.threadManager.threads.slice(index, index + count));
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

  async appendToSubcommentList(replyParent, threadParent, newPost) {
    await this.datasource.adapter.relax(); // Wait until it's ok to modify the data
    this.threadManager.addReplyToThread(threadParent.PostHashHex, replyParent, newPost);
    await this.datasource.adapter.replace({
      predicate: (item) => {
        const post = item as any;
        return post.PostHashHex === threadParent.PostHashHex;
      },
      items: [this.threadManager.getThread(threadParent.PostHashHex)],
    });
  }

  // Returns a flat array of all posts in the data source
  async _allPosts() {
    let posts = [];

    // Update is a hack. I just need some way to iterate over all the posts in the datasource.
    // It'd be better if there were an explicit iteration method, but I don't think it exists
    // (at least not at the time of writing).
    await this.datasource.adapter.update({
      predicate: ({ $index, data, element }) => {
        let currentPost = data as any;

        posts.push(currentPost);
        posts = posts.concat(currentPost.Comments || []);

        return true;
      },
    });

    return posts;
  }

  updateCommentCountAndShowToast(parentPost, postEntryResponse) {
    parentPost.CommentCount += 1;

    // Show toast when adding comment to parent post
    this.toastr.info("Your post was sent!", null, { positionClass: "toast-top-center", timeOut: 3000 });
  }

  prependToCommentList(parentPost, postEntryResponse) {
    // parentPost.CommentCount += 1;
    this.currentPost.CommentCount += 1;
    this.threadManager.addThread(postEntryResponse);
    this.datasource.adapter.prepend(this.threadManager.getThread(postEntryResponse.PostHashHex));
    // TODO: this doesn't seem to be doing anything...
    // this.currentPost.ParentPosts.map((parentPost) => parentPost.CommentCount++);
  }

  onPostHidden(hiddenPostEntryResponse, parentPostEntryResponse, grandparentPostEntryResponse) {
    if (parentPostEntryResponse == null) {
      // TODO: this has a bug. Posts cached in the global state can still show up in the
      // user's the global feed after deletion.
      // deleted the root post, redirect home
      this.router.navigate(["/"], { queryParamsHandling: "merge" });
    } else {
      this.onCommentHidden(hiddenPostEntryResponse, parentPostEntryResponse, grandparentPostEntryResponse);
    }
  }

  // Note: there are definitely issues here where we're decrementing parent/grandparent CommentCounts
  // by the incorrect amount in many cases. For example, when adding a new comment and subcomment,
  // the frontend is currently only incrementing the parent, so this only decrements the parent.
  // However, the backend is incrementing both the parent and grandparent. We should revisit / unify
  // all this stuff.
  async onCommentHidden(hiddenPostEntryResponse, parentPostEntryResponse, grandparentPostEntryResponse) {
    let allPosts = await this._allPosts();
    FeedComponent.onPostHidden(allPosts, hiddenPostEntryResponse, parentPostEntryResponse, null);

    // This seems a little off. We're decrementing all the way up the tree, but I think
    // our comment counts only take into account two layers. TODO: reconsider this
    if (parentPostEntryResponse.PostHashHex === this.currentPostHashHex) {
      this.currentPost.ParentPosts.map((parentPost) => parentPost.CommentCount--);
    }

    // Remove hidden post from datasource if it's in there. Note: It may not be in there if
    // it's a reply to a subcomment.
    this.datasource.adapter.remove({
      predicate: ({ data }) => {
        return (data as any).PostHashHex === hiddenPostEntryResponse.PostHashHex;
      },
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
