<?php
function store($p, $o) {
	file_put_contents($p, str_replace("    ", "\t", json_encode($o, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . "\n");
}

function storeC($p, $o) {
	$json = json_encode($o, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
	$descriptorspec = [
		0 => ["pipe", "r"], // stdin
		1 => ["pipe", "w"], // stdout
	];
	$process = proc_open("brotli -q 11 -c", $descriptorspec, $pipes);
	if (is_resource($process)) {
		fwrite($pipes[0], $json);
		fclose($pipes[0]);
		$compressed = stream_get_contents($pipes[1]);
		fclose($pipes[1]);
		proc_close($process);
		file_put_contents($p, $compressed);
	}
}

if (PHP_SAPI !== "cli")
	exit;
$bypassGithub = $argc == 2 && $argv[1] == "-n";
$pathkey = __DIR__ . "/password-githubkey.txt";
$githubAPIKey = file_get_contents($pathkey);
$modulesPath = __DIR__ . "/modules";
$files = scandir($modulesPath);
//usort($files, function($a, $b) use ($modulesPath) { $fileA = $modulesPath . DIRECTORY_SEPARATOR . $a; $fileB = $modulesPath . DIRECTORY_SEPARATOR . $b; return filemtime($fileB) - filemtime($fileA); }); //Sort by last date
$starsTotal = 0;
$modulesDefault = array();
$modulesMeta = array();
$modulesTranslationTitle = array();
$modulesTranslationDescription = array();
$modulesMarkdown = array();
$modulesKeywords = array();
$modulesSetup = array();
$modulesReset = array();
$finishedStrange = array();
$count = 0;
foreach ($files as $file) {
    $fullPath = $modulesPath . "/" . $file;
	if ($file == "." || $file == ".." || is_dir($fullPath))
		continue;
	$data = file_get_contents($fullPath);
	$module = json_decode($data, true);
	if ($module === null) {
		echo "$fullPath has an error\n";
		exit;
	}
	$name = $module["module"];
	echo $name . ", ";
	if (!file_exists($modulesPath . "/icons/" . $name . ".png"))
		echo "\n\nIcon for " . $name . " doesn't exist\n\n";
	if (isset($module["default"]["setup"]) && !file_exists($modulesPath . "/reset/" . $name . ".sh")) {
		echo "\n\nReset for " . $name . " doesn't exist but has default.setup property\n\n";
		exit;
	}
	if (isset($module["default"]["setup"]) && !isset($module["default"]["setupDependencies"])) {
		echo "\n\ndefault.SetupDependencies for " . $name . " doesn't exist but has default.setup property\n\n";
		exit;
	}
	if ($module["finished"] == true && $module["installMethod"] != "apt" && !file_exists($modulesPath . "/install/" . $name . ".sh") && !file_exists($modulesPath . "/reset/" . $name . ".sh"))
		array_push($finishedStrange, $name);
	if ($module["web"] === true) {
		if (isset($modulesLocalPort[$module["default"]["localPort"]])) {
			echo "\nProblem localPort " . $module["default"]["localPort"] . " for " . $name . "\n\n";
			exit;
		}
		$modulesLocalPort[$module["default"]["localPort"]] = true;
	}
	if (isset($module["default"]["setup"]))
		array_push($modulesSetup, $name);
	if (isset($module["default"]["reset"]))
		array_push($modulesReset, $name);
	if (!$bypassGithub && $module["github"] != "") {
		$headers = array("Accept: application/json", "Authorization: Bearer " . $githubAPIKey, "X-GitHub-Api-Version: 2022-11-28", "User-Agent: X");
		$ch = curl_init("https://api.github.com/repos/" . $module["github"]);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		$resp = curl_exec($ch);
		curl_close($ch);
		$github = json_decode($resp, true);
		$starsTotal += intval($github["stargazers_count"]);
		$module["githubStars"] = intval($github["stargazers_count"] ?? 0);
		$module["githubLicense"] = $github["license"]["name"] ?? "";
		$module["githubDescription"] = $github["description"] ?? "";
		$module["githubLanguage"] = $github["language"] ?? "";
	}
	$modulesDefault[$name] = $module["default"];
	if ($module["web"] == true)
		$modulesDefault[$name]["web"] = true;
	foreach($module["keywords"] as $k)
		$modulesKeywords[$k] =  "";
	$modulesMeta[$name] = $module;
	unset($modulesMeta[$name]["default"]);
	$modulesTranslationTitle[$module["title"]] = "";
	$modulesTranslationDescription[$module["description"]] = "";
	$modulesMarkdown[$count] = "|" . implode("|", array($module["github"] != "" ? ("[" . $module["name"] . "](https://github.com/" . $module["github"] . ")") : $module["name"], $module["title"], $module["description"], "" . number_format(intval($github["stargazers_count"] ?? 0) / 1000, 1) . "k", $module["web"] ? "web" : "terminal", $module["category"])) . "|";
	$modulesMarkdown[$count] = str_replace("0.0k", "", $modulesMarkdown[$count]);
	$count++;
}
echo "\n\n";
echo "Setup (" . count($modulesSetup) . "): " . implode(", ", $modulesSetup) . "\n\n";
echo "Reset (" . count($modulesReset) . "): " . implode(", ", $modulesReset) . "\n\n";
echo "IsItFinished? (" . count($finishedStrange) . "): " . implode(", ", $finishedStrange) . "\n\n";
echo $count . " modules for " . $starsTotal . " ⭐\n";
store(__DIR__ . "/../client/src/assets/modulesmeta.json", $modulesMeta);
storeC(__DIR__ . "/../client/src/assets/modulesmeta.json.br", $modulesMeta);
store(__DIR__ . "/../client/src/assets/modulesdefault.json", $modulesDefault);
storeC(__DIR__ . "/../client/src/assets/modulesdefault.json.br", $modulesDefault);
ksort($modulesTranslationTitle);
ksort($modulesTranslationDescription);
store(__DIR__ . "/../client/src/assets/i18n/modules-en.json", array( "title" => $modulesTranslationTitle, "description" => $modulesTranslationDescription));
ksort($modulesKeywords);
store(__DIR__ . "/../client/src/assets/i18n/keywords-en.json", array("keywords" => $modulesKeywords));
$modulesMarkdownHeader="|Module|Title|Description|⭐|Type|Category|\n|-|-|-|:-:|-|:-:|\n";
$modulesMarkdownFooter="\n||||" . number_format($starsTotal / 1000 / 1000, 2) . "M ⭐|||";
if (!is_dir(__DIR__ . "/../build"))
	mkdir(__DIR__ . "/../build");
file_put_contents(__DIR__ . "/../build/README-modules.md", $modulesMarkdownHeader . implode("\n", $modulesMarkdown) . $modulesMarkdownFooter);
system("cp " . __DIR__ . "/modules/reset/* " . __DIR__ . "/../rootfs/usr/local/modules/_core_/reset/");
?>
