import { NgModule } from "@angular/core";
import { BlogPostRoutingModule } from "./blog-post-routing.module";
import { SharedModule } from "../shared/shared.module";
import { QuillModule } from "ngx-quill";

@NgModule({
  declarations: [],
  imports: [
    SharedModule,
    BlogPostRoutingModule,
    QuillModule.forRoot({
      format: "text",
    }),
  ],
})
export class BlogPostModule {}
