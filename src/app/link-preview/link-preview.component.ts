import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { BackendApiService } from "../backend-api.service";

@Component({
  selector: "link-preview",
  templateUrl: "./link-preview.component.html",
})
export class LinkPreviewComponent implements OnInit {
  @Input() link: string;
  image: string;
  proxyImageUrl: string;
  title: string;
  description: string;
  displayLink: string;
  showCard: boolean = false;
  constructor(private backendApi: BackendApiService, private ref: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.getLinkPreview();
  }

  getLinkPreview() {
    this.backendApi.GetLinkPreview(this.link).subscribe((linkPreviewMetaTags) => {
      this.image = linkPreviewMetaTags.image;
      if (this.image !== "") {
        this.proxyImageUrl = this.backendApi.ConstructProxyImageUrl(this.image);
      }
      this.title = linkPreviewMetaTags.title;
      this.description = linkPreviewMetaTags.description;
      const url = new URL(this.link);
      this.displayLink = url.hostname.replace("www.", "");
      this.showCard = this.title != "" && this.description != "";
      this.ref.detectChanges();
    });
  }

  handleClick(event) {
    event.stopPropagation();
  }
}
