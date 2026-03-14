<?php
$ch = curl_init();

function base64url_decode(string $data): string {
	$data = strtr($data, "-_", "+/");
	$mod = strlen($data) % 4;
	if ($mod)
		$data .= substr("====", $mod);
	return base64_decode($data);
}

function encodeAsn1Integer(string $binary): string {
	if (empty($binary))
		$binary = "\x00";
	$length = strlen($binary);
	if ($length > 127)
		return "";
	return "\x02" . chr($length) . $binary;
}

function rawToDer(string $raw_signature): string|false {
	if (strlen($raw_signature) !== 64)
		return false;
	$r = substr($raw_signature, 0, 32);
	$s = substr($raw_signature, 32, 32);
	$r = ltrim($r, "\x00");
	$s = ltrim($s, "\x00");
	if (ord($r[0]) > 0x7F)
		$r = "\x00" . $r;
	if (ord($s[0]) > 0x7F)
		$s = "\x00" . $s;
	$r_encoded = encodeAsn1Integer($r);
	$s_encoded = encodeAsn1Integer($s);
	$der = "\x30" . chr(strlen($r_encoded) + strlen($s_encoded)) . $r_encoded . $s_encoded;
	return $der;
}

function verifyJwt(string $jwt, string $keyPem): array {
	$parts = explode(".", $jwt);
	if (count($parts) !== 3)
		return [];
	list($encoded_header, $encoded_payload, $encoded_signature) = $parts;
	$header = json_decode(base64url_decode($encoded_header), true);
	$payload = json_decode(base64url_decode($encoded_payload), true);
	$signature = base64url_decode($encoded_signature);
	$der_signature = rawToDer($signature);
	if ($der_signature === false)
		return [];
	$signed_data = $encoded_header . "." . $encoded_payload;
	$public_key_resource = openssl_get_publickey($keyPem);
	if ($public_key_resource === false)
		return [];
	$verification_result = openssl_verify($signed_data, $der_signature, $public_key_resource, OPENSSL_ALGO_SHA256);
	openssl_free_key($public_key_resource);
	if ($verification_result === 1) {
		if (!isset($payload["exp"]) || $payload["exp"] < time())
			return [];
		return $payload;
	}
	return [];
}

function getToken() {
}

function login($email, $password, $url) {
	global $ch;

	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	curl_setopt($ch, CURLOPT_COOKIE, "jwt=" . $_COOKIE["jwt"]);
	curl_setopt($ch, CURLOPT_COOKIEFILE, "");
	curl_setopt($ch, CURLOPT_COOKIEJAR, "");
	$response = curl_exec($ch);
	preg_match('|<input type="hidden" name="_token" value="([A-z0-9]*)">|', $response, $matches);
	if($matches)
		$token = $matches[1];
	else
		return false;

	$post_params = array(
		"_token" => $token,
		"_task" => "login",
		"_action" => "login",
		"_timezone" => "",
		"_url" => "_task=login",
		"_host" => "",
		"_user" => $email,
		"_pass" => $password
	);
	curl_setopt($ch, CURLOPT_URL, $url . "?_task=login");
	curl_setopt($ch, CURLOPT_COOKIE, "jwt=" . $_COOKIE["jwt"]);
	curl_setopt($ch, CURLOPT_COOKIEFILE, "");
	curl_setopt($ch, CURLOPT_COOKIEJAR, "");
	curl_setopt($ch, CURLOPT_POST, TRUE);
	curl_setopt($ch, CURLOPT_HEADER, TRUE);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_params));
	$response = curl_exec($ch);
	$response_info = curl_getinfo($ch);
	if($response_info["http_code"] == 302) {
		preg_match_all("/Set-Cookie: (.*)\b/", $response, $cookies);
		$cookie_return = array();
		foreach($cookies[1] as $cookie) {
			preg_match("|([A-z0-9\_]*)=([A-z0-9\_\-]*);|", $cookie, $cookie_match);
			if($cookie_match) {
				$cookie_return[$cookie_match[1]] = $cookie_match[2];
			}
		}
		return $cookie_return;
	} else
		return false;
	return false;
}

$email = "";
if (isset($_COOKIE["jwt"])) {
	curl_setopt($ch, CURLOPT_URL, "http://localhost:8091/auth/jwks-pem");
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	$jwksPem = curl_exec($ch);
	$jwt = $_COOKIE["jwt"];
	$payload = verifyJwt($jwt, $jwksPem);
	if (!empty($payload)) {
		$email = $payload["user"]["username"] . "@" . $payload["cloudname"] . ".maxi.cloud";
	}
}
/*
else if (isset($_POST["email"]))
	$email = strtolower($_POST["email"]);
else if (isset($_GET["email"]))
	$email = strtolower($_GET["email"]);
*/
if ($email == "") {
	echo "Error: no email";
	exit;
}

$path = "/disk/admin/modules/_config_/roundcube.json";
$data = file_get_contents($path);
$info = json_decode($data, true);
$email = $info["email"];
$password = $info["password"];

$protocol = isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http";
$url = $protocol . "://" . $_SERVER["HTTP_HOST"];
$cookies = login($email, $password, $url);
if (!empty($cookies)) {
	foreach($cookies as $cookie_name => $cookie_value)
	setcookie($cookie_name, $cookie_value, 0, "/", "");
	header("Location: " . $url . "?task=mail");
	exit;
}
?><html><body>An error occured</body></html>
