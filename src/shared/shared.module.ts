import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ReactiveFormsModule } from "@angular/forms";
import { PageComponent } from "../app/page/page.component";
import { SimpleCenterLoaderComponent } from "../app/simple-center-loader/simple-center-loader.component";
import { IconsModule } from "../app/icons/icons.module";

@NgModule({
  declarations: [PageComponent, SimpleCenterLoaderComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, IconsModule, PageComponent, SimpleCenterLoaderComponent],
})
export class SharedModule {}
