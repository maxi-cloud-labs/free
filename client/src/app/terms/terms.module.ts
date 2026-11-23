import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { TermsRoutingModule } from './terms-routing.module';
import { Terms } from './terms.page';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		TranslateModule,
		ComponentsModule,
		TermsRoutingModule
	],
	schemas: [NO_ERRORS_SCHEMA],
	declarations: [Terms]
})

export class TermsModule {}
