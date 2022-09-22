// @ts-strict
import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { ContentChange, QuillEditorComponent } from "ngx-quill";
import { BackendApiService, GetSinglePostResponse, PostEntryResponse } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import { has } from "lodash";
import { environment } from "src/environments/environment";
import { ActivatedRoute } from "@angular/router";

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
export class CreateLongPostComponent {
  private content = "";
  coverImageUrl: string = "";
  title: string = "";
  description: string = "";
  editPostHashHex: string = "";
  blogDeltaRtfFormat: string = "";
  quillEditor: QuillEditorComponent | undefined;

  formFieldNames = {
    coverImage: "coverImage",
    title: "title",
    description: "description",
  };

  constructor(
    private backendApi: BackendApiService,
    private globalVars: GlobalVarsService,
    private route: ActivatedRoute
  ) {}

  async checkForBlogPostFields(): Promise<void> {
    if (this.route.snapshot.params?.postHashHex && this.route.snapshot.params.postHashHex !== "") {
      this.editPostHashHex = this.route.snapshot.params.postHashHex;
      await this.getAndSetBlogPostFields(this.editPostHashHex);
    }
  }

  async onEditorCreated(event: any) {
    await this.checkForBlogPostFields();
    this.quillEditor = event;

    if (this.blogDeltaRtfFormat !== "") {
      const rtfJson = JSON.parse(this.blogDeltaRtfFormat);
      // @ts-ignore
      this.quillEditor.setContents(rtfJson);
    }
  }

  async getBlogPostToEdit(blogPostHashHex: string): Promise<GetSinglePostResponse> {
    return this.backendApi
      .GetSinglePost(
        this.globalVars.localNode,
        blogPostHashHex /*PostHashHex*/,
        this.globalVars.loggedInUser?.PublicKeyBase58Check ?? "" /*ReaderPublicKeyBase58Check*/,
        false /*FetchParents */,
        0 /*CommentOffset*/,
        20 /*CommentLimit*/,
        this.globalVars.showAdminTools() /*AddGlobalFeedBool*/,
        2 /*ThreadLevelLimit*/,
        1 /*ThreadLeafLimit*/,
        false /*LoadAuthorThread*/
      )
      .toPromise();
  }

  async setFieldsFromPost(blogPost: GetSinglePostResponse): Promise<void> {
    this.title = blogPost.PostFound.PostExtraData.Title;
    this.description = blogPost.PostFound.PostExtraData.Description;
    this.coverImageUrl = blogPost.PostFound.PostExtraData.CoverImage;
    this.blogDeltaRtfFormat = blogPost.PostFound.PostExtraData.BlogDeltaRtfFormat;
  }

  async getAndSetBlogPostFields(blogPostHashHex: string): Promise<void> {
    const blogPost = await this.getBlogPostToEdit(blogPostHashHex);
    await this.setFieldsFromPost(blogPost);
  }

  handleContentChange($event: ContentChange) {
    this.content = $event.content;
  }

  async _handleFileInput(files: FileList): Promise<void> {
    let fileToUpload = files.item(0);
    if (fileToUpload === null) {
      return;
    }
    if (!fileToUpload.type || !fileToUpload.type.startsWith("image/")) {
      this.globalVars._alertError("File selected does not have an image file type.");
      return;
    }
    if (fileToUpload.size > 5 * 1024 * 1024) {
      this.globalVars._alertError("Please upload an image that is smaller than 5MB.");
      return;
    }
    this.coverImageUrl = await this.uploadImage(fileToUpload);
  }

  dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(",");
    // @ts-ignore
    let mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // TODO: Add file size checker
  // Loop through all ops in the Delta, convert any images from base64 to a File object, upload them, and then replace
  // that image in the Delta object with the link to the uploaded image.
  // This is done to drastically reduce on-chain file size.
  async uploadAndReplaceBase64Images() {
    await Promise.all(
      // @ts-ignore
      this.content.ops.map(async (op) => {
        if (has(op, "insert.image") && op.insert.image.substring(0, 5) === "data:") {
          const newFile = this.dataURLtoFile(op.insert.image, "uploaded_image");
          const res = await this.backendApi
            .UploadImage(environment.uploadImageHostname, this.globalVars.loggedInUser.PublicKeyBase58Check, newFile)
            .toPromise();
          op.insert.image = res.ImageURL;
        }
      })
    );
  }

  async submit(event: Event) {
    console.log("Here is the title: ", this.title);
    console.log("Here is the event: ", event);
    console.log("Before replace");
    await this.uploadAndReplaceBase64Images();
    console.log("After replace");

    // TODO: Validate that all required fields are present and set.
    const postExtraData: BlogPostExtraData = {
      Title: this.title,
      Description: this.description,
      BlogDeltaRtfFormat: JSON.stringify(this.content),
      CoverImage: this.coverImageUrl,
    };

    const postBody = `${postExtraData.Title}\n\n${postExtraData.Description}\n\n#blog`;

    console.log("Before submit");
    // TODO: Add preview image URL to post object
    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        this.editPostHashHex /*PostHashHexToModify*/,
        "" /*ParentPostHashHex*/,
        "" /*Title*/,
        {
          Body: postBody,
        } /*BodyObj*/,
        "" /*RepostedPostHashHex*/,
        postExtraData /*PostExtraData*/,
        "" /*Sub*/,
        false /*IsHidden*/,
        this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
        false
      )
      .toPromise()
      .then((res) => {
        console.log(
          `Your post is ready, view it here: ${window.location.origin}/blog/${res.PostEntryResponse?.PostHashHex}`
        );
      });
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
}
