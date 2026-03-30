import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { forkJoin, Observable, map } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { ComponentsModule } from './components/components.module';

export class MultiHttpLoader implements TranslateLoader {
constructor(private http: HttpClient, private configs: { prefix: string, suffix: string }[]) {}

getTranslation(lang: string): Observable<any> {
	const requests = this.configs.map(config => {
		const path = `${config.prefix}${lang}${config.suffix}`;
		return this.http.get(path);
	});
	return forkJoin(requests).pipe(map(responses => {
		return responses.reduce((acc, current) => ({ ...acc, ...current }), {});
	}));
}

}

export function createMultiHttpLoader(http: HttpClient) {
	return new MultiHttpLoader(http, [
		{ prefix: 'assets/i18n/global-', suffix: '.json' },
		{ prefix: 'assets/i18n/keywords-', suffix: '.json' },
		{ prefix: 'assets/i18n/pages-', suffix: '.json' },
		{ prefix: 'assets/i18n/modules-', suffix: '.json' }
	]);
}

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		IonicModule.forRoot(),
		BrowserAnimationsModule,
		ToastrModule.forRoot(),
		AppRoutingModule,
		ComponentsModule,
		TranslateModule.forRoot({
			loader: {
				provide: TranslateLoader,
				useFactory: createMultiHttpLoader,
				deps: [HttpClient]
			},
			fallbackLang: "en"
		})],
	providers: [
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		provideHttpClient()
	],
	bootstrap: [AppComponent],
})

export class AppModule {}
