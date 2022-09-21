import { AfterViewInit, Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BackendApiService, PostEntryResponse } from "src/app/backend-api.service";
import { BlogPostExtraData } from "src/app/create-long-post-page/create-long-post/create-long-post.component";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "app-blog-detail",
  templateUrl: "./blog-detail.component.html",
  styleUrls: ["./blog-detail.component.scss"],
})
export class BlogDetailComponent implements AfterViewInit {
  private pendingBlogPost: Promise<PostEntryResponse>;
  content = "";
  blogData: BlogPostExtraData;
  isLoading: boolean;

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {
    this.isLoading = true;
    this.pendingBlogPost = this.backendApi
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
      .then(({ PostFound }) => PostFound);
  }

  ngAfterViewInit(): void {
    this.pendingBlogPost
      .then((p) => {
        this.blogData = p.PostExtraData as BlogPostExtraData;
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
}
