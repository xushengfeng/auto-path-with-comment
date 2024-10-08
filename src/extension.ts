import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

export function activate(context: vscode.ExtensionContext) {
	console.log("hhw");

	const disposable = vscode.languages.registerCompletionItemProvider(
		["javascript", "typescript"],
		{
			async provideCompletionItems(
				document: vscode.TextDocument,
				position: vscode.Position,
			) {
				const line = document.lineAt(position);
				let quoteStartIndex = line.text.lastIndexOf("'", position.character);
				if (quoteStartIndex === -1) {
					quoteStartIndex = line.text.lastIndexOf('"', position.character);
				}
				if (quoteStartIndex === -1) {
					return undefined;
				}
				if (line.text.at(quoteStartIndex - 2) !== "(") {
					return undefined;
				}
				let quoteEndIndex = line.text
					.slice(position.character)
					.indexOf(line.text.at(quoteStartIndex) as string);
				if (quoteEndIndex === -1) {
					quoteEndIndex = line.range.end.character;
				} else {
					quoteEndIndex += position.character;
				}

				const funArg = line.text.slice(quoteStartIndex, quoteEndIndex);
				console.log(funArg);

				const centerPath = funArg.trim();

				const functionName2seg: Map<string, vscode.CompletionItem[]> =
					new Map();
				const nposition = new vscode.Position(
					position.line,
					position.character - funArg.length - 2, // - (",
				);

				const definitions = await vscode.commands.executeCommand<
					vscode.LocationLink[]
				>("vscode.executeDefinitionProvider", document.uri, nposition);

				if (definitions && definitions.length > 0) {
					for (const l of definitions) {
						const { line, character } = l.targetRange.start;
						console.log(`函数定义在行 ${line + 1} 列 ${character + 1}`);
						let actualDoc = document;
						if (document.uri.path !== l.targetUri.path) {
							actualDoc = await vscode.workspace.openTextDocument(l.targetUri);
						}
						const functionName = actualDoc
							.lineAt(line)
							.text.slice(
								l.targetSelectionRange?.start.character,
								l.targetSelectionRange?.end.character,
							);
						getPathFromLine(actualDoc, line, functionName);
					}
				} else {
					console.log("未找到函数定义");
				}

				function getPathFromLine(
					document: vscode.TextDocument,
					line: number,
					functionName: string,
				) {
					const lastLine = line - 1;
					if (lastLine < 0) {
						return null;
					}
					const prevLine = document.lineAt(lastLine);
					const commandR = /^\s*\/\//;
					const baseUrlM = prevLine.text
						.replace(commandR, "")
						.trim()
						.startsWith("@auto-path:");
					if (baseUrlM) {
						const pathR = prevLine.text
							.replace(commandR, "")
							.trim()
							.replace("@auto-path:", "")
							.trim();
						console.log(pathR);

						let baseUrl = pathR;
						let replaceName: null | [string, string] = null;
						if (path.basename(pathR).includes("$")) {
							baseUrl = path.dirname(pathR);
							replaceName = path.basename(pathR).split("$") as [string, string];
						}
						const completionItems: vscode.CompletionItem[] = [];

						const currentDir = path.dirname(document.uri.fsPath);

						const fullBaseUrl = path.join(currentDir, baseUrl, centerPath);
						console.log(fullBaseUrl);

						try {
							const files = fs.readdirSync(fullBaseUrl);
							for (const file of files.filter(
								(f) =>
									!replaceName ||
									(replaceName.join("").length <= f.length &&
										f.startsWith(replaceName[0]) &&
										f.endsWith(replaceName[1])),
							)) {
								const item = new vscode.CompletionItem(`${file}`);
								const fileType = fs.lstatSync(path.join(fullBaseUrl, file));
								if (fileType.isDirectory()) {
									item.kind = vscode.CompletionItemKind.Folder;
									item.insertText = new vscode.SnippetString(`${file}/`);
								} else {
									item.kind = vscode.CompletionItemKind.File;
									let n = file;
									if (replaceName) {
										n = file.slice(
											replaceName[0].length,
											-replaceName[1].length,
										);
									}
									item.insertText = new vscode.SnippetString(`${n}`);
								}
								completionItems.push(item);
								functionName2seg.set(functionName, completionItems);
							}
						} catch (error) {
							console.error("读取目录失败:", error);
						}
					}
				}

				for (const k of functionName2seg.keys()) {
					if (line.text.match(k)) {
						return functionName2seg.get(k);
					}
				}

				return undefined;
			},
		},
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
