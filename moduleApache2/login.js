let _app_Form;
let _app_Arg1;
let _app_Arg2;
let _app_Arg3;

function _app_React(_app_El) {
	const _app_Key = Object.keys(_app_El).find(key => key.startsWith('__reactProps'));
	if (_app_Key) {
		const _app_Prop = _app_El[_app_Key];
		_app_Prop.value = _app_El.value;
		if (_app_Prop.onChange)
			_app_Prop.onChange({ target: _app_El, currentTarget: _app_El, nativeEvent: new Event('input', { bubbles: true }) });
	}
}

function _app_Color(_app_Ele) {
	const _app_Style = window.getComputedStyle(_app_Ele);
	const _app_PrevColor = _app_Style.color;
    _app_Ele.style.color = _app_Style.backgroundColor;
	setTimeout(function() { _app_Ele.style.color = _app_PrevColor; }, 2000);
}

function _app_Close() {
	const _app_Div = document.getElementById('_app_ButtonID');
	if (_app_Div)
		_app_Div.style.display = 'none';
}
window._app_Close = _app_Close;

function _app_Credentials() {
	_app_Color(_app_Arg1);
	_app_Arg1.value = '%s';
	_app_Arg1.dispatchEvent(new Event('input', { bubbles: true }));
	_app_Arg1.dispatchEvent(new Event('change', { bubbles: true }));
	_app_React(_app_Arg1);
	if (_app_Arg2 != null) {
		_app_Color(_app_Arg2);
		_app_Arg2.value = '%s';
		_app_Arg2.dispatchEvent(new Event('input', { bubbles: true }));
		_app_Arg2.dispatchEvent(new Event('change', { bubbles: true }));
		_app_React(_app_Arg2);
	}
	setTimeout(() => { _app_Arg3.click(); }, 100);
	setTimeout(_app_Close, 1000);
}
window._app_Credentials = _app_Credentials;

let _app_Tries = 0;
function _app_Insert() {
	if (_app_Tries++ > 5)
		return;
	_app_Form = document.querySelector('%s');
	if (_app_Form !== null) {
		let _app_qS_Arg1 = '%s';
		_app_Arg1 = _app_Form.querySelector(_app_qS_Arg1);
		let _app_qS_Arg2 = '%s';
		_app_Arg2 = _app_qS_Arg2 == "" ? null : _app_Form.querySelector(_app_qS_Arg2);
		let _app_qS_Arg3 = '%s';
		_app_Arg3 = _app_Form.querySelector(_app_qS_Arg3);
		if (_app_Arg1 !== null && _app_Arg3 === null)
			_app_Arg3 = document.querySelector(_app_qS_Arg3);
		if (_app_Arg1 !== null && (_app_qS_Arg2 == "" || _app_Arg2 !== null) && _app_Arg3 !== null)
			document.body.insertAdjacentHTML('beforeend', `<div id="_app_ButtonID"; style="display:flex; flex-direction:column; align-items:end; position:absolute; z-index:10001; top:100px; right:50px;">
	<div style="width:100%%; display:flex; justify-content:space-between;">
		<div style="display:flex">
			<a href="https://docs.maxi.cloud/#/autologin" title="Understand AutoLogin" target="_blank" style="color:black">
				<svg xmlns="http://www.w3.org/2000/svg" style="width:20px; height:20px; cursor:pointer;" viewBox="0 0 512 512">
					<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="white" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
					<path d="M200 202.29s.84-17.5 19.57-32.57C230.68 160.77 244 158.18 256 158c10.93-.14 20.69 1.67 26.53 4.45 10 4.76 29.47 16.38 29.47 41.09 0 26-17 37.81-36.37 50.8S251 281.43 251 296" fill="white" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="28"/>
					<circle cx="250" cy="348" r="20"/>
				</svg>
			</a>
			<a href="https://app.%s.maxi.cloud/?search=%s&settings=true" title="See those Credentials" target="_blank" style="color:black">
				<svg xmlns="http://www.w3.org/2000/svg" style="width:20px; height:20px; cursor:pointer;" viewBox="0 0 512 512">
					<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="white" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
					<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M220 220h32v116"/>
					<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M208 340h88"/>
					<path d="M248 130a26 26 0 1026 26 26 26 0 00-26-26z"/>
				</svg>
			</a>
		</div>
		<a href="javascript:window._app_Close();" title="Close" style="color:black">
			<svg xmlns="http://www.w3.org/2000/svg" style="width:20px; height:20px; cursor:pointer;" viewBox="0 0 512 512">
				<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="white" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
				<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 320L192 192M192 320l128-128"/>
			</svg>
		</a>
	</div>
	<div style="background-color:#000f4e; color:white; font-weight:bold; text-align:center; border:2px solid white; border-radius:15px; padding:10px;">
		mAxI.cloud<br>
		<button style="text-align:center; background-color:#0092ce; color:white; margin-top:10px; border-radius:10px; padding:5px; cursor:pointer;" onclick="window._app_Credentials();">
			Automatic<br>Login
		</button>
</div>`);
		else
			setTimeout(_app_Insert, 1000);
	} else
		setTimeout(_app_Insert, 1000);
}

document.addEventListener('DOMContentLoaded', (event) => { _app_Insert(); });
