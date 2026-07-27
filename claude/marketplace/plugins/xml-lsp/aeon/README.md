# xml-lsp

Eclipse LemMinX XML LSP: DMN, BPMN, SHACL-XML, XSD.

Install / upgrade:
1. `sudo apt-get install -y openjdk-21-jre-headless`
2. Install pinned uber jar:
   `curl -sSL -o ~/.local/share/lemminx/lemminx.jar https://repo.eclipse.org/content/repositories/lemminx-releases/org/eclipse/lemminx/org.eclipse.lemminx/0.31.1/org.eclipse.lemminx-0.31.1-uber.jar`
3. Add `~/.local/bin/lemminx`:
   `java -jar ~/.local/share/lemminx/lemminx.jar "$@"`.

Last verified: LemMinX 0.31.1 on Debian 13 trixie.
