// @ts-strict
import { Component } from "@angular/core";
import { ContentChange } from "ngx-quill";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import { has } from "lodash";
import { environment } from "src/environments/environment";

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

  formFieldNames = {
    coverImage: "coverImage",
    title: "title",
    description: "description",
  };

  constructor(private backendApi: BackendApiService, private globalVars: GlobalVarsService) {}

  handleContentChange($event: ContentChange) {
    console.log("Editor changed:", $event);
    this.content = $event.content;
  }

  dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(",")
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

  // Loop through all ops in the Delta, convert any images from base64 to a File object, upload them, and then replace
  // that image in the Delta object with the link to the uploaded image.
  // This is done to drastically reduce on-chain file size.
  async uploadAndReplaceBase64Images() {
    await Promise.all(
      // @ts-ignore
      this.content.ops.map(async (op) => {
        if (has(op, "insert.image")) {
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
    await this.uploadAndReplaceBase64Images();
    const formElements = (event.currentTarget as HTMLFormElement)?.elements;
    const imageEl = formElements.namedItem(this.formFieldNames.coverImage) as HTMLInputElement;
    const titleEl = formElements.namedItem(this.formFieldNames.title) as HTMLInputElement;
    const descEl = formElements.namedItem(this.formFieldNames.description) as HTMLInputElement;

    const imgFile = imageEl.files?.item(0);

    const postExtraData: BlogPostExtraData = {
      Title: titleEl.value.trim(),
      Description: descEl.value.trim(),
      BlogDeltaRtfFormat: JSON.stringify(this.content),
      CoverImage: (imgFile && (await this.uploadImage(imgFile))) ?? "",
    };

    const postBody = `${postExtraData.Title}\n\n${postExtraData.Description}\n\n#blog`;

    // TODO: Add preview image URL to post object
    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        "" /*PostHashHexToModify*/,
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
