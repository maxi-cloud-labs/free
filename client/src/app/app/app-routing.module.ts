import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { App } from './app.page';

const routes: Routes = [{
	path: '',
	component: App
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})

export class AppRoutingModule {}
