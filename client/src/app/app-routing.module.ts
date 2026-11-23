import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { Global } from './env';

const routes: Routes = [
	{
		path: 'about',
		loadChildren: () => import('./about/about.module').then( m => m.AboutModule)
	},
	{
		path: 'ai',
		canActivate: [Global],
		loadChildren: () => import('./ai/ai.module').then( m => m.AIModule)
	},
	{
		path: 'app',
		canActivate: [Global],
		loadChildren: () => import('./app/app.module').then( m => m.AppModule)
	},
	{
		path: 'backup',
		canActivate: [Global],
		loadChildren: () => import('./backup/backup.module').then( m => m.BackupModule)
	},
	{
		path: 'buy',
		loadChildren: () => import('./buy/buy.module').then( m => m.BuyModule)
	},
	{
		path: 'classic',
		canActivate: [Global],
		loadChildren: () => import('./classic/classic.module').then( m => m.ClassicModule)
	},
	{
		path: 'delete',
		loadChildren: () => import('./delete/delete.module').then( m => m.DeleteModule)
	},
	{
		path: 'find',
		loadChildren: () => import('./find/find.module').then( m => m.FindModule)
	},
	{
		path: 'hardware',
		canActivate: [Global],
		loadChildren: () => import('./hardware/hardware.module').then( m => m.HardwareModule)
	},
	{
		path: 'help',
		loadChildren: () => import('./help/help.module').then( m => m.HelpModule)
	},
	{
		path: '',
		canActivate: [Global],
		loadChildren: () => import('./modern/modern.module').then( m => m.ModernModule)
	},
	{
		path: 'login',
		loadChildren: () => import('./login/login.module').then( m => m.LoginModule)
	},
	{
		path: 'permissions',
		canActivate: [Global],
		loadChildren: () => import('./permissions/permissions.module').then( m => m.PermissionsModule)
	},
	{
		path: 'pricing',
		loadChildren: () => import('./pricing/pricing.module').then( m => m.PricingModule)
	},
	{
		path: 'privacy',
		loadChildren: () => import('./privacy/privacy.module').then( m => m.PrivacyModule)
	},
	{
		path: 'profile',
		canActivate: [Global],
		loadChildren: () => import('./profile/profile.module').then( m => m.ProfileModule)
	},
	{
		path: 'serverlog',
		canActivate: [Global],
		loadChildren: () => import('./serverlog/serverlog.module').then( m => m.ServerLogModule)
	},
	{
		path: 'settings',
		canActivate: [Global],
		loadChildren: () => import('./settings/settings.module').then( m => m.SettingsModule)
	},
	{
		path: 'setup',
		loadChildren: () => import('./setup/setup.module').then( m => m.SetupModule)
	},
	{
		path: 'splash',
		loadChildren: () => import('./splash/splash.module').then( m => m.SplashModule)
	},
	{
		path: 'terms',
		loadChildren: () => import('./terms/terms.module').then( m => m.TermsModule)
	},
	{
		path: 'users',
		canActivate: [Global],
		loadChildren: () => import('./users/users.module').then( m => m.UsersModule)
	},
	{
		path: 'wrapper',
		canActivate: [Global],
		loadChildren: () => import('./wrapper/wrapper.module').then( m => m.WrapperModule)
	},
	{
		path: '**',
		redirectTo: 'splash',
		pathMatch: 'full'
	},
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes, {
			scrollPositionRestoration: 'enabled',
			preloadingStrategy: PreloadAllModules
		})
	],
	exports: [RouterModule]
})

export class AppRoutingModule {

constructor() {}

}
