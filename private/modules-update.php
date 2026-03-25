<?php
function store($p, $o) {
	file_put_contents(__DIR__ . $p, str_replace("\\/", "/", str_replace("    ", "\t", json_encode($o, JSON_PRETTY_PRINT))));
}

if (PHP_SAPI !== "cli")
	exit;
$bypassGithub = $argc == 2 && $argv[1] == "-n";
$pathkey = __DIR__ . "/password-githubkey.txt";
$githubAPIKey = file_get_contents($pathkey);
$modulesPath = __DIR__ . "/modules";
$files = scandir($modulesPath);
$starsTotal = 0;
$modulesDefault = array();
$modulesMeta = array();
$modulesTranslationTitle = array();
$modulesTranslationDescription = array();
$modulesMarkdown = array();
$modulesKeywords = array();
$modulesSetup = array();
$modulesReset = array();
$modulesLocalPort = array();
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
		echo "\n\default.SetupDependencies for " . $name . " doesn't exist but has default.setup property\n\n";
		exit;
	}
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
	$modulesTranslationTitle[$module["title"]] = "";
	$modulesTranslationDescription[$module["description"]] = "";
	$modulesMarkdown[$count] = "|" . implode("|", array($module["github"] != "" ? ("[" . $module["name"] . "](https://github.com/" . $module["github"] . ")") : $module["name"], $module["title"], $module["description"], "" . number_format(intval($github["stargazers_count"] ?? 0) / 1000, 1) . "k", $module["web"] ? "web" : "terminal", $module["category"])) . "|";
	$modulesMarkdown[$count] = str_replace("0.0k", "", $modulesMarkdown[$count]);
	$count++;
}
echo "\n\nSetup (" . count($modulesSetup) . "): " . implode(", ", $modulesSetup) . "\n\nReset (" . count($modulesReset) . "): " . implode(", ", $modulesReset) . "\n\n" . $count . " modules for " . $starsTotal . " ⭐\n";
store("/../client/src/assets/modulesmeta.json", $modulesMeta);
store("/../client/src/assets/modulesdefault.json", $modulesDefault);
store("/../client/src/assets/i18n/modules-en.json", array( "modules" => array( "title" => $modulesTranslationTitle, "description" => $modulesTranslationDescription)));
ksort($modulesKeywords);
store("/../client/src/assets/i18n/keywords-en.json", array("keywords" => $modulesKeywords));
$modulesMarkdownHeader="|Module|Title|Description|⭐|Type|Category|\n|-|-|-|:-:|-|:-:|\n";
$modulesMarkdownFooter="\n||||" . number_format($starsTotal / 1000 / 1000, 2) . "M ⭐|||";
if (!is_dir(__DIR__ . "/../build"))
	mkdir(__DIR__ . "/../build");
file_put_contents(__DIR__ . "/../build/README-modules.md", $modulesMarkdownHeader . implode("\n", $modulesMarkdown) . $modulesMarkdownFooter);
system("cp " . __DIR__ . "/modules/reset/* " . __DIR__ . "/../rootfs/usr/local/modules/_core_/reset/");
?>
