import { NgModule } from '@angular/core';
import { LongPressDirective } from './longPress/longPress.directive';
import { IonicModule } from '@ionic/angular';
import { SidebarComponent } from './sidebar/sidebar.component';
import { JoyrideModule } from 'ngx-joyride';
import { TopbarComponent } from './topbar/topbar.component';
import { FooterComponent } from './footer/footer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
	declarations: [LongPressDirective, SidebarComponent, TopbarComponent, FooterComponent],
	exports: [LongPressDirective, SidebarComponent, TopbarComponent, FooterComponent],
	imports: [IonicModule, CommonModule, JoyrideModule.forRoot(), FormsModule, RouterModule]
})
export class ComponentsModule {}
