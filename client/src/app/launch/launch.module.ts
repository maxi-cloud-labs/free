import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { Launch } from './launch.page';
import { LaunchRoutingModule } from './launch-routing.module';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		TranslateModule,
		ComponentsModule,
		LaunchRoutingModule
	],
	declarations: [Launch]
})

export class LaunchModule {}
