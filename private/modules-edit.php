<?php
function store($p, $o) {
	file_put_contents(__DIR__ . $p, str_replace("\\/", "/", str_replace("    ", "\t", json_encode($o, JSON_PRETTY_PRINT))) . "\n");
}

if (PHP_SAPI !== "cli")
	exit;
$modulesPath = __DIR__ . "/modules";
$files = scandir($modulesPath);
$starsTotal = 0;
$csv = array();
$modulesDefault = array();
foreach ($files as $file) {
    $fullPath = $modulesPath . "/" . $file;
	if ($file == "." || $file == ".." || is_dir($fullPath))
		continue;
	$data = file_get_contents($fullPath);
	$module = json_decode($data, true);
	$module["keywords"] = implode(",", $module["keywords"]);
	$module["proprietary"] = implode(",", $module["proprietary"]);
	$module["reverseProxy"] = isset($module["default"]["reverseProxy"]) ? "1" : "";
	$module["services"] = implode(",", $module["default"]["services"] ?? array());
	$modulesDefault[$module["module"]] = $module["default"];
	unset($module["default"]);
	if (count($csv) == 0) {
		$nbCol = count($module);
		echo "" . $nbCol . " columns\n";
		$names = array_keys($module);
		array_push($csv, implode(";", $names));
	}
	if (count($module) != $nbCol) {
		echo "\nProblem " . $file . " doesn't have the right number of columns (" . $nbCol . ")\n";
		exit;
	}
	array_push($csv, implode(";", array_values($module)));
}
$csvPath = "/tmp/modules.csv";
file_put_contents($csvPath, implode("\n", $csv));

exec("libreoffice " . $csvPath);

$data = file_get_contents($csvPath);
$modules = explode("\n", $data);
$names = explode(";", $modules[0]);
echo "" . count($names) . " columns\n";
for ($i = 1; $i < count($modules); $i++) {
	if (strlen($modules[$i]) == 0)
		continue;
	$m = explode(";", $modules[$i]);
	$out = array();
	for ($j = 0; $j < count($m); $j++)
		$out[$names[$j]] = $m[$j];
	$out["essential"] = $out["essential"] === "1";
	$out["web"] = $out["web"] === "1";
	$out["finished"] = $out["finished"] === "1";
	$out["default"] = $modulesDefault[$m[0]];
	unset($out["reverseProxy"]);
	unset($out["services"]);
	$out["keywords"] = explode(",", $out["keywords"]);
	$out["keywords"] = array_map("ucfirst", $out["keywords"]);
	sort($out["keywords"]);
	$out["keywords"] = array_values(array_unique($out["keywords"], SORT_STRING));
	$out["proprietary"] = explode(",", $out["proprietary"]);
	$out["proprietary"] = array_map("ucfirst", $out["proprietary"]);
	sort($out["proprietary"]);
	$out["proprietary"] = array_values(array_unique($out["proprietary"], SORT_STRING));
	if ($out["proprietary"][0] == "")
		$out["proprietary"] = array();
	store("/modules/" . $m[0] . ".json", $out);
}
?>
