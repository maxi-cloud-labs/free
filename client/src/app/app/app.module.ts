import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JoyrideModule } from 'ngx-joyride';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { AppRoutingModule } from './app-routing.module';
import { App } from './app.page';
import { FormsModule } from '@angular/forms';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		JoyrideModule.forRoot(),
		FormsModule,
		TranslateModule,
		ComponentsModule,
		AppRoutingModule
	],
	declarations: [App]
})

export class AppModule {}
