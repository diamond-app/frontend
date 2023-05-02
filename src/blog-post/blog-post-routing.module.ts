import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CreateLongPostPageComponent } from "./create-long-post-page/create-long-post-page.component";
import { SharedModule } from "../shared/shared.module";

const routes: Routes = [
  {
    path: "",
    component: CreateLongPostPageComponent,
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes), SharedModule],
  exports: [RouterModule],
})
export class BlogPostRoutingModule {}
