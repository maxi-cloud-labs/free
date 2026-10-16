<?php

if (PHP_SAPI !== "cli")
	exit;

function moduleImageGH($module, $force) {
	if (!$force) {
		$ret = __DIR__ . "/../build/images/gh/" . $module["module"] . ".png";
		return file_exists($ret) ? $ret : null;
	}
	$ret = null;
	$pathkey = __DIR__ . "/password-githubkey.txt";
	$authToken = file_get_contents($pathkey);
	$name = $module["module"];
	$query = "query (\$owner: String!, \$name: String!) { repository(owner: \$owner, name: \$name) { openGraphImageUrl } }";
	$repo = explode("/", $module["github"]);
	$repoOwner = $repo[0];
	$repoName = $repo[1];
	$variables = ["owner" => $repoOwner, "name" => $repoName];
	$payload = json_encode(["query" => $query, "variables" => $variables]);
	$ch = curl_init("https://api.github.com/graphql");
	curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_HTTPHEADER => ["Content-Type: application/json", "User-Agent: PHP-GraphQL-Client", "Authorization: bearer " . $authToken]]);
	$response = curl_exec($ch);
	if (!curl_errno($ch)) {
		$data = json_decode($response, true);
		if (isset($data["errors"])) {
			echo "GraphQL Error:\n";
			print_r($data["errors"]);
		} else if (isset($data["data"]["repository"]["openGraphImageUrl"])) {
			$ogImageUrl = $data["data"]["repository"]["openGraphImageUrl"];
			$ret = __DIR__ . "/../build/images/gh/" . $name . ".png";
			if (strpos($ogImageUrl, "://opengraph.githubassets.com") === false && !file_exists($ret)) {
				system("wget -q -O " . $ret . " " . $ogImageUrl);
				echo "\r\033[K" . $name . ": " . $ogImageUrl . "\n";
			} else
				echo "\r\033[K" . $name;
		}
	}
	curl_close($ch);
	return $ret;
}


const BACKDROP = ["w" => 1280, "h" => 720, "ratio" => "16:9"];

const POSTER = ["w" => 768, "h" => 1024, "ratio" => "3:4"];

const STYLE = [
	"A realistic theatrical one-sheet movie poster, professional key art, matte finish, shot like a real photograph with natural window light, shallow depth of field, fine film grain.",
	"A theatrical one-sheet movie poster in the style of a modern painted illustration, bold shapes, clean detail, matte finish.",
	"A minimalist theatrical one-sheet movie poster, flat graphic shapes, generous negative space, matte finish.",
	"A vintage 1970s theatrical one-sheet movie poster, hand-painted gouache look, slightly faded paper texture, matte finish.",
	"A cinematic one-sheet movie poster rendered as a polished 3D render, soft studio lighting, crisp materials, matte finish.",
	"A Saul Bass inspired one-sheet movie poster, cut-paper shapes, limited flat colors, bold graphic symbolism, matte finish.",
	"A moody noir one-sheet movie poster, high-contrast dramatic lighting, deep shadows, fine film grain, matte finish.",
	"A watercolor and ink one-sheet movie poster, soft washes, visible paper texture, delicate linework, matte finish.",
	"A retro-futuristic one-sheet movie poster, airbrushed 1980s sci-fi illustration, soft glow, matte finish.",
	"A realistic macro-photography one-sheet movie poster, extreme close-up, tactile textures, razor-thin depth of field, matte finish."
];

const PALETTE = [
	"magenta as the dominant color with rose pink accents",
	"deep teal as the dominant color with warm amber accents",
	"midnight blue as the dominant color with pale gold accents",
	"forest green as the dominant color with cream accents",
	"burnt orange as the dominant color with dusty blue accents",
	"charcoal black as the dominant color with electric cyan accents",
	"ivory white as the dominant color with coral red accents",
	"royal purple as the dominant color with lime yellow accents",
	"sage green as the dominant color with terracotta accents",
	"crimson red as the dominant color with warm gray accents",
	"mustard yellow as the dominant color with navy blue accents",
	"sky blue as the dominant color with sunset orange accents",
	"emerald green as the dominant color with soft pink accents",
	"deep burgundy as the dominant color with dusty gold accents",
	"turquoise as the dominant color with hot coral accents",
	"slate gray as the dominant color with mint green accents",
	"chocolate brown as the dominant color with peach accents",
	"olive green as the dominant color with rust orange accents",
	"indigo as the dominant color with soft lavender accents",
	"bright red as the dominant color with off-white accents",
	"peach as the dominant color with powder blue accents",
	"petrol blue as the dominant color with saffron yellow accents",
	"jet black as the dominant color with neon green accents",
	"bone white as the dominant color with jet black accents",
	"lilac as the dominant color with butter yellow accents",
	"copper as the dominant color with deep navy accents",
	"plum as the dominant color with seafoam accents",
	"electric blue as the dominant color with bright orange accents",
	"dusty rose as the dominant color with sage green accents",
	"maroon as the dominant color with sand beige accents",
	"aqua as the dominant color with deep purple accents",
	"golden yellow as the dominant color with charcoal accents",
	"moss green as the dominant color with pale lemon accents",
	"cobalt blue as the dominant color with crisp white accents",
	"salmon pink as the dominant color with deep teal accents",
	"steel blue as the dominant color with silver accents",
	"tangerine orange as the dominant color with cool gray accents",
	"raspberry as the dominant color with dark green accents",
	"pale mint as the dominant color with charcoal accents",
	"sepia brown as the dominant color with faded turquoise accents",
	"violet as the dominant color with silver accents",
	"desert sand as the dominant color with deep indigo accents",
	"ruby red as the dominant color with antique gold accents",
	"ice blue as the dominant color with graphite accents",
	"pine green as the dominant color with burnt sienna accents",
	"hot pink as the dominant color with electric blue accents",
	"pearl gray as the dominant color with soft gold accents",
	"ochre as the dominant color with sea green accents",
	"deep ocean blue as the dominant color with coral pink accents",
	"matte black as the dominant color with molten orange accents"
];

const MOOD = [
	"server" => "solid, reliable, infrastructural",
	"developer" => "precise, technical, inventive",
	"utils" => "handy, compact, clever",
	"knowledge" => "calm, scholarly, curious",
	"ai" => "futuristic, intelligent, mysterious",
	"collaboration" => "warm, connected, human",
	"productivity" => "focused, efficient, clean",
	"media" => "cinematic, immersive, dramatic",
	"personal" => "cozy, intimate, private",
	"database" => "dense, structured, deep",
	"torrent" => "distributed, swarm-like, kinetic"
];

const TITLE = [
	// Classic placements, varied
	"The title \"{title}\" is set in thin, widely spaced sans-serif capital letters, centered at the bottom of the poster.",
	"The title \"{title}\" is set in huge bold condensed capital letters across the top of the poster, slightly overlapping the top edge of the hero.",
	"The title \"{title}\" is set in elegant high-contrast serif capital letters, centered in the middle of the poster, with the hero partly in front of the letters.",
	"The title \"{title}\" is set in small refined lowercase letters in the upper left corner, with generous empty space around it.",
	"The title \"{title}\" is stacked vertically along the right edge of the poster, in tall narrow capital letters.",
	// Integrated into the picture
	"The title \"{title}\" is large, in heavy block letters, and the hero stands in front of it so that the letters are partly hidden behind the hero.",
	"The title \"{title}\" is formed by glowing neon tubes, mounted on a wall in the scene, casting colored light on the surroundings.",
	"The title \"{title}\" is carved or embossed into the surface of the scene, in deep letters with soft shadows, as if part of the material.",
	"The title \"{title}\" is written in the sky or on a distant horizon in large translucent letters, like a faded atmospheric haze.",
	"The title \"{title}\" is printed on a physical object in the scene, such as a sign, label or plaque, naturally lit and in perspective.",
	// Playful typography
	"The title \"{title}\" is set in bold retro 1970s lettering with rounded shapes, tilted slightly upward, placed in the lower third.",
	"The title \"{title}\" is hand-lettered in brush script with an energetic stroke, running diagonally across the lower half of the poster.",
	"The title \"{title}\" is set in oversized thin outlined capital letters spanning the full width of the poster, with the hero overlapping them.",
	"The title \"{title}\" is set in a clean geometric typeface, split on two lines, aligned to the left edge at the bottom.",
	"The title \"{title}\" is reflected on a glossy surface below it, in metallic chrome capital letters, centered in the lower half.",
];

const COMPOSITION = [
	"Diagonal composition, hero in the lower right, slightly tilted horizon.",
	"Centered symmetrical composition, hero in the middle.",
	"Low-angle view looking up at the hero, hero large in the frame.",
	"Rule-of-thirds composition, hero in the left third, generous empty space on the right.",
	"Top-down view, hero in the center of a clean surface.",
	"Hero small in a vast empty landscape, strong sense of scale.",
	"Tight close-up, hero filling two thirds of the frame and cropped by the edges.",
	"Hero in the upper half, reflected on a glossy surface below.",
	"Dutch-angle tilted view, hero off-center to the left, dynamic perspective.",
	"Hero framed by a large circular shape behind it, symmetrical.",
];

function pick(array $list, string $key, string $salt): string {
	$h = (int)sprintf("%u", crc32($salt . ":" . $key));
	return $list[$h % count($list)];
}

function modulePrompt($module) {
	$category = strtolower($module["category"]);
	$name = $module["name"];
	$key = $module["module"];
	$mood = MOOD[$category];
	$style = pick(STYLE, $key, "style");
	$palette = pick(PALETTE, $key, "palette");
	$hero = $module["hero"];
	$composition = pick(COMPOSITION, $key, "composition");
	$titleTreatment = str_replace("{title}", $name, pick(TITLE, $key, "title"));
	$posterPrompt = implode(" ", [
		$style,
		"Hero image: {$hero}, a single clear focal point.",
		"Title: ${titleTreatment}",
		"Composition: ${composition}",
		"Mood: {$mood}.",
		"Color palette: {$palette}.",
		"Remarks: The only text on the entire poster is the word \"{$name}\". No tagline, no credits, no logos, no other words anywhere.",
	]);
	return [
		"module" => $module["module"],
		"name" => $module["name"],
		"category" => $category,
		"poster" => [
			"width" => POSTER["w"],
			"height" => POSTER["h"],
			"ratio" => POSTER["ratio"],
			"prompt" => $posterPrompt,
			"output" => __DIR__ . "/modules/images/" . $module["module"] . ".poster.jpg",
		],
		"backdrop" => [
			"width" => BACKDROP["w"],
			"height" => BACKDROP["h"],
			"ratio" => BACKDROP["ratio"],
			"prompt" => $posterPrompt,
			"output" => __DIR__ . "/modules/images/" . $module["module"] . ".backdrop.jpg",
		]
	];
}

function curl($url, $headers, $method, $fields) {
	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
	if ($method == "POST" && $fields !== NULL) {
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
	}
	if ($headers !== NULL)
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_TIMEOUT, 300);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
	$response = curl_exec($ch);
	$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	curl_close($ch);
	return [
		"status" => $status,
		"response" => $response
	];
}

function generateImageCloudflare($model, $data, $kind, $div) {
	$pathkey = __DIR__ . "/password-cloudflare.txt";
	$authData = explode(" ", trim(file_get_contents($pathkey)));
	$authAccount = $authData[0];
	$authToken = $authData[1];
	$url = "https://api.cloudflare.com/client/v4/accounts/" . $authAccount . "/ai/run/" . $model;
	$fields = [
		"prompt" => $data[$kind]["prompt"],
		"mode" => "generation",
		"aspect_ratio" => $data[$kind]["ratio"] ?? "1:1",
		"output_format" => "png",
	];
	$headers = ["Authorization: Bearer " . $authToken];
	$result = curl($url, $headers, "POST", $fields);
	if ($result["status"] === 200 && $result["response"]) {
		$ret = json_decode($result["response"], true);
		$outputFile = $data[$kind]["output"];
		file_put_contents($outputFile, base64_decode($ret["result"]["image"]));
		echo "" . $data["module"] . ": " . $outputFile . "\n";
	} else
		echo "Cloudflare API Error (Status Code " . $result["status"] . "): " . $result["response"] . "\n";
}

function generateCodex($command) {
	$process = proc_open($command, [ 0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"] ], $pipes);
	if (!is_resource($process))
		die("Failed to start Codex\n");
	fclose($pipes[0]);
	stream_set_blocking($pipes[1], false);
	stream_set_blocking($pipes[2], false);
	while (true) {
		$read = [$pipes[1], $pipes[2]];
		$write = null;
		$except = null;
		if (stream_select($read, $write, $except, 1) === false)
			break;
		foreach ($read as $stream) {
			while (($line = fgets($stream)) !== false) {
				if ($stream === $pipes[2]) {
					echo "[stderr] $line";
					continue;
				}
				$event = json_decode($line, true);
				if (!$event) {
					echo $line;
					continue;
				}
				$type = $event["type"] ?? "";
				if ($type === "item.completed") {
					$item = $event["item"] ?? [];
					echo "[Codex] " . ($item["text"] ?? $item["type"] ?? "Item completed") . "\n";
				} elseif ($type === "turn.completed") {
					//echo "[Codex] Completed\n";
				} elseif ($type === "turn.failed" || $type === "error")
					echo "[Codex] ERROR: $line";
				elseif ($type === "turn.started") {
					//echo "[Codex] Working...\n";
				}
			}
		}
		$status = proc_get_status($process);
		if (!$status["running"])
			break;
	}
	foreach ([$pipes[1], $pipes[2]] as $pipe) {
		echo stream_get_contents($pipe);
		fclose($pipe);
	}
	proc_close($process);
}

function generateImageCodex($data, $kind) {
	$prompt = "Generate a jpg image with aspect ratio " . $data[$kind]["ratio"] . " (" . $data[$kind]["width"] . "x" . $data[$kind]["height"] . "), quality 80 and save it to " . $data[$kind]["output"] .  ". " . $data[$kind]["prompt"];
	$command = "codex exec --cd " . __DIR__ . " --sandbox workspace-write --json " . escapeshellarg($prompt);
	echo "Generating " . $kind . ": " . $data["name"] . "\n";
	generateCodex($command);
}

function generateIconCodex($module, $path) {
	$prompt = "Generate a png icon image with aspect ratio 1:1 (512x512), fully transparent with only black RGB(0,0,0) color, and save it to " . $path . ". It should be a simple generic icon depicting a software project name \"" . $module["name"] . "\" which description is: " . $module["description"];
	$command = "codex exec --cd " . __DIR__ . " --sandbox workspace-write --json " . escapeshellarg($prompt);
	echo "Generating icon: " . $module["name"] . "\n";
	generateCodex($command);
}

function generateImageAIHorde($data, $kind) {
	$pathkey = __DIR__ . "/password-aihorde.txt";
	$authkey = trim(file_get_contents($pathkey));
	$url = "https://aihorde.net/api/v2/generate/async";
	$fields = [
		"prompt" => $data[$kind]["prompt"],
		"params" => [
			"steps" => 20,
			"width" => $data[$kind]["width"] / $div,
			"height" => $data[$kind]["height"] / $div,
			"sampler_name" => "k_euler"
		]
	];
	$CLIENT_AGENT = "MyPHPImageApp:1.0.0:contact@example.com";
	$headers = ["apikey: " . $authkey, "Client-Agent: " . $CLIENT_AGENT, "Content-Type: application/json"];
	$result = curl($url, $headers, "POST", json_encode($fields));
	if ($result["status"] === 202 && $result["response"]) {
		$ret = json_decode($result["response"], true);
		$requestId = $ret["id"];
		$statusUrl = "https://aihorde.net/api/v2/generate/status/" . $requestId;
		echo "requestId: " . $requestId . "\n";
		$isDone = false;
		$maxAttempts = 30;
		$attempt = 0;
		while (!$isDone && $attempt < $maxAttempts) {
			sleep(4);
			$attempt++;
			$statusResult = curl($statusUrl, $headers, "GET", NULL);
			if ($statusResult["status"] === 200 && $statusResult["response"]) {
				$statusResponse = json_decode($statusResult["response"], true);
				if (isset($statusResponse["done"]) && $statusResponse["done"] === true) {
					$isDone = true;
					echo "Generation complete!\n";
					if (!empty($statusResponse["generations"])) {
						$generation = $statusResponse["generations"][0];
						$imgData = $generation["img"];
						$outputFile = $data[$kind]["output"];
						if (filter_var($imgData, FILTER_VALIDATE_URL))
							file_put_contents($outputFile, file_get_contents($imgData));
						else
							file_put_contents($outputFile, base64_decode($imgData));
						echo "" . $data["module"] . ": " . $outputFile . "\n";
					} else {
						echo "Job marked as done, but no image generations data was found.\n";
					}
					break;
				}
			}
			echo "Still processing... Attempt $attempt\n";
		}
	} else {
		echo "API Error (Status Code " . $result["status"] . "): " . $result["response"];
	}
}

function findPositiveTextNode(array $wf, $startId, int $depth = 0) {
	if ($startId === null || $depth > 10 || !isset($wf[$startId])) return null;
	$node = $wf[$startId];
	if (($node["class_type"] ?? "") === "CLIPTextEncode") return (string)$startId;
	// otherwise follow the "conditioning" input (FluxGuidance, ConditioningSetTimestepRange...)
	$next = $node["inputs"]["conditioning"][0] ?? null;
	return findPositiveTextNode($wf, $next, $depth + 1);
}

function generateImageLocal($model, $data, $kind, $div) {
	$prompt = $data[$kind]["prompt"];
	$width = $data[$kind]["width"] / $div;
	$height = $data[$kind]["height"] / $div;
	$outputFile = $data[$kind]["output"];
	$seed = 1;
	if ($model == "z-image-turbo") {
		$workflow_file = __DIR__ . "/models/images/image_z_image_turbo.json";
		$wf = json_decode(file_get_contents($workflow_file), true);
		$positiveId = null;
		foreach ($wf as $id => $n)
			if (($n["class_type"] ?? "") === "KSampler") {
				$positiveId = $n["inputs"]["positive"][0] ?? null;
				break;
			}
		foreach ($wf as $id => &$n) {
			$t = $n["class_type"] ?? "";
			$title = $n["_meta"]["title"] ?? "";
			if ($t === "CLIPTextEncode" && ($positiveId === null || (string)$id === (string)$positiveId))
				$n["inputs"]["text"] = $prompt;
			if (in_array($t, ["EmptySD3LatentImage", "EmptyLatentImage", "EmptyFlux2LatentImage"], true) && isset($n["inputs"]["width"], $n["inputs"]["height"])) {
				$n["inputs"]["width"] = $width;
				$n["inputs"]["height"] = $height;
			}
			if ($t === "PrimitiveInt" && $title === "Width")
				$n["inputs"]["value"] = $width;
			if ($t === "PrimitiveInt" && $title === "Height")
				$n["inputs"]["value"] = $height;
			if ($t === "KSampler") {
				$n["inputs"]["seed"] = $seed;
				$n["inputs"]["steps"] = 8;
				$n["inputs"]["cfg"] = 1;
			}
		}
		unset($n);
	} else if ($model == "flux-2-klein") {
		$workflow_file = __DIR__ . "/models/images/flux-2-klein.json";
		$wf = json_decode(file_get_contents($workflow_file), true);
		foreach ($wf as $key => &$n) {
			$t = $n["class_type"] ?? "";
			$title = $n["_meta"]["title"] ?? "";
			if ($t === "CLIPTextEncode") $n["inputs"]["text"] = $prompt;
			if ($t === "PrimitiveInt" && $title === "Width") $n["inputs"]["value"] = $width;
			if ($t === "PrimitiveInt" && $title === "Height") $n["inputs"]["value"] = $height;
			if ($t === "RandomNoise") $n["inputs"]["noise_seed"] = $seed;
			if ($t === "Flux2Scheduler") $n["inputs"]["steps"] = 4;
			if ($t === "CFGGuider") $n["inputs"]["cfg"] = 1;
		}
		unset($n);
	} else if ($model == "flux-1-dev") {
		$workflow_file = __DIR__ . "/models/images/flux_dev_checkpoint_example.json";
		$wf = json_decode(file_get_contents($workflow_file), true);
		$positiveTextId = null;
		foreach ($wf as $id => $n)
			if (($n["class_type"] ?? "") === "KSampler") {
				$positiveTextId = findPositiveTextNode($wf, $n["inputs"]["positive"][0] ?? null);
				break;
			}
		foreach ($wf as $id => &$n) {
			$t	 = $n["class_type"] ?? "";
			$title = $n["_meta"]["title"] ?? "";
			if ($t === "CLIPTextEncode" && (string)$id === $positiveTextId) {
				$n["inputs"]["text"] = $prompt;
			}
			if (in_array($t, ["EmptySD3LatentImage", "EmptyLatentImage"], true)
				&& isset($n["inputs"]["width"], $n["inputs"]["height"])) {
				$n["inputs"]["width"] = $width;
				$n["inputs"]["height"] = $height;
			}
			if ($t === "PrimitiveInt" && $title === "Width")
				$n["inputs"]["value"] = $width;
			if ($t === "PrimitiveInt" && $title === "Height")
				$n["inputs"]["value"] = $height;
			if ($t === "FluxGuidance") {
				$n["inputs"]["guidance"] = 3.5;
			}
			if ($t === "KSampler") {
				$n["inputs"]["seed"] = $seed;
				$n["inputs"]["steps"] = 25;
				$n["inputs"]["cfg"] = 1;
				$n["inputs"]["sampler_name"] = "euler";
				$n["inputs"]["scheduler"] = "simple";
				$n["inputs"]["denoise"] = 1;
			}
		}
		unset($n);
	}

	$result = curl("http://127.0.0.1:8188/prompt", ["Content-Type: application/json"], "POST", json_encode(["prompt" => $wf]));
	if ($result["status"] !== 200 || !$result["response"]) {
		echo "Queue failed: " . print_r($result, true) . "\n";
		return;
	}
	$pid = json_decode($result["response"], true)["prompt_id"];
	echo "\nLocally queued: $pid (" . $kind . ": " . $data["name"] . ")\n";
	$count = 0;
	while (true) {
		echo "\r\033[KIteration " . ($count++ * 5) . "s";
		$result = curl("http://127.0.0.1:8188/history/" . $pid, NULL, "GET", NULL);
		if ($result["status"] === 200 && $result["response"]) {
			$ret = json_decode($result["response"], true);
			if (isset($ret[$pid])) {
				foreach (($ret[$pid]["outputs"] ?? []) as $node) {
					foreach (($node["images"] ?? []) as $img) {
						rename("/home/gregoire/ComfyUI/output/" . $img["filename"], $outputFile);
						echo "\n" . $data["module"] . ": " . $outputFile . " (". ($count * 5) . "s)\n";
					}
				}
				break;
			}
		}
		sleep(5);
	}
}

function generateImage($data, $kind) {
	//generateImageCloudflare("@cf/black-forest-labs/flux-2-dev", $data, $kind, 2);
	//generateImageLocal("z-image-turbo", $data, $kind, 2);
	generateImageCodex($data, $kind);
}

function generateIcon($module, $fullPathIcon) {
	generateIconCodex($module, $fullPathIcon);
}

function store($p, $o) {
	$oo = str_replace("\\/", "/", str_replace("    ", "\t", json_encode($o, JSON_PRETTY_PRINT))) . "\n";
	file_put_contents($p, $oo);
}

function moduleImagesIcon($arg, $force) {
	$name = str_replace(".json", "", $arg);
	$fullPath = __DIR__ . "/modules/" . $name . ".json";
	$module = json_decode(file_get_contents($fullPath), true);
	$fullPath2 = __DIR__ . "/../build/images/$name.json";
	$fullPathIcon = __DIR__ . "/modules/icons/" . $name . ".png";
	if (!file_exists($fullPath2) || $force) {
		$ret2 = null;
		if ($module["github"] != "")
			$ret2 = moduleImageGH($module, false);
		if ($ret2 != null)
			$module["githubImage"] = $ret2;
		$ret = modulePrompt($module);
		store($fullPath2, $ret);
	} else
		$ret = json_decode(file_get_contents($fullPath2), true);
	if (!file_exists($ret["poster"]["output"]))
		generateImage($ret, "poster");
	if (!file_exists($ret["backdrop"]["output"]))
		generateImage($ret, "backdrop");
	if (!file_exists($fullPathIcon))
		generateIcon($module, $fullPathIcon);
}

if (!file_exists(__DIR__ . "/../build/images/gh/"))
	mkdir(__DIR__ . "/../build/images/gh/", 0775, true);
if ($argc >= 2)
	moduleImagesIcon($argv[1], true);
else {
	$modulesPath = __DIR__ . "/modules";
	$files = scandir($modulesPath);
	//usort($files, function($a, $b) use ($modulesPath) { $fileA = $modulesPath . DIRECTORY_SEPARATOR . $a; $fileB = $modulesPath . DIRECTORY_SEPARATOR . $b; return filemtime($fileB) - filemtime($fileA); }); //Sort by last date
	foreach ($files as $file) {
		$fullPath = $modulesPath . "/" . $file;
		if ($file == "." || $file == ".." || is_dir($fullPath))
			continue;
		moduleImagesIcon($file, true);
	}
}
echo "\n";
?>
