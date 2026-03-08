import fs from "fs";
import userid from "userid";
import path from "path";

//Interface
interface FileSystemNode {
	name: string;
	type: "directory" | "file" | "symlink";
	permissions: string;
	owner: string;
	group: string;
	size: number;
	modified: string;
	children?: FileSystemNode[];
}

//Functions
function getFileStats(filePath: string): FileSystemNode {
	const stats = fs.statSync(filePath);
	const { uid, gid, mode, size, mtime } = stats;
	const fileType = stats.isDirectory() ? "d" : stats.isSymbolicLink() ? "l" : "-";
	const permBits = (mode & 0o777).toString(8).padStart(3, "0");
	const permChars = permBits.split("").map((digit) => {
		const num = parseInt(digit, 8);
		return [
			num & 4 ? "r" : "-",
			num & 2 ? "w" : "-",
			num & 1 ? "x" : "-",
		].join("");
	}).join("");

	const permissions = fileType + permChars;

	return {
		name: path.basename(filePath),
		type: stats.isDirectory() ? "directory" : stats.isSymbolicLink() ? "symlink" : "file",
		permissions,
		owner: userid.username(uid),
		group: userid.groupname(gid),
		size: size,
		modified: mtime.toISOString(),
	};
}

export function folderAndChildren( rootPath: string, depth: number = 0, maxDepth: number = -1): FileSystemNode {
	const stats = fs.statSync(rootPath);
	const node: FileSystemNode = getFileStats(rootPath);

	if (node.type === "directory" && (maxDepth == -1 || depth < maxDepth)) {
		let entries;
		try {
			entries = fs.readdirSync(rootPath, { withFileTypes: true });
		} catch (error) {
			console.error(`Error reading ${rootPath}:`, error);
			return node; // Return early if directory is unreadable
		}

		node.children = entries
			.map((entry) => {
				const fullPath = path.join(rootPath, entry.name);
				try {
					return folderAndChildren(fullPath, depth + 1, maxDepth);
				} catch (error) {
					console.error(`Error reading ${fullPath}:`, error);
					return null;
				}
			})
			.filter((child): child is FileSystemNode => child !== null) // Filter out errors
			.sort((a, b) => {
				// Directories first, then files (case-insensitive)
				if (a.type === "directory" && b.type !== "directory") return -1;
				if (a.type !== "directory" && b.type === "directory") return 1;
				return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
			});
	}
	return node;
}
