import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { PricingRoutingModule } from './pricing-routing.module';
import { Pricing } from './pricing.page';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		TranslateModule,
		ComponentsModule,
		PricingRoutingModule
	],
	schemas: [NO_ERRORS_SCHEMA],
	declarations: [Pricing]
})

export class PricingModule {}
