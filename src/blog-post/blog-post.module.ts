import { NgModule } from "@angular/core";
import { BlogPostRoutingModule } from "./blog-post-routing.module";
import { SharedModule } from "../shared/shared.module";
import { QuillModule } from "ngx-quill";
import { CreateLongPostComponent } from "./create-long-post/create-long-post.component";
import { ManageDraftsModalComponent } from "./manage-drafts-modal/manage-drafts-modal.component";
import { DraftsTableComponent } from "./drafts-table/drafts-table.component";
import { CreateLongPostPageComponent } from "./create-long-post-page/create-long-post-page.component";

@NgModule({
  declarations: [
    CreateLongPostPageComponent,
    CreateLongPostComponent,
    ManageDraftsModalComponent,
    DraftsTableComponent,
  ],
  imports: [
    SharedModule,
    BlogPostRoutingModule,
    QuillModule.forRoot({
      format: "text",
    }),
  ],
})
export class BlogPostModule {}
