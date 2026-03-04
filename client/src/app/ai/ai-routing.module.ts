import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AI } from './ai.page';

const routes: Routes = [{
	path: '',
	component: AI
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})

export class AIRoutingModule {}
