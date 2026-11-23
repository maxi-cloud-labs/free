import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Terms } from './terms.page';

const routes: Routes = [{
	path: '',
	component: Terms
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})

export class TermsRoutingModule {}
