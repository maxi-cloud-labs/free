<?php
function store($p, $o) {
	file_put_contents($p, str_replace("\\\\", "\\", str_replace("    ", "\t", json_encode($o, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE))) . "\n");
}

echo "/work/ai.maxi/client/src/assets/i18n/pages-en.json: Extracting strings\n";
$dir = "/work/ai.maxi/client/src";
$results = [];
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
foreach ($iterator as $file) {
	if ($file->isDir())
		continue;
	if (!str_ends_with($file->getFilename(), ".page.html") && !str_ends_with($file->getFilename(), ".page.ts"))
		continue;
	$content = file_get_contents($file->getPathname());
	if (preg_match_all('/L\(([\'"])(.*?)\1\)/', $content, $matches)) {
		$pageName = str_replace(".page", "", pathinfo($file->getFilename(), PATHINFO_FILENAME));
		if (!isset($results[$pageName]))
			$results[$pageName] = [];
		foreach (array_unique($matches[2]) as $str)
			$results[$pageName][$str] = "";
	}
}
ksort($results);
foreach ($results as &$strings)
	ksort($strings);
unset($strings);
store("/work/ai.maxi/client/src/assets/i18n/pages-en.json", $results);
echo "####################################\n";

echo "/work/ai.maxi/app/i18n/app-en.json: Extracting strings\n";
$dir = "/work/ai.maxi/app";
$results = [];
$results["app"] = [];
$files = scandir($dir);
foreach ($files as $file) {
	if (!str_ends_with($file, ".c"))
		continue;
	$content = file_get_contents($dir . "/" . $file);
	if (preg_match_all('/L\(([\'"])(.*?)\1\)/', $content, $matches)) {
		foreach (array_unique($matches[2]) as $str)
			$results["app"][$str] = "";
	}
}
ksort($results["app"]);
store("/work/ai.maxi/app/i18n/app-en.json", $results);
echo "####################################\n";

function checkLanguage_($lg, $dir) {
	foreach (glob("$dir/*-en.json") as $enFile) {
		$lgFile = substr($enFile, 0, -8) . "-" . $lg . ".json";
		echo $lgFile . ": Cleaning\n";
		$enData = json_decode(file_get_contents($enFile), true);
		$lgData = json_decode(file_get_contents($lgFile), true);
		foreach ($enData as $enPageKey => $enPageValue)
			foreach ($enPageValue as $enStringKey => $enStringValue)
				if (isset($lgData[$enPageKey][$enStringKey])) {
					$enData[$enPageKey][$enStringKey] = $lgData[$enPageKey][$enStringKey];
					unset($lgData[$enPageKey][$enStringKey]);
				}
		store($lgFile, $enData);
		foreach ($enData as $enPageKey => $enPageValue)
			foreach ($enPageValue as $enStringKey => $enStringValue)
				if ($enStringValue == "")
					echo "No value for {$enPageKey}: {$enStringKey}\n";
		foreach ($lgData as $lgPageKey => $lgPageValue)
			foreach ($lgPageValue as $lgStringKey => $lgStringValue)
				echo "Not used {$lgPageKey}: {$lgStringKey}\n";
		echo "####################################\n";
	}
}

function checkLanguage($lg) {
	checkLanguage_($lg, "/work/ai.maxi/client/src/assets/i18n/");
	//checkLanguage_($lg, "/work/ai.maxi/app/i18n/");
}

checkLanguage("de");
checkLanguage("es");
checkLanguage("fr");
checkLanguage("it");
checkLanguage("ja");
checkLanguage("ko");
checkLanguage("pt");
checkLanguage("zh");
