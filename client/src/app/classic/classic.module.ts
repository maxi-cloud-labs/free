import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JoyrideModule } from 'ngx-joyride';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { ClassicRoutingModule } from './classic-routing.module';
import { Classic } from './classic.page';
import { FormsModule } from '@angular/forms';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		JoyrideModule.forRoot(),
		FormsModule,
		TranslateModule,
		ComponentsModule,
		ClassicRoutingModule
	],
	declarations: [Classic]
})

export class ClassicModule {}
