import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
  name: "sanitizeQRCode",
})
export class SanitizeQRCodePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url) {
    const sendDESOExp = /[A-Za-z0-9.:]{0,30}\/send-deso\?public_key=[A-Za-z0-9]{54,55}/;
    const referralExp = /[A-za-z0-9.:]{0,30}\?r=[A-Za-z-0-9]{6,8}/;
    if (!url.match(sendDESOExp) && !url.match(referralExp)) {
      return false;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://quickchart.io/qr?size=300&text=${encodeURIComponent(url)}`
    );
  }
}
