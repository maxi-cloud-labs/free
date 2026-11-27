import { Component, Input, ElementRef, Renderer2, ChangeDetectorRef, inject, DestroyRef, afterNextRender } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Global } from '../../env';

@Component({
	selector: 'app-topbar',
	templateUrl: './topbar.component.html',
	standalone: false
})

export class TopbarComponent {
LG(st) { return this.global.mytranslateG(st); }
@Input() title;
private documentClickListener: (() => void) | null = null;
showUserMenu:boolean = false;
initials: string = "";
private destroyRef = inject(DestroyRef);

constructor(public global: Global, private cdr: ChangeDetectorRef, private elRef: ElementRef, private renderer: Renderer2, private route: ActivatedRoute) {
	this.initials = this.getInitials();
	afterNextRender(() => {
		const unlisten = this.renderer.listen("document", "click", (event: Event) => {
			const userMenuDropdown = this.elRef.nativeElement.querySelector(".user-menu-dropdown");
			const userMenuButton = this.elRef.nativeElement.querySelector(".user-menu-button");
			if (this.showUserMenu && userMenuDropdown && userMenuButton && !userMenuDropdown.contains(event.target) && !userMenuButton.contains(event.target)) {
				this.showUserMenu = false;
				this.cdr.markForCheck();
			}
		});
		this.destroyRef.onDestroy(() => { unlisten(); });
	});
}

toggleUserMenu() {
	this.showUserMenu = !this.showUserMenu;
}

getInitials() {
	const st = this.global.session?.user?.name ?? "";
	const nameParts = st.trim().split(" ");
	const initials = nameParts.map(name => name.charAt(0)).join("").toUpperCase();
	return initials;
}

extract() {
	window.open((document.getElementById("iframeLaunch") as HTMLIFrameElement).src, "_blank");
}

}
