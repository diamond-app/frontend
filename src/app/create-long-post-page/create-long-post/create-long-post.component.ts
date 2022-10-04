// @ts-strict
import { Location } from "@angular/common";
import { AfterViewInit, Component, ElementRef, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { has } from "lodash";
import { ToastrService } from "ngx-toastr";
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

class FormModel {
  Title = "";
  Description = "";
  ContentDelta: any = null;
  CoverImage = "";
  errors: string[] = [];

  get hasErrors() {
    return this.errors.length > 0;
  }

  validate() {
    if (this.Title.trim() === "") {
      this.errors.push("Headline is a required field!");
    }
    if (!this.ContentDelta?.ops) {
      this.errors.push("Blog content is required field!");
    }
  }

  clearErrors() {
    this.errors = [];
  }
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
  model = new FormModel();
  isDraggingFileOverDropZone = false;
  isSubmittingPost = false;
  isLoadingEditModel: boolean;
  placeholder = RANDOM_MOVIE_QUOTES[Math.floor(Math.random() * RANDOM_MOVIE_QUOTES.length)];
  quillModules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "super" }],
      [{ header: [1, 2, 3, false] }],
      ["link", "image"],
    ],
  };

  get coverImgSrc() {
    return this.imagePreviewDataURL ?? this.model.CoverImage;
  }

  get editPostHashHex() {
    return this.route.snapshot.params?.postHashHex ?? "";
  }

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private toastr: ToastrService,
    private location: Location
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
          Object.assign(this.model, { ...editPostData, ContentDelta: JSON.parse(editPostData.BlogDeltaRtfFormat) });
        }
      } catch (e) {
        // This is assuming 404 which might hide other types of errors, but this is currently what the
        // post thread page does...
        this.router.navigateByUrl("/" + this.globalVars.RouteNames.NOT_FOUND, { skipLocationChange: true });
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
    if (this.isSubmittingPost) {
      return;
    }

    this.model.validate();

    if (this.model.hasErrors) {
      this.globalVars._alertError(this.model.errors[0]);
      return;
    }

    this.isSubmittingPost = true;

    try {
      await this.uploadAndReplaceBase64Images();

      const postExtraData: BlogPostExtraData = {
        Title: this.model.Title.trim(),
        Description: this.model.Description.trim(),
        BlogDeltaRtfFormat: JSON.stringify(this.model.ContentDelta),
        CoverImage: (this.coverImageFile && (await this.uploadImage(this.coverImageFile))) ?? this.model.CoverImage,
      };

      const submitPost = (body: string, postHashHex: string) =>
        this.backendApi
          .SubmitPost(
            this.globalVars.localNode,
            this.globalVars.loggedInUser.PublicKeyBase58Check,
            postHashHex /*PostHashHexToModify*/,
            "" /*ParentPostHashHex*/,
            "" /*Title*/,
            {
              Body: body,
              ImageURLs: postExtraData.CoverImage ? [postExtraData.CoverImage] : [],
            } /*BodyObj*/,
            "" /*RepostedPostHashHex*/,
            postExtraData /*PostExtraData*/,
            "" /*Sub*/,
            false /*IsHidden*/,
            this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
            false
          )
          .toPromise();

      const buildLinkBack = (postHashHex: string) =>
        postHashHex ? `View this post at https://diamondapp.com/blog/${this.editPostHashHex}\n\n` : "";
      const postTx = await submitPost(
        `${postExtraData.Title}\n\n${postExtraData.Description}\n\n${buildLinkBack(this.editPostHashHex)}#blog`,
        this.editPostHashHex
      );
      const submittedPostHashHex = postTx.PostEntryResponse.PostHashHex;

      if (!this.editPostHashHex) {
        const txFound = await this.globalVars.waitForTransaction(postTx.TxnHashHex);

        // NOTE: this is not ideal, but we need to add the link back to diamond to the post body for nodes that do not
        // yet support long form, so in the case of a newly created post we edit it after it's submitted to include the
        // link back.
        if (txFound) {
          await submitPost(
            `${postExtraData.Title}\n\n${postExtraData.Description}\n\n${buildLinkBack(submittedPostHashHex)}#blog`,
            submittedPostHashHex
          );
        }
      }

      this.toastr.show(
        `Blog Post Created<a href="${window.location.origin}/blog/${submittedPostHashHex}" class="toast-link cursor-pointer">View</a>`,
        undefined,
        {
          toastClass: "info-toast",
          enableHtml: true,
          positionClass: "toast-bottom-center",
        }
      );
    } catch (e) {
      this.globalVars._alertError(
        `Whoops, something went wrong...${e?.error?.error ? JSON.stringify(e.error.error) : e.toString()}`
      );
    }

    this.isSubmittingPost = false;
  }

  onFormInput(ev: Event) {
    ev.preventDefault();
    this.model.clearErrors();
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
        return "";
      });
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = true;
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
  }

  onClickSelectFile(ev: DragEvent) {
    ev.preventDefault();
    if (!this.coverImgInput?.nativeElement) {
      this.globalVars._alertError("Whoops, something went wrong. Unable to select files.");
      return;
    }

    this.coverImgInput.nativeElement.click();
  }

  onDropImg(ev: DragEvent) {
    ev.preventDefault();
    this.isDraggingFileOverDropZone = false;
    const file = ev?.dataTransfer?.files?.[0];
    if (!file) {
      this.globalVars._alertError(
        "No files were detected. Please try it again. If the error continues, try another file."
      );
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  onFileSelected(ev: Event) {
    ev.preventDefault();
    const file = (ev.currentTarget as HTMLInputElement)?.files?.[0];

    if (!file) {
      this.globalVars._alertError(
        "No files were detected. Please try it again. If the error continues, try another file."
      );
      return;
    }

    this.handleCoverImgFileChange(file);
  }

  async handleCoverImgFileChange(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError("File is too large. Please choose a file less than 15MB");
      return "";
    }
    this.imagePreviewDataURL = await fileToDataURL(file);
    this.coverImageFile = file;
  }

  onRemoveCoverImg(ev: Event) {
    ev.preventDefault();
    this.imagePreviewDataURL = undefined;
    this.coverImageFile = undefined;
    this.model.CoverImage = "";
  }
}
