import { NgModule } from '@angular/core';
import { LongPressDirective } from './longPress/longPress.directive';
import { IonicModule } from '@ionic/angular';
import { SidebarComponent } from './sidebar/sidebar.component';
import { JoyrideModule } from 'ngx-joyride';
import { TopbarComponent } from './topbar/topbar.component';
import { ModernbarComponent } from './modernbar/modernbar.component';
import { FooterComponent } from './footer/footer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
	declarations: [LongPressDirective, SidebarComponent, TopbarComponent, ModernbarComponent, FooterComponent],
	exports: [LongPressDirective, SidebarComponent, TopbarComponent, ModernbarComponent, FooterComponent],
	imports: [IonicModule, CommonModule, JoyrideModule.forRoot(), FormsModule, RouterModule]
})
export class ComponentsModule {}
