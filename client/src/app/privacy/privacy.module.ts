import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { PrivacyRoutingModule } from './privacy-routing.module';
import { Privacy } from './privacy.page';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		TranslateModule,
		ComponentsModule,
		PrivacyRoutingModule
	],
	schemas: [NO_ERRORS_SCHEMA],
	declarations: [Privacy]
})

export class PrivacyModule {}
