import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../components/components.module';
import { AIRoutingModule } from './ai-routing.module';
import { AI } from './ai.page';
import { FormsModule } from '@angular/forms';

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		FormsModule,
		TranslateModule,
		ComponentsModule,
		AIRoutingModule
	],
	declarations: [AI]
})

export class AIModule {}
