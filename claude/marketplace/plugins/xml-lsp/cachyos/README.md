# xml-lsp

Eclipse LemMinX XML LSP: DMN, BPMN, SHACL-XML, XSD.

Install / upgrade:
1. JRE present: `jdk-openjdk`; headless option:
   `sudo pacman -S --needed jre-openjdk-headless`.
2. Install pinned uber jar manually:
   `curl -sSL --create-dirs -o ~/.local/share/lemminx/lemminx.jar https://repo.eclipse.org/content/repositories/lemminx-releases/org/eclipse/lemminx/org.eclipse.lemminx/0.31.1/org.eclipse.lemminx-0.31.1-uber.jar`
3. Add `~/.local/bin/lemminx`:
   `java -jar ~/.local/share/lemminx/lemminx.jar "$@"`.

Status: CachyOS installation pending.
