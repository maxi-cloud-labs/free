<?php
if (isset($_SERVER['HTTP_REFERER'])) {
	if (session_status() === PHP_SESSION_NONE) session_start();
	if (isset($_SESSION["token"])) {
		header("Location: /?token=" . $_SESSION["token"]);
		exit;
	}
}
if (isset($_POST["token"])) {
	if (session_status() === PHP_SESSION_NONE) session_start();
	$_SESSION["token"] = $_POST["token"];
	header("Location: /?token=" . $_POST["token"]);
	exit;
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="tailwindcss.js"></script>
<script>
function onStart() {
	document.getElementById("tokenID").focus();
}
</script>
<style>
html {
    font-family: 'Inter', system-ui, sans-serif;
	--radius: 0.65rem;
	--color-blue-100: #25aae0;
	--color-blue-200: #0092ce;
	--color-blue-300: #0078b5;
	--color-blue-400: #005e9c;
	--color-blue-500: #014d8b;
	--color-blue-600: #013d7b;
	--color-blue-700: #012e6c;
	--color-blue-800: #011f5d;
	--color-blue-900: #000f4e;
}
</style>
</head>
<body onload="onStart();">
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full">
		<div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
			<div class="text-center mb-8 flex items-center flex-col">
				<h1 class="flex flex-row items-center text-lg -mt-2 mb-4 font-bold"><img src="logo.png" class="w-10 h-10 mr-2 cursor-pointer" (click)="global.openPage('');"/> OPENCLAW</h1>
				<div class="flex items-center gap-2 mb-2">
					<div class="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
						<svg xmlns="http://www.w3.org/2000/svg" class="text-white w-10 h-10" viewBox="0 0 512 512">
							<path d="M336 208v-95a80 80 0 00-160 0v95" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
							<rect x="96" y="208" width="320" height="272" rx="48" ry="48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
						</svg>
					</div>
					<h1 class="text-3xl font-bold text-left text-gray-900">Enter<br>Token</h1>
				</div>
				<p class="text-gray-600">Enter the token of OpenClaw</p>
			</div>
			<form method="POST" action="#" id="formID" class="space-y-6">
				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">Token</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg xmlns="http://www.w3.org/2000/svg" class="text-gray-500 w-4 h-4" viewBox="0 0 512 512">
								<path d="M336 208v-95a80 80 0 00-160 0v95" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
								<rect x="96" y="208" width="320" height="272" rx="48" ry="48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
							</svg>
						</div>
						<input id="tokenID" name="token" required class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-colors duration-200" placeholder="Enter token" [class.border-red-300]="token?.invalid && token?.touched" [class.focus:ring-red-500]="token?.invalid && token?.touched" type="password">
					</div>
				</div>
				<div class="bg-red-50 border border-red-200 rounded-xl p-4" id="errorDiv" style="display:none;">
					<div class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="text-red w-5 h-5" viewBox="0 0 512 512">
							<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
							<path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 367.91a20 20 0 1120-20 20 20 0 01-20 20z"/>
						</svg>
						<span class="text-red-800 text-sm font-medium" id="errorSpan"></span>
					</div>
				</div>
				<button type="submit" id="submitID" class="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]">
					<svg xmlns="http://www.w3.org/2000/svg" class="text-white w-6 h-6" viewBox="0 0 512 512">
						<path d="M192 176v-40a40 40 0 0140-40h160a40 40 0 0140 40v240a40 40 0 01-40 40H240c-22.09 0-48-17.91-48-40v-40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
						<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 336l80-80-80-80M80 256h272"/>
					</svg>
					Validate
				</button>
			</form>
		</div>
	</div>
</div>
</body>
</html>
