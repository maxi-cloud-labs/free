import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JoyrideModule } from 'ngx-joyride';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { ModernRoutingModule } from './modern-routing.module';
import { Modern, FilterByCategoriesPipe } from './modern.page';
import { FormsModule } from '@angular/forms';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		JoyrideModule.forRoot(),
		FormsModule,
		TranslateModule,
		ComponentsModule,
		ModernRoutingModule
	],
	declarations: [Modern, FilterByCategoriesPipe]
})

export class ModernModule {}
