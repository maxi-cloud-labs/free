import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Pricing } from './pricing.page';

const routes: Routes = [{
	path: '',
	component: Pricing
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})

export class PricingRoutingModule {}
