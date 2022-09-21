import { Component } from "@angular/core";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";
import { has } from "lodash";
import { environment } from "src/environments/environment";

@Component({
  selector: "create-long-post",
  templateUrl: "./create-long-post.component.html",
  styleUrls: ["./create-long-post.component.scss"],
})
export class CreateLongPostComponent {
  private content;

  constructor(private backendApi: BackendApiService, private appData: GlobalVarsService) {}

  handleContentChange($event) {
    console.log("Editor changed:", $event);
    this.content = $event.content;
  }

  dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
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
      this.content.ops.map(async (op) => {
        if (has(op, "insert.image")) {
          const newFile = this.dataURLtoFile(op.insert.image, "uploaded_image");
          const res = await this.backendApi
            .UploadImage(environment.uploadImageHostname, this.appData.loggedInUser.PublicKeyBase58Check, newFile)
            .toPromise();
          op.insert.image = res.ImageURL;
        }
      })
    );
  }

  async publish() {
    await this.uploadAndReplaceBase64Images();
    this.backendApi
      .SubmitPost(
        this.appData.localNode,
        this.appData.loggedInUser.PublicKeyBase58Check,
        "" /*PostHashHexToModify*/,
        "" /*ParentPostHashHex*/,
        "" /*Title*/,
        {
          Body: "Test 123",
        } /*BodyObj*/,
        "" /*RepostedPostHashHex*/,
        {
          QuillDeltaFormat: JSON.stringify(this.content),
        } /*PostExtraData*/,
        "" /*Sub*/,
        false /*IsHidden*/,
        this.appData.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
        false
      )
      .toPromise()
      .then((res) => {
        console.log(
          `Your post is ready, view it here: ${window.location.origin}/blog/${res.PostEntryResponse?.PostHashHex}`
        );
      });
  }
}
