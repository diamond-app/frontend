import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ReactiveFormsModule } from "@angular/forms";
import { SimpleCenterLoaderComponent } from "../app/simple-center-loader/simple-center-loader.component";
import { IconsModule } from "../app/icons/icons.module";
import { BsModalService } from "ngx-bootstrap/modal";
import { TranslocoRootModule } from "../app/transloco-root.module";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsModule, TranslocoRootModule],
  declarations: [SimpleCenterLoaderComponent],
  providers: [BsModalService],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconsModule,
    TranslocoRootModule,
    SimpleCenterLoaderComponent,
  ],
})
export class SharedModule {}
