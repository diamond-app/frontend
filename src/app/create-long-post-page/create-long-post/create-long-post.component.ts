// @ts-strict
import { AfterViewInit, Component, ElementRef, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { has } from "lodash";
import { BackendApiService, GetSinglePostResponse } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import { environment } from "src/environments/environment";
import { dataURLtoFile, fileToDataURL } from "src/lib/helpers/data-url-helpers";

const RANDOM_MOVIE_QUOTES = [
  "feed_create_post.quotes.quote1",
  "feed_create_post.quotes.quote2",
  "feed_create_post.quotes.quote3",
  "feed_create_post.quotes.quote4",
  "feed_create_post.quotes.quote5",
  "feed_create_post.quotes.quote6",
  "feed_create_post.quotes.quote7",
  "feed_create_post.quotes.quote8",
  "feed_create_post.quotes.quote9",
  "feed_create_post.quotes.quote10",
  "feed_create_post.quotes.quote11",
  "feed_create_post.quotes.quote12",
  "feed_create_post.quotes.quote13",
  "feed_create_post.quotes.quote14",
  "feed_create_post.quotes.quote15",
  "feed_create_post.quotes.quote16",
  "feed_create_post.quotes.quote17",
  "feed_create_post.quotes.quote18",
];

export interface BlogPostExtraData {
  Title: string;
  Description: string;
  BlogDeltaRtfFormat: string;
  CoverImage: string;
}

@Component({
  selector: "create-long-post",
  templateUrl: "./create-long-post.component.html",
  styleUrls: ["./create-long-post.component.scss"],
})
export class CreateLongPostComponent implements AfterViewInit {
  @ViewChild("coverImgInput") coverImgInput?: ElementRef<HTMLInputElement>;
  @ViewChild("titleInput") titleInput?: ElementRef<HTMLInputElement>;

  imagePreviewDataURL?: string;
  coverImageFile?: File;
  model: Omit<BlogPostExtraData, "BlogDeltaRtfFormat"> & { ContentDelta: any } = {
    Title: "",
    Description: "",
    ContentDelta: null,
    CoverImage: "",
  };
  isDraggingFileOverDropZone = false;
  didRemoveCoverImg = false;
  isLoadingEditModel: boolean;
  placeholder = RANDOM_MOVIE_QUOTES[Math.floor(Math.random() * RANDOM_MOVIE_QUOTES.length)];
  quillModules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }], // superscript/subscript
      [{ header: [1, 2, 3, false] }],
      ["link", "image", "video"], // link and image, video
    ],
  };

  get coverImgSrc() {
    return this.imagePreviewDataURL ?? this.model.CoverImage;
  }

  get editPostHashHex() {
    return this.route.snapshot.params?.postHashHex;
  }

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private titleService: Title
  ) {
    this.isLoadingEditModel = !!this.route.snapshot.params?.postHashHex;
  }

  async ngAfterViewInit() {
    this.titleService.setTitle(`Publish Blog Post`);

    if (this.editPostHashHex) {
      try {
        const editPost = await this.getBlogPostToEdit(this.editPostHashHex);
        if (editPost.PostFound?.PostExtraData?.BlogDeltaRtfFormat) {
          const editPostData = editPost.PostFound?.PostExtraData as BlogPostExtraData;
          this.model = {
            ...editPostData,
            ContentDelta: JSON.parse(editPostData.BlogDeltaRtfFormat),
          };
        }
      } catch (e) {
        // TODO: error handling
      }
    }

    this.isLoadingEditModel = false;
    this.titleInput?.nativeElement?.focus();
  }

  async getBlogPostToEdit(blogPostHashHex: string): Promise<GetSinglePostResponse> {
    return this.backendApi
      .GetSinglePost(
        this.globalVars.localNode,
        blogPostHashHex /*PostHashHex*/,
        this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
        false /*FetchParents */,
        0 /*CommentOffset*/,
        0 /*CommentLimit*/,
        this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
        0 /*ThreadLevelLimit*/,
        0 /*ThreadLeafLimit*/,
        false /*LoadAuthorThread*/
      )
      .toPromise();
  }

  // Loop through all ops in the Delta, convert any images from base64 to a File object, upload them, and then replace
  // that image in the Delta object with the link to the uploaded image.
  // This is done to drastically reduce on-chain file size.
  async uploadAndReplaceBase64Images() {
    await Promise.all(
      this.model.ContentDelta.ops.map(async (op: any) => {
        if (has(op, "insert.image") && op.insert.image.substring(0, 5) === "data:") {
          const newFile = dataURLtoFile(op.insert.image, "uploaded_image");
          const res = await this.backendApi
            .UploadImage(environment.uploadImageHostname, this.globalVars.loggedInUser.PublicKeyBase58Check, newFile)
            .toPromise();
          op.insert.image = res.ImageURL;
        }
      })
    );
  }

  async submit(ev: Event) {
    ev.preventDefault();
    await this.uploadAndReplaceBase64Images();
    // TODO: validation for required fields (title and blog content at the least), etc
    const coverImage = this.coverImageFile && (await this.uploadImage(this.coverImageFile));
    const coverImageFallback = this.didRemoveCoverImg ? "" : this.model.CoverImage;
    const postExtraData: BlogPostExtraData = {
      Title: this.model.Title.trim(),
      Description: this.model.Description.trim(),
      BlogDeltaRtfFormat: JSON.stringify(this.model.ContentDelta),
      CoverImage: coverImage ?? coverImageFallback,
    };

    console.log("submit post", postExtraData);

    // this.backendApi
    //   .SubmitPost(
    //     this.globalVars.localNode,
    //     this.globalVars.loggedInUser.PublicKeyBase58Check,
    //     this.editPostHashHex /*PostHashHexToModify*/,
    //     "" /*ParentPostHashHex*/,
    //     "" /*Title*/,
    //     {
    //       Body: `${postExtraData.Title}\n\n${postExtraData.Description}\n\n#blog`,
    //       ImageURLs: postExtraData.CoverImage ? [postExtraData.CoverImage] : [],
    //     } /*BodyObj*/,
    //     "" /*RepostedPostHashHex*/,
    //     postExtraData /*PostExtraData*/,
    //     "" /*Sub*/,
    //     false /*IsHidden*/,
    //     this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
    //     false
    //   )
    //   .toPromise()
    //   .then((res) => {
    //     console.log(
    //       `Your post is ready, view it here: ${window.location.origin}/blog/${res.PostEntryResponse?.PostHashHex}`
    //     );
    //   });
  }

  /**
   * @returns the uploaded image url. empty string if the file invalid.
   */
  async uploadImage(file: File): Promise<string> {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return "";
    }

    return this.backendApi
      .UploadImage(environment.uploadImageHostname, this.globalVars.loggedInUser.PublicKeyBase58Check, file)
      .toPromise()
      .then((res) => res.ImageURL)
      .catch((err) => {
        this.globalVars._alertError(JSON.stringify(err.error.error));
      });
  }

  onDragOver(ev: any) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragEnter(ev: any) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragLeave(ev: any) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
  }

  onClickSelectFile(ev: any) {
    ev.preventDefault();
    if (!this.coverImgInput?.nativeElement) {
      // TODO: error toast
      console.log("no input element ref");
      return;
    }

    this.coverImgInput.nativeElement.click();
  }

  onDropImg(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
    const file = ev?.dataTransfer?.files?.[0];
    if (!file) {
      // TODO: we need some kind of toast error for this scenario.
      console.log("No files dropped!");
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  onFileSelected(ev: Event) {
    ev.preventDefault();
    const file = (ev.currentTarget as HTMLInputElement)?.files?.[0];

    if (!file) {
      // TODO: we need some kind of toast error for this scenario.
      console.log("No files dropped!");
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  async handleCoverImgFileChange(file: File) {
    this.imagePreviewDataURL = await fileToDataURL(file);
    this.coverImageFile = file;
  }

  onRemoveCoverImg(ev: Event) {
    ev.preventDefault();
    this.imagePreviewDataURL = undefined;
    this.coverImageFile = undefined;
    this.model.CoverImage = "";
    this.didRemoveCoverImg = true;
  }
}
