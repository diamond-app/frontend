import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import * as _ from "lodash";
import { IAdapter, IDatasource } from "ngx-ui-scroll";
import { Subscription } from "rxjs";
import { InfiniteScroller } from "src/app/infinite-scroller";
import { BackendApiService } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { PostEntryResponse, ProfileEntryResponse } from "deso-protocol";
import { isNil } from "lodash";

class DiamondsPost {
  Post: PostEntryResponse;
  // Boolean that is set to true when this is the first post at a given diamond level.
  ShowDiamondDivider?: boolean;
}

@Component({
  selector: "diamond-posts",
  templateUrl: "./diamond-posts.component.html",
  styleUrls: ["./diamond-posts.component.sass"],
})
export class DiamondPostsComponent {
  static BUFFER_SIZE = 10;
  static PAGE_SIZE = 10;
  static WINDOW_VIEWPORT = true;

  constructor(
    public globalVars: GlobalVarsService,
    private router: Router,
    private backendApi: BackendApiService,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe((params) => {
      this.receiverUsername = params.receiver;
      this.senderUsername = params.sender;
    });
  }

  receiverUsername: string;
  senderUsername: string;

  receiverProfileEntryResponse: ProfileEntryResponse;
  senderProfileEntryResponse: ProfileEntryResponse;

  loadingFirstPage = true;
  loadingNextPage = false;
  pagedKeys = {
    0: "",
  };

  lastDiamondLevelOnPage = {
    0: 0,
  };

  lastPage = null;
  subscriptions = new Subscription();

  getPage(page: number) {
    if (!isNil(this.lastPage) && page > this.lastPage) {
      return [];
    }
    this.loadingNextPage = true;
    const lastPostHashHex = this.pagedKeys[page];
    return this.backendApi
      .GetDiamondedPosts(
        "",
        this.receiverUsername,
        "",
        this.senderUsername,
        this.globalVars.loggedInUser?.PublicKeyBase58Check,
        lastPostHashHex,
        DiamondPostsComponent.PAGE_SIZE
      )
      .toPromise()
      .then((res) => {
        const posts: PostEntryResponse[] = res.DiamondedPosts;
        this.pagedKeys[page + 1] = posts.length > 0 ? posts[posts.length - 1].PostHashHex : "";
        this.lastDiamondLevelOnPage[page] = posts.length > 0 ? posts[posts.length - 1].DiamondsFromSender : -1;
        if (!posts || posts.length < DiamondPostsComponent.PAGE_SIZE || this.pagedKeys[page + 1] === "") {
          this.lastPage = page;
        }
        if (!this.receiverProfileEntryResponse) {
          this.receiverProfileEntryResponse = res.ReceiverProfileEntryResponse;
        }
        if (!this.senderProfileEntryResponse) {
          this.senderProfileEntryResponse = res.SenderProfileEntryResponse;
        }
        const diamondPosts = posts.map((post) => {
          post.ProfileEntryResponse = res.ReceiverProfileEntryResponse;
          const diamondPost = new DiamondsPost();
          diamondPost.Post = post;
          return diamondPost;
        });

        let lastDiamondLevel = this.lastDiamondLevelOnPage[page - 1];
        for (let ii = 0; ii < diamondPosts.length; ii++) {
          diamondPosts[ii].Post.ProfileEntryResponse = this.receiverProfileEntryResponse;
          if (diamondPosts[ii].Post.DiamondsFromSender != lastDiamondLevel) {
            diamondPosts[ii].ShowDiamondDivider = true;
            lastDiamondLevel = diamondPosts[ii].Post.DiamondsFromSender;
          }
        }
        return diamondPosts;
      })
      .finally(() => {
        this.loadingFirstPage = false;
        this.loadingNextPage = false;
      });
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.datasource.adapter.lastVisible$.subscribe((lastVisible) => {
        if (lastVisible.element.parentElement) {
          setTimeout(() => {
            this.correctDataPaddingForwardElementHeight(lastVisible.element.parentElement);
          }, 5);
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

  diamondArray(n: number): Array<number> {
    return Array(n);
  }

  async _prependComment(uiPostParent, newComment) {
    await this.datasource.adapter.relax();
    await this.datasource.adapter.update({
      predicate: ({ data }: { data: any }) => {
        let currentPost = data as PostEntryResponse;
        if (currentPost.PostHashHex === uiPostParent.PostHashHex) {
          newComment.parentPost = currentPost;
          currentPost.Comments = currentPost.Comments || [];
          currentPost.Comments.unshift(_.cloneDeep(newComment));
          currentPost.CommentCount += 1;
          currentPost = _.cloneDeep(currentPost);
          return [currentPost];
        }
        return true;
      },
    });
  }

  infiniteScroller: InfiniteScroller = new InfiniteScroller(
    DiamondPostsComponent.PAGE_SIZE,
    this.getPage.bind(this),
    DiamondPostsComponent.WINDOW_VIEWPORT,
    DiamondPostsComponent.BUFFER_SIZE
  );
  datasource: IDatasource<IAdapter<any>> = this.infiniteScroller.getDatasource();
}
