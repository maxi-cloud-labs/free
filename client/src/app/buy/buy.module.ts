import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BuyRoutingModule } from './buy-routing.module';
import { Buy } from './buy.page';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		TranslateModule,
		FormsModule,
		ReactiveFormsModule,
		ComponentsModule,
		BuyRoutingModule
	],
	schemas: [NO_ERRORS_SCHEMA],
	declarations: [Buy]
})

export class BuyModule {}
