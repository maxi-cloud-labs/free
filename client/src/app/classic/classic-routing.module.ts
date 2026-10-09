import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Classic } from './classic.page';

const routes: Routes = [{
	path: '',
	component: Classic
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})

export class ClassicRoutingModule {}
