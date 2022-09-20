import { Component } from "@angular/core";
import { BackendApiService } from "src/app/backend-api.service";
import { GlobalVarsService } from "src/app/global-vars.service";

@Component({
  selector: "create-long-post",
  templateUrl: "./create-long-post.component.html",
  styleUrls: ["./create-long-post.component.scss"],
})
export class CreateLongPostComponent {
  private content;

  constructor(private backendApi: BackendApiService, private appData: GlobalVarsService) {}

  handleContentChange($event) {
    this.content = $event.content;
  }

  publish() {
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
      .then(() => {
        alert("your post is ready.");
      });
  }
}
